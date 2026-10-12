import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';
import Application from '../models/Application.js';
import Company from '../models/Company.js';
import CompanyApplication from '../models/CompanyApplication.js';
import JobListing from '../models/JobListing.js';
import JobApplication from '../models/JobApplication.js';
import WorkLog from '../models/WorkLog.js';
import Notification from '../models/Notification.js';
import ActivityLog from '../models/ActivityLog.js';
import { createCompany, getMyCompany, getPublicCompanies, getPublicCompany } from './companyController.js';
import {
  getProviderCompanyApplications,
  downloadCompanyApplicationFile,
  submitCompanyApplication,
  updateCompanyApplicationStatus,
} from './companyApplicationController.js';
import { getCompanyUploadDirectory } from '../utils/companyUpload.js';
import { migrateLegacyProviderCompany } from '../utils/legacyCompanyMigration.js';
import { adminListJobs, adminReviewJob, createJob, getProviderJobs, getPublicJobs, updateProviderJob, updateProviderJobStatus } from './jobController.js';
import { getApplicantJobApplicationDraft, getApplicantJobApplications, getProviderJobApplications, saveJobApplicationDraft, submitJobApplication, updateProviderJobApplication } from './jobApplicationController.js';
import { createWorkLog, listWorkLogs } from './workLogController.js';
import { updateApplication as updateTrackerApplication } from './applicationController.js';
import adminRoutes from '../routes/adminRoutes.js';
import { listMyNotifications, markNotificationRead } from './notificationController.js';

let memoryServer;
const testFilePaths = new Set();

const response = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
  set() { return this; },
  sendFile(filePath) { this.filePath = filePath; return this; },
});

const createUser = (role, name, verificationStatus, businessProfile) => User.create({
  name,
  email: `${name.toLowerCase().replace(/\s+/g, '.')}-${randomUUID()}@example.com`,
  password: 'Testpass1',
  role,
  status: 'active',
  businessVerification: role === 'provider' ? { status: verificationStatus } : undefined,
  businessProfile,
});

const createPdfUpload = async (requirementId) => {
  await fs.mkdir(getCompanyUploadDirectory(), { recursive: true });
  const filename = `${randomUUID()}.pdf`;
  const filePath = path.join(getCompanyUploadDirectory(), filename);
  const buffer = Buffer.from('%PDF-1.7\nTest resume content');
  await fs.writeFile(filePath, buffer);
  testFilePaths.add(filePath);
  return {
    fieldname: String(requirementId),
    originalname: 'resume.pdf',
    mimetype: 'application/pdf',
    filename,
    path: filePath,
    size: buffer.length,
  };
};

const adminRouteHandler = (routePath, method) => {
  const routeLayer = adminRoutes.stack.find((layer) => layer.route?.path === routePath && layer.route.methods[method]);
  return routeLayer.route.stack.find((layer) => layer.method === method).handle;
};

before(async () => {
  memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri());
  await Promise.all([User, Application, Company, CompanyApplication, JobListing, JobApplication, WorkLog, Notification, ActivityLog].map((model) => model.createIndexes()));
});

beforeEach(async () => {
  await Promise.all([User, Application, Company, CompanyApplication, JobListing, JobApplication, WorkLog, Notification, ActivityLog].map((model) => model.deleteMany({})));
});

after(async () => {
  await Promise.all([...testFilePaths].map((filePath) => fs.unlink(filePath).catch(() => {})));
  await mongoose.disconnect();
  await memoryServer.stop();
});

