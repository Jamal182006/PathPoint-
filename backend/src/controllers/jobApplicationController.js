import fs from 'fs/promises';
import path from 'path';
import { fileTypeFromFile } from 'file-type';
import JobApplication from '../models/JobApplication.js';
import JobListing from '../models/JobListing.js';
import { getJobUploadDirectory } from '../utils/jobUpload.js';

const supportedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validId = (id) => /^[a-f\d]{24}$/i.test(String(id));
const safeName = (name) => path.basename(String(name || 'document')).replace(/[\r\n"\\]/g, '_').slice(0, 255);
const cleanText = (value, maxLength) => String(value || '').trim().slice(0, maxLength);

const serializeApplication = (application, isPopulated = false) => ({
  id: String(application._id),
  job: isPopulated && application.jobId ? application.jobId : undefined,
  jobId: String(application.jobId?._id || application.jobId),
  companyId: String(application.companyId),
  applicant: application.applicant,
  status: application.status,
  providerNote: application.providerNote,
  interviewDate: application.interviewDate,
  createdAt: application.createdAt,
  updatedAt: application.updatedAt,
  responses: (application.responses || []).map((response) => ({
    id: String(response._id),
    requirementId: String(response.requirementId),
    requirementTitle: response.requirementTitle,
    responseType: response.responseType,
    value: response.value,
    fileName: response.fileName,
    mimeType: response.mimeType,
    fileSize: response.fileSize,
    uploadedAt: response.uploadedAt,
    downloadUrl: response.responseType === 'file' ? `/api/jobs/applications/${application._id}/responses/${response._id}/file` : undefined,
  })),
});

const removeFiles = async (files = []) => Promise.all(files.map((file) => fs.unlink(file.path).catch(() => {})));
const applicantOnly = (req, res) => {
  if (req.user.role === 'user') return true;
  res.status(403).json({ success: false, message: 'Only applicant accounts can submit or view job applications' });
  return false;
};

export const submitJobApplication = async (req, res) => {
  const uploadedFiles = req.files || [];
  let persisted = false;
  let reservedJobId;
  try {
    if (!applicantOnly(req, res)) return;
    if (!validId(req.params.jobId)) return res.status(400).json({ success: false, message: 'Invalid job ID' });
    const job = await JobListing.findOne({
      _id: req.params.jobId,
      status: 'open',
      reviewStatus: 'approved',
      archivedAt: { $exists: false },
      $or: [{ applicationDeadline: { $exists: false } }, { applicationDeadline: null }, { applicationDeadline: { $gte: new Date() } }],
    });
    if (!job) return res.status(404).json({ success: false, message: 'Job is not open for applications' });

    const slotReservation = await JobListing.updateOne(
      {
        _id: job._id,
        status: 'open',
        reviewStatus: 'approved',
        archivedAt: { $exists: false },
        $expr: { $lt: [{ $ifNull: ['$applicationCount', 0] }, '$slots'] },
      },
      { $inc: { applicationCount: 1 } }
    );
    if (!slotReservation.modifiedCount) return res.status(409).json({ success: false, message: 'All positions for this job have been filled' });
    reservedJobId = job._id;

    const applicant = {
      name: cleanText(req.body.applicantName || req.user.name, 100),
      email: cleanText(req.body.applicantEmail || req.user.email, 254).toLowerCase(),
      phone: cleanText(req.body.applicantPhone || req.user.phone, 40),
      address: cleanText(req.body.applicantAddress || req.user.address, 300),
    };
    if (!applicant.name || !emailPattern.test(applicant.email)) return res.status(400).json({ success: false, message: 'Applicant name and a valid email are required' });

    const requirementsById = new Map(job.requirements.map((requirement) => [String(requirement._id), requirement]));
    const filesByRequirement = new Map();
    for (const file of uploadedFiles) {
      const requirement = requirementsById.get(String(file.fieldname));
      if (!requirement || requirement.type !== 'file') return res.status(400).json({ success: false, message: 'Uploaded file does not match a file requirement' });
      if (filesByRequirement.has(String(requirement._id))) return res.status(400).json({ success: false, message: `Only one file may be uploaded for ${requirement.title}` });
      const maxBytes = Math.min(requirement.maxSizeMB || 5, 10) * 1024 * 1024;
      if (file.size > maxBytes) return res.status(400).json({ success: false, message: `${requirement.title} must be ${requirement.maxSizeMB || 5} MB or smaller` });
      const detected = await fileTypeFromFile(file.path);
      if (!detected || !supportedTypes.has(detected.mime) || detected.mime !== file.mimetype) return res.status(400).json({ success: false, message: `${safeName(file.originalname)} is not a valid PDF, JPG, or PNG document` });
      if (!requirement.allowedFileTypes.includes(detected.mime)) return res.status(400).json({ success: false, message: `${requirement.title} does not allow ${detected.ext.toUpperCase()} files` });
      filesByRequirement.set(String(requirement._id), file);
    }

    const responses = [];
    for (const requirement of job.requirements) {
      if (requirement.type === 'file') {
        const file = filesByRequirement.get(String(requirement._id));
        if (!file && requirement.isRequired) return res.status(400).json({ success: false, message: `Upload the required document: ${requirement.title}` });
        if (file) responses.push({
          requirementId: requirement._id,
          requirementTitle: requirement.title,
          responseType: 'file',
          storageKey: path.basename(file.filename),
          fileName: safeName(file.originalname),
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedAt: new Date(),
        });
        continue;
      }

      const value = cleanText(req.body[`requirement-${requirement._id}`], 5000);
      if (!value && requirement.isRequired) return res.status(400).json({ success: false, message: `Complete the required response: ${requirement.title}` });
      if (value) responses.push({ requirementId: requirement._id, requirementTitle: requirement.title, responseType: 'text', value });
    }

    const application = await JobApplication.create({
      jobId: job._id,
      companyId: job.companyId,
      applicantId: req.user._id,
      applicant,
      responses,
      status: 'submitted',
    });
    persisted = true;
    return res.status(201).json({ success: true, message: 'Job application submitted', data: serializeApplication(application) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'You have already applied to this job' });
    console.error('[Job Application Error - Submit]:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit job application' });
  } finally {
    if (!persisted) {
      await removeFiles(uploadedFiles);
      if (reservedJobId) await JobListing.updateOne({ _id: reservedJobId, applicationCount: { $gt: 0 } }, { $inc: { applicationCount: -1 } });
    }
  }
};

export const getApplicantJobApplications = async (req, res) => {
  if (!applicantOnly(req, res)) return;
  try {
    const applications = await JobApplication.find({ applicantId: req.user._id }).populate({
      path: 'jobId',
      select: 'title location employmentType salaryType salaryMin salaryMax salaryPayPeriod interviewDate interviewLocation interviewLink interviewerName status reviewStatus',
    }).sort({ updatedAt: -1 });
    return res.status(200).json({ success: true, count: applications.length, data: applications.map((application) => serializeApplication(application, true)) });
  } catch (error) {
    console.error('[Job Application Error - Applicant List]:', error);
    return res.status(500).json({ success: false, message: 'Failed to load applications' });
  }
};

export const getApplicantJobApplication = async (req, res) => {
  if (!applicantOnly(req, res)) return;
  if (!validId(req.params.applicationId)) return res.status(400).json({ success: false, message: 'Invalid application ID' });
  try {
    const application = await JobApplication.findOne({ _id: req.params.applicationId, applicantId: req.user._id }).populate({ path: 'jobId', select: 'title location employmentType salaryType salaryMin salaryMax salaryPayPeriod interviewDate interviewLocation interviewLink interviewerName status reviewStatus' });
    if (!application) return res.status(404).json({ success: false, message: 'Application not found' });
    return res.status(200).json({ success: true, data: serializeApplication(application, true) });
  } catch (error) {
    console.error('[Job Application Error - Applicant Detail]:', error);
    return res.status(500).json({ success: false, message: 'Failed to load application' });
  }
};

export const getProviderJobApplications = async (req, res) => {
  if (req.user.role !== 'provider') return res.status(403).json({ success: false, message: 'Only providers can view job applicants' });
  if (req.user.businessVerification?.status !== 'approved') return res.status(403).json({ success: false, message: 'Provider verification approval is required' });
  if (!validId(req.params.jobId)) return res.status(400).json({ success: false, message: 'Invalid job ID' });
  try {
    const job = await JobListing.findOne({ _id: req.params.jobId, providerId: req.user._id, archivedAt: { $exists: false } }).select('_id');
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    const applications = await JobApplication.find({ jobId: job._id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: applications.length, data: applications.map((application) => serializeApplication(application)) });
  } catch (error) {
    console.error('[Job Application Error - Provider List]:', error);
    return res.status(500).json({ success: false, message: 'Failed to load job applicants' });
  }
};

export const updateProviderJobApplication = async (req, res) => {
  if (req.user.role !== 'provider') return res.status(403).json({ success: false, message: 'Only providers can review job applications' });
  if (req.user.businessVerification?.status !== 'approved') return res.status(403).json({ success: false, message: 'Provider verification approval is required' });
  if (!validId(req.params.applicationId)) return res.status(400).json({ success: false, message: 'Invalid application ID' });
  const allowedStatuses = new Set(['under_review', 'interview_scheduled', 'accepted', 'rejected']);
  const { status, providerNote = '', interviewDate } = req.body;
  if (!allowedStatuses.has(status)) return res.status(400).json({ success: false, message: 'Invalid application status' });
  try {
    const application = await JobApplication.findById(req.params.applicationId);
    if (!application) return res.status(404).json({ success: false, message: 'Application not found' });
    const job = await JobListing.findOne({ _id: application.jobId, providerId: req.user._id, archivedAt: { $exists: false } });
    if (!job) return res.status(404).json({ success: false, message: 'Application not found' });
    let confirmedInterviewDate;
    if (status === 'interview_scheduled') {
      confirmedInterviewDate = interviewDate ? new Date(interviewDate) : job.interviewDate;
      if (!confirmedInterviewDate || Number.isNaN(confirmedInterviewDate.getTime()) || confirmedInterviewDate.getTime() < Date.now()) {
        return res.status(400).json({ success: false, message: 'A valid future interview date is required' });
      }
    }
    application.status = status;
    application.providerNote = cleanText(providerNote, 2000);
    application.interviewDate = status === 'interview_scheduled' ? confirmedInterviewDate : undefined;
    await application.save();
    return res.status(200).json({ success: true, message: 'Application updated', data: serializeApplication(application) });
  } catch (error) {
    console.error('[Job Application Error - Status]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update application' });
  }
};

