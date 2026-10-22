import Company from '../models/Company.js';
import JobApplication from '../models/JobApplication.js';
import JobListing from '../models/JobListing.js';
import User from '../models/User.js';
import { notifyAdmins, notifyUser, recordActivity } from '../utils/platformEvents.js';

const employmentTypes = new Set(['full_time', 'part_time', 'contract', 'temporary', 'internship', 'casual']);
const payPeriods = new Set(['hour', 'day', 'week', 'month', 'year', 'project']);
const workSetups = new Set(['on_site', 'remote', 'hybrid']);
const fileTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const validId = (id) => /^[a-f\d]{24}$/i.test(String(id));
const inputError = (message) => Object.assign(new Error(message), { statusCode: 400 });
const sameInstant = (a, b) => {
  const left = a ? new Date(a).getTime() : Number.NaN;
  const right = b ? new Date(b).getTime() : Number.NaN;
  return Number.isFinite(left) && Number.isFinite(right) && left === right;
};

const normalizeRequirements = (requirements = []) => {
  if (!Array.isArray(requirements) || requirements.length > 25) throw inputError('Add no more than 25 job requirements');
  return requirements.map((requirement, index) => {
    const type = requirement.type;
    const title = String(requirement.title || '').trim();
    if (!['file', 'text'].includes(type) || !title || title.length > 120) throw inputError('Each requirement needs a valid type and title');
    const allowedFileTypes = requirement.allowedFileTypes || [];
    if (type === 'file' && (!Array.isArray(allowedFileTypes) || !allowedFileTypes.length || allowedFileTypes.some((mimeType) => !fileTypes.has(mimeType)))) {
      throw inputError(`${title} must allow at least one supported file type`);
    }
    const maxSizeMB = Number(requirement.maxSizeMB || 5);
    if (type === 'file' && (!Number.isFinite(maxSizeMB) || maxSizeMB < 0.1 || maxSizeMB > 10)) throw inputError('File size must be between 0.1 and 10 MB');
    return {
      _id: requirement._id,
      type,
      title,
      description: String(requirement.description || '').trim().slice(0, 1500),
      isRequired: requirement.isRequired !== false,
      allowedFileTypes: type === 'file' ? [...new Set(allowedFileTypes)] : [],
      maxSizeMB: type === 'file' ? maxSizeMB : 5,
      order: Number.isInteger(Number(requirement.order)) ? Number(requirement.order) : index,
    };
  });
};

const normalizeStringList = (value, field, limit, maxLength) => {
  if (value === undefined || value === null || value === '') return [];
  if (!Array.isArray(value) || value.length > limit) throw inputError(`${field} must contain no more than ${limit} items`);
  return value.map((item) => String(item).trim()).filter(Boolean).map((item) => {
    if (item.length > maxLength) throw inputError(`${field} items must be ${maxLength} characters or fewer`);
    return item;
  });
};