test('providers can only read and manage their own company records', async () => {
  const provider = await createUser('provider', 'Provider One', 'approved');
  const otherProvider = await createUser('provider', 'Provider Two', 'approved');
  const createResponse = response();

  await createCompany({
    user: provider,
    body: {
      name: 'Northwind Studio',
      category: 'Design',
      size: '11-50 employees',
      website: 'https://northwind.example',
      locations: ['Oakland', 'San Francisco'],
      requirements: [{ type: 'document', title: 'Resume', isRequired: true, allowedFileTypes: ['application/pdf'] }],
    },
  }, createResponse);

  assert.equal(createResponse.statusCode, 201);
  assert.equal(createResponse.body.data.status, 'pending');
  assert.equal(createResponse.body.data.organizationType, 'company');
  assert.deepEqual(createResponse.body.data.locations, ['Oakland', 'San Francisco']);
  assert.equal(createResponse.body.data.size, '11-50 employees');
  assert.equal(createResponse.body.data.website, 'https://northwind.example');
  const companyId = String(createResponse.body.data._id);
  const ownerResponse = response();
  await getMyCompany({ user: provider, params: { companyId } }, ownerResponse);
  assert.equal(ownerResponse.statusCode, 200);

  const unauthorizedResponse = response();
  await getMyCompany({ user: otherProvider, params: { companyId } }, unauthorizedResponse);
  assert.equal(unauthorizedResponse.statusCode, 404);

  const businessResponse = response();
  await createCompany({ user: provider, body: { organizationType: 'business', name: 'Riverside Market', category: 'Retail' } }, businessResponse);
  assert.equal(businessResponse.statusCode, 201);
  assert.equal(businessResponse.body.data.organizationType, 'business');

  const invalidTypeResponse = response();
  await createCompany({ user: provider, body: { organizationType: 'nonprofit', name: 'Invalid Listing', category: 'Other' } }, invalidTypeResponse);
  assert.equal(invalidTypeResponse.statusCode, 400);
});

test('legacy provider migration defaults to pending, preserves approved status, and is idempotent', async () => {
  const legacyProvider = await User.create({
    name: 'Legacy Business',
    email: `legacy-${randomUUID()}@example.com`,
    password: 'Testpass1',
    role: 'provider',
    businessProfile: { companyName: 'Legacy Studio', industry: 'Design', location: 'Remote' },
  });
  const approvedProvider = await createUser('provider', 'Approved Legacy', 'approved', {
    companyName: 'Approved Studio',
    industry: 'Technology',
  });

  const firstMigration = await migrateLegacyProviderCompany(legacyProvider);
  const repeatMigration = await migrateLegacyProviderCompany(legacyProvider);
  const approvedMigration = await migrateLegacyProviderCompany(approvedProvider);

  assert.equal(firstMigration.created, true);
  assert.equal(repeatMigration.created, false);
  assert.equal(approvedMigration.created, true);
  assert.equal(legacyProvider.businessVerification.status, 'pending');
  assert.equal(await Company.countDocuments({ providerId: legacyProvider._id }), 1);
  assert.equal((await Company.findOne({ providerId: legacyProvider._id })).status, 'pending');
  assert.equal((await Company.findOne({ providerId: approvedProvider._id })).status, 'approved');
});

test('public directory and applications include pending listings from verified providers', async () => {
  const verifiedProvider = await createUser('provider', 'Public Provider', 'approved');
  const pendingProvider = await createUser('provider', 'Pending Provider', 'pending');
  const [approvedCompany, pendingCompany] = await Company.create([
    { providerId: verifiedProvider._id, name: 'Approved Listing', category: 'Technology', status: 'approved' },
    { providerId: verifiedProvider._id, name: 'Pending Listing', category: 'Technology', status: 'pending' },
    { providerId: verifiedProvider._id, name: 'Rejected Listing', category: 'Technology', status: 'rejected' },
    { providerId: pendingProvider._id, name: 'Blocked Listing', category: 'Technology', status: 'approved' },
  ]);
  await CompanyApplication.create({ companyId: approvedCompany._id, applicantId: (await createUser('user', 'Directory Applicant'))._id });

  const res = response();
  await getPublicCompanies({}, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.count, 2);
  assert.deepEqual(new Set(res.body.data.map(({ name }) => name)), new Set(['Approved Listing', 'Pending Listing']));
  assert.equal(res.body.data.find(({ name }) => name === 'Approved Listing').applicantCount, 1);

  const pendingDetail = response();
  await getPublicCompany({ params: { companyId: String(pendingCompany._id) } }, pendingDetail);
  assert.equal(pendingDetail.statusCode, 200);

  const applicant = await createUser('user', 'Pending Listing Applicant');
  const application = response();
  await submitCompanyApplication({ user: applicant, params: { companyId: String(pendingCompany._id) }, body: {}, files: [] }, application);
  assert.equal(application.statusCode, 201);
  assert.equal(String(application.body.data.companyId), String(pendingCompany._id));
});

