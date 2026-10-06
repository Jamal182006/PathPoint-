import express from 'express';
import { getProviderDirectory, submitBusinessVerificationDocument, updateMyBusinessProfile } from '../controllers/providerController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getProviderDirectory);
router.put('/me', protect, updateMyBusinessProfile);
router.post('/me/verification-document', protect, submitBusinessVerificationDocument);

export default router;