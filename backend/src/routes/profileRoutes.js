import express from 'express';
import { getProfileCustomization, updateProfileCustomization } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/profile', protect, getProfileCustomization);
router.patch('/profile/customize', protect, updateProfileCustomization);

export default router;