const normalizeJobInput = (body = {}, fallback = {}) => {
  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim();
  if (!title || !description) throw inputError('Job title and description are required');
  const category = String(body.category || fallback.category || '').trim();
  if (!category) throw inputError('Choose a job category');
  if (!employmentTypes.has(body.employmentType)) throw inputError('Choose a valid employment type');

  const normalizedStatus = String(body.status || '').trim().toLowerCase();
  if (normalizedStatus && !['draft', 'pending_verification', 'verified', 'rejected', 'closed', 'open'].includes(normalizedStatus)) {
    throw inputError('Choose a valid job status');
  }

  const salaryType = body.salaryType || 'range';
  const salaryMin = body.salaryMin === '' || body.salaryMin == null ? undefined : Number(body.salaryMin);
  let salaryMax = body.salaryMax === '' || body.salaryMax == null ? undefined : Number(body.salaryMax);
  if (!['fixed', 'range'].includes(salaryType)) throw inputError('Choose fixed pay or a salary range');
  if ((salaryMin !== undefined && (!Number.isFinite(salaryMin) || salaryMin < 0)) || (salaryMax !== undefined && (!Number.isFinite(salaryMax) || salaryMax < 0))) throw inputError('Salary values must be non-negative numbers');
  if (salaryMin !== undefined && salaryMax !== undefined && salaryMin > salaryMax) throw inputError('Minimum salary cannot exceed maximum salary');
  if (salaryType === 'fixed' && salaryMin === undefined) throw inputError('Fixed salary amount is required');
  if (salaryType === 'fixed' && salaryMax === undefined) salaryMax = salaryMin;
  if (salaryType === 'fixed' && salaryMin !== salaryMax) throw inputError('Fixed salary must use equal min and max values');
  if (!payPeriods.has(body.salaryPayPeriod || 'month')) throw inputError('Choose a valid salary pay period');
  const currency = String(body.currency ?? fallback.currency ?? 'USD').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw inputError('Currency must be a three-letter code');
  const workSetup = body.workSetup ?? fallback.workSetup ?? 'on_site';
  if (!workSetups.has(workSetup)) throw inputError('Choose on-site, remote, or hybrid work');

  const interviewDate = body.interviewDate ? new Date(body.interviewDate) : undefined;
  if (interviewDate && Number.isNaN(interviewDate.getTime())) throw inputError('Interview date is invalid');
  // Only a newly chosen past date is rejected. A date already stored on the
  // listing is kept as-is so unrelated edits stay possible after it elapses.
  if (interviewDate && interviewDate.getTime() < Date.now() && !sameInstant(interviewDate, fallback.interviewDate)) throw inputError('Interview date cannot be in the past');
  const applicationDeadline = body.applicationDeadline ? new Date(body.applicationDeadline) : undefined;
  if (applicationDeadline && Number.isNaN(applicationDeadline.getTime())) throw inputError('Application deadline is invalid');
  if (applicationDeadline && applicationDeadline.getTime() < Date.now() && !sameInstant(applicationDeadline, fallback.applicationDeadline)) throw inputError('Application deadline cannot be in the past');
  const startDate = body.startDate ? new Date(body.startDate) : undefined;
  if (startDate && Number.isNaN(startDate.getTime())) throw inputError('Start date is invalid');

  const slots = Number(body.slots ?? 1);
  if (!Number.isInteger(slots) || slots < 1 || slots > 10000) throw inputError('Slots must be a whole number between 1 and 10000');
  const interviewLink = String(body.interviewLink || '').trim();
  if (interviewLink && !/^https?:\/\//i.test(interviewLink)) throw inputError('Interview link must use HTTP or HTTPS');
  const latitudeValue = body.latitude ?? fallback.latitude;
  const longitudeValue = body.longitude ?? fallback.longitude;
  const latitude = latitudeValue === '' || latitudeValue == null ? undefined : Number(latitudeValue);
  const longitude = longitudeValue === '' || longitudeValue == null ? undefined : Number(longitudeValue);
  if ((latitude !== undefined && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90))
    || (longitude !== undefined && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))) throw inputError('Location coordinates are invalid');
  if ((latitude === undefined) !== (longitude === undefined)) throw inputError('Provide both latitude and longitude');
  const contactEmail = String(body.contactEmail ?? fallback.contactEmail ?? '').trim().toLowerCase();
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) throw inputError('Contact email is invalid');

  return {
    title,
    category: category.slice(0, 100),
    description,
    responsibilities: normalizeStringList(body.responsibilities ?? fallback.responsibilities, 'Responsibilities', 30, 1000),
    qualifications: normalizeStringList(body.qualifications ?? fallback.qualifications, 'Qualifications', 30, 1000),
    skills: normalizeStringList(body.skills ?? fallback.skills, 'Skills', 40, 80),
    requirements: normalizeRequirements(body.requirements || []),
    salaryType,
    salaryMin,
    salaryMax,
    salaryPayPeriod: body.salaryPayPeriod || 'month',
    currency,
    salaryNegotiable: body.salaryNegotiable === undefined ? Boolean(fallback.salaryNegotiable) : Boolean(body.salaryNegotiable),
    benefits: normalizeStringList(body.benefits ?? fallback.benefits, 'Benefits', 30, 120),
    workSetup,
    experienceLevel: String(body.experienceLevel ?? fallback.experienceLevel ?? '').trim().slice(0, 80),
    educationLevel: String(body.educationLevel ?? fallback.educationLevel ?? '').trim().slice(0, 120),
    dressCode: String(body.dressCode ?? fallback.dressCode ?? '').trim().slice(0, 500),
    workSchedule: String(body.workSchedule ?? fallback.workSchedule ?? '').trim().slice(0, 500),
    startDate,
    contactName: String(body.contactName ?? fallback.contactName ?? '').trim().slice(0, 120),
    contactEmail,
    interviewerName: String(body.interviewerName || '').trim().slice(0, 120),
    interviewerPosition: String(body.interviewerPosition || '').trim().slice(0, 120),
    interviewerContact: String(body.interviewerContact || '').trim().slice(0, 200),
    interviewDate,
    interviewLocation: String(body.interviewLocation || '').trim().slice(0, 300),
    interviewLink,
    slots,
    applicationDeadline,
    employmentType: body.employmentType,
    location: String(body.location ?? fallback.location ?? '').trim().slice(0, 200),
    formattedAddress: String(body.formattedAddress ?? fallback.formattedAddress ?? '').trim().slice(0, 300),
    latitude,
    longitude,
  };
};

