import fs from 'fs/promises';
import path from 'path';
import { fileTypeFromFile } from 'file-type';
import Company from '../models/Company.js';
import CompanyApplication from '../models/CompanyApplication.js';
import User from '../models/User.js';
import { getCompanyUploadDirectory } from '../utils/companyUpload.js';
import { notifyUser, recordActivity } from '../utils/platformEvents.js';

const acceptedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const validId = (id) => /^[a-f\d]{24}$/i.test(String(id));
const safeFileName = (name) => path.basename(String(name || 'document')).replace(/[\r\n"\\]/g, '_').slice(0, 255);

const serializeApplication = (application) => ({
  id: String(application._id),
  companyId: String(application.companyId?._id || application.companyId),
  applicantId: String(application.applicantId?._id || application.applicantId),
  applicant: application.applicantId?.name ? {
    id: String(application.applicantId._id),
    name: application.applicantId.name,
    email: application.applicantId.email,
  } : undefined,
  company: application.companyId?.name ? {
    id: String(application.companyId._id),
    name: application.companyId.name,
  } : undefined,
  status: application.status,
  formData: application.formData || {},
  formData: application.formData || {},
  providerNote: application.providerNote,
  applicantNote: application.applicantNote || '',
  interviewDate: application.interviewDate,
  rejectedAt: application.rejectedAt,
  withdrawnAt: application.withdrawnAt,
  archivedAt: application.archivedAt,
  statusHistory: application.statusHistory || [],
  createdAt: application.createdAt,
  updatedAt: application.updatedAt,
  submittedFiles: (application.submittedFiles || []).map((file) => ({
    id: String(file._id),
    requirementId: String(file.requirementId),
    requirementTitle: file.requirementTitle,
    fileName: file.fileName,
    mimeType: file.mimeType,
    fileSize: file.fileSize,
    uploadedAt: file.uploadedAt,
    downloadUrl: `/api/companies/applications/${application._id}/files/${file._id}`,
  })),
});

const removeUploadedFiles = async (files = []) => {
  await Promise.all(files.map((file) => fs.unlink(file.path).catch(() => {})));
};

const applicantOnly = (req, res) => {
  if (req.user.role === 'user') return true;
  res.status(403).json({ success: false, message: 'Only applicant accounts can submit or view applicant applications' });
  return false;
};

export const submitCompanyApplication = async (req, res) => {
  const files = req.files || [];
  let persisted = false;
  let resubmitting = false;
  try {
    if (!applicantOnly(req, res)) return;
    if (!validId(req.params.companyId)) return res.status(400).json({ success: false, message: 'Invalid company ID' });

    const company = await Company.findOne({
      _id: req.params.companyId,
      status: { $in: ['pending', 'approved'] },
      isArchived: false,
    });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found or not accepting applications' });
    const provider = await User.findOne({ _id: company.providerId, role: 'provider', status: 'active', 'businessVerification.status': 'approved' }).select('_id');
    if (!provider) return res.status(404).json({ success: false, message: 'Company not found or not accepting applications' });
    const existingApplication = await CompanyApplication.findOne({ companyId: company._id, applicantId: req.user._id })
      .select('+submittedFiles.storageKey');
    if (existingApplication && !['changes_requested', 'rejected'].includes(existingApplication.status)) {
      return res.status(409).json({ success: false, message: 'You have already applied to this company' });
    }

    const documentRequirements = company.requirements.filter((requirement) => ['document', 'file'].includes(requirement.type));
    let formData = {};
    try {
      const parsed = typeof req.body.formData === 'string' ? JSON.parse(req.body.formData) : req.body.formData;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) formData = parsed;
    } catch {
      return res.status(400).json({ success: false, message: 'Application responses must be valid JSON' });
    }
    const responseRequirements = company.requirements.filter((requirement) => ['text', 'date', 'select'].includes(requirement.type));
    const normalizedFormData = {};
    for (const requirement of responseRequirements) {
      const requirementId = String(requirement._id);
      const value = String(formData[requirementId] ?? '').trim();
      if (requirement.isRequired && !value) {
        return res.status(400).json({ success: false, message: `${requirement.title} is required` });
      }
      if (value.length > 5000) {
        return res.status(400).json({ success: false, message: `${requirement.title} must be 5000 characters or fewer` });
      }
      if (value && requirement.type === 'date' && Number.isNaN(new Date(value).getTime())) {
        return res.status(400).json({ success: false, message: `${requirement.title} must be a valid date` });
      }
      if (value && requirement.type === 'select' && !requirement.options.includes(value)) {
        return res.status(400).json({ success: false, message: `Choose a valid option for ${requirement.title}` });
      }
      normalizedFormData[requirementId] = value;
    }
    const requirementById = new Map(documentRequirements.map((requirement) => [String(requirement._id), requirement]));
    const filesByRequirement = new Map();
    const submittedFiles = [];

    for (const file of files) {
      const requirement = requirementById.get(String(file.fieldname));
      if (!requirement) return res.status(400).json({ success: false, message: 'An uploaded file does not match a company document requirement' });
      if (filesByRequirement.has(String(requirement._id))) {
        return res.status(400).json({ success: false, message: `Only one file may be uploaded for ${requirement.title}` });
      }

      const maxBytes = Math.min(requirement.maxSizeMB || 5, 5) * 1024 * 1024;
      if (file.size > maxBytes) {
        return res.status(400).json({ success: false, message: `${requirement.title} must be ${requirement.maxSizeMB || 5} MB or smaller` });
      }

      const detectedType = await fileTypeFromFile(file.path);
      if (!detectedType || !acceptedMimeTypes.has(detectedType.mime) || detectedType.mime !== file.mimetype) {
        return res.status(400).json({ success: false, message: `${safeFileName(file.originalname)} is not a valid PDF, JPG, or PNG document` });
      }
      if (!requirement.allowedFileTypes.includes(detectedType.mime)) {
        return res.status(400).json({ success: false, message: `${requirement.title} does not allow ${detectedType.ext.toUpperCase()} files` });
      }

      filesByRequirement.set(String(requirement._id), file);
      submittedFiles.push({
        requirementId: requirement._id,
        requirementTitle: requirement.title,
        storageKey: path.basename(file.filename),
        fileName: safeFileName(file.originalname),
        mimeType: detectedType.mime,
        fileSize: file.size,
        uploadedAt: new Date(),
      });
    }

    const missingRequired = documentRequirements.find((requirement) => requirement.isRequired && !filesByRequirement.has(String(requirement._id)));
    if (missingRequired) {
      return res.status(400).json({ success: false, message: `Upload the required document: ${missingRequired.title}` });
    }

    let application;
    if (existingApplication) {
      const previousFiles = existingApplication.submittedFiles.map((file) => file.storageKey).filter(Boolean);
      if (existingApplication.status === 'rejected' && existingApplication.statusHistory.at(-1)?.status !== 'rejected') {
        existingApplication.statusHistory.push({ status: 'rejected', changedAt: existingApplication.rejectedAt || existingApplication.updatedAt || new Date() });
      }
      existingApplication.statusHistory.push({ status: 'submitted', changedAt: new Date() });
      existingApplication.status = 'submitted';
      existingApplication.rejectedAt = undefined;
      existingApplication.withdrawnAt = undefined;
      existingApplication.archivedAt = undefined;
      existingApplication.formData = normalizedFormData;
      existingApplication.submittedFiles = submittedFiles;
      existingApplication.providerNote = '';
      existingApplication.interviewDate = undefined;
      application = await existingApplication.save();
      resubmitting = true;
      await Promise.all(previousFiles.map((storageKey) => fs.unlink(path.join(getCompanyUploadDirectory(), path.basename(storageKey))).catch(() => {})));
    } else {
      application = await CompanyApplication.create({
        companyId: company._id,
        applicantId: req.user._id,
        status: 'submitted',
        statusHistory: [{ status: 'submitted', changedAt: new Date() }],
        formData: normalizedFormData,
        submittedFiles,
        providerNote: '',
      });
    }
    persisted = true;
    await Promise.all([
      notifyUser(company.providerId, `${resubmitting ? 'An application was resubmitted to' : 'A new application was submitted to'} ${company.name}.`, `/provider/companies/${company._id}`),
      recordActivity(req.user._id, `${resubmitting ? 'resubmitted' : 'submitted'} a company application`, application._id, 'companyApplication'),
    ]);
    return res.status(resubmitting ? 200 : 201).json({ success: true, message: resubmitting ? 'Application resubmitted' : 'Application submitted', data: serializeApplication(application) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'You have already applied to this company' });
    console.error('[Company Application Error - Submit]:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit company application' });
  } finally {
    if (!persisted) await removeUploadedFiles(files);
  }
};

