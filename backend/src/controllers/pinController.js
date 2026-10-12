import mongoose from 'mongoose';
import Company from '../models/Company.js';
import CompanyApplication from '../models/CompanyApplication.js';
import JobApplication from '../models/JobApplication.js';
import JobListing from '../models/JobListing.js';
import PinnedItem from '../models/PinnedItem.js';

const validId = (id) => /^[a-f\d]{24}$/i.test(String(id));
const applicationKinds = new Set(['job', 'company']);
const statusLabels = {
  submitted: 'Applied',
  under_review: 'Under Review',
  shortlisted: 'Under Review',
  changes_requested: 'Under Review',
  interview_scheduled: 'Interview',
  accepted: 'Offer',
  approved: 'Offer',
  hired: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  draft: 'Draft',
};
const displayDate = (date) => date ? new Date(date).toLocaleDateString() : 'Recently updated';
const keyFor = (itemType, itemId, applicationKind = '') => `${itemType}:${applicationKind}:${itemId}`;

const resolvePinnedRecords = async (pins, userId) => {
  const companies = pins.filter((pin) => pin.itemType === 'company');
  const jobs = pins.filter((pin) => pin.itemType === 'job');
  const jobApplications = pins.filter((pin) => pin.itemType === 'application' && pin.applicationKind === 'job');
  const companyApplications = pins.filter((pin) => pin.itemType === 'application' && pin.applicationKind === 'company');
  const companyIds = companies.map((pin) => pin.itemId);
  const jobIds = jobs.map((pin) => pin.itemId);
  const jobAppIds = jobApplications.map((pin) => pin.itemId);
  const companyAppIds = companyApplications.map((pin) => pin.itemId);

  const [companyRows, latestJobs, jobRows, jobAppRows, companyAppRows] = await Promise.all([
    companyIds.length ? Company.find({ _id: { $in: companyIds }, isArchived: false }).select('name category status updatedAt').lean() : [],
    companyIds.length ? JobListing.find({ companyId: { $in: companyIds }, status: { $in: ['open', 'verified'] }, reviewStatus: 'approved', archivedAt: { $exists: false } }).select('companyId title createdAt').sort({ createdAt: -1 }).lean() : [],
    jobIds.length ? JobListing.find({ _id: { $in: jobIds }, archivedAt: { $exists: false } }).select('title status updatedAt companyId').populate('companyId', 'name').lean() : [],
    jobAppIds.length ? JobApplication.find({ _id: { $in: jobAppIds }, applicantId: userId }).select('jobId companyId status statusHistory providerNote updatedAt').populate('jobId', 'title').populate('companyId', 'name').lean() : [],
    companyAppIds.length ? CompanyApplication.find({ _id: { $in: companyAppIds }, applicantId: userId }).select('companyId status statusHistory providerNote updatedAt').populate('companyId', 'name').lean() : [],
  ]);

  const companyMap = new Map(companyRows.map((item) => [String(item._id), item]));
  const latestJobMap = new Map();
  latestJobs.forEach((item) => {
    const companyId = String(item.companyId);
    if (!latestJobMap.has(companyId)) latestJobMap.set(companyId, item);
  });
  const jobMap = new Map(jobRows.map((item) => [String(item._id), item]));
  const jobApplicationMap = new Map(jobAppRows.map((item) => [String(item._id), item]));
  const companyApplicationMap = new Map(companyAppRows.map((item) => [String(item._id), item]));
  const resolved = new Map();

  companies.forEach((pin) => {
    const company = companyMap.get(String(pin.itemId));
    if (!company) return;
    const latestJob = latestJobMap.get(String(pin.itemId));
    resolved.set(keyFor('company', pin.itemId), {
      title: company.name,
      subtitle: company.category || 'Company',
      status: company.status === 'approved' ? 'Verified' : 'Pending review',
      latestUpdate: latestJob ? `New job posted: ${latestJob.title}` : `Organization updated ${displayDate(company.updatedAt)}`,
      latestAt: latestJob?.createdAt || company.updatedAt,
      href: `/companies/${company._id}`,
    });
  });

  jobs.forEach((pin) => {
    const job = jobMap.get(String(pin.itemId));
    if (!job) return;
    resolved.set(keyFor('job', pin.itemId), {
      title: job.title,
      subtitle: job.companyId?.name || 'Company',
      status: job.status === 'closed' ? 'Closed' : 'Open',
      latestUpdate: `Listing updated ${displayDate(job.updatedAt)}`,
      latestAt: job.updatedAt,
      href: `/jobs/${job._id}`,
    });
  });

  jobApplications.forEach((pin) => {
    const application = jobApplicationMap.get(String(pin.itemId));
    if (!application) return;
    const lastTransition = application.statusHistory?.at(-1);
    resolved.set(keyFor('application', pin.itemId, 'job'), {
      title: application.jobId?.title || 'Job application',
      subtitle: application.companyId?.name || 'Company',
      status: statusLabels[application.status] || application.status,
      latestUpdate: lastTransition ? `Status changed to ${statusLabels[lastTransition.status] || lastTransition.status} ${displayDate(lastTransition.changedAt)}` : `Application updated ${displayDate(application.updatedAt)}`,
      latestAt: application.updatedAt,
      href: '/my-applications',
    });
  });

  companyApplications.forEach((pin) => {
    const application = companyApplicationMap.get(String(pin.itemId));
    if (!application) return;
    const lastTransition = application.statusHistory?.at(-1);
    resolved.set(keyFor('application', pin.itemId, 'company'), {
      title: application.companyId?.name || 'Company application',
      subtitle: 'Company application',
      status: statusLabels[application.status] || application.status,
      latestUpdate: lastTransition ? `Status changed to ${statusLabels[lastTransition.status] || lastTransition.status} ${displayDate(lastTransition.changedAt)}` : `Application updated ${displayDate(application.updatedAt)}`,
      latestAt: application.updatedAt,
      href: '/my-applications',
    });
  });
  return resolved;
};