const canPublishJob = async (providerId, companyId) => {
  const [provider, company] = await Promise.all([
    User.findOne({ _id: providerId, role: 'provider', status: 'active', isArchived: { $ne: true }, 'businessVerification.status': 'approved' }).select('_id'),
    Company.findOne({ _id: companyId, providerId, status: 'approved', isArchived: false }).select('_id'),
  ]);
  return Boolean(provider && company);
};

export const getProviderJobs = async (req, res) => {
  try {
    const { companyId, status, search = '' } = req.query;
    const query = { providerId: req.user._id, archivedAt: { $exists: false } };
    if (companyId && validId(companyId)) query.companyId = companyId;
    if (['draft', 'pending_verification', 'verified', 'rejected', 'closed', 'open'].includes(status)) {
      query.status = status === 'open' ? 'verified' : status;
    }
    if (search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [{ title: { $regex: escaped, $options: 'i' } }, { location: { $regex: escaped, $options: 'i' } }];
    }
    const jobs = await JobListing.find(query).populate('companyId', 'name status location formattedAddress latitude longitude').sort({ updatedAt: -1 }).lean();
    const counts = await JobApplication.aggregate([
      { $match: { jobId: { $in: jobs.map((job) => job._id) }, status: { $ne: 'draft' } } },
      { $group: { _id: '$jobId', applicants: { $sum: 1 }, pending: { $sum: { $cond: [{ $in: ['$status', ['submitted', 'under_review']] }, 1, 0] } } } },
    ]);
    const countsByJob = new Map(counts.map((count) => [String(count._id), count]));
    return res.status(200).json({ success: true, count: jobs.length, data: jobs.map((job) => ({ ...job, applicantCount: countsByJob.get(String(job._id))?.applicants || 0, pendingApplicationCount: countsByJob.get(String(job._id))?.pending || 0 })) });
  } catch (error) {
    console.error('[Job Error - Provider List]:', error);
    return res.status(500).json({ success: false, message: 'Failed to load job listings' });
  }
};

export const createJob = async (req, res) => {
  try {
    if (!validId(req.params.companyId)) return res.status(400).json({ success: false, message: 'Invalid company ID' });
    const company = await Company.findOne({ _id: req.params.companyId, providerId: req.user._id, status: 'approved', isArchived: false }).select('_id category location formattedAddress latitude longitude');
    if (!company) return res.status(403).json({ success: false, message: 'Only your approved companies can publish jobs' });
    const payload = normalizeJobInput(req.body, {
      category: company.category,
      location: company.location,
      formattedAddress: company.formattedAddress,
      latitude: company.latitude,
      longitude: company.longitude,
    });
    const workflowAction = req.body.workflowAction || 'submit';
    if (!['draft', 'submit'].includes(workflowAction)) return res.status(400).json({ success: false, message: 'Choose draft or submit for review' });
    const job = await JobListing.create({
      ...payload,
      companyId: company._id,
      providerId: req.user._id,
      status: workflowAction === 'submit' && req.body.workflowAction ? 'pending_verification' : 'draft',
      reviewStatus: workflowAction === 'submit' ? 'pending' : 'draft',
    });
    if (workflowAction === 'submit') {
      await Promise.all([
        notifyAdmins(`New job submission: ${job.title}`, '/admin/jobs'),
        recordActivity(req.user._id, 'submitted a job listing for review', job._id, 'job'),
      ]);
    }
    return res.status(201).json({ success: true, message: workflowAction === 'draft' ? 'Job saved as a draft.' : 'Job submitted for verification and is not visible to users yet.', data: job });
  } catch (error) {
    if (error.statusCode || error.name === 'ValidationError') return res.status(400).json({ success: false, message: error.message });
    console.error('[Job Error - Create]:', error);
    return res.status(500).json({ success: false, message: 'Failed to create job listing' });
  }
};