export const getMyCompanyApplications = async (req, res) => {
  if (!applicantOnly(req, res)) return;
  try {
    const applications = await CompanyApplication.find({ applicantId: req.user._id })
      .populate('companyId', 'name category location logo')
      .sort({ updatedAt: -1 });
    return res.status(200).json({ success: true, count: applications.length, data: applications.map(serializeApplication) });
  } catch (error) {
    console.error('[Company Application Error - Applicant List]:', error);
    return res.status(500).json({ success: false, message: 'Failed to load your company applications' });
  }
};

export const getMyCompanyApplication = async (req, res) => {
  if (!applicantOnly(req, res)) return;
  if (!validId(req.params.applicationId)) return res.status(400).json({ success: false, message: 'Invalid application ID' });
  try {
    const application = await CompanyApplication.findOne({ _id: req.params.applicationId, applicantId: req.user._id })
      .populate('companyId', 'name category location logo status');
    if (!application) return res.status(404).json({ success: false, message: 'Application not found' });
    return res.status(200).json({ success: true, data: serializeApplication(application) });
  } catch (error) {
    console.error('[Company Application Error - Applicant Detail]:', error);
    return res.status(500).json({ success: false, message: 'Failed to load application' });
  }
};

export const getProviderCompanyApplications = async (req, res) => {
  if (req.user.role !== 'provider') return res.status(403).json({ success: false, message: 'Only providers can view company applicants' });
  if (req.user.businessVerification?.status !== 'approved') return res.status(403).json({ success: false, message: 'Provider verification approval is required' });
  if (!validId(req.params.companyId)) return res.status(400).json({ success: false, message: 'Invalid company ID' });
  try {
    const company = await Company.findOne({ _id: req.params.companyId, providerId: req.user._id, isArchived: false }).select('_id');
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    const applications = await CompanyApplication.find({ companyId: company._id })
      .populate('applicantId', 'name email')
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: applications.length, data: applications.map(serializeApplication) });
  } catch (error) {
    console.error('[Company Application Error - Provider List]:', error);
    return res.status(500).json({ success: false, message: 'Failed to load applicants' });
  }
};

