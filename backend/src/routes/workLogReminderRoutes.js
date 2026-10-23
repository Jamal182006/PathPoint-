import express from 'express';
import { getMyWorkLogReminder, saveMyWorkLogReminder } from '../controllers/workLogReminderController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);
router.get('/', getMyWorkLogReminder);
router.put('/', saveMyWorkLogReminder);

export default router;
