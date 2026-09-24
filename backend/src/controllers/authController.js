import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const namePattern = /^[a-zA-Z][a-zA-Z .'-]*$/;

const getLoginKey = (req, email) => `${req.ip}:${email.toLowerCase().trim()}`;

const getLockout = (key) => {
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

const recordFailedLogin = (key) => {
  const attempt = loginAttempts.get(key) || { count: 0 };
  attempt.count += 1;

  if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
    attempt.lockedUntil = Date.now() + LOCKOUT_MS;
  }

  loginAttempts.set(key, attempt);
  return attempt.lockedUntil ? Math.ceil((attempt.lockedUntil - Date.now()) / 1000) : null;
};

// Helper to sign JWT
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id || user._id,
      role: user.role,
    },
    process.env.JWT_SECRET || 'pathpoint_jwt_super_secret_key_2026_production_grade',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

// @desc    Register a new user / candidate
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { name, email, password, role = 'user', careerTrack = 'General' } = req.body;
    const normalizedName = name?.trim();
    const normalizedEmail = email?.toLowerCase().trim();

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

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must include an uppercase letter, lowercase letter, and number',
      });
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
      password,
      role: role === 'admin' ? 'admin' : 'user',
      careerTrack: careerTrack || 'General',
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
};

// @desc    Authenticate administrator or counselor
// @route   POST /api/auth/admin/login
// @access  Public (Enforces Admin Role)
export const adminLogin = async (req, res) => {
  try {
    const { email, password, securityCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide administrator email and password',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid administrator credentials',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid administrator credentials',
      });
    }

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

    const resetCode = String(Math.floor(100000 + Math.random() * 900000));
    user.resetCode = resetCode;
    user.resetCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    console.log(`[Password Reset] Code for ${normalizedEmail}: ${resetCode}`);

    return res.status(200).json({
      success: true,
      message: `A 6-digit verification code has been sent to ${normalizedEmail}.`,
      code: process.env.NODE_ENV !== 'production' ? resetCode : undefined,
    });
  } catch (error) {
    console.error('[Auth Error - Forgot Password]:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error processing password reset request',
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
