import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import User from '../models/User.js';
import Application from '../models/Application.js';
import Company from '../models/Company.js';
import CompanyApplication from '../models/CompanyApplication.js';
import JobApplication from '../models/JobApplication.js';
import JobListing from '../models/JobListing.js';
import WorkLog from '../models/WorkLog.js';
import ActivityLog from '../models/ActivityLog.js';
import { adminArchiveJob, adminListJobs, adminReviewJob } from '../controllers/jobController.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { MAX_BUSINESS_DOCUMENT_SIZE } from '../utils/businessVerification.js';
import { getCompanyUploadDirectory } from '../utils/companyUpload.js';
import { getJobUploadDirectory } from '../utils/jobUpload.js';
import { notifyUser, recordActivity } from '../utils/platformEvents.js';

const router = express.Router();

router.use(protect, adminOnly);

router.get('/jobs', adminListJobs);
router.patch('/jobs/:jobId/review', adminReviewJob);
router.delete('/jobs/:jobId', adminArchiveJob);

router.get('/activity-log', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const [data, count] = await Promise.all([
      ActivityLog.find().populate('actorId', 'name email role').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      ActivityLog.countDocuments(),
    ]);
    return res.status(200).json({ success: true, count, page, pages: Math.ceil(count / limit), data });
  } catch (error) {
    console.error('[Admin Error - Activity Log]:', error);
    return res.status(500).json({ success: false, message: 'Failed to load activity log' });
  }
});

router.get('/applications', async (req, res) => {
  try {
    const { type = 'all', status, search = '', page = 1, limit = 30 } = req.query;
    if (!['all', 'tracker', 'company', 'job'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Application type must be all, tracker, company, or job' });
    }
    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 30));
    const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = escaped ? new RegExp(escaped, 'i') : null;
    const matchingUsers = regex ? await User.find({ $or: [{ name: regex }, { email: regex }] }).distinct('_id') : [];
    const matchingCompanies = regex ? await Company.find({ name: regex }).distinct('_id') : [];
    const matchingJobs = regex ? await JobListing.find({ title: regex }).distinct('_id') : [];
    const queryFor = (kind) => {
      const query = {};
      if (status) query.status = status;
      if (regex) {
        if (kind === 'tracker') query.$or = [{ company: regex }, { role: regex }, { userId: { $in: matchingUsers } }];
        if (kind === 'company') query.$or = [{ applicantId: { $in: matchingUsers } }, { companyId: { $in: matchingCompanies } }];
        if (kind === 'job') query.$or = [{ applicantId: { $in: matchingUsers } }, { companyId: { $in: matchingCompanies } }, { jobId: { $in: matchingJobs } }];
      }
      return query;
    };
    const kinds = type === 'all' ? ['tracker', 'company', 'job'] : [type];
    const results = await Promise.all(kinds.map(async (kind) => {
      const query = queryFor(kind);
      if (kind === 'tracker') {
        const [records, total] = await Promise.all([Application.find(query).populate('userId', 'name email').sort({ updatedAt: -1 }).limit(pageNumber * pageSize).lean(), Application.countDocuments(query)]);
        return { total, items: records.map((record) => ({ id: String(record._id), type: kind, candidate: record.userId?.name || 'Unknown applicant', email: record.userId?.email || '', organization: record.company, position: record.role, status: record.status, createdAt: record.createdAt, updatedAt: record.updatedAt })) };
      }
      if (kind === 'company') {
        const [records, total] = await Promise.all([CompanyApplication.find(query).populate('applicantId', 'name email').populate('companyId', 'name').sort({ updatedAt: -1 }).limit(pageNumber * pageSize).lean(), CompanyApplication.countDocuments(query)]);
        return { total, items: records.map((record) => ({ id: String(record._id), type: kind, candidate: record.applicantId?.name || 'Unknown applicant', email: record.applicantId?.email || '', organization: record.companyId?.name || 'Company unavailable', position: 'Company application', status: record.status, createdAt: record.createdAt, updatedAt: record.updatedAt })) };
      }
      const [records, total] = await Promise.all([JobApplication.find(query).populate('applicantId', 'name email').populate('companyId', 'name').populate('jobId', 'title').sort({ updatedAt: -1 }).limit(pageNumber * pageSize).lean(), JobApplication.countDocuments(query)]);
      return { total, items: records.map((record) => ({ id: String(record._id), type: kind, candidate: record.applicantId?.name || record.applicant?.name || 'Unknown applicant', email: record.applicantId?.email || record.applicant?.email || '', organization: record.companyId?.name || 'Company unavailable', position: record.jobId?.title || 'Job unavailable', status: record.status, createdAt: record.createdAt, updatedAt: record.updatedAt })) };
    }));
    const data = results.flatMap(({ items }) => items).sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    const count = results.reduce((sum, result) => sum + result.total, 0);
    return res.status(200).json({ success: true, count, page: pageNumber, pages: Math.ceil(count / pageSize), data: data.slice((pageNumber - 1) * pageSize, pageNumber * pageSize) });
  } catch (error) {
    console.error('[Admin Error - Applications]:', error);
    return res.status(500).json({ success: false, message: 'Failed to load applications' });
  }
});

