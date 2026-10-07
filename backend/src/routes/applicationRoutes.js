import express from 'express';
import {
  getApplications,
  getApplicationById,
  createApplication,
  updateApplication,
  updateApplicationStatus,
  deleteApplication,
  uploadResume,
} from '../controllers/applicationController.js';
import { applicantOnly, protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect, applicantOnly); // Personal job-tracker data is applicant-only.

router.route('/')
  .get(getApplications)
  .post(createApplication);

router.route('/:id')
  .get(getApplicationById)
  .put(updateApplication)
  .delete(deleteApplication);

router.post('/:id/resume', uploadResume);
router.patch('/:id/status', updateApplicationStatus);

export default router;
