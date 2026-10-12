import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
import CompanyApplication from '../models/CompanyApplication.js';
import Company from '../models/Company.js';
import JobApplication from '../models/JobApplication.js';
import JobListing from '../models/JobListing.js';
import { getCompanyUploadDirectory } from '../utils/companyUpload.js';

const validId = (id) => /^[a-f\d]{24}$/i.test(String(id));
const statusKeys = new Set(['all', 'active', 'applied', 'under_review', 'interview', 'offer', 'rejected', 'withdrawn', 'draft', 'archived']);
const applicationKinds = new Set(['all', 'job', 'company']);
const statusKeyExpression = (field = '$status') => ({
  $switch: {
    branches: [
      { case: { $eq: [field, 'submitted'] }, then: 'applied' },
      { case: { $in: [field, ['under_review', 'shortlisted', 'changes_requested']] }, then: 'under_review' },
      { case: { $eq: [field, 'interview_scheduled'] }, then: 'interview' },
      { case: { $in: [field, ['accepted', 'approved', 'hired']] }, then: 'offer' },
      { case: { $eq: [field, 'rejected'] }, then: 'rejected' },
      { case: { $eq: [field, 'withdrawn'] }, then: 'withdrawn' },
      { case: { $eq: [field, 'draft'] }, then: 'draft' },
    ],
    default: 'unknown',
  },
});
const displayStatusExpression = (field = '$status') => ({
  $switch: {
    branches: [
      { case: { $eq: [field, 'submitted'] }, then: 'Applied' },
      { case: { $in: [field, ['under_review', 'shortlisted', 'changes_requested']] }, then: 'Under Review' },
      { case: { $eq: [field, 'interview_scheduled'] }, then: 'Interview' },
      { case: { $in: [field, ['accepted', 'approved', 'hired']] }, then: 'Offer' },
      { case: { $eq: [field, 'rejected'] }, then: 'Rejected' },
      { case: { $eq: [field, 'withdrawn'] }, then: 'Withdrawn' },
      { case: { $eq: [field, 'draft'] }, then: 'Draft' },
    ],
    default: 'Unknown',
  },
});
const applicationProjection = (kind) => ({
  id: { $toString: '$_id' },
  kind: { $literal: kind },
  title: 1,
  organization: 1,
  jobId: { $toString: '$jobId' },
  companyId: { $toString: '$companyId' },
  status: '$statusKey',
  rawStatus: '$status',
  displayStatus: '$displayStatus',
  dateApplied: 1,
  updatedAt: 1,
  createdAt: 1,
  rejectedAt: 1,
  withdrawnAt: 1,
  archivedAt: 1,
  applicantNote: 1,
  providerNote: 1,
  interviewDate: 1,
  formData: 1,
  responses: 1,
  submittedFiles: 1,
});

