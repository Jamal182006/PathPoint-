import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import User from '../models/User.js';
import { parseBusinessDocument } from '../utils/businessVerification.js';
import { sendLoginCodeEmail, sendPasswordResetCodeEmail } from '../utils/emailService.js';
import {
  getLoginKey,
  getLockout,
  recordFailedLogin,
  resetLoginAttempts,
} from '../utils/loginLockout.js';

const MAX_PASSWORD_LENGTH = 72;
const MAX_EMAIL_LENGTH = 254;
const MAX_AGE = 130;
const MIN_BIRTH_YEAR = 1900;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Unicode-aware so names such as "Jose" with accents, "Peña", or "Ñoño" are
// accepted instead of only ASCII letters. `\p{M}` allows combining marks.
const namePattern = /^\p{L}[\p{L}\p{M} .'-]*$/u;
const usernamePattern = /^[a-z0-9_]{3,20}$/;
const normalizeIdentifier = (value) => String(value || '').trim().toLowerCase();
const profileInputError = (message) => Object.assign(new Error(message), { statusCode: 400 });
const findUserByIdentifier = (value) => {
  const identifier = normalizeIdentifier(value);
  return identifier.includes('@')
    ? User.findOne({ email: identifier })
    : User.findOne({ username: identifier });
};
const calculateAge = (value, now = new Date()) => {
  const date = new Date(value);
  let age = now.getFullYear() - date.getFullYear();
  if (now.getMonth() < date.getMonth() || (now.getMonth() === date.getMonth() && now.getDate() < date.getDate())) age -= 1;
  return age;
};
const passwordMeetsRules = (password) => password.length >= 8
  && /[A-Z]/.test(password)
  && /[a-z]/.test(password)
  && /[0-9]/.test(password);

const sanitizeTextField = (value, { maxLength = 2000, fallback = '' } = {}) => {
  if (value === undefined || value === null) return fallback;
  const clean = String(value)
    .replace(/\0/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.slice(0, maxLength) || fallback;
};

const normalizeProfileInfo = (source = {}) => ({
  headline: sanitizeTextField(source.headline, { maxLength: 160, fallback: '' }),
  bio: sanitizeTextField(source.bio, { maxLength: 2000, fallback: '' }),
  targetRoles: Array.isArray(source.targetRoles)
    ? source.targetRoles.map((item) => sanitizeTextField(item, { maxLength: 80, fallback: '' })).filter(Boolean).slice(0, 10)
    : [],
  desiredSalary: {
    min: Number.isFinite(Number(source?.desiredSalary?.min)) ? Number(source.desiredSalary.min) : 0,
    max: Number.isFinite(Number(source?.desiredSalary?.max)) ? Number(source.desiredSalary.max) : 0,
    currency: sanitizeTextField(source?.desiredSalary?.currency, { maxLength: 12, fallback: 'USD' }),
  },
  workPreference: ['Remote', 'Hybrid', 'On-site', 'Flexible', ''].includes(source?.workPreference)
    ? source.workPreference
    : '',
});

// Curated accent palette. The client stores the accent as a *name* so the
// palette stays contrast-safe; `accentColor` keeps the matching hex for
// backwards compatibility with older clients that only know about hexes.
const ACCENT_PALETTE = {
  indigo: { primary: '#4F46E5', shades: ['#E0E7FF', '#6366F1', '#4F46E5', '#4338CA'] },
  violet: { primary: '#7C3AED', shades: ['#EDE9FE', '#8B5CF6', '#7C3AED', '#6D28D9'] },
  teal: { primary: '#0F766E', shades: ['#CCFBF1', '#14B8A6', '#0F766E', '#115E59'] },
  blue: { primary: '#2563EB', shades: ['#DBEAFE', '#3B82F6', '#2563EB', '#1D4ED8'] },
  rose: { primary: '#E11D48', shades: ['#FFE4E6', '#F43F5E', '#E11D48', '#BE123C'] },
  emerald: { primary: '#047857', shades: ['#D1FAE5', '#10B981', '#047857', '#065F46'] },
  amber: { primary: '#B45309', shades: ['#FEF3C7', '#F59E0B', '#B45309', '#92400E'] },
};

const HEX_TO_ACCENT = Object.entries(ACCENT_PALETTE).reduce((map, [name, palette]) => {
  [palette.primary, ...palette.shades].forEach((hex) => map[hex.toLowerCase()] = name);
  return map;
}, {});

const resolveAccentName = (source = {}) => {
  if (ACCENT_PALETTE[source?.accent]) return source.accent;
  const raw = String(source?.accentColor || '').trim().toLowerCase();
  if (HEX_TO_ACCENT[raw]) return HEX_TO_ACCENT[raw];
  return 'indigo';
};

const normalizeCustomization = (source = {}) => {
  const accent = resolveAccentName(source);
  const rawHex = String(source?.accentColor || '').trim();
  return {
    themePreset: ['light', 'dark', 'minimal', 'dark_modern', 'creative_tech'].includes(source?.themePreset)
      ? source.themePreset
      : 'light',
    accent,
    // Keep a valid hex untouched so existing accounts do not lose their exact
    // shade; fall back to the palette entry for the resolved accent.
    accentColor: /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(rawHex)
      ? rawHex
      : ACCENT_PALETTE[accent].primary,
    compactMode: !!source?.compactMode,
    notifications: source?.notifications !== false,
    showWelcomeBanner: source?.showWelcomeBanner !== false,
    avatarUrl: sanitizeTextField(source?.avatarUrl, { maxLength: 500, fallback: '' }),
    bannerUrl: sanitizeTextField(source?.bannerUrl, { maxLength: 500, fallback: '' }),
    profileTitle: sanitizeTextField(source?.profileTitle, { maxLength: 120, fallback: '' }),
    layoutBlocks: Array.isArray(source?.layoutBlocks)
      ? source.layoutBlocks
        .map((block) => ({
          id: sanitizeTextField(block?.id, { maxLength: 80, fallback: 'custom' }),
          order: Number.isFinite(Number(block?.order)) ? Number(block.order) : 0,
          visible: Boolean(block?.visible),
        }))
        .slice(0, 20)
      : [
        { id: 'summary', order: 0, visible: true },
        { id: 'skills', order: 1, visible: true },
        { id: 'resumes', order: 2, visible: true },
      ],
  };
};

const normalizePrivacySettings = (source = {}) => ({
  profileVisibility: ['private', 'counselors_only', 'public'].includes(source?.profileVisibility)
    ? source.profileVisibility
    : 'private',
  shareResumeToPublic: !!source?.shareResumeToPublic,
});

const serializeProfileCustomization = (user) => ({
  id: user.id || String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
  username: user.username,
  avatar: user.avatar || '',
  profileInfo: normalizeProfileInfo(user.profileInfo || {}),
  customization: normalizeCustomization(user.customization || {}),
  privacySettings: normalizePrivacySettings(user.privacySettings || {}),
});

export const checkUsernameAvailability = async (req, res) => {
  const username = normalizeIdentifier(req.query.username);
  if (!usernamePattern.test(username)) {
    return res.status(400).json({ success: false, available: false, message: 'Use 3–20 letters, numbers, or underscores.' });
  }
  try {
    const exists = await User.exists({ username });
    return res.status(200).json({ success: true, available: !exists });
  } catch (error) {
    console.error('[Auth Error - Username Availability]:', error.message);
    return res.status(503).json({ success: false, available: false, message: 'Username availability is temporarily unavailable.' });
  }
};

// Helper to sign JWT
const generateToken = (user, rememberMe = false) => {
  return jwt.sign(
    {
      id: user.id || user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: rememberMe ? '30d' : (process.env.JWT_EXPIRES_IN || '7d'),
    }
  );
};

const generateVerificationCode = () => String(Math.floor(100000 + Math.random() * 900000));
const hashDeviceToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const trustedDeviceExpiry = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

const isTrustedDevice = (user, deviceToken) => {
  if (!deviceToken || !Array.isArray(user.trustedDevices)) return false;
  const now = Date.now();
  return user.trustedDevices.some(
    (device) => device.tokenHash === hashDeviceToken(deviceToken) && new Date(device.expiresAt).getTime() > now
  );
};

const rememberDevice = async (user, deviceToken) => {
  if (!deviceToken) return;
  const tokenHash = hashDeviceToken(deviceToken);
  user.trustedDevices = (user.trustedDevices || [])
    .filter((device) => new Date(device.expiresAt).getTime() > Date.now() && device.tokenHash !== tokenHash)
    .concat({ tokenHash, expiresAt: trustedDeviceExpiry() })
    .slice(-5);
};

// @desc    Register a new user / candidate
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const {
      email,
      username,
      firstName,
      middleName = '',
      lastName,
      dateOfBirth,
      gender = '',
      phone = '',
      phoneCountryCode = '+1',
      country = '',
      province = '',
      city = '',
      barangay = '',
      streetAddress = '',
      postalCode = '',
      education = '',
      occupation = '',
      employmentStatus = '',
      bio = '',
      avatar = '',
      businessName = '',
      businessType = '',
      businessAddress = '',
      businessRegistrationNumber = '',
      contactPerson = '',
      password,
      confirmPassword,
      role = 'user',
      careerTrack = 'General',
      businessProfile = {},
      businessDocument,
    } = req.body;
    const normalizedEmail = normalizeIdentifier(email);
    const normalizedUsername = normalizeIdentifier(username);
    const normalizedFirstName = String(firstName || '').trim();
    const normalizedMiddleName = String(middleName || '').trim();
    const normalizedLastName = String(lastName || '').trim();
    const normalizedName = [normalizedFirstName, normalizedMiddleName, normalizedLastName].filter(Boolean).join(' ');

    if (!['user', 'provider'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Account type must be user or provider',
      });
    }

    if (!normalizedFirstName || !normalizedLastName || !normalizedEmail || !normalizedUsername || !password || !dateOfBirth) {
      return res.status(400).json({
        success: false,
        message: 'Complete the required account and personal information fields.',
      });
    }

    if (!usernamePattern.test(normalizedUsername)) {
      return res.status(400).json({ success: false, message: 'Username must be 3–20 characters using letters, numbers, or underscores.' });
    }

    if (normalizedFirstName.length < 1 || normalizedFirstName.length > 80 || normalizedLastName.length < 1 || normalizedLastName.length > 80 || normalizedMiddleName.length > 80 || normalizedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Enter valid first, middle, and last names.',
      });
    }

    if (!namePattern.test(normalizedName)) {
      return res.status(400).json({
        success: false,
        message: 'Names may only contain letters, spaces, apostrophes, periods, and hyphens.',
      });
    }

    if (!emailPattern.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    if (normalizedEmail.length > MAX_EMAIL_LENGTH) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters`,
      });
    }

    if (!passwordMeetsRules(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters and include uppercase, lowercase, and numeric characters.',
      });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    const birthTimestamp = new Date(dateOfBirth);
    if (Number.isNaN(birthTimestamp.getTime()) || birthTimestamp > new Date()) {
      return res.status(400).json({ success: false, message: 'Enter a valid date of birth.' });
    }
    const age = calculateAge(birthTimestamp);
    if (age < 18) {
      return res.status(400).json({ success: false, message: 'You must be at least 18 years old to create an account.' });
    }

    // Guard against absurd dates that would otherwise trip Mongoose's `age`
    // maximum and surface as an opaque 500 error.
    if (age > MAX_AGE || birthTimestamp.getFullYear() < MIN_BIRTH_YEAR) {
      return res.status(400).json({ success: false, message: 'Enter a valid date of birth.' });
    }

    if (gender && !['female', 'male', 'non_binary', 'prefer_not_to_say'].includes(gender)) {
      return res.status(400).json({ success: false, message: 'Choose a valid gender option.' });
    }

    if (role === 'provider' && (!String(businessName).trim() || !String(businessType).trim())) {
      return res.status(400).json({
        success: false,
        message: 'Providers must provide a business name and business type.',
      });
    }

    let normalizedAvatar = '';
    if (avatar) {
      const match = /^data:image\/(png|jpeg);base64,([a-z\d+/]+=*)$/i.exec(String(avatar));
      if (!match || Buffer.from(match[2], 'base64').length > 3 * 1024 * 1024) {
        return res.status(400).json({ success: false, message: 'Profile photo must be a PNG or JPG up to 3 MB.' });
      }
      normalizedAvatar = String(avatar);
    }

    // Providers may register first and submit their verification document later
    // from the provider dashboard, so only parse the document when one is supplied.
    let businessVerification = { status: 'not_submitted' };
    if (role === 'provider' && businessDocument) {
      try {
        businessVerification = {
          ...parseBusinessDocument(businessDocument),
          status: 'pending',
          submittedAt: new Date(),
        };
      } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
      }
    }

    const existingUser = await User.findOne({ $or: [{ email: normalizedEmail }, { username: normalizedUsername }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === normalizedEmail
          ? 'An account with this email address already exists.'
          : 'That username is already in use.',
      });
    }

    const normalizedPhoneCountryCode = /^\+[1-9]\d{0,3}$/.test(String(phoneCountryCode)) ? String(phoneCountryCode) : '';
    const normalizedPhone = String(phone || '').replace(/[^\d+()\-\s]/g, '').trim().slice(0, 30);
    const normalizedBusinessName = sanitizeTextField(businessName, { maxLength: 120, fallback: '' });
    const normalizedBusinessType = sanitizeTextField(businessType, { maxLength: 100, fallback: '' });
    const normalizedBusinessAddress = sanitizeTextField(businessAddress, { maxLength: 300, fallback: '' });
    // Whitelist nested business fields so unexpected keys cannot be injected
    // into the profile document via the raw request body.
    const normalizedBusinessProfile = role === 'provider' ? {
      companyName: normalizedBusinessName,
      industry: normalizedBusinessType,
      location: normalizedBusinessAddress,
      description: sanitizeTextField(businessProfile?.description, { maxLength: 1000, fallback: '' }),
      website: sanitizeTextField(businessProfile?.website, { maxLength: 200, fallback: '' }),
    } : undefined;
    const fullAddress = [streetAddress, barangay, city, province, country, postalCode].map((part) => String(part || '').trim()).filter(Boolean).join(', ');

    // Create user in MongoDB
    const user = await User.create({
      username: normalizedUsername,
      name: normalizedName,
      firstName: normalizedFirstName,
      middleName: normalizedMiddleName,
      lastName: normalizedLastName,
      email: normalizedEmail,
      dateOfBirth: birthTimestamp,
      age,
      gender,
      avatar: normalizedAvatar,
      phone: `${normalizedPhoneCountryCode}${normalizedPhone}`.slice(0, 40),
      phoneCountryCode: normalizedPhoneCountryCode,
      country: sanitizeTextField(country, { maxLength: 100, fallback: '' }),
      province: sanitizeTextField(province, { maxLength: 100, fallback: '' }),
      city: sanitizeTextField(city, { maxLength: 100, fallback: '' }),
      barangay: sanitizeTextField(barangay, { maxLength: 100, fallback: '' }),
      streetAddress: sanitizeTextField(streetAddress, { maxLength: 200, fallback: '' }),
      postalCode: sanitizeTextField(postalCode, { maxLength: 20, fallback: '' }),
      address: fullAddress.slice(0, 300),
      education: sanitizeTextField(education, { maxLength: 100, fallback: '' }),
      occupation: sanitizeTextField(occupation, { maxLength: 120, fallback: '' }),
      employmentStatus: sanitizeTextField(employmentStatus, { maxLength: 80, fallback: '' }),
      bio: sanitizeTextField(bio, { maxLength: 2000, fallback: '' }),
      businessName: role === 'provider' ? normalizedBusinessName : '',
      businessType: role === 'provider' ? normalizedBusinessType : '',
      businessAddress: role === 'provider' ? normalizedBusinessAddress : '',
      businessRegistrationNumber: role === 'provider' ? sanitizeTextField(businessRegistrationNumber, { maxLength: 100, fallback: '' }) : '',
      contactPerson: role === 'provider' ? (sanitizeTextField(contactPerson, { maxLength: 160, fallback: '' }) || normalizedName) : '',
      password,
      role,
      careerTrack: sanitizeTextField(careerTrack, { maxLength: 80, fallback: 'General' }) || 'General',
      businessProfile: normalizedBusinessProfile,
      businessVerification,
    });

    // Auto-create the first company/business from signup details for providers
    if (role === 'provider' && normalizedBusinessName) {
      try {
        const Company = (await import('../models/Company.js')).default;
        const businessTypeLower = normalizedBusinessType.toLowerCase();
        const isCompany = /(corporation|inc\.?|incorporated|corporate|company|ltd\.?|limited|plc|gmbh)/.test(businessTypeLower);
        const organizationType = isCompany ? 'company' : 'business';
        await Company.create({
          providerId: user._id,
          name: normalizedBusinessName,
          category: normalizedBusinessType || (organizationType === 'company' ? 'Company' : 'Business'),
          organizationType,
          location: normalizedBusinessAddress,
          status: 'pending',
          isArchived: false,
        });
      } catch (autoCreateError) {
        console.error('[Auth Error - Auto-create provider company]:', autoCreateError);
      }
    }

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return res.status(409).json({ success: false, message: field === 'username' ? 'That username is already in use.' : 'An account with this email address already exists.' });
    }
    // Surface schema validation problems as a friendly 400 rather than an
    // opaque 500 with an internal Mongoose message.
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Please check the information you entered and try again.',
      });
    }
    console.error('[Auth Error - Register]:', error);
    return res.status(500).json({
      success: false,
      message: 'We could not create your account right now. Please try again in a moment.',
    });
  }
};

// @desc    Authenticate candidate / user & return JWT
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { identifier, email, password, rememberMe = false, deviceToken } = req.body;
    const normalizedIdentifier = normalizeIdentifier(identifier || email);

    if (!normalizedIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email or username and password.',
      });
    }

    const loginKey = getLoginKey(req.ip, normalizedIdentifier);
    const lockedSeconds = getLockout(loginKey);
    if (lockedSeconds) {
      return res.status(429).json({
        success: false,
        message: `Too many failed attempts. Try again in ${lockedSeconds} seconds.`,
        lockoutSeconds: lockedSeconds,
      });
    }

    const user = await findUserByIdentifier(normalizedIdentifier).select('+password');
    if (!user) {
      const failedAttempts = recordFailedLogin(loginKey);
      if (failedAttempts) {
        return res.status(429).json({
          success: false,
          message: `Too many failed attempts. Try again in ${failedAttempts} seconds.`,
          lockoutSeconds: failedAttempts,
        });
      }
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      const failedAttempts = recordFailedLogin(loginKey);
      if (failedAttempts) {
        return res.status(429).json({
          success: false,
          message: `Too many failed attempts. Try again in ${failedAttempts} seconds.`,
          lockoutSeconds: failedAttempts,
        });
      }
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    resetLoginAttempts(loginKey);

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account suspended. Please contact support.',
      });
    }

    if (user.role === 'admin') {
      user.lastActiveAt = new Date();
      await user.save({ validateBeforeSave: false });
      return res.status(200).json({
        success: true,
        message: 'Administrative login successful',
        token: generateToken(user, rememberMe),
        user: user.toJSON(),
      });
    }

    if (isTrustedDevice(user, deviceToken)) {
      user.lastActiveAt = new Date();
      await user.save({ validateBeforeSave: false });
      return res.status(200).json({
        success: true,
        trustedDevice: true,
        message: 'Trusted device recognized. Login successful.',
        token: generateToken(user, rememberMe),
        user: user.toJSON(),
      });
    }

    const code = generateVerificationCode();
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[PathPoint Auth] 🔐 Verification code for ${user.email}: ${code}`);
    }
    const emailResult = await sendLoginCodeEmail(user.email, code);
    user.loginCode = code;
    user.loginCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      requiresCode: true,
      destinationEmail: user.email,
      message: emailResult.consoleOnly
        ? 'Console-only delivery is active. Enter the code shown in the backend console.'
        : `A 6-digit verification code was sent to ${user.email}. Enter it to continue signing in.`,
    });
  } catch (error) {
    console.error('[Auth Error - Login]:', error);
    return res.status(503).json({
      success: false,
      message: error.message || 'Server error while signing in',
    });
  }
};