export const updateCompanyApplicationStatus = async (req, res) => {
  if (req.user.role !== 'provider') return res.status(403).json({ success: false, message: 'Only providers can update application status' });
  if (req.user.businessVerification?.status !== 'approved') return res.status(403).json({ success: false, message: 'Provider verification approval is required' });
  if (!validId(req.params.applicationId)) return res.status(400).json({ success: false, message: 'Invalid application ID' });
  const allowedStatuses = new Set(['under_review', 'changes_requested', 'interview_scheduled', 'accepted', 'approved', 'rejected']);
  const { status, providerNote = '', interviewDate } = req.body;
  if (!allowedStatuses.has(status)) return res.status(400).json({ success: false, message: 'Invalid company application status' });
  if (['changes_requested', 'rejected'].includes(status) && !String(providerNote).trim()) {
    return res.status(400).json({ success: false, message: 'A comment is required when requesting changes or rejecting an application' });
  }
  if (status === 'interview_scheduled' && interviewDate && Number.isNaN(new Date(interviewDate).getTime())) {
    return res.status(400).json({ success: false, message: 'Interview date is invalid' });
  }

  try {
    const application = await CompanyApplication.findById(req.params.applicationId);
    if (!application) return res.status(404).json({ success: false, message: 'Application not found' });
    const company = await Company.findOne({ _id: application.companyId, providerId: req.user._id, isArchived: false }).select('_id');
    if (!company) return res.status(404).json({ success: false, message: 'Application not found' });

    application.status = status;
    if (application.statusHistory.at(-1)?.status !== status) application.statusHistory.push({ status, changedAt: new Date() });
    application.rejectedAt = status === 'rejected' ? new Date() : undefined;
    application.providerNote = String(providerNote).trim().slice(0, 2000);
    application.interviewDate = status === 'interview_scheduled' && interviewDate ? new Date(interviewDate) : undefined;
    await application.save();
    await Promise.all([
      notifyUser(application.applicantId, `${company.name} updated your application: ${status.replaceAll('_', ' ')}.`, '/my-company-applications'),
      recordActivity(req.user._id, `changed a company application to ${status}`, application._id, 'companyApplication'),
    ]);
    return res.status(200).json({ success: true, message: 'Application status updated', data: serializeApplication(application) });
  } catch (error) {
    console.error('[Company Application Error - Status Update]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update application status' });
  }
};

export const downloadCompanyApplicationFile = async (req, res) => {
  if (!validId(req.params.applicationId) || !validId(req.params.fileId)) {
    return res.status(400).json({ success: false, message: 'Invalid application or file ID' });
  }
  try {
    const application = await CompanyApplication.findById(req.params.applicationId)
      .select('+submittedFiles.storageKey')
      .populate('companyId', 'providerId');
    if (!application) return res.status(404).json({ success: false, message: 'Document not found' });

    const isApplicant = String(application.applicantId) === String(req.user._id);
    const isProvider = req.user.role === 'provider'
      && String(application.companyId?.providerId) === String(req.user._id);
    if (!isApplicant && !isProvider && req.user.role !== 'admin') {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const file = application.submittedFiles.id(req.params.fileId);
    if (!file || !/^[a-f\d-]+\.(?:pdf|jpg|png)$/i.test(file.storageKey)) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    const filePath = path.join(getCompanyUploadDirectory(), file.storageKey);
    const detectedType = await fileTypeFromFile(filePath);
    if (!detectedType || detectedType.mime !== file.mimeType) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const inline = req.query.inline === 'true';
    res.set('Content-Type', file.mimeType);
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${safeFileName(file.fileName)}"`);
    return res.sendFile(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).json({ success: false, message: 'Document not found' });
    console.error('[Company Application Error - File Download]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve document' });
  }
};