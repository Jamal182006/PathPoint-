const loginAttempts = new Map();

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_MS = 60 * 1000;

export const getLoginKey = (ip, email) => `${String(ip || 'unknown')}:${String(email || '').toLowerCase().trim()}`;

export const getLockout = (key) => {
  const attempt = loginAttempts.get(key);
  if (!attempt) return null;

  if (attempt.lockedUntil && attempt.lockedUntil > Date.now()) {
    return Math.ceil((attempt.lockedUntil - Date.now()) / 1000);
  }

  if (attempt.lockedUntil && attempt.lockedUntil <= Date.now()) {
    loginAttempts.delete(key);
  }

  return null;
};

export const recordFailedLogin = (key) => {
  const attempt = loginAttempts.get(key) || { count: 0 };
  attempt.count += 1;

  if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
    attempt.lockedUntil = Date.now() + LOCKOUT_MS;
  }

  loginAttempts.set(key, attempt);
  return attempt.lockedUntil ? Math.ceil((attempt.lockedUntil - Date.now()) / 1000) : null;
};

export const resetLoginAttempts = (key) => {
  if (key) {
    loginAttempts.delete(key);
  }
};

export const clearAllLoginAttempts = () => {
  loginAttempts.clear();
};