// @desc    Authenticate administrator or counselor
// @route   POST /api/auth/admin/login
// @access  Public (Enforces Admin Role)
export const adminLogin = async (req, res) => {
  try {
    const { identifier, email, password } = req.body;
    const normalizedIdentifier = normalizeIdentifier(identifier || email);

    if (!normalizedIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide administrator email and password',
      });
    }

    const loginKey = getLoginKey(req.ip, normalizedIdentifier);
    const lockedSeconds = getLockout(loginKey);
    if (lockedSeconds) {
      return res.status(429).json({
        success: false,
        message: `Too many failed attempts. Try again in ${lockedSeconds} seconds.`,
        lockoutSeconds: lockedSeconds,
      });
    }

    const user = await findUserByIdentifier(normalizedIdentifier).select('+password');

    if (!user) {
      const failedAttempts = recordFailedLogin(loginKey);
      if (failedAttempts) {
        return res.status(429).json({
          success: false,
          message: `Too many failed attempts. Try again in ${failedAttempts} seconds.`,
          lockoutSeconds: failedAttempts,
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      const failedAttempts = recordFailedLogin(loginKey);
      if (failedAttempts) {
        return res.status(429).json({
          success: false,
          message: `Too many failed attempts. Try again in ${failedAttempts} seconds.`,
          lockoutSeconds: failedAttempts,
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    resetLoginAttempts(loginKey);

    // Strict role check: candidates cannot log into admin area
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Account lacks administrative privileges.',
      });
    }

    // Update last active
    user.lastActiveAt = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Administrative login successful',
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('[Auth Error - Admin Login]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during admin login',
    });
  }
};

// @desc    Request an email verification code before completing login
// @route   POST /api/auth/request-login-code
// @access  Public
export const requestLoginCode = async (req, res) => {
  try {
    const { identifier, email, password, rememberMe = false, deviceToken } = req.body;
    const normalizedIdentifier = normalizeIdentifier(identifier || email);

    if (!normalizedIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email or username and password.',
      });
    }

    const loginKey = getLoginKey(req.ip, normalizedIdentifier);
    const lockedSeconds = getLockout(loginKey);
    if (lockedSeconds) {
      return res.status(429).json({
        success: false,
        message: `Too many failed attempts. Try again in ${lockedSeconds} seconds.`,
        lockoutSeconds: lockedSeconds,
      });
    }

    const user = await findUserByIdentifier(normalizedIdentifier).select('+password');
    if (!user) {
      const failedAttempts = recordFailedLogin(loginKey);
      if (failedAttempts) {
        return res.status(429).json({
          success: false,
          message: `Too many failed attempts. Try again in ${failedAttempts} seconds.`,
          lockoutSeconds: failedAttempts,
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      const failedAttempts = recordFailedLogin(loginKey);
      if (failedAttempts) {
        return res.status(429).json({
          success: false,
          message: `Too many failed attempts. Try again in ${failedAttempts} seconds.`,
          lockoutSeconds: failedAttempts,
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    resetLoginAttempts(loginKey);

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account suspended. Please contact support.',
      });
    }

    if (user.role === 'admin') {
      user.lastActiveAt = new Date();
      await user.save({ validateBeforeSave: false });

      return res.status(200).json({
        success: true,
        requiresCode: false,
        message: 'Administrator login successful.',
        token: generateToken(user, rememberMe),
        user: user.toJSON(),
      });
    }

    if (isTrustedDevice(user, deviceToken)) {
      user.lastActiveAt = new Date();
      await user.save({ validateBeforeSave: false });

      return res.status(200).json({
        success: true,
        requiresCode: false,
        trustedDevice: true,
        message: 'Trusted device recognized. Login successful.',
        token: generateToken(user, rememberMe),
        user: user.toJSON(),
      });
    }

    const code = generateVerificationCode();
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[PathPoint Auth] 🔐 Request login code for ${user.email}: ${code}`);
    }
    const emailResult = await sendLoginCodeEmail(user.email, code);
    user.loginCode = code;
    user.loginCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      requiresCode: true,
      destinationEmail: user.email,
      message: emailResult.consoleOnly
        ? `Console-only delivery is active. Enter the code shown in the backend console.`
        : `A 6-digit verification code was sent to ${user.email}. Enter it to continue signing in.`,
    });
  } catch (error) {
    console.error('[Auth Error - Request Login Code]:', error);
    return res.status(503).json({
      success: false,
      message: error.message || 'Server error while sending login code',
    });
  }
};

// @desc    Verify the emailed login code and complete sign-in
// @route   POST /api/auth/verify-login-code
// @access  Public
export const verifyLoginCode = async (req, res) => {
  try {
    const { identifier, email, password, code, rememberMe = false, deviceToken } = req.body;
    const normalizedIdentifier = normalizeIdentifier(identifier || email);

    if (!normalizedIdentifier || !password || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email or username, password, and verification code are required.',
      });
    }

    const loginKey = getLoginKey(req.ip, normalizedIdentifier);
    const lockedSeconds = getLockout(loginKey);
    if (lockedSeconds) {
      return res.status(429).json({
        success: false,
        message: `Too many failed attempts. Try again in ${lockedSeconds} seconds.`,
        lockoutSeconds: lockedSeconds,
      });
    }

    const user = await findUserByIdentifier(normalizedIdentifier).select('+password');
    if (!user) {
      const failedAttempts = recordFailedLogin(loginKey);
      if (failedAttempts) {
        return res.status(429).json({
          success: false,
          message: `Too many failed attempts. Try again in ${failedAttempts} seconds.`,
          lockoutSeconds: failedAttempts,
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      const failedAttempts = recordFailedLogin(loginKey);
      if (failedAttempts) {
        return res.status(429).json({
          success: false,
          message: `Too many failed attempts. Try again in ${failedAttempts} seconds.`,
          lockoutSeconds: failedAttempts,
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    resetLoginAttempts(loginKey);

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account suspended. Please contact support.',
      });
    }

    if (!user.loginCode || !user.loginCodeExpiresAt) {
      return res.status(400).json({
        success: false,
        message: 'No verification code is active for this account. Please request a new one.',
      });
    }

    if (user.loginCode !== String(code).trim()) {
      return res.status(400).json({
        success: false,
        message: 'The verification code is incorrect.',
      });
    }

    if (new Date(user.loginCodeExpiresAt).getTime() < Date.now()) {
      user.loginCode = null;
      user.loginCodeExpiresAt = null;
      await user.save({ validateBeforeSave: false });

      return res.status(400).json({
        success: false,
        message: 'This verification code has expired. Please request a new one.',
      });
    }

    user.loginCode = null;
    user.loginCodeExpiresAt = null;
    user.lastActiveAt = new Date();
    await rememberDevice(user, deviceToken);
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user, rememberMe);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      trustedDeviceToken: deviceToken || undefined,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('[Auth Error - Verify Login Code]:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while verifying login code',
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Protected
export const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: req.user.toJSON(),
    });
  } catch (error) {
    console.error('[Auth Error - GetMe]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile',
    });
  }
};

export const getProfileCustomization = async (req, res) => {
  try {
    const payload = serializeProfileCustomization(req.user);
    return res.status(200).json({
      success: true,
      data: payload,
    });
  } catch (error) {
    console.error('[Auth Error - GetProfileCustomization]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile customization settings',
    });
  }
};

export const updateProfileCustomization = async (req, res) => {
  try {
    const { profileInfo, customization, privacySettings } = req.body || {};

    if (profileInfo) {
      const profileData = normalizeProfileInfo(profileInfo);
      req.user.profileInfo = {
        ...normalizeProfileInfo(req.user.profileInfo || {}),
        ...profileData,
        desiredSalary: {
          min: Number(profileData.desiredSalary?.min) || 0,
          max: Number(profileData.desiredSalary?.max) || 0,
          currency: profileData.desiredSalary?.currency || 'USD',
        },
      };
    }

    if (customization) {
      const normalizedCustomization = normalizeCustomization(customization);
      req.user.customization = {
        ...normalizeCustomization(req.user.customization || {}),
        ...normalizedCustomization,
      };
    }

    if (privacySettings) {
      req.user.privacySettings = {
        ...normalizePrivacySettings(req.user.privacySettings || {}),
        ...normalizePrivacySettings(privacySettings),
      };
    }

    await req.user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile customization updated',
      data: serializeProfileCustomization(req.user),
    });
  } catch (error) {
    console.error('[Auth Error - UpdateProfileCustomization]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile customization settings',
    });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const { name, username, phone, address, avatar, bio, education, occupation, employmentStatus, skills, experience, educationHistory, profileInfo } = req.body;
    const normalizedName = String(name ?? req.user.name).trim();
    if (normalizedName.length < 2 || normalizedName.length > 100 || !namePattern.test(normalizedName)) {
      return res.status(400).json({ success: false, message: 'Enter a valid full name' });
    }
    req.user.name = normalizedName;
    if (username !== undefined) {
      const normalizedUsername = normalizeIdentifier(username);
      if (!normalizedUsername) {
        return res.status(400).json({ success: false, message: 'Enter a username to save.' });
      }
      if (!usernamePattern.test(normalizedUsername)) {
        return res.status(400).json({ success: false, message: 'Username must be 3–20 characters using letters, numbers, or underscores.' });
      }
      if (normalizedUsername !== req.user.username) {
        const taken = await User.exists({ username: normalizedUsername, _id: { $ne: req.user._id } });
        if (taken) {
          return res.status(409).json({ success: false, message: 'That username is already taken.' });
        }
        req.user.username = normalizedUsername;
      }
    }
    if (phone !== undefined) req.user.phone = String(phone).trim().slice(0, 40);
    if (address !== undefined) req.user.address = String(address).trim().slice(0, 300);
    if (avatar !== undefined) {
      if (avatar) {
        const match = /^data:image\/(png|jpeg);base64,([a-z\d+/]+=*)$/i.exec(String(avatar));
        if (!match || Buffer.from(match[2], 'base64').length > 3 * 1024 * 1024) throw profileInputError('Profile photo must be a PNG or JPG up to 3 MB.');
        req.user.avatar = String(avatar);
      } else req.user.avatar = '';
    }
    if (bio !== undefined) req.user.bio = sanitizeTextField(bio, { maxLength: 2000 });
    if (education !== undefined) req.user.education = sanitizeTextField(education, { maxLength: 100 });
    if (occupation !== undefined) req.user.occupation = sanitizeTextField(occupation, { maxLength: 120 });
    if (employmentStatus !== undefined) req.user.employmentStatus = sanitizeTextField(employmentStatus, { maxLength: 80 });
    if (skills !== undefined) {
      if (!Array.isArray(skills) || skills.length > 50) throw profileInputError('Add no more than 50 skills.');
      req.user.skills = [...new Set(skills.map((skill) => sanitizeTextField(skill, { maxLength: 80 })).filter(Boolean))];
    }
    if (experience !== undefined) {
      if (!Array.isArray(experience) || experience.length > 20) throw profileInputError('Add no more than 20 experience entries.');
      req.user.experience = experience.map((entry) => ({
        _id: entry._id,
        title: sanitizeTextField(entry.title, { maxLength: 120 }),
        company: sanitizeTextField(entry.company, { maxLength: 120 }),
        location: sanitizeTextField(entry.location, { maxLength: 120 }),
        startDate: entry.startDate ? new Date(entry.startDate) : undefined,
        endDate: entry.endDate ? new Date(entry.endDate) : undefined,
        current: Boolean(entry.current),
        description: sanitizeTextField(entry.description, { maxLength: 2000 }),
      }));
      if (req.user.experience.some((entry) => (entry.startDate && Number.isNaN(entry.startDate.getTime())) || (entry.endDate && Number.isNaN(entry.endDate.getTime())))) {
        throw profileInputError('Experience dates must be valid.');
      }
    }
    if (educationHistory !== undefined) {
      if (!Array.isArray(educationHistory) || educationHistory.length > 20) throw profileInputError('Add no more than 20 education entries.');
      req.user.educationHistory = educationHistory.map((entry) => ({
        _id: entry._id,
        school: sanitizeTextField(entry.school, { maxLength: 160 }),
        degree: sanitizeTextField(entry.degree, { maxLength: 120 }),
        fieldOfStudy: sanitizeTextField(entry.fieldOfStudy, { maxLength: 120 }),
        startDate: entry.startDate ? new Date(entry.startDate) : undefined,
        endDate: entry.endDate ? new Date(entry.endDate) : undefined,
        description: sanitizeTextField(entry.description, { maxLength: 1000 }),
      }));
      if (req.user.educationHistory.some((entry) => (entry.startDate && Number.isNaN(entry.startDate.getTime())) || (entry.endDate && Number.isNaN(entry.endDate.getTime())))) {
        throw profileInputError('Education dates must be valid.');
      }
    }
    if (profileInfo !== undefined) {
      req.user.profileInfo = normalizeProfileInfo({ ...normalizeProfileInfo(req.user.profileInfo || {}), ...profileInfo });
    }
    await req.user.save();
    return res.status(200).json({ success: true, message: 'Profile updated', user: req.user.toJSON() });
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || error.keyValue || {})[0];
      return res.status(409).json({
        success: false,
        message: duplicateField === 'username' ? 'That username is already taken.' : 'That value is already in use.',
      });
    }
    if (error.statusCode || error.name === 'ValidationError') return res.status(error.statusCode || 400).json({ success: false, message: error.message });
    console.error('[Auth Error - Update Profile]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

export const getMyResume = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+resume.documentData');
    if (!user?.resume?.documentData) return res.status(404).json({ success: false, message: 'Resume not found' });
    const detected = await fileTypeFromBuffer(user.resume.documentData);
    if (!detected || detected.mime !== user.resume.mimeType) return res.status(404).json({ success: false, message: 'Resume not found' });
    res.set('Content-Type', user.resume.mimeType);
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Content-Disposition', `${req.query.inline === 'true' ? 'inline' : 'attachment'}; filename="${String(user.resume.fileName || 'resume').replace(/[\r\n"\\]/g, '_')}"`);
    return res.send(user.resume.documentData);
  } catch (error) {
    console.error('[Auth Error - Resume Download]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve resume' });
  }
};