router.delete('/applications/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  if (!['tracker', 'company', 'job'].includes(type) || !/^[a-f\d]{24}$/i.test(id)) {
    return res.status(400).json({ success: false, message: 'Invalid application reference' });
  }
  try {
    let removed;
    let files = [];
    let directory;
    if (type === 'tracker') {
      removed = await Application.findByIdAndDelete(id);
    } else if (type === 'company') {
      const application = await CompanyApplication.findById(id).select('+submittedFiles.storageKey');
      if (application) {
        files = application.submittedFiles.map((file) => file.storageKey).filter(Boolean);
        removed = await CompanyApplication.findByIdAndDelete(id);
        directory = getCompanyUploadDirectory();
      }
    } else {
      const application = await JobApplication.findById(id).select('+responses.storageKey');
      if (application) {
        files = application.responses.map((response) => response.storageKey).filter(Boolean);
        removed = await JobApplication.findByIdAndDelete(id);
        directory = getJobUploadDirectory();
      }
    }
    if (!removed) return res.status(404).json({ success: false, message: 'Application not found' });
    if (directory) await Promise.all(files.map((file) => fs.unlink(path.join(directory, path.basename(file))).catch(() => {})));
    if (type === 'job') {
      await JobListing.updateOne({ _id: removed.jobId, applicationCount: { $gt: 0 } }, { $inc: { applicationCount: -1 } });
    }
    return res.status(200).json({ success: true, message: 'Application deleted' });
  } catch (error) {
    console.error('[Admin Error - Delete Application]:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete application' });
  }
});

router.get('/companies', async (req, res) => {
  try {
    const { status, search = '', page = 1, limit = 20 } = req.query;
    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));
    const query = { isArchived: false };
    if (['pending', 'approved', 'rejected'].includes(status)) query.status = status;
    if (search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { category: { $regex: escaped, $options: 'i' } },
      ];
    }
    const [companies, total] = await Promise.all([
      Company.find(query).populate('providerId', 'name email businessVerification.status').sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize).lean(),
      Company.countDocuments(query),
    ]);
    const applicantCounts = await CompanyApplication.aggregate([
      { $match: { companyId: { $in: companies.map((company) => company._id) } } },
      { $group: { _id: '$companyId', count: { $sum: 1 } } },
    ]);
    const countByCompany = new Map(applicantCounts.map((entry) => [String(entry._id), entry.count]));
    return res.status(200).json({
      success: true,
      count: total,
      page: pageNumber,
      pages: Math.ceil(total / pageSize),
      data: companies.map((company) => ({ ...company, applicantCount: countByCompany.get(String(company._id)) || 0 })),
    });
  } catch (error) {
    console.error('[Admin Error - Companies]:', error);
    return res.status(500).json({ success: false, message: 'Failed to load companies' });
  }
});