const jobApplicationPipeline = (applicantId) => [
  { $match: { applicantId, status: { $ne: 'draft' } } },
  { $unset: ['responses.documentData', 'responses.storageKey', 'resume.documentData'] },
  { $lookup: {
    from: JobListing.collection.name,
    let: { targetId: '$jobId' },
    pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$targetId'] } } }, { $project: { _id: 1, title: 1 } }],
    as: 'job',
  } },
  { $unwind: { path: '$job', preserveNullAndEmptyArrays: true } },
  { $lookup: {
    from: Company.collection.name,
    let: { targetId: '$companyId' },
    pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$targetId'] } } }, { $project: { _id: 1, name: 1 } }],
    as: 'company',
  } },
  { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
  { $addFields: {
    title: { $ifNull: ['$job.title', 'Job application'] },
    organization: { $ifNull: ['$company.name', 'Company'] },
    dateApplied: { $ifNull: ['$submittedAt', '$createdAt'] },
    statusKey: statusKeyExpression(),
    displayStatus: displayStatusExpression(),
    responses: { $map: {
      input: { $ifNull: ['$responses', []] },
      as: 'response',
      in: {
        id: { $toString: '$$response._id' },
        requirementId: { $toString: '$$response.requirementId' },
        requirementTitle: '$$response.requirementTitle',
        responseType: '$$response.responseType',
        value: '$$response.value',
        kind: { $cond: [{ $eq: ['$$response.responseType', 'file'] }, 'file', 'text'] },
        fileName: '$$response.fileName',
        mimeType: '$$response.mimeType',
        fileSize: '$$response.fileSize',
        uploadedAt: '$$response.uploadedAt',
      },
    } },
  } },
  { $project: applicationProjection('job') },
];

const companyApplicationPipeline = (applicantId) => [
  { $match: { applicantId } },
  { $unset: 'submittedFiles.storageKey' },
  { $lookup: {
    from: Company.collection.name,
    let: { targetId: '$companyId' },
    pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$targetId'] } } }, { $project: { _id: 1, name: 1 } }],
    as: 'company',
  } },
  { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
  { $addFields: {
    title: { $ifNull: ['$company.name', 'Company application'] },
    organization: { $ifNull: ['$company.name', 'Company'] },
    dateApplied: '$createdAt',
    statusKey: statusKeyExpression(),
    displayStatus: displayStatusExpression(),
    submittedFiles: { $map: {
      input: { $ifNull: ['$submittedFiles', []] },
      as: 'file',
      in: {
        id: { $toString: '$$file._id' },
        requirementId: { $toString: '$$file.requirementId' },
        requirementTitle: '$$file.requirementTitle',
        fileName: '$$file.fileName',
        mimeType: '$$file.mimeType',
        fileSize: '$$file.fileSize',
        uploadedAt: '$$file.uploadedAt',
      },
    } },
  } },
  { $project: applicationProjection('company') },
];

const escapedRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const parsePositiveInteger = (value, fallback) => {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const listUserApplications = async (req, res) => {
  if (req.user.role !== 'user') return res.status(403).json({ success: false, message: 'Only applicant accounts can view applications' });
  const status = String(req.query.status || 'all').toLowerCase();
  const kind = String(req.query.kind || 'all').toLowerCase();
  const page = parsePositiveInteger(req.query.page, 1);
  const requestedLimit = parsePositiveInteger(req.query.limit, 20);
  if (!statusKeys.has(status)) return res.status(400).json({ success: false, message: 'Choose a valid application status' });
  if (!applicationKinds.has(kind)) return res.status(400).json({ success: false, message: 'Choose a valid application type' });
  if (!page || !requestedLimit) return res.status(400).json({ success: false, message: 'Page and limit must be positive integers' });
  const limit = Math.min(requestedLimit, 50);
  const search = String(req.query.search || '').trim().slice(0, 120);
  const sort = String(req.query.sort || 'updated_desc');
  const sorts = {
    updated_desc: { updatedAt: -1, _id: -1 },
    date_desc: { dateApplied: -1, _id: -1 },
    date_asc: { dateApplied: 1, _id: 1 },
    company_asc: { organization: 1, dateApplied: -1, _id: -1 },
  };
  if (!sorts[sort]) return res.status(400).json({ success: false, message: 'Choose a valid application sort order' });

  try {
    const aggregateMatch = {};
    if (status === 'archived') aggregateMatch.archivedAt = { $exists: true, $ne: null };
    else {
      aggregateMatch.archivedAt = { $exists: false };
      if (status === 'active') aggregateMatch.status = { $nin: ['rejected', 'withdrawn', 'draft'] };
      else if (status !== 'all') aggregateMatch.status = status;
    }
    if (kind !== 'all') aggregateMatch.kind = kind;
    if (search) {
      const searchRegex = new RegExp(escapedRegex(search), 'i');
      aggregateMatch.$or = [{ title: searchRegex }, { organization: searchRegex }];
    }

    const [result] = await JobApplication.aggregate([
      ...jobApplicationPipeline(req.user._id),
      { $unionWith: { coll: CompanyApplication.collection.name, pipeline: companyApplicationPipeline(req.user._id) } },
      { $match: aggregateMatch },
      { $sort: sorts[sort] },
      { $facet: {
        data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        metadata: [{ $count: 'count' }],
      } },
    ]);
    const count = result?.metadata?.[0]?.count || 0;
    return res.status(200).json({
      success: true,
      count,
      page,
      limit,
      pages: Math.max(1, Math.ceil(count / limit)),
      data: result?.data || [],
    });
  } catch (error) {
    console.error('[User Application Error - List]:', error);
    return res.status(500).json({ success: false, message: 'Failed to load applications' });
  }
};

const modelForKind = (kind) => kind === 'job' ? JobApplication : kind === 'company' ? CompanyApplication : null;

export const updateUserApplication = async (req, res) => {
  if (req.user.role !== 'user') return res.status(403).json({ success: false, message: 'Only applicants can manage their applications' });
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid application ID' });
  const Model = modelForKind(req.params.kind);
  if (!Model) return res.status(400).json({ success: false, message: 'Invalid application type' });
  const { action, applicantNote } = req.body || {};
  const validActions = new Set(['archive', 'restore', 'withdraw', 'note']);
  if (action && !validActions.has(action)) return res.status(400).json({ success: false, message: 'Invalid application action' });
  if (applicantNote !== undefined && (typeof applicantNote !== 'string' || applicantNote.length > 2000)) {
    return res.status(400).json({ success: false, message: 'Note must be a string no longer than 2000 characters' });
  }
  if (!action && applicantNote === undefined) return res.status(400).json({ success: false, message: 'Provide an application action or note' });

  try {
    const application = await Model.findOne({ _id: req.params.id, applicantId: req.user._id });
    if (!application) return res.status(404).json({ success: false, message: 'Application not found' });
    if (action === 'withdraw') {
      if (!['submitted', 'under_review', 'shortlisted', 'interview_scheduled'].includes(application.status)) {
        return res.status(409).json({ success: false, message: 'This application can no longer be withdrawn' });
      }
      application.status = 'withdrawn';
      application.withdrawnAt = new Date();
    }
    if (action === 'archive') application.archivedAt = new Date();
    if (action === 'restore') application.archivedAt = undefined;
    if (applicantNote !== undefined) application.applicantNote = applicantNote.trim().slice(0, 2000);
    await application.save();
    return res.status(200).json({ success: true, message: 'Application updated', data: { id: String(application._id), kind: req.params.kind, status: application.status, applicantNote: application.applicantNote || '', archivedAt: application.archivedAt || null, withdrawnAt: application.withdrawnAt || null, updatedAt: application.updatedAt } });
  } catch (error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ success: false, message: error.message });
    console.error('[User Application Error - Update]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update application' });
  }
};