export const updateMyResume = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Choose a PDF, JPG, or PNG resume.' });
  try {
    const detected = await fileTypeFromBuffer(req.file.buffer);
    if (!detected || !['application/pdf', 'image/jpeg', 'image/png'].includes(detected.mime) || detected.mime !== req.file.mimetype) {
      return res.status(400).json({ success: false, message: 'Resume content must be a valid PDF, JPG, or PNG.' });
    }
    req.user.resume = {
      fileName: String(req.file.originalname || 'resume').replace(/[\\/\r\n]/g, '_').slice(0, 255),
      mimeType: detected.mime,
      fileSize: req.file.size,
      uploadedAt: new Date(),
      documentData: req.file.buffer,
    };
    await req.user.save();
    return res.status(200).json({
      success: true,
      message: 'Resume saved to your profile',
      resume: {
        fileName: req.user.resume.fileName,
        mimeType: req.user.resume.mimeType,
        fileSize: req.user.resume.fileSize,
        uploadedAt: req.user.resume.uploadedAt,
      },
    });
  } catch (error) {
    console.error('[Auth Error - Resume Upload]:', error);
    return res.status(500).json({ success: false, message: 'Failed to save resume' });
  }
};

export const deleteMyResume = async (req, res) => {
  try {
    req.user.resume = undefined;
    await req.user.save();
    return res.status(200).json({ success: true, message: 'Resume removed from your profile' });
  } catch (error) {
    console.error('[Auth Error - Resume Delete]:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove resume' });
  }
};

