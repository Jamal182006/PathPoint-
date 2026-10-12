import express from 'express';
import { applicantOnly, protect } from '../middleware/auth.js';
import { listPins, pinItem, unpinItem } from '../controllers/pinController.js';

const router = express.Router();
router.use(protect, applicantOnly);
router.get('/', listPins);
router.post('/', pinItem);
router.delete('/:itemType/:itemId', unpinItem);

export default router;
