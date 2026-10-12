const normalizeUsername = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9_]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .slice(0, 20);

const calculateAge = (dateOfBirth, now = new Date()) => {
  const birthDate = new Date(dateOfBirth);
  let age = now.getFullYear() - birthDate.getFullYear();
  if (now.getMonth() < birthDate.getMonth() || (now.getMonth() === birthDate.getMonth() && now.getDate() < birthDate.getDate())) age -= 1;
  return age;
};

export const fillMissingUserProfile = (user, usedUsernames = new Set()) => {
  let changed = false;
  if (!user.username) {
    const base = user.role === 'admin'
      ? 'pathpoint_admin'
      : normalizeUsername(user.email?.split('@')[0]) || normalizeUsername(user.name) || `user_${String(user._id).slice(-8)}`;
    let candidate = base.length >= 3 ? base : `${base}user`.slice(0, 20);
    let suffix = 2;
    while (usedUsernames.has(candidate)) {
      const tail = `_${suffix++}`;
      candidate = `${base.slice(0, 20 - tail.length)}${tail}`;
    }
    user.username = candidate;
    changed = true;
  } else {
    const normalized = normalizeUsername(user.username);
    if (normalized !== user.username) {
      user.username = normalized;
      changed = true;
    }
  }
  usedUsernames.add(user.username);

  const nameParts = String(user.name || '').trim().split(/\s+/).filter(Boolean);
  if (!user.firstName && nameParts.length) { user.firstName = nameParts[0]; changed = true; }
  if (!user.lastName && nameParts.length > 1) { user.lastName = nameParts.slice(1).join(' '); changed = true; }
  if (user.dateOfBirth && user.age == null) { user.age = calculateAge(user.dateOfBirth); changed = true; }
  if (user.phoneCountryCode == null) { user.phoneCountryCode = '+1'; changed = true; }

  if (user.role === 'provider' && user.businessProfile) {
    if (!user.businessName && user.businessProfile.companyName) { user.businessName = user.businessProfile.companyName; changed = true; }
    if (!user.businessType && user.businessProfile.industry) { user.businessType = user.businessProfile.industry; changed = true; }
    if (!user.businessAddress && user.businessProfile.location) { user.businessAddress = user.businessProfile.location; changed = true; }
    if (!user.contactPerson && user.name) { user.contactPerson = user.name; changed = true; }
  }

  return changed;
};
