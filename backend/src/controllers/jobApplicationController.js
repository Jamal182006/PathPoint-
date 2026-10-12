import fs from 'fs/promises';
import path from 'path';
import { fileTypeFromBuffer, fileTypeFromFile } from 'file-type';
import JobApplication from '../models/JobApplication.js';
import JobListing from '../models/JobListing.js';
import User from '../models/User.js';
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
  draftStep: application.draftStep,
  experience: application.experience || '',
  coverLetter: application.coverLetter || '',
  resume: application.resume ? {
    fileName: application.resume.fileName,
    mimeType: application.resume.mimeType,
    fileSize: application.resume.fileSize,
    uploadedAt: application.resume.uploadedAt,
    downloadUrl: `/api/jobs/applications/${application._id}/resume`,
  } : null,
  status: application.status,
  providerNote: application.providerNote,
  applicantNote: application.applicantNote || '',
  interviewDate: application.interviewDate,
  rejectedAt: application.rejectedAt,
  withdrawnAt: application.withdrawnAt,
  archivedAt: application.archivedAt,
  statusHistory: application.statusHistory || [],
  submittedAt: application.submittedAt,
  createdAt: application.createdAt,
  updatedAt: application.updatedAt,
  responses: [
    ...(application.resume ? [{
      id: 'resume',
      requirementId: 'resume',
      requirementTitle: 'Resume/CV',
      responseType: 'file',
      kind: 'resume',
      fileName: application.resume.fileName,
      mimeType: application.resume.mimeType,
      fileSize: application.resume.fileSize,
      uploadedAt: application.resume.uploadedAt,
    }] : []),
    ...(application.responses || []).map((response) => ({
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
  ],
});

const applicantOnly = (req, res) => {
  if (req.user.role === 'user') return true;
  res.status(403).json({ success: false, message: 'Only applicant accounts can submit or view job applications' });
  return false;
};

const requestError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

const validateUploadedDocument = async (file, { title, maxSizeMB = 10, allowedFileTypes = supportedTypes } = {}) => {
  if (file.size > maxSizeMB * 1024 * 1024) throw requestError(`${title} must be ${maxSizeMB} MB or smaller`);
  const detected = await fileTypeFromBuffer(file.buffer);
  if (!detected || !supportedTypes.has(detected.mime) || detected.mime !== file.mimetype) {
    throw requestError(`${safeName(file.originalname)} is not a valid PDF, JPG, or PNG document`);
  }
  if (!allowedFileTypes.includes(detected.mime)) throw requestError(`${title} does not allow ${detected.ext.toUpperCase()} files`);
  return {
    fileName: safeName(file.originalname),
    mimeType: detected.mime,
    fileSize: file.size,
    uploadedAt: new Date(),
    documentData: file.buffer,
  };
};

const getApplicationPayload = async (req, job, existing, draft) => {
  const files = req.files || [];
  const filesByName = new Map();
  const requirementsById = new Map(job.requirements.map((requirement) => [String(requirement._id), requirement]));

  for (const file of files) {
    if (filesByName.has(file.fieldname)) throw requestError('Only one file may be uploaded for each document field');
    if (file.fieldname !== 'resume') {
      const requirement = requirementsById.get(String(file.fieldname));
      if (!requirement || requirement.type !== 'file') throw requestError('Uploaded file does not match a file requirement');
      filesByName.set(file.fieldname, await validateUploadedDocument(file, {
        title: requirement.title,
        maxSizeMB: Math.min(requirement.maxSizeMB || 5, 10),
        allowedFileTypes: requirement.allowedFileTypes,
      }));
    } else {
      filesByName.set('resume', await validateUploadedDocument(file, { title: 'Resume/CV' }));
    }
  }

  const oldResponses = new Map((existing?.responses || []).map((response) => [String(response.requirementId), response]));
  const responses = [];
  for (const requirement of job.requirements) {
    const requirementId = String(requirement._id);
    const previous = oldResponses.get(requirementId);
    if (requirement.type === 'file') {
      const uploaded = filesByName.get(requirementId);
      const value = uploaded
        ? { requirementId: requirement._id, requirementTitle: requirement.title, responseType: 'file', ...uploaded }
        : previous
          ? { ...previous.toObject(), requirementId: requirement._id, requirementTitle: requirement.title }
          : null;
      if (!draft && requirement.isRequired && !value) throw requestError(`Upload the required document: ${requirement.title}`);
      if (value) responses.push(value);
      continue;
    }

    const key = `requirement-${requirementId}`;
    const value = cleanText(Object.hasOwn(req.body, key) ? req.body[key] : oldResponses.get(requirementId)?.value, 5000);
    if (!draft && requirement.isRequired && !value) throw requestError(`Complete the required response: ${requirement.title}`);
    if (value) responses.push({ requirementId: requirement._id, requirementTitle: requirement.title, responseType: 'text', value });
  }

  const useProfileResume = req.body.useProfileResume === 'true';
  const removeResume = req.body.removeResume === 'true';
  let profileResume;
  if (useProfileResume && !filesByName.has('resume')) {
    const profile = await User.findById(req.user._id).select('+resume.documentData');
    profileResume = profile?.resume?.toObject();
  }
  const resume = filesByName.get('resume')
    || (useProfileResume ? profileResume : null)
    || (removeResume ? null : existing?.resume?.toObject?.() || existing?.resume);
  const storedBytes = [...responses, ...(resume ? [resume] : [])]
    .reduce((total, item) => total + (item.documentData?.length || 0), 0);
  if (storedBytes > 12 * 1024 * 1024) throw requestError('All application documents together must be 12 MB or smaller');

  const applicant = {
    name: cleanText(req.body.applicantName || existing?.applicant?.name || req.user.name, 100),
    email: cleanText(req.body.applicantEmail || existing?.applicant?.email || req.user.email, 254).toLowerCase(),
    phone: cleanText(req.body.applicantPhone ?? existing?.applicant?.phone ?? req.user.phone, 40),
    address: cleanText(req.body.applicantAddress ?? existing?.applicant?.address ?? req.user.address, 300),
  };
  if (!applicant.name || !emailPattern.test(applicant.email)) throw requestError('Applicant name and a valid email are required');

  return {
    applicant,
    experience: cleanText(req.body.experience ?? existing?.experience, 5000),
    coverLetter: cleanText(req.body.coverLetter ?? existing?.coverLetter, 5000),
    resume,
    responses,
  };
};

const findOpenJob = (jobId) => JobListing.findOne({
  _id: jobId,
  status: { $in: ['verified', 'open'] },
  reviewStatus: 'approved',
  archivedAt: { $exists: false },
  $or: [{ applicationDeadline: { $exists: false } }, { applicationDeadline: null }, { applicationDeadline: { $gte: new Date() } }],
});

export const getApplicantJobApplicationDraft = async (req, res) => {
  if (!applicantOnly(req, res)) return;
  if (!validId(req.params.jobId)) return res.status(400).json({ success: false, message: 'Invalid job ID' });
  try {
    const application = await JobApplication.findOne({ jobId: req.params.jobId, applicantId: req.user._id });
    return res.status(200).json({ success: true, data: application ? serializeApplication(application) : null });
  } catch (error) {
    console.error('[Job Application Error - Draft Load]:', error);
    return res.status(500).json({ success: false, message: 'Failed to load application draft' });
  }
};

export const saveJobApplicationDraft = async (req, res) => {
  if (!applicantOnly(req, res)) return;
  if (!validId(req.params.jobId)) return res.status(400).json({ success: false, message: 'Invalid job ID' });
  try {
    const job = await findOpenJob(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job is not open for applications' });
    const existing = await JobApplication.findOne({ jobId: job._id, applicantId: req.user._id })
      .select('+responses.documentData +responses.storageKey +resume.documentData');
    if (job.applicationCount >= job.slots && existing?.status !== 'rejected') return res.status(409).json({ success: false, message: 'All positions for this job have been filled' });
    if (existing && !['draft', 'rejected'].includes(existing.status)) return res.status(409).json({ success: false, message: 'You have already submitted an application for this job' });
    const payload = await getApplicationPayload(req, job, existing, true);
    const draftStep = Number(req.body.draftStep || 1);
    if (!Number.isInteger(draftStep) || draftStep < 1 || draftStep > 4) throw requestError('Draft step must be between 1 and 4');

    const draft = existing || new JobApplication({ jobId: job._id, companyId: job.companyId, applicantId: req.user._id });
    if (!existing) draft.statusHistory.push({ status: 'draft', changedAt: new Date() });
    if (existing?.status === 'rejected') {
      if (draft.statusHistory.at(-1)?.status !== 'rejected') {
        draft.statusHistory.push({ status: 'rejected', changedAt: draft.rejectedAt || draft.updatedAt || new Date() });
      }
      draft.rejectedAt ||= draft.updatedAt || new Date();
      draft.statusHistory.push({ status: 'draft', changedAt: new Date() });
    }
    Object.assign(draft, payload, { draftStep, status: 'draft', submittedAt: undefined });
    await draft.save();
    return res.status(200).json({ success: true, message: 'Application draft saved', data: serializeApplication(draft) });
  } catch (error) {
    if (error.statusCode || error.name === 'ValidationError') return res.status(error.statusCode || 400).json({ success: false, message: error.message });
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'An application already exists for this job' });
    console.error('[Job Application Error - Draft Save]:', error);
    return res.status(500).json({ success: false, message: 'Failed to save application draft' });
  }
};