export const getProviderJob = async (req, res) => {
  if (!validId(req.params.jobId)) return res.status(400).json({ success: false, message: 'Invalid job ID' });
  try {
    const job = await JobListing.findOne({ _id: req.params.jobId, providerId: req.user._id, archivedAt: { $exists: false } }).populate('companyId', 'name status');
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    return res.status(200).json({ success: true, data: job });
  } catch (error) {
    console.error('[Job Error - Provider Detail]:', error);
    return res.status(500).json({ success: false, message: 'Failed to load job listing' });
  }
};

export const updateProviderJob = async (req, res) => {
  if (!validId(req.params.jobId)) return res.status(400).json({ success: false, message: 'Invalid job ID' });
  try {
    const job = await JobListing.findOne({ _id: req.params.jobId, providerId: req.user._id, archivedAt: { $exists: false } });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (req.body.workflowAction !== 'draft' && !await Company.exists({ _id: job.companyId, providerId: req.user._id, status: 'approved', isArchived: false })) {
      return res.status(403).json({ success: false, message: 'Only jobs for your approved companies can be submitted for review' });
    }
    const payload = normalizeJobInput({ ...job.toObject(), ...req.body }, job.toObject());
    if (payload.slots < job.applicationCount) return res.status(400).json({ success: false, message: 'Slots cannot be lower than the number of applications already received' });
    const workflowAction = req.body.workflowAction;
    if (workflowAction && !['draft', 'submit'].includes(workflowAction)) return res.status(400).json({ success: false, message: 'Choose draft or submit for review' });
    const wasPublished = job.status === 'verified' || job.status === 'open';
    Object.assign(job, payload);
    // Saving a draft of an already published listing keeps it live: a private
    // working copy must never pull a visible job out of the directory.
    const keepsPublished = workflowAction === 'draft' && wasPublished;
    if (!keepsPublished) {
      job.reviewStatus = workflowAction === 'draft' ? 'draft' : 'pending';
      job.reviewedBy = undefined;
      job.reviewedAt = undefined;
      job.reviewReason = '';
      job.status = workflowAction === 'draft' ? 'draft' : workflowAction === 'submit' ? 'pending_verification' : (wasPublished ? 'pending_verification' : 'draft');
    }
    await job.save();
    if (workflowAction === 'submit' || !workflowAction) {
      await Promise.all([
        notifyAdmins(`Updated job submission: ${job.title}`, '/admin/jobs'),
        recordActivity(req.user._id, 'submitted a job listing for review', job._id, 'job'),
      ]);
    }
    return res.status(200).json({
      success: true,
      message: keepsPublished
        ? 'Changes saved. Your published listing stays live.'
        : workflowAction === 'draft'
          ? 'Job saved as a draft.'
          : 'Job updated and sent back for admin verification.',
      data: job,
    });
  } catch (error) {
    if (error.statusCode || error.name === 'ValidationError') return res.status(400).json({ success: false, message: error.message });
    console.error('[Job Error - Update]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update job listing' });
  }
};