test('typed application answers, change requests, resubmission, and notifications stay connected', async () => {
  const provider = await createUser('provider', 'Workflow Provider', 'approved');
  const applicant = await createUser('user', 'Workflow Applicant');
  const otherApplicant = await createUser('user', 'Other Workflow Applicant');
  const company = await Company.create({
    providerId: provider._id,
    name: 'Workflow Company',
    category: 'Technology',
    status: 'approved',
    requirements: [
      { type: 'text', title: 'Experience', isRequired: true, order: 0 },
      { type: 'select', title: 'Work mode', isRequired: true, options: ['Remote', 'On-site'], order: 1 },
    ],
  });
  const requirements = company.requirements;
  const missingAnswer = response();
  await submitCompanyApplication({
    user: applicant,
    params: { companyId: String(company._id) },
    body: { formData: JSON.stringify({ [requirements[0]._id]: 'Three years' }) },
    files: [],
  }, missingAnswer);
  assert.equal(missingAnswer.statusCode, 400);
  assert.match(missingAnswer.body.message, /work mode is required/i);

  const submitted = response();
  await submitCompanyApplication({
    user: applicant,
    params: { companyId: String(company._id) },
    body: { formData: JSON.stringify({ [requirements[0]._id]: 'Three years', [requirements[1]._id]: 'Remote' }) },
    files: [],
  }, submitted);
  assert.equal(submitted.statusCode, 201);
  const applicationId = submitted.body.data.id;
  assert.equal(submitted.body.data.formData[String(requirements[1]._id)], 'Remote');

  const missingComment = response();
  await updateCompanyApplicationStatus({
    user: provider,
    params: { applicationId },
    body: { status: 'changes_requested' },
  }, missingComment);
  assert.equal(missingComment.statusCode, 400);

  const changeRequest = response();
  await updateCompanyApplicationStatus({
    user: provider,
    params: { applicationId },
    body: { status: 'changes_requested', providerNote: 'Please add more detail.' },
  }, changeRequest);
  assert.equal(changeRequest.statusCode, 200);
  assert.equal(changeRequest.body.data.status, 'changes_requested');

  const resubmitted = response();
  await submitCompanyApplication({
    user: applicant,
    params: { companyId: String(company._id) },
    body: { formData: JSON.stringify({ [requirements[0]._id]: 'Five years', [requirements[1]._id]: 'On-site' }) },
    files: [],
  }, resubmitted);
  assert.equal(resubmitted.statusCode, 200);
  assert.equal(resubmitted.body.data.id, applicationId);
  assert.equal(resubmitted.body.data.status, 'submitted');
  assert.equal(resubmitted.body.data.formData[String(requirements[0]._id)], 'Five years');

  const applicantNotifications = response();
  await listMyNotifications({ user: applicant }, applicantNotifications);
  assert.equal(applicantNotifications.body.unreadCount, 1);
  assert.match(applicantNotifications.body.data[0].message, /changes requested/i);
  const otherNotifications = response();
  await listMyNotifications({ user: otherApplicant }, otherNotifications);
  assert.equal(otherNotifications.body.unreadCount, 0);

  const crossUserRead = response();
  await markNotificationRead({ user: otherApplicant, params: { notificationId: String(applicantNotifications.body.data[0]._id) } }, crossUserRead);
  assert.equal(crossUserRead.statusCode, 404);
  assert.ok(await ActivityLog.countDocuments({ targetType: 'companyApplication', targetId: applicationId }));
});