router.patch('/companies/:id/review', async (req, res) => {
  try {
    const { status, rejectionReason = '' } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Review status must be approved or rejected' });
    }
    if (status === 'rejected' && !String(rejectionReason).trim()) {
      return res.status(400).json({ success: false, message: 'Provide a reason when rejecting a company' });
    }

    const company = await Company.findById(req.params.id).populate('providerId', 'businessVerification.status');
    if (!company || company.isArchived) return res.status(404).json({ success: false, message: 'Company not found' });
    if (status === 'approved' && company.providerId?.businessVerification?.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Verify the provider before approving this company' });
    }
    company.status = status;
    company.rejectionReason = status === 'rejected' ? String(rejectionReason).trim().slice(0, 500) : '';
    company.reviewedBy = req.user._id;
    company.reviewedAt = new Date();
    await company.save();
    await Promise.all([
      notifyUser(company.providerId._id, `${company.name} was ${status}${status === 'rejected' ? `: ${company.rejectionReason}` : ' and is now verified'}.`, `/provider/companies/${company._id}`),
      recordActivity(req.user._id, `${status} a company listing`, company._id, 'company'),
    ]);
    return res.status(200).json({ success: true, message: `Company ${status}`, data: company });
  } catch (error) {
    console.error('[Admin Error - Company Review]:', error);
    return res.status(500).json({ success: false, message: 'Failed to review company' });
  }
});

router.delete('/companies/:id', async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { $set: { isArchived: true, archivedAt: new Date() } },
      { new: true }
    );
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    return res.status(200).json({ success: true, message: 'Company archived; application history retained' });
  } catch (error) {
    console.error('[Admin Error - Archive Company]:', error);
    return res.status(500).json({ success: false, message: 'Failed to archive company' });
  }
});

router.get('/providers/:id/verification-document', async (req, res) => {
  try {
    const provider = await User.findOne({ _id: req.params.id, role: 'provider' })
      .select('+businessVerification.documentData');
    const verification = provider?.businessVerification;
    if (!verification?.documentData) {
      return res.status(404).json({ success: false, message: 'Verification document not found' });
    }

    const fileName = (verification.documentName || 'business-document').replace(/[\r\n"\\]/g, '_');
    res.set('Content-Type', verification.documentMimeType);
    res.set('Content-Length', String(Math.min(verification.documentSize, MAX_BUSINESS_DOCUMENT_SIZE)));
    res.set('Content-Disposition', `inline; filename="${fileName}"`);
    return res.send(verification.documentData);
  } catch (error) {
    console.error('[Admin Error - Provider Document]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve verification document' });
  }
});

router.patch('/providers/:id/verification', async (req, res) => {
  try {
    const { status, rejectionReason = '' } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Review status must be approved or rejected' });
    }
    if (status === 'rejected' && !rejectionReason.trim()) {
      return res.status(400).json({ success: false, message: 'Provide a reason when rejecting a verification' });
    }

    const provider = await User.findOne({ _id: req.params.id, role: 'provider' })
      .select('+businessVerification.documentData');
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }
    if (!provider.businessVerification?.documentData) {
      return res.status(400).json({ success: false, message: 'Provider has not submitted a verification document' });
    }

    provider.businessVerification.status = status;
    provider.businessVerification.rejectionReason = status === 'rejected' ? rejectionReason.trim().slice(0, 500) : '';
    provider.businessVerification.reviewedAt = new Date();
    provider.businessVerification.reviewedBy = req.user._id;
    await provider.save();
    await Promise.all([
      notifyUser(provider._id, `Your provider verification was ${status}${status === 'rejected' ? `: ${provider.businessVerification.rejectionReason}` : ''}.`, '/provider'),
      recordActivity(req.user._id, `${status} provider verification`, provider._id, 'provider'),
    ]);

    return res.status(200).json({ success: true, message: `Provider verification ${status}`, data: provider.toJSON() });
  } catch (error) {
    console.error('[Admin Error - Provider Verification]:', error);
    return res.status(500).json({ success: false, message: 'Failed to review provider verification' });
  }
});

