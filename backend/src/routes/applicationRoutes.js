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
import { deleteUserApplication, listUserApplications, updateUserApplication } from '../controllers/userApplicationController.js';
import { importApplications } from '../controllers/applicationImportController.js';

const router = express.Router();

router.use(protect, applicantOnly); // Personal job-tracker data is applicant-only.

router.get('/submissions', listUserApplications);
router.patch('/submissions/:kind/:id', updateUserApplication);
router.delete('/submissions/:kind/:id', deleteUserApplication);
router.post('/import', importApplications);

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
