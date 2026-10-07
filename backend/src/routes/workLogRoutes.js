import express from 'express';
import { applicantOnly, protect } from '../middleware/auth.js';
import { createWorkLog, deleteWorkLog, getWorkLog, listWorkLogs, updateWorkLog } from '../controllers/workLogController.js';

const router = express.Router();
router.use(protect, applicantOnly);
router.route('/').get(listWorkLogs).post(createWorkLog);
router.route('/:id').get(getWorkLog).put(updateWorkLog).delete(deleteWorkLog);

export default router;