test('applications require documents, validate files, prevent duplicates, and restrict provider actions', async () => {
  const provider = await createUser('provider', 'Verified Provider', 'approved');
  const otherProvider = await createUser('provider', 'Unrelated Provider', 'approved');
  const applicant = await createUser('user', 'Applicant User');
  const company = await Company.create({
    providerId: provider._id,
    name: 'Northwind Studio',
    category: 'Design',
    status: 'approved',
    requirements: [{
      type: 'document',
      title: 'Resume',
      isRequired: true,
      allowedFileTypes: ['application/pdf'],
      maxSizeMB: 1,
    }],
  });

  const missingFileResponse = response();
  await submitCompanyApplication({ user: applicant, params: { companyId: String(company._id) }, body: {}, files: [] }, missingFileResponse);
  assert.equal(missingFileResponse.statusCode, 400);
  assert.match(missingFileResponse.body.message, /required document/i);

  const firstFile = await createPdfUpload(company.requirements[0]._id);
  const submitResponse = response();
  await submitCompanyApplication({ user: applicant, params: { companyId: String(company._id) }, body: {}, files: [firstFile] }, submitResponse);
  assert.equal(submitResponse.statusCode, 201);
  assert.equal(submitResponse.body.data.submittedFiles.length, 1);

  const duplicateFile = await createPdfUpload(company.requirements[0]._id);
  const duplicateResponse = response();
  await submitCompanyApplication({ user: applicant, params: { companyId: String(company._id) }, body: {}, files: [duplicateFile] }, duplicateResponse);
  assert.equal(duplicateResponse.statusCode, 409);

  const applicationId = submitResponse.body.data.id;
  const fileId = submitResponse.body.data.submittedFiles[0].id;
  const unauthorizedFileResponse = response();
  await downloadCompanyApplicationFile({
    user: otherProvider,
    params: { applicationId, fileId },
    query: { inline: 'true' },
  }, unauthorizedFileResponse);
  assert.equal(unauthorizedFileResponse.statusCode, 404);

  const providerFileResponse = response();
  await downloadCompanyApplicationFile({
    user: provider,
    params: { applicationId, fileId },
    query: { inline: 'true' },
  }, providerFileResponse);
  assert.equal(providerFileResponse.statusCode, 200);
  assert.ok(providerFileResponse.filePath);

  const deniedStatusResponse = response();
  await updateCompanyApplicationStatus({
    user: otherProvider,
    params: { applicationId },
    body: { status: 'accepted' },
  }, deniedStatusResponse);
  assert.equal(deniedStatusResponse.statusCode, 404);

  const statusResponse = response();
  await updateCompanyApplicationStatus({
    user: provider,
    params: { applicationId },
    body: { status: 'interview_scheduled', interviewDate: '2026-10-12T09:00:00.000Z', providerNote: 'Bring portfolio' },
  }, statusResponse);
  assert.equal(statusResponse.statusCode, 200);
  assert.equal(statusResponse.body.data.status, 'interview_scheduled');

  const providerListResponse = response();
  await getProviderCompanyApplications({ user: provider, params: { companyId: String(company._id) } }, providerListResponse);
  assert.equal(providerListResponse.statusCode, 200);
  assert.equal(providerListResponse.body.data.length, 1);
  assert.equal(providerListResponse.body.data[0].applicant.email, applicant.email);
});