export const updateProviderJobStatus = async (req, res) => {
  if (!validId(req.params.jobId)) return res.status(400).json({ success: false, message: 'Invalid job ID' });
  const { status } = req.body;
  const allowed = ['draft', 'pending_verification', 'verified', 'closed', 'open'];
  if (!allowed.includes(status)) return res.status(400).json({ success: false, message: 'Status must be draft, pending_verification, verified, closed, or open' });
  try {
    const job = await JobListing.findOne({ _id: req.params.jobId, providerId: req.user._id, archivedAt: { $exists: false } });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    const normalizedStatus = status === 'open' ? 'verified' : status;
    if (normalizedStatus === 'verified') {
      if (job.reviewStatus !== 'approved') return res.status(400).json({ success: false, message: 'Admin approval is required before making this job visible to users' });
      if (!await canPublishJob(req.user._id, job.companyId)) return res.status(400).json({ success: false, message: 'Company approval is required before making this job visible to users' });
      if (job.applicationDeadline && job.applicationDeadline.getTime() < Date.now()) return res.status(400).json({ success: false, message: 'The application deadline has passed' });
    }
    job.status = normalizedStatus;
    if (normalizedStatus === 'verified') {
      job.reviewStatus = 'approved';
    }
    await job.save();
    return res.status(200).json({ success: true, message: `Job ${normalizedStatus}`, data: job });
  } catch (error) {
    console.error('[Job Error - Status]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update job status' });
  }
};

export const archiveProviderJob = async (req, res) => {
  if (!validId(req.params.jobId)) return res.status(400).json({ success: false, message: 'Invalid job ID' });
  try {
    const job = await JobListing.findOneAndUpdate({ _id: req.params.jobId, providerId: req.user._id, archivedAt: { $exists: false } }, { $set: { archivedAt: new Date(), status: 'closed' } }, { new: true });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    return res.status(200).json({ success: true, message: 'Job archived; application history retained' });
  } catch (error) {
    console.error('[Job Error - Archive]:', error);
    return res.status(500).json({ success: false, message: 'Failed to archive job listing' });
  }
};

export const getPublicJobs = async (req, res) => {
  try {
    const { search = '', employmentType, location } = req.query || {};
    const approvedProviders = await User.find({ role: 'provider', status: 'active', isArchived: { $ne: true }, 'businessVerification.status': 'approved' }).select('_id');
    const companies = await Company.find({ providerId: { $in: approvedProviders.map((user) => user._id) }, status: 'approved', isArchived: false }).select('_id');
    const query = {
      companyId: { $in: companies.map((company) => company._id) },
      status: { $in: ['verified', 'open'] },
      reviewStatus: 'approved',
      archivedAt: { $exists: false },
      $expr: { $lt: [{ $ifNull: ['$applicationCount', 0] }, '$slots'] },
      $and: [{ $or: [{ applicationDeadline: { $exists: false } }, { applicationDeadline: null }, { applicationDeadline: { $gte: new Date() } }] }],
    };
    if (employmentTypes.has(employmentType)) query.employmentType = employmentType;
    if (location?.trim()) query.location = { $regex: location.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    if (search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [{ title: { $regex: escaped, $options: 'i' } }, { description: { $regex: escaped, $options: 'i' } }];
    }
    const jobs = await JobListing.find(query).populate('companyId', 'name category location logo').sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, count: jobs.length, data: jobs });
  } catch (error) {
    console.error('[Job Error - Public List]:', error);
    return res.status(500).json({ success: false, message: 'Failed to load jobs' });
  }
};

export const getPublicJob = async (req, res) => {
  if (!validId(req.params.jobId)) return res.status(400).json({ success: false, message: 'Invalid job ID' });
  try {
    const job = await JobListing.findOne({
      _id: req.params.jobId,
      status: { $in: ['verified', 'open'] },
      reviewStatus: 'approved',
      archivedAt: { $exists: false },
      $expr: { $lt: [{ $ifNull: ['$applicationCount', 0] }, '$slots'] },
      $or: [{ applicationDeadline: { $exists: false } }, { applicationDeadline: null }, { applicationDeadline: { $gte: new Date() } }],
    }).populate({ path: 'companyId', match: { status: 'approved', isArchived: false }, select: 'name category location formattedAddress latitude longitude logo providerId' }).lean();
    if (!job?.companyId) return res.status(404).json({ success: false, message: 'Job listing not found' });
    const provider = await User.findOne({ _id: job.companyId.providerId, role: 'provider', status: 'active', isArchived: { $ne: true }, 'businessVerification.status': 'approved' }).select('_id');
    if (!provider) return res.status(404).json({ success: false, message: 'Job listing not found' });
    return res.status(200).json({ success: true, data: job });
  } catch (error) {
    console.error('[Job Error - Public Detail]:', error);
    return res.status(500).json({ success: false, message: 'Failed to load job listing' });
  }
};