// @desc    Platform Aggregate Cohort Metrics
// @route   GET /api/admin/aggregate-metrics
router.get('/aggregate-metrics', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user', isArchived: { $ne: true } });
    const trackedApplications = await Application.countDocuments();
    const totalProviders = await User.countDocuments({ role: 'provider', isArchived: { $ne: true } });
    const pendingVerifications = await User.countDocuments({
      role: 'provider',
      isArchived: { $ne: true },
      $or: [
        { 'businessVerification.status': 'pending' },
        { 'businessVerification.status': 'not_submitted' },
        { 'businessVerification.status': { $exists: false } },
      ],
    });
    const totalCompanies = await Company.countDocuments({ isArchived: false });
    const totalCompanyApplications = await CompanyApplication.countDocuments();
    const totalJobListings = await JobListing.countDocuments({ archivedAt: { $exists: false } });
    const pendingJobReviews = await JobListing.countDocuments({ reviewStatus: 'pending', archivedAt: { $exists: false } });
    const totalJobApplications = await JobApplication.countDocuments();
    const approvedProviders = await User.find({ role: 'provider', status: 'active', isArchived: { $ne: true }, 'businessVerification.status': 'approved' }).select('_id');
    const approvedCompanies = await Company.find({ providerId: { $in: approvedProviders.map(({ _id }) => _id) }, status: 'approved', isArchived: false }).select('_id');
    const activeJobListings = await JobListing.countDocuments({
      companyId: { $in: approvedCompanies.map(({ _id }) => _id) },
      status: { $in: ['verified', 'open'] },
      reviewStatus: 'approved',
      archivedAt: { $exists: false },
      $or: [{ applicationDeadline: { $exists: false } }, { applicationDeadline: null }, { applicationDeadline: { $gte: new Date() } }],
    });
    const [jobStatusRows, companyStatusRows] = await Promise.all([
      JobApplication.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      CompanyApplication.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
    const totalWorkLogs = await WorkLog.countDocuments();
    const paidWorkTotals = await WorkLog.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, amount: { $sum: '$payAmount' } } },
    ]);
    const offeredApps = await Application.find({ status: 'Offered' });
    const firstOfferByUser = new Map();
    for (const application of offeredApps) {
      const offerEvent = application.statusHistory?.find((entry) => entry.status === 'Offered');
      const offerDate = offerEvent?.changedAt || application.updatedAt || application.createdAt;
      const userKey = String(application.userId);
      if (!firstOfferByUser.has(userKey) || offerDate < firstOfferByUser.get(userKey)) firstOfferByUser.set(userKey, offerDate);
    }
    const [acceptedJobApplications, acceptedCompanyApplications] = await Promise.all([
      JobApplication.find({ status: 'accepted' }).select('applicantId updatedAt createdAt').lean(),
      CompanyApplication.find({ status: 'accepted' }).select('applicantId updatedAt createdAt').lean(),
    ]);
    [...acceptedJobApplications, ...acceptedCompanyApplications].forEach((application) => {
      const userKey = String(application.applicantId);
      const offerDate = application.updatedAt || application.createdAt;
      if (!firstOfferByUser.has(userKey) || offerDate < firstOfferByUser.get(userKey)) firstOfferByUser.set(userKey, offerDate);
    });
    const applicationsBeforeOffer = await Promise.all([...firstOfferByUser.entries()].map(async ([userId, offerDate]) => {
      const [tracked, job, company] = await Promise.all([
        Application.countDocuments({ userId, createdAt: { $lte: offerDate } }),
        JobApplication.countDocuments({ applicantId: userId, createdAt: { $lte: offerDate } }),
        CompanyApplication.countDocuments({ applicantId: userId, createdAt: { $lte: offerDate } }),
      ]);
      return tracked + job + company;
    }));
    const usersWithOffer = firstOfferByUser.size;

    const statusCounts = {
      Saved: await Application.countDocuments({ status: 'Saved' }),
      Applied: await Application.countDocuments({ status: 'Applied' }),
      Interviewing: await Application.countDocuments({ status: 'Interviewing' }),
      Offered: await Application.countDocuments({ status: 'Offered' }),
      Rejected: await Application.countDocuments({ status: 'Rejected' }),
    };
    const pipelineStatusMap = {
      submitted: 'Applied',
      under_review: 'Interviewing',
      changes_requested: 'Applied',
      interview_scheduled: 'Interviewing',
      accepted: 'Offered',
      approved: 'Offered',
      rejected: 'Rejected',
    };
    [...jobStatusRows, ...companyStatusRows].forEach(({ _id, count }) => {
      const bucket = pipelineStatusMap[_id];
      if (bucket) statusCounts[bucket] += count;
    });
    const totalApplications = trackedApplications + totalJobApplications + totalCompanyApplications;
    const interviewing = statusCounts.Interviewing;
    const offered = statusCounts.Offered;

    const avgApplicationsPerUser = totalUsers > 0 ? Number((totalApplications / totalUsers).toFixed(1)) : 0;
    const avgApplicationsBeforeOffer = applicationsBeforeOffer.length
      ? Number((applicationsBeforeOffer.reduce((sum, count) => sum + count, 0) / applicationsBeforeOffer.length).toFixed(1))
      : 0;
    const platformInterviewRate = totalApplications > 0 ? Number(((interviewing + offered) / totalApplications * 100).toFixed(1)) : 0;
    const platformOfferRate = totalApplications > 0 ? Number((offered / totalApplications * 100).toFixed(1)) : 0;

    const [recentProviders, recentCompanies, recentJobs, recentJobApplications, recentCompanyApplications] = await Promise.all([
      User.find({ role: 'provider' }).select('name createdAt updatedAt').sort({ updatedAt: -1 }).limit(6).lean(),
      Company.find({}).select('name status createdAt updatedAt').sort({ updatedAt: -1 }).limit(6).lean(),
      JobListing.find({}).select('title reviewStatus createdAt updatedAt').sort({ updatedAt: -1 }).limit(6).lean(),
      JobApplication.find({}).select('status createdAt updatedAt').populate('applicantId', 'name').sort({ updatedAt: -1 }).limit(6).lean(),
      CompanyApplication.find({}).select('status createdAt updatedAt').populate('applicantId', 'name').sort({ updatedAt: -1 }).limit(6).lean(),
    ]);
    const recentActivity = [
      ...recentProviders.map((item) => ({ label: `Provider account updated: ${item.name}`, occurredAt: item.updatedAt || item.createdAt, href: '/admin/providers' })),
      ...recentCompanies.map((item) => ({ label: `Company ${item.status}: ${item.name}`, occurredAt: item.updatedAt || item.createdAt, href: '/admin/companies' })),
      ...recentJobs.map((item) => ({ label: `Job ${item.reviewStatus}: ${item.title}`, occurredAt: item.updatedAt || item.createdAt, href: '/admin/jobs' })),
      ...recentJobApplications.map((item) => ({ label: `Job application ${item.status}${item.applicantId?.name ? ` · ${item.applicantId.name}` : ''}`, occurredAt: item.updatedAt || item.createdAt, href: '/admin/jobs' })),
      ...recentCompanyApplications.map((item) => ({ label: `Company application ${item.status}${item.applicantId?.name ? ` · ${item.applicantId.name}` : ''}`, occurredAt: item.updatedAt || item.createdAt, href: '/admin/companies' })),
    ].sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt)).slice(0, 8);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalProviders,
        pendingVerifications,
        totalCompanies,
        totalCompanyApplications,
        totalJobListings,
        pendingJobReviews,
        totalJobApplications,
        totalWorkLogs,
        totalWorkLogEarnings: paidWorkTotals[0]?.amount || 0,
        totalApplications,
        usersWithOfferCount: usersWithOffer,
        avgApplicationsPerUser,
        avgApplicationsBeforeOffer,
        platformInterviewRate,
        platformOfferRate,
        recentActivity,
        activeJobListings,
        statusCounts,
      },
    });
  } catch (error) {
    console.error('[Admin Error - Aggregate Metrics]:', error);
    res.status(500).json({ success: false, message: 'Failed to compute cohort metrics' });
  }
});