test('job review gates publication and job applications are unique and status updates are visible to applicants', async () => {
  const provider = await createUser('provider', 'Job Provider', 'approved');
  const applicant = await createUser('user', 'Job Applicant');
  const admin = await createUser('admin', 'Job Admin');
  const company = await Company.create({ providerId: provider._id, name: 'Approved Employer', category: 'Trade', status: 'approved' });
  const createResponse = response();
  await createJob({
    user: provider,
    params: { companyId: String(company._id) },
    body: {
      title: 'Carpenter',
      description: 'Residential carpentry work.',
      employmentType: 'full_time',
      salaryType: 'range',
      salaryMin: 100,
      salaryMax: 150,
      requirements: [{ type: 'text', title: 'Experience summary', isRequired: true }],
      slots: 2,
    },
  }, createResponse);
  assert.equal(createResponse.statusCode, 201);
  assert.equal(createResponse.body.data.status, 'draft');
  const jobId = String(createResponse.body.data._id);

  const pendingJobs = response();
  await getPublicJobs({}, pendingJobs);
  assert.equal(pendingJobs.body.count, 0);

  const reviewResponse = response();
  await adminReviewJob({
    user: admin,
    params: { jobId },
    body: { reviewStatus: 'approved' },
  }, reviewResponse);
  assert.equal(reviewResponse.statusCode, 200);

  const openResponse = response();
  await updateProviderJobStatus({ user: provider, params: { jobId }, body: { status: 'open' } }, openResponse);
  assert.equal(openResponse.statusCode, 200);

  const openJobs = response();
  await getPublicJobs({}, openJobs);
  assert.equal(openJobs.body.count, 1);

  const requirementId = reviewResponse.body.data.requirements[0]._id;
  const applicationResponse = response();
  await submitJobApplication({
    user: applicant,
    params: { jobId },
    body: {
      applicantName: applicant.name,
      applicantEmail: applicant.email,
      applicantPhone: '555-0100',
      applicantAddress: 'Main Street',
      [`requirement-${requirementId}`]: 'Two years of experience',
    },
    files: [],
  }, applicationResponse);
  assert.equal(applicationResponse.statusCode, 201);

  const duplicateResponse = response();
  await submitJobApplication({
    user: applicant,
    params: { jobId },
    body: { applicantName: applicant.name, applicantEmail: applicant.email, [`requirement-${requirementId}`]: 'Two years' },
    files: [],
  }, duplicateResponse);
  assert.equal(duplicateResponse.statusCode, 409);

  const secondApplicant = await createUser('user', 'Second Job Applicant');
  const secondApplicationResponse = response();
  await submitJobApplication({
    user: secondApplicant,
    params: { jobId },
    body: { applicantName: secondApplicant.name, applicantEmail: secondApplicant.email, [`requirement-${requirementId}`]: 'Three years' },
    files: [],
  }, secondApplicationResponse);
  assert.equal(secondApplicationResponse.statusCode, 201);

  const thirdApplicant = await createUser('user', 'Third Job Applicant');
  const fullJobResponse = response();
  await submitJobApplication({
    user: thirdApplicant,
    params: { jobId },
    body: { applicantName: thirdApplicant.name, applicantEmail: thirdApplicant.email, [`requirement-${requirementId}`]: 'Four years' },
    files: [],
  }, fullJobResponse);
  assert.equal(fullJobResponse.statusCode, 409);
  assert.match(fullJobResponse.body.message, /positions .* filled/i);

  const jobApplicationId = applicationResponse.body.data.id;
  const providerUpdate = response();
  await updateProviderJobApplication({
    user: provider,
    params: { applicationId: jobApplicationId },
    body: { status: 'interview_scheduled', interviewDate: '2027-01-01T10:00:00.000Z', providerNote: 'See you then' },
  }, providerUpdate);
  assert.equal(providerUpdate.statusCode, 200);

  const applicantList = response();
  await getApplicantJobApplications({ user: applicant, query: {} }, applicantList);
  assert.equal(applicantList.body.data[0].status, 'interview_scheduled');
  assert.equal(applicantList.body.data[0].applicant.phone, '555-0100');
  assert.ok(applicantList.body.data[0].interviewDate);
});

