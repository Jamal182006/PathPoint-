import express from 'express';
import { applicantOnly, approvedProviderOnly, protect } from '../middleware/auth.js';
import { archiveProviderJob, createJob, getProviderJob, getProviderJobs, getPublicJob, getPublicJobs, updateProviderJob, updateProviderJobStatus } from '../controllers/jobController.js';
import { downloadJobApplicationResponse, getApplicantJobApplication, getApplicantJobApplications, getProviderJobApplications, submitJobApplication, updateProviderJobApplication } from '../controllers/jobApplicationController.js';
import { jobApplicationUpload } from '../utils/jobUpload.js';

const router = express.Router();

router.get('/', getPublicJobs);
router.get('/applications/mine', protect, getApplicantJobApplications);
router.get('/applications/:applicationId', protect, getApplicantJobApplication);
router.get('/applications/:applicationId/responses/:responseId/file', protect, downloadJobApplicationResponse);
router.post('/:jobId/applications', protect, applicantOnly, jobApplicationUpload, submitJobApplication);
router.patch('/applications/:applicationId/status', protect, approvedProviderOnly, updateProviderJobApplication);
router.get('/provider/listings', protect, approvedProviderOnly, getProviderJobs);
router.post('/provider/companies/:companyId/listings', protect, approvedProviderOnly, createJob);
router.get('/provider/listings/:jobId/applications', protect, approvedProviderOnly, getProviderJobApplications);
router.get('/provider/listings/:jobId', protect, approvedProviderOnly, getProviderJob);
router.put('/provider/listings/:jobId', protect, approvedProviderOnly, updateProviderJob);
router.patch('/provider/listings/:jobId/status', protect, approvedProviderOnly, updateProviderJobStatus);
router.delete('/provider/listings/:jobId', protect, approvedProviderOnly, archiveProviderJob);
router.get('/:jobId', getPublicJob);

export default router;