// @desc    Request a password reset code for a registered email
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const identifier = normalizeIdentifier(req.body.identifier || req.body.email);
    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email address or username.',
      });
    }

    const user = await findUserByIdentifier(identifier);

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If the account exists, a password reset code has been sent to its registered email.',
      });
    }

    const resetCode = String(crypto.randomInt(100000, 1000000));
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[PathPoint Auth] 🔐 Password reset code for ${user.email}: ${resetCode}`);
    }
    const delivery = await sendPasswordResetCodeEmail(user.email, resetCode);

    user.resetCode = resetCode;
    user.resetCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: 'If the account exists, a password reset code has been sent to its registered email.',
      deliveryMode: delivery.consoleOnly ? 'console' : 'email',
    });
  } catch (error) {
    console.error('[Auth Error - Forgot Password]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to send the password reset email. Please try again.',
    });
  }
};

// @desc    Verify the reset code for a user
// @route   POST /api/auth/verify-reset-code
// @access  Public
export const verifyResetCode = async (req, res) => {
  try {
    const identifier = normalizeIdentifier(req.body.identifier || req.body.email);
    const { code } = req.body;

    if (!identifier || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email or username and verification code are required.',
      });
    }

    const user = await findUserByIdentifier(identifier);
    if (!user || !user.resetCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset code.',
      });
    }

    if (user.resetCode !== String(code).trim()) {
      return res.status(400).json({
        success: false,
        message: 'The verification code does not match.',
      });
    }

    if (user.resetCodeExpiresAt && new Date(user.resetCodeExpiresAt).getTime() < Date.now()) {
      user.resetCode = null;
      user.resetCodeExpiresAt = null;
      await user.save({ validateBeforeSave: false });

      return res.status(400).json({
        success: false,
        message: 'This verification code has expired. Please request a new one.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Verification code accepted.',
    });
  } catch (error) {
    console.error('[Auth Error - Verify Reset Code]:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error verifying reset code',
    });
  }
};

// @desc    Reset a password using a valid code
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const identifier = normalizeIdentifier(req.body.identifier || req.body.email);
    const { code, newPassword } = req.body;

    if (!identifier || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email or username, verification code, and new password are required.',
      });
    }

    if (!passwordMeetsRules(String(newPassword))) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters and include uppercase, lowercase, and numeric characters.' });
    }

    if (Buffer.byteLength(String(newPassword), 'utf8') > MAX_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `New password cannot exceed ${MAX_PASSWORD_LENGTH} characters`,
      });
    }

    const user = await findUserByIdentifier(identifier);
    if (!user || !user.resetCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing password reset request.',
      });
    }

    if (user.resetCode !== String(code).trim()) {
      return res.status(400).json({
        success: false,
        message: 'The verification code is incorrect.',
      });
    }

    if (user.resetCodeExpiresAt && new Date(user.resetCodeExpiresAt).getTime() < Date.now()) {
      user.resetCode = null;
      user.resetCodeExpiresAt = null;
      await user.save({ validateBeforeSave: false });

      return res.status(400).json({
        success: false,
        message: 'This verification code has expired. Please request a new one.',
      });
    }

    user.password = newPassword;
    user.resetCode = null;
    user.resetCodeExpiresAt = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Your password has been reset successfully. You can now sign in.',
    });
  } catch (error) {
    console.error('[Auth Error - Reset Password]:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error resetting password',
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Protected
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password',
      });
    }

    if (!passwordMeetsRules(String(newPassword))) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters and include uppercase, lowercase, and numeric characters.',
      });
    }

    if (Buffer.byteLength(newPassword, 'utf8') > MAX_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `New password cannot exceed ${MAX_PASSWORD_LENGTH} characters`,
      });
    }

    const user = await User.findById(req.user.id).select('+password');
    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('[Auth Error - Change Password]:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating password',
    });
  }
};