test('company jobs inherit locations, validate new fields, and keep drafts out of admin review', async () => {
  const provider = await createUser('provider', 'Company Job Provider', 'approved');
  const otherProvider = await createUser('provider', 'Other Job Provider', 'approved');
  const admin = await createUser('admin', 'Company Job Admin');
  const company = await Company.create({
    providerId: provider._id,
    name: 'Mapped Employer',
    category: 'Hospitality',
    status: 'approved',
    location: 'Oakland',
    formattedAddress: '1 Market Street, Oakland',
    latitude: 37.8044,
    longitude: -122.2712,
  });
  const otherCompany = await Company.create({ providerId: otherProvider._id, name: 'Other Employer', category: 'Retail', status: 'approved' });

  const draftResponse = response();
  await createJob({
    user: provider,
    params: { companyId: String(company._id) },
    body: {
      title: 'Cafe Manager',
      description: 'Lead the daily cafe team.',
      employmentType: 'full_time',
      workflowAction: 'draft',
      responsibilities: ['Lead the team'],
      skills: ['Scheduling'],
      salaryNegotiable: true,
      contactEmail: 'jobs@example.com',
    },
  }, draftResponse);
  assert.equal(draftResponse.statusCode, 201);
  assert.equal(draftResponse.body.data.reviewStatus, 'draft');
  assert.equal(draftResponse.body.data.latitude, 37.8044);
  assert.equal(draftResponse.body.data.longitude, -122.2712);
  assert.equal(draftResponse.body.data.category, 'Hospitality');
  assert.deepEqual(draftResponse.body.data.responsibilities, ['Lead the team']);
  assert.deepEqual(draftResponse.body.data.skills, ['Scheduling']);
  assert.equal(draftResponse.body.data.salaryNegotiable, true);

  const pendingDraftReviews = response();
  await adminListJobs({ query: { reviewStatus: 'pending' } }, pendingDraftReviews);
  assert.equal(pendingDraftReviews.body.count, 0);

  const invalidLocation = response();
  await createJob({
    user: provider,
    params: { companyId: String(company._id) },
    body: { title: 'Invalid map', description: 'Bad coordinate.', employmentType: 'full_time', latitude: 120, longitude: 0 },
  }, invalidLocation);
  assert.equal(invalidLocation.statusCode, 400);

  const invalidContact = response();
  await createJob({
    user: provider,
    params: { companyId: String(company._id) },
    body: { title: 'Invalid contact', description: 'Bad email.', employmentType: 'full_time', workflowAction: 'draft', contactEmail: 'not-an-email' },
  }, invalidContact);
  assert.equal(invalidContact.statusCode, 400);

  const foreignCompanyJob = response();
  await createJob({
    user: provider,
    params: { companyId: String(otherCompany._id) },
    body: { title: 'Unauthorized', description: 'Wrong owner.', employmentType: 'full_time' },
  }, foreignCompanyJob);
  assert.equal(foreignCompanyJob.statusCode, 403);

  const submitResponse = response();
  await createJob({
    user: provider,
    params: { companyId: String(company._id) },
    body: { title: 'Cafe Cook', description: 'Prepare cafe meals.', employmentType: 'part_time', workflowAction: 'submit' },
  }, submitResponse);
  assert.equal(submitResponse.body.data.reviewStatus, 'pending');
  assert.equal(submitResponse.body.data.status, 'pending_verification');
  assert.equal(await Notification.countDocuments({ userId: admin._id }), 1);

  const allSubmittedJobs = response();
  await adminListJobs({ query: { reviewStatus: 'all' } }, allSubmittedJobs);
  assert.equal(allSubmittedJobs.body.count, 1);

  await Company.updateOne({ _id: company._id }, { $set: { status: 'pending' } });
  const blockedResubmission = response();
  await updateProviderJob({ user: provider, params: { jobId: String(submitResponse.body.data._id) }, body: { workflowAction: 'submit' } }, blockedResubmission);
  assert.equal(blockedResubmission.statusCode, 403);
  await Company.updateOne({ _id: company._id }, { $set: { status: 'approved' } });

  const review = response();
  await adminReviewJob({ user: admin, params: { jobId: String(submitResponse.body.data._id) }, body: { reviewStatus: 'approved' } }, review);
  assert.equal(review.statusCode, 200);
  assert.equal(await Notification.countDocuments({ userId: provider._id }), 1);

  const providerJobs = response();
  await getProviderJobs({ user: provider, query: { companyId: String(company._id) } }, providerJobs);
  assert.equal(providerJobs.body.count, 2);
});

