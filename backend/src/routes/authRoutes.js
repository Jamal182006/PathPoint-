import express from 'express';
import {
  register,
  login,
  adminLogin,
  getMe,
  updateMyProfile,
  requestLoginCode,
  verifyLoginCode,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  changePassword,
  checkUsernameAvailability,
  getMyResume,
  updateMyResume,
  deleteMyResume,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { profileResumeUpload } from '../utils/profileUpload.js';
import { createRateLimiter } from '../utils/rateLimiter.js';

const router = express.Router();

// Best-effort throttling for unauthenticated endpoints. These protect the
// signup, username lookup, and email-code flows from scripted abuse.
const registerLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 12, keyPrefix: 'register' });
const usernameLimiter = createRateLimiter({ windowMs: 5 * 60 * 1000, max: 80, keyPrefix: 'username' });
const codeLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 25, keyPrefix: 'authcode' });

router.post('/register', registerLimiter, register);
router.get('/username-availability', usernameLimiter, checkUsernameAvailability);
router.post('/login', login);
router.post('/request-login-code', codeLimiter, requestLoginCode);
router.post('/verify-login-code', codeLimiter, verifyLoginCode);
router.post('/admin/login', adminLogin);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateMyProfile);
router.get('/profile/resume', protect, getMyResume);
router.put('/profile/resume', protect, profileResumeUpload, updateMyResume);
router.delete('/profile/resume', protect, deleteMyResume);
router.post('/forgot-password', codeLimiter, forgotPassword);
router.post('/verify-reset-code', codeLimiter, verifyResetCode);
router.post('/reset-password', codeLimiter, resetPassword);
router.put('/password', protect, changePassword);
router.post('/logout', (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

export default router;