// @desc    Seeker Directory / User Management
// @route   GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { search = '', role, status, verificationStatus, page = 1, limit = 20, archived } = req.query;
    const query = {};

    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));
    if (['user', 'provider', 'admin'].includes(role)) query.role = role;
    if (['active', 'suspended'].includes(status)) query.status = status;
    query.isArchived = archived === 'true' ? true : { $ne: true };
    if (verificationStatus) query['businessVerification.status'] = verificationStatus;
    if (search) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ];
    }

    const [users, count] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize),
      User.countDocuments(query),
    ]);

    const applicationStats = await Application.aggregate([
      { $match: { userId: { $in: users.map((user) => user._id) } } },
      { $group: {
        _id: '$userId',
        applicationCount: { $sum: 1 },
        interviewCount: { $sum: { $cond: [{ $eq: ['$status', 'Interviewing'] }, 1, 0] } },
        offerCount: { $sum: { $cond: [{ $eq: ['$status', 'Offered'] }, 1, 0] } },
      } },
    ]);
    const statsByUser = new Map(applicationStats.map((stats) => [String(stats._id), stats]));
    const enrichedUsers = users.map((user) => ({
      ...user.toJSON(),
      applicationCount: statsByUser.get(String(user._id))?.applicationCount || 0,
      interviewCount: statsByUser.get(String(user._id))?.interviewCount || 0,
      offerCount: statsByUser.get(String(user._id))?.offerCount || 0,
    }));

    res.status(200).json({
      success: true,
      count,
      page: pageNumber,
      pages: Math.ceil(count / pageSize),
      data: enrichedUsers,
    });
  } catch (error) {
    console.error('[Admin Error - Users]:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve user list' });
  }
});