export const adminListJobs = async (req, res) => {
  try {
    const { status, reviewStatus, search = '', page = 1, limit = 20 } = req.query;
    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));
    const query = { archivedAt: { $exists: false } };
    if (['draft', 'pending_verification', 'verified', 'rejected', 'closed', 'open'].includes(status)) {
      query.status = status === 'open' ? 'verified' : status;
    }
    if (['pending', 'approved', 'rejected'].includes(reviewStatus)) query.reviewStatus = reviewStatus;
    else query.reviewStatus = { $ne: 'draft' };
    if (search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [{ title: { $regex: escaped, $options: 'i' } }, { description: { $regex: escaped, $options: 'i' } }];
    }
    const [jobs, total] = await Promise.all([
      JobListing.find(query).populate('providerId', 'name email').populate('companyId', 'name status location formattedAddress latitude longitude').sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize).lean(),
      JobListing.countDocuments(query),
    ]);
    return res.status(200).json({ success: true, count: total, page: pageNumber, pages: Math.ceil(total / pageSize), data: jobs });
  } catch (error) {
    console.error('[Admin Error - Jobs]:', error);
    return res.status(500).json({ success: false, message: 'Failed to load job listings' });
  }
};

export const adminReviewJob = async (req, res) => {
  const { reviewStatus, reviewReason = '' } = req.body;
  if (!['approved', 'rejected'].includes(reviewStatus)) return res.status(400).json({ success: false, message: 'Review status must be approved or rejected' });
  if (reviewStatus === 'rejected' && !String(reviewReason).trim()) return res.status(400).json({ success: false, message: 'Rejection reason is required' });
  try {
    const job = await JobListing.findById(req.params.jobId);
    if (!job || job.archivedAt) return res.status(404).json({ success: false, message: 'Job listing not found' });
    if (job.reviewStatus === 'draft') return res.status(400).json({ success: false, message: 'Draft jobs cannot be reviewed until submitted' });
    if (reviewStatus === 'approved' && !await canPublishJob(job.providerId, job.companyId)) return res.status(400).json({ success: false, message: 'Provider and company approval are required before approving this job' });
    job.reviewStatus = reviewStatus;
    job.reviewReason = reviewStatus === 'rejected' ? String(reviewReason).trim().slice(0, 500) : '';
    job.reviewedBy = req.user._id;
    job.reviewedAt = new Date();
    if (reviewStatus === 'approved') {
      job.status = 'verified';
    } else {
      job.status = 'rejected';
    }
    await job.save();
    await Promise.all([
      notifyUser(job.providerId, `Your job listing “${job.title}” was ${reviewStatus}${reviewStatus === 'rejected' ? `: ${job.reviewReason}` : ' and is ready to publish'}.`, `/provider/jobs/${job._id}/edit`),
      recordActivity(req.user._id, `${reviewStatus} a job listing`, job._id, 'job'),
    ]);
    return res.status(200).json({ success: true, message: `Job ${reviewStatus}`, data: job });
  } catch (error) {
    console.error('[Admin Error - Job Review]:', error);
    return res.status(500).json({ success: false, message: 'Failed to review job listing' });
  }
};

export const adminArchiveJob = async (req, res) => {
  try {
    const job = await JobListing.findByIdAndUpdate(req.params.jobId, { $set: { archivedAt: new Date(), status: 'closed' } }, { new: true });
    if (!job) return res.status(404).json({ success: false, message: 'Job listing not found' });
    return res.status(200).json({ success: true, message: 'Job archived; application history retained' });
  } catch (error) {
    console.error('[Admin Error - Archive Job]:', error);
    return res.status(500).json({ success: false, message: 'Failed to archive job listing' });
  }
};