export const submitJobApplication = async (req, res) => {
  let persisted = false;
  let reservedJobId;
  try {
    if (!applicantOnly(req, res)) return;
    if (!validId(req.params.jobId)) return res.status(400).json({ success: false, message: 'Invalid job ID' });
    const job = await findOpenJob(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job is not open for applications' });

    const existing = await JobApplication.findOne({ jobId: job._id, applicantId: req.user._id })
      .select('+responses.documentData +responses.storageKey +resume.documentData');
    if (existing && !['draft', 'rejected'].includes(existing.status)) return res.status(409).json({ success: false, message: 'You have already applied to this job' });
    const payload = await getApplicationPayload(req, job, existing, false);

    const isReapplication = Boolean(existing && (
      existing.status === 'rejected'
      || existing.rejectedAt
      || existing.statusHistory.some((entry) => entry.status === 'rejected')
    ));
    if (!isReapplication) {
      const slotReservation = await JobListing.updateOne(
        {
          _id: job._id,
          status: { $in: ['verified', 'open'] },
          reviewStatus: 'approved',
          archivedAt: { $exists: false },
          $expr: { $lt: [{ $ifNull: ['$applicationCount', 0] }, '$slots'] },
        },
        { $inc: { applicationCount: 1 } }
      );
      if (!slotReservation.modifiedCount) return res.status(409).json({ success: false, message: 'All positions for this job have been filled' });
      reservedJobId = job._id;
    }

    const submittedAt = new Date();
    const application = existing
      ? await (async () => {
        existing.statusHistory.push({ status: 'submitted', changedAt: submittedAt });
        Object.assign(existing, payload, { status: 'submitted', submittedAt, draftStep: 4, rejectedAt: undefined, withdrawnAt: undefined, archivedAt: undefined });
        return existing.save();
      })()
      : await JobApplication.create({
        jobId: job._id,
        companyId: job.companyId,
        applicantId: req.user._id,
        ...payload,
        status: 'submitted',
        submittedAt,
        draftStep: 4,
        statusHistory: [{ status: 'submitted', changedAt: submittedAt }],
      });
    if (!application) return res.status(409).json({ success: false, message: 'This application was already submitted' });
    persisted = true;
    return res.status(201).json({ success: true, message: 'Job application submitted', data: serializeApplication(application) });
  } catch (error) {
    if (error.statusCode || error.name === 'ValidationError') return res.status(error.statusCode || 400).json({ success: false, message: error.message });
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'You have already applied to this job' });
    console.error('[Job Application Error - Submit]:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit job application' });
  } finally {
    if (!persisted && reservedJobId) await JobListing.updateOne({ _id: reservedJobId, applicationCount: { $gt: 0 } }, { $inc: { applicationCount: -1 } });
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
    const applications = await JobApplication.find({ jobId: job._id, status: { $ne: 'draft' } }).sort({ createdAt: -1 });
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
  const allowedStatuses = new Set(['under_review', 'shortlisted', 'interview_scheduled', 'accepted', 'hired', 'rejected']);
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
    if (application.statusHistory.at(-1)?.status !== status) application.statusHistory.push({ status, changedAt: new Date() });
    application.rejectedAt = status === 'rejected' ? new Date() : undefined;
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
    const application = await JobApplication.findById(req.params.applicationId).select('+responses.storageKey +responses.documentData');
    if (!application) return res.status(404).json({ success: false, message: 'File not found' });
    const isApplicant = String(application.applicantId) === String(req.user._id);
    const isProvider = req.user.role === 'provider'
      && req.user.businessVerification?.status === 'approved'
      && await JobListing.exists({ _id: application.jobId, providerId: req.user._id });
    if (!isApplicant && !isProvider && req.user.role !== 'admin') return res.status(404).json({ success: false, message: 'File not found' });
    const response = application.responses.id(req.params.responseId);
    if (!response) return res.status(404).json({ success: false, message: 'File not found' });
    if (response.documentData) {
      const detected = await fileTypeFromBuffer(response.documentData);
      if (!detected || detected.mime !== response.mimeType) return res.status(404).json({ success: false, message: 'File not found' });
      res.set('Content-Type', response.mimeType);
      res.set('X-Content-Type-Options', 'nosniff');
      res.set('Content-Disposition', `${req.query.inline === 'true' ? 'inline' : 'attachment'}; filename="${safeName(response.fileName)}"`);
      return res.send(response.documentData);
    }
    if (!response.storageKey || !/^[a-f\d-]+\.(?:pdf|jpg|png)$/i.test(response.storageKey)) return res.status(404).json({ success: false, message: 'File not found' });
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

export const downloadJobApplicationResume = async (req, res) => {
  if (!validId(req.params.applicationId)) return res.status(400).json({ success: false, message: 'Invalid application ID' });
  try {
    const application = await JobApplication.findById(req.params.applicationId).select('+resume.documentData');
    if (!application?.resume?.documentData) return res.status(404).json({ success: false, message: 'Resume not found' });
    const isApplicant = String(application.applicantId) === String(req.user._id);
    const isProvider = req.user.role === 'provider'
      && req.user.businessVerification?.status === 'approved'
      && await JobListing.exists({ _id: application.jobId, providerId: req.user._id });
    if (!isApplicant && !isProvider && req.user.role !== 'admin') return res.status(404).json({ success: false, message: 'Resume not found' });
    const detected = await fileTypeFromBuffer(application.resume.documentData);
    if (!detected || detected.mime !== application.resume.mimeType) return res.status(404).json({ success: false, message: 'Resume not found' });
    res.set('Content-Type', application.resume.mimeType);
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Content-Disposition', `${req.query.inline === 'true' ? 'inline' : 'attachment'}; filename="${safeName(application.resume.fileName)}"`);
    return res.send(application.resume.documentData);
  } catch (error) {
    console.error('[Job Application Error - Resume Download]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve resume' });
  }
};
