import express from 'express';
import { getProviderDirectory, submitBusinessVerificationDocument, updateMyBusinessProfile } from '../controllers/providerController.js';
import { approvedProviderOnly, protect } from '../middleware/auth.js';
import { archiveMyCompany, createCompany, getMyCompanies, getMyCompany, updateMyCompany } from '../controllers/companyController.js';
import { getProviderCompanyApplications } from '../controllers/companyApplicationController.js';

const router = express.Router();

router.get('/', getProviderDirectory);
router.put('/me', protect, updateMyBusinessProfile);
router.post('/me/verification-document', protect, submitBusinessVerificationDocument);
router.route('/me/companies')
	.get(protect, approvedProviderOnly, getMyCompanies)
	.post(protect, approvedProviderOnly, createCompany);
router.route('/me/companies/:companyId')
	.get(protect, approvedProviderOnly, getMyCompany)
	.put(protect, approvedProviderOnly, updateMyCompany)
	.delete(protect, approvedProviderOnly, archiveMyCompany);
router.get('/me/companies/:companyId/applications', protect, approvedProviderOnly, getProviderCompanyApplications);

export default router;