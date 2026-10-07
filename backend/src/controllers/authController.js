import jwt from 'jsonwebtoken';
import crypto from 'crypto';
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
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const namePattern = /^[a-zA-Z][a-zA-Z .'-]*$/;

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
      name,
      email,
      phone = '',
      address = '',
      password,
      role = 'user',
      careerTrack = 'General',
      businessProfile = {},
      businessDocument,
    } = req.body;
    const normalizedName = name?.trim();
    const normalizedEmail = email?.toLowerCase().trim();

    if (!['user', 'provider'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Account type must be user or provider',
      });
    }

    if (!normalizedName || !normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full name, email, and password',
      });
    }

    if (normalizedName.length < 2 || normalizedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Name must be between 2 and 100 characters',
      });
    }

    if (!namePattern.test(normalizedName)) {
      return res.status(400).json({
        success: false,
        message: 'Name may only contain letters, spaces, apostrophes, periods, and hyphens',
      });
    }

    if (!emailPattern.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters`,
      });
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must include an uppercase letter, lowercase letter, and number',
      });
    }

    if (role === 'provider' && (!businessProfile.companyName?.trim() || !businessProfile.industry?.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Providers must provide a business name and industry',
      });
    }

    let businessVerification;
    if (role === 'provider') {
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

    // Treat the full name as the username and prevent case-insensitive duplicates.
    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { name: { $regex: `^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
      ],
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === normalizedEmail
          ? 'An account with this email address already exists. Please sign in.'
          : 'That username is already in use. Please choose another name.',
      });
    }

    // Create user in MongoDB
    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      phone: String(phone).trim().slice(0, 40),
      address: String(address).trim().slice(0, 300),
      password,
      role,
      careerTrack: careerTrack || 'General',
      businessProfile: role === 'provider' ? businessProfile : undefined,
      businessVerification,
    });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('[Auth Error - Register]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during registration',
    });
  }
};

// @desc    Authenticate candidate / user & return JWT
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  return requestLoginCode(req, res);
  /*
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter both email and password',
      });
    }

    if (!emailPattern.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const loginKey = getLoginKey(req, normalizedEmail);
    const lockedSeconds = getLockout(loginKey);
    if (lockedSeconds) {
      return res.status(429).json({
        success: false,
        message: `Too many failed attempts. Try again in ${lockedSeconds} seconds.`,
        lockoutSeconds: lockedSeconds,
      });
    }

    // Find user in MongoDB and explicitly select the password
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

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
        message: 'Invalid email or password',
      });
    }

    // Verify password match using bcrypt
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
        message: 'Invalid email or password',
      });
    }

    loginAttempts.delete(loginKey);

    // Verify account status
    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account suspended. Please contact career counselor support.',
      });
    }

    // Update last active timestamp
    user.lastActiveAt = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('[Auth Error - Login]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during login',
    });
  }
  */
};

// @desc    Authenticate administrator or counselor
// @route   POST /api/auth/admin/login
// @access  Public (Enforces Admin Role)
export const adminLogin = async (req, res) => {
  try {
    const { email, password, securityCode } = req.body;
    const normalizedEmail = String(email || '').toLowerCase().trim();

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide administrator email and password',
      });
    }

    const loginKey = getLoginKey(req.ip, normalizedEmail);
    const lockedSeconds = getLockout(loginKey);
    if (lockedSeconds) {
      return res.status(429).json({
        success: false,
        message: `Too many failed attempts. Try again in ${lockedSeconds} seconds.`,
        lockoutSeconds: lockedSeconds,
      });
    }

    const user = await User.findOne({ email: normalizedEmail }).select('+password');

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
        message: 'Invalid administrator credentials',
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
        message: 'Invalid administrator credentials',
      });
    }

    resetLoginAttempts(loginKey);

    // Strict role check: candidates cannot log into counselor suite
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
    const { email, password, rememberMe = false, deviceToken } = req.body;
    const normalizedEmail = String(email || '').toLowerCase().trim();

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email and password',
      });
    }

    const loginKey = getLoginKey(req.ip, normalizedEmail);
    const lockedSeconds = getLockout(loginKey);
    if (lockedSeconds) {
      return res.status(429).json({
        success: false,
        message: `Too many failed attempts. Try again in ${lockedSeconds} seconds.`,
        lockoutSeconds: lockedSeconds,
      });
    }

    const user = await User.findOne({ email: normalizedEmail }).select('+password');
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
        message: 'Invalid email or password',
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
        message: 'Invalid email or password',
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
    const emailResult = await sendLoginCodeEmail(normalizedEmail, code);
    user.loginCode = code;
    user.loginCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      requiresCode: true,
      message: emailResult.consoleOnly
        ? `Console-only delivery is active. Enter the code shown in the backend console.`
        : `A 6-digit verification code was sent to ${normalizedEmail}. Enter it to continue signing in.`,
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
    const { email, password, code, rememberMe = false, deviceToken } = req.body;
    const normalizedEmail = String(email || '').toLowerCase().trim();

    if (!normalizedEmail || !password || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and verification code are required',
      });
    }

    const loginKey = getLoginKey(req.ip, normalizedEmail);
    const lockedSeconds = getLockout(loginKey);
    if (lockedSeconds) {
      return res.status(429).json({
        success: false,
        message: `Too many failed attempts. Try again in ${lockedSeconds} seconds.`,
        lockoutSeconds: lockedSeconds,
      });
    }

    const user = await User.findOne({ email: normalizedEmail }).select('+password');
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
        message: 'Invalid email or password',
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
        message: 'Invalid email or password',
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

export const updateMyProfile = async (req, res) => {
  try {
    const { name, phone = '', address = '' } = req.body;
    const normalizedName = String(name ?? req.user.name).trim();
    if (normalizedName.length < 2 || normalizedName.length > 100 || !namePattern.test(normalizedName)) {
      return res.status(400).json({ success: false, message: 'Enter a valid full name' });
    }
    req.user.name = normalizedName;
    req.user.phone = String(phone).trim().slice(0, 40);
    req.user.address = String(address).trim().slice(0, 300);
    await req.user.save();
    return res.status(200).json({ success: true, message: 'Profile updated', user: req.user.toJSON() });
  } catch (error) {
    console.error('[Auth Error - Update Profile]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

// @desc    Request a password reset code for a registered email
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address',
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If the email exists in our records, a reset code has been sent.',
      });
    }

    const resetCode = String(crypto.randomInt(100000, 1000000));
    const delivery = await sendPasswordResetCodeEmail(normalizedEmail, resetCode);

    user.resetCode = resetCode;
    user.resetCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: `A 6-digit verification code has been sent to ${normalizedEmail}.`,
      ...(delivery.consoleOnly && process.env.NODE_ENV !== 'production' ? { code: resetCode } : {}),
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
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required',
      });
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
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
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, verification code, and new password are required',
      });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    if (Buffer.byteLength(String(newPassword), 'utf8') > MAX_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `New password cannot exceed ${MAX_PASSWORD_LENGTH} characters`,
      });
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
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

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
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