export const deleteUserApplication = async (req, res) => {
  if (req.user.role !== 'user') return res.status(403).json({ success: false, message: 'Only applicants can delete their applications' });
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid application ID' });
  const Model = modelForKind(req.params.kind);
  if (!Model) return res.status(400).json({ success: false, message: 'Invalid application type' });
  let application;
  try {
    const selection = req.params.kind === 'company' ? '+submittedFiles.storageKey' : '';
    if (req.params.kind === 'job') {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          application = await Model.findOne({ _id: req.params.id, applicantId: req.user._id }).select(selection).session(session);
          if (!application) return;
          await application.deleteOne({ session });
          if (application.status !== 'draft') {
            await JobListing.updateOne(
              { _id: application.jobId, applicationCount: { $gt: 0 } },
              { $inc: { applicationCount: -1 } },
              { session }
            );
          }
        });
      } finally {
        await session.endSession();
      }
    } else {
      application = await Model.findOne({ _id: req.params.id, applicantId: req.user._id }).select(selection);
      if (application) await application.deleteOne();
    }
    if (!application) return res.status(404).json({ success: false, message: 'Application not found' });
    if (req.params.kind === 'company') {
      const uploadDirectory = getCompanyUploadDirectory();
      await Promise.all((application.submittedFiles || []).map(async (file) => {
        const storageKey = String(file.storageKey || '');
        if (!/^[a-f\d-]+\.(?:pdf|jpg|png)$/i.test(storageKey)) return;
        const filePath = path.resolve(uploadDirectory, storageKey);
        if (filePath.startsWith(`${path.resolve(uploadDirectory)}${path.sep}`)) await fs.unlink(filePath).catch(() => {});
      }));
    }
    return res.status(200).json({ success: true, message: 'Application permanently deleted' });
  } catch (error) {
    console.error('[User Application Error - Delete]:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete application' });
  }
};