export const downloadJobApplicationResponse = async (req, res) => {
  if (!validId(req.params.applicationId) || !validId(req.params.responseId)) return res.status(400).json({ success: false, message: 'Invalid file reference' });
  try {
    const application = await JobApplication.findById(req.params.applicationId).select('+responses.storageKey');
    if (!application) return res.status(404).json({ success: false, message: 'File not found' });
    const isApplicant = String(application.applicantId) === String(req.user._id);
    const isProvider = req.user.role === 'provider'
      && req.user.businessVerification?.status === 'approved'
      && await JobListing.exists({ _id: application.jobId, providerId: req.user._id });
    if (!isApplicant && !isProvider && req.user.role !== 'admin') return res.status(404).json({ success: false, message: 'File not found' });
    const response = application.responses.id(req.params.responseId);
    if (!response?.storageKey || !/^[a-f\d-]+\.(?:pdf|jpg|png)$/i.test(response.storageKey)) return res.status(404).json({ success: false, message: 'File not found' });
    const filePath = path.join(getJobUploadDirectory(), response.storageKey);
    const detected = await fileTypeFromFile(filePath);
    if (!detected || detected.mime !== response.mimeType) return res.status(404).json({ success: false, message: 'File not found' });
    res.set('Content-Type', response.mimeType);
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Content-Disposition', `${req.query.inline === 'true' ? 'inline' : 'attachment'}; filename="${safeName(response.fileName)}"`);
    return res.sendFile(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).json({ success: false, message: 'File not found' });
    console.error('[Job Application Error - Download]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve file' });
  }
};
