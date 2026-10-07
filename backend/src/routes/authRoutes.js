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
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/request-login-code', requestLoginCode);
router.post('/verify-login-code', verifyLoginCode);
router.post('/admin/login', adminLogin);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateMyProfile);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-code', verifyResetCode);
router.post('/reset-password', resetPassword);
router.put('/password', protect, changePassword);
router.post('/logout', (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

export default router;
