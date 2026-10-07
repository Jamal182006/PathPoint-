import express from 'express';
import { applicantOnly, protect } from '../middleware/auth.js';
import { getPublicCompanies, getPublicCompany } from '../controllers/companyController.js';
import { downloadCompanyApplicationFile, submitCompanyApplication, getMyCompanyApplications, getMyCompanyApplication, updateCompanyApplicationStatus } from '../controllers/companyApplicationController.js';
import { companyApplicationUpload } from '../utils/companyUpload.js';

const router = express.Router();

router.get('/', getPublicCompanies);
router.get('/applications/mine', protect, getMyCompanyApplications);
router.get('/applications/:applicationId', protect, getMyCompanyApplication);
router.get('/applications/:applicationId/files/:fileId', protect, downloadCompanyApplicationFile);
router.post('/:companyId/applications', protect, applicantOnly, companyApplicationUpload, submitCompanyApplication);
router.patch('/applications/:applicationId/status', protect, updateCompanyApplicationStatus);
router.get('/:companyId', getPublicCompany);

export default router;