test('job application drafts persist to Mongo, resume files stay private, and submission is owner-scoped and unique', async () => {
  const provider = await createUser('provider', 'Draft Job Provider', 'approved');
  const applicant = await createUser('user', 'Draft Job Applicant');
  const otherApplicant = await createUser('user', 'Other Draft Applicant');
  const otherProvider = await createUser('provider', 'Other Job Provider', 'approved');
  const company = await Company.create({ providerId: provider._id, name: 'Draft Employer', category: 'Technology', status: 'approved' });
  const job = await JobListing.create({
    providerId: provider._id,
    companyId: company._id,
    title: 'Developer',
    description: 'Build and maintain software.',
    employmentType: 'full_time',
    status: 'open',
    reviewStatus: 'approved',
    slots: 2,
    requirements: [
      { type: 'text', title: 'Relevant experience', isRequired: true },
      { type: 'file', title: 'Portfolio', isRequired: true, allowedFileTypes: ['application/pdf'] },
    ],
  });
  const [textRequirement, fileRequirement] = job.requirements;
  const resumeBuffer = Buffer.from('%PDF-1.7\nProfile resume content');
  applicant.resume = {
    fileName: 'profile-resume.pdf',
    mimeType: 'application/pdf',
    fileSize: resumeBuffer.length,
    uploadedAt: new Date(),
    documentData: resumeBuffer,
  };
  await applicant.save();
  const portfolioBuffer = Buffer.from('%PDF-1.7\nPortfolio document');

  const draftResponse = response();
  await saveJobApplicationDraft({
    user: applicant,
    params: { jobId: String(job._id) },
    body: {
      applicantName: applicant.name,
      applicantEmail: applicant.email,
      draftStep: '3',
      useProfileResume: 'true',
      experience: 'Built production web applications.',
      coverLetter: 'I am interested in the role.',
      [`requirement-${textRequirement._id}`]: 'Three years of experience',
    },
    files: [{
      fieldname: String(fileRequirement._id),
      originalname: 'portfolio.pdf',
      mimetype: 'application/pdf',
      size: portfolioBuffer.length,
      buffer: portfolioBuffer,
    }],
  }, draftResponse);
  assert.equal(draftResponse.statusCode, 200);
  assert.equal(draftResponse.body.data.status, 'draft');
  assert.equal(draftResponse.body.data.draftStep, 3);
  assert.equal(draftResponse.body.data.resume.fileName, 'profile-resume.pdf');

  const storedDraft = await JobApplication.findById(draftResponse.body.data.id).select('+resume.documentData +responses.documentData');
  assert.equal(storedDraft.status, 'draft');
  assert.equal(storedDraft.resume.documentData.toString(), resumeBuffer.toString());
  assert.equal(storedDraft.responses.find((responseEntry) => responseEntry.responseType === 'file').documentData.toString(), portfolioBuffer.toString());

  const providerDraftList = response();
  await getProviderJobApplications({ user: provider, params: { jobId: String(job._id) } }, providerDraftList);
  assert.equal(providerDraftList.body.count, 0);
  const otherApplicantDraft = response();
  await getApplicantJobApplicationDraft({ user: otherApplicant, params: { jobId: String(job._id) } }, otherApplicantDraft);
  assert.equal(otherApplicantDraft.body.data, null);

  const submitResponse = response();
  await submitJobApplication({
    user: applicant,
    params: { jobId: String(job._id) },
    body: {
      applicantName: applicant.name,
      applicantEmail: applicant.email,
      draftStep: '4',
      useProfileResume: 'true',
      [`requirement-${textRequirement._id}`]: 'Three years of experience',
    },
    files: [],
  }, submitResponse);
  assert.equal(submitResponse.statusCode, 201);
  assert.equal(submitResponse.body.data.status, 'submitted');
  assert.equal(submitResponse.body.data.responses.find((item) => item.kind === 'resume').fileName, 'profile-resume.pdf');
  assert.equal((await JobListing.findById(job._id)).applicationCount, 1);

  const ownerApplicants = response();
  await getProviderJobApplications({ user: provider, params: { jobId: String(job._id) } }, ownerApplicants);
  assert.equal(ownerApplicants.body.count, 1);
  const unauthorizedApplicants = response();
  await getProviderJobApplications({ user: otherProvider, params: { jobId: String(job._id) } }, unauthorizedApplicants);
  assert.equal(unauthorizedApplicants.statusCode, 404);

  const duplicateResponse = response();
  await submitJobApplication({ user: applicant, params: { jobId: String(job._id) }, body: {}, files: [] }, duplicateResponse);
  assert.equal(duplicateResponse.statusCode, 409);
});