// @desc    Update user account status
// @route   PATCH /api/admin/users/:id/status
router.patch('/users/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be active or suspended' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await Promise.all([
      recordActivity(req.user._id, `${status} user account`, user._id, 'user'),
      notifyUser(user._id, `Your account was ${status} by an administrator.`, '/profile'),
    ]);

    res.status(200).json({
      success: true,
      message: `User status updated to ${status}`,
      data: user.toJSON(),
    });
  } catch (error) {
    console.error('[Admin Error - Update User Status]:', error);
    res.status(500).json({ success: false, message: 'Failed to update user status' });
  }
});

router.patch('/users/:id/archive', async (req, res) => {
  try {
    const { archived } = req.body;
    if (typeof archived !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Archived must be true or false' });
    }
    if (String(req.user._id) === String(req.params.id)) {
      return res.status(400).json({ success: false, message: 'You cannot archive your own admin account' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isArchived = archived;
    if (archived) user.status = 'suspended';
    await user.save();
    await recordActivity(req.user._id, `${archived ? 'archived' : 'restored'} user account`, user._id, 'user');
    return res.status(200).json({ success: true, message: archived ? 'Account archived; records retained' : 'Account restored', data: user.toJSON() });
  } catch (error) {
    console.error('[Admin Error - Archive User]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update user archive status' });
  }
});

// @desc    Counselor Portfolio Review
// @route   GET /api/admin/users/:id/applications
router.get('/users/:id/applications', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const applications = await Application.find({ userId: user._id }).sort({ dateApplied: -1 });

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        careerTrack: user.careerTrack,
      },
      applications,
    });
  } catch (error) {
    console.error('[Admin Error - User Applications]:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user portfolio' });
  }
});

export default router;