const verifyTarget = async ({ itemType, itemId, applicationKind, userId }) => {
  if (itemType === 'company') return Company.exists({ _id: itemId, status: { $in: ['pending', 'approved'] }, isArchived: false });
  if (itemType === 'job') return JobListing.exists({ _id: itemId, status: { $in: ['open', 'verified'] }, reviewStatus: 'approved', archivedAt: { $exists: false } });
  if (itemType === 'application' && applicationKind === 'job') return JobApplication.exists({ _id: itemId, applicantId: userId, status: { $ne: 'draft' } });
  if (itemType === 'application' && applicationKind === 'company') return CompanyApplication.exists({ _id: itemId, applicantId: userId });
  return false;
};

export const listPins = async (req, res) => {
  if (req.user.role !== 'user') return res.status(403).json({ success: false, message: 'Applicant account access is required' });
  try {
    const pins = await PinnedItem.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
    const resolved = await resolvePinnedRecords(pins, req.user._id);
    const stalePinIds = [];
    const data = pins.flatMap((pin) => {
      const itemId = String(pin.itemId);
      const applicationKind = pin.applicationKind || '';
      const item = resolved.get(keyFor(pin.itemType, itemId, applicationKind));
      if (!item) {
        stalePinIds.push(pin._id);
        return [];
      }
      return [{ id: String(pin._id), itemType: pin.itemType, itemId, applicationKind: applicationKind || undefined, createdAt: pin.createdAt, ...item }];
    });
    if (stalePinIds.length) await PinnedItem.deleteMany({ userId: req.user._id, _id: { $in: stalePinIds } });
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    console.error('[Pin Error - List]:', error);
    return res.status(500).json({ success: false, message: 'Failed to load tracked items' });
  }
};

export const pinItem = async (req, res) => {
  if (req.user.role !== 'user') return res.status(403).json({ success: false, message: 'Applicant account access is required' });
  const { itemType, itemId, applicationKind } = req.body || {};
  if (!['company', 'job', 'application'].includes(itemType) || !validId(itemId) || (itemType === 'application' && !applicationKinds.has(applicationKind)) || (itemType !== 'application' && applicationKind !== undefined)) {
    return res.status(400).json({ success: false, message: 'Provide a valid item type, ID, and application kind when needed' });
  }
  try {
    const exists = await verifyTarget({ itemType, itemId, applicationKind, userId: req.user._id });
    if (!exists) return res.status(404).json({ success: false, message: 'Tracked item not found or unavailable' });
    const pin = await PinnedItem.findOneAndUpdate(
      { userId: req.user._id, itemType, itemId: new mongoose.Types.ObjectId(itemId) },
      { $setOnInsert: { userId: req.user._id, itemType, itemId, ...(applicationKind ? { applicationKind } : {}) } },
      { upsert: true, new: true, runValidators: true }
    );
    return res.status(200).json({ success: true, message: 'Item pinned', data: { id: String(pin._id), itemType: pin.itemType, itemId: String(pin.itemId), applicationKind: pin.applicationKind } });
  } catch (error) {
    if (error.code === 11000) return res.status(200).json({ success: true, message: 'Item is already pinned' });
    console.error('[Pin Error - Create]:', error);
    return res.status(500).json({ success: false, message: 'Failed to pin item' });
  }
};

export const unpinItem = async (req, res) => {
  if (req.user.role !== 'user') return res.status(403).json({ success: false, message: 'Applicant account access is required' });
  const { itemType, itemId } = req.params;
  const applicationKind = req.query.applicationKind;
  if (!['company', 'job', 'application'].includes(itemType) || !validId(itemId) || (itemType === 'application' && !applicationKinds.has(applicationKind)) || (itemType !== 'application' && applicationKind !== undefined)) {
    return res.status(400).json({ success: false, message: 'Provide a valid pinned item reference' });
  }
  try {
    const query = { userId: req.user._id, itemType, itemId: new mongoose.Types.ObjectId(itemId) };
    if (itemType === 'application') query.applicationKind = applicationKind;
    const pin = await PinnedItem.findOneAndDelete(query);
    if (!pin) return res.status(404).json({ success: false, message: 'Pinned item not found' });
    return res.status(200).json({ success: true, message: 'Item unpinned' });
  } catch (error) {
    console.error('[Pin Error - Delete]:', error);
    return res.status(500).json({ success: false, message: 'Failed to unpin item' });
  }
};