test('work logs are owner-private and summaries reflect payment state', async () => {
  const user = await createUser('user', 'Work Log Owner');
  const otherUser = await createUser('user', 'Other Owner');
  const createResponse = response();
  await createWorkLog({
    user,
    body: { title: 'Bakery shift', clientName: 'Local bakery', startedAt: '2026-10-01', hours: 8, payAmount: 120, paymentStatus: 'paid', status: 'completed' },
  }, createResponse);
  assert.equal(createResponse.statusCode, 201);

  const pendingResponse = response();
  await createWorkLog({
    user,
    body: { title: 'Neighbor labor', startedAt: '2026-10-02', days: 1, payAmount: 80, paymentStatus: 'pending' },
  }, pendingResponse);
  assert.equal(pendingResponse.statusCode, 201);

  const ownerList = response();
  await listWorkLogs({ user, query: {} }, ownerList);
  assert.equal(ownerList.body.count, 2);
  assert.equal(ownerList.body.summary.totalEarnings, 200);
  assert.equal(ownerList.body.summary.totalHours, 8);
  assert.equal(ownerList.body.summary.unpaidBalance, 80);

  const isolatedList = response();
  await listWorkLogs({ user: otherUser, query: {} }, isolatedList);
  assert.equal(isolatedList.body.count, 0);
});

test('legacy tracker update preserves ownership and rejects other users', async () => {
  const owner = await createUser('user', 'Tracker Owner');
  const other = await createUser('user', 'Other Tracker User');
  const application = await Application.create({ userId: owner._id, company: 'First Company', role: 'Laborer' });
  const originalCreatedAt = application.createdAt.getTime();
  const updateResponse = response();

  await updateTrackerApplication({
    user: owner,
    params: { id: String(application._id) },
    body: { company: 'Updated Company', userId: String(other._id), createdAt: new Date(0), status: 'Applied' },
  }, updateResponse);
  assert.equal(updateResponse.statusCode, 200);
  assert.equal(String(updateResponse.body.data.userId), String(owner._id));
  assert.equal(updateResponse.body.data.company, 'Updated Company');
  assert.equal(updateResponse.body.data.createdAt.getTime(), originalCreatedAt);

  const deniedResponse = response();
  await updateTrackerApplication({ user: other, params: { id: String(application._id) }, body: { company: 'Hijacked' } }, deniedResponse);
  assert.equal(deniedResponse.statusCode, 404);
});

test('admin application oversight lists all pipelines and deletes selected records', async () => {
  const admin = await createUser('admin', 'Application Admin');
  const applicant = await createUser('user', 'Application Owner');
  const provider = await createUser('provider', 'Application Provider', 'approved');
  const company = await Company.create({ providerId: provider._id, name: 'Oversight Company', category: 'Education', status: 'approved' });
  const job = await JobListing.create({ companyId: company._id, providerId: provider._id, title: 'Tutor', description: 'Teach learners', employmentType: 'part_time', status: 'open', reviewStatus: 'approved' });
  await Application.create({ userId: applicant._id, company: 'Oversight Company', role: 'Coordinator' });
  const companyApplication = await CompanyApplication.create({ companyId: company._id, applicantId: applicant._id });
  const jobApplication = await JobApplication.create({
    jobId: job._id,
    companyId: company._id,
    applicantId: applicant._id,
    applicant: { name: applicant.name, email: applicant.email },
  });

  const listResponse = response();
  await adminRouteHandler('/applications', 'get')({ user: admin, query: { type: 'all', page: 1, limit: 30 } }, listResponse);
  assert.equal(listResponse.statusCode, 200);
  assert.equal(listResponse.body.count, 3);
  assert.deepEqual(new Set(listResponse.body.data.map((item) => item.type)), new Set(['tracker', 'company', 'job']));

  const deleteResponse = response();
  await adminRouteHandler('/applications/:type/:id', 'delete')({ user: admin, params: { type: 'job', id: String(jobApplication._id) } }, deleteResponse);
  assert.equal(deleteResponse.statusCode, 200);
  assert.equal(await JobApplication.countDocuments({ _id: jobApplication._id }), 0);
  assert.equal((await JobListing.findById(job._id)).applicationCount, 0);
  assert.equal(await CompanyApplication.countDocuments({ _id: companyApplication._id }), 1);
});
