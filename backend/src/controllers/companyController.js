import Company from '../models/Company.js';
import CompanyApplication from '../models/CompanyApplication.js';
import User from '../models/User.js';

const validRequirementTypes = new Set(['document', 'interview', 'dressCode', 'note']);
const validMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const isInputError = (error) => /required|requirement|document size|interview links|logo url/i.test(error.message || '');

const normalizeRequirements = (requirements = []) => {
  if (!Array.isArray(requirements) || requirements.length > 20) {
    throw new Error('Provide no more than 20 requirements');
  }

  return requirements.map((requirement, index) => {
    const type = String(requirement.type || '');
    const title = String(requirement.title || '').trim();
    if (!validRequirementTypes.has(type) || !title) {
      throw new Error('Each requirement needs a valid type and title');
    }

    const allowedFileTypes = requirement.allowedFileTypes || [];
    if (type === 'document' && (!Array.isArray(allowedFileTypes) || !allowedFileTypes.length || allowedFileTypes.some((mimeType) => !validMimeTypes.has(mimeType)))) {
      throw new Error('Document requirements must allow PDF, JPG, or PNG files');
    }

    const maxSizeMB = Number(requirement.maxSizeMB || 5);
    if (type === 'document' && (!Number.isFinite(maxSizeMB) || maxSizeMB < 0.1 || maxSizeMB > 10)) {
      throw new Error('Document size limit must be between 0.1 and 10 MB');
    }

    const interviewLink = String(requirement.interviewLink || '').trim();
    if (interviewLink && !/^https?:\/\//i.test(interviewLink)) {
      throw new Error('Interview links must use HTTP or HTTPS');
    }
    if (requirement.interviewDate && Number.isNaN(new Date(requirement.interviewDate).getTime())) {
      throw new Error('Interview date is invalid');
    }

    return {
      _id: requirement._id,
      type,
      title,
      description: String(requirement.description || '').trim(),
      isRequired: Boolean(requirement.isRequired),
      allowedFileTypes: type === 'document' ? [...new Set(allowedFileTypes)] : [],
      maxSizeMB: type === 'document' ? maxSizeMB : 5,
      order: Number.isInteger(Number(requirement.order)) ? Number(requirement.order) : index,
      interviewDate: requirement.interviewDate || undefined,
      interviewLocation: String(requirement.interviewLocation || '').trim(),
      interviewLink,
    };
  });
};

const getCompanyPayload = (body, existing = {}) => {
  const name = String(body.name ?? existing.name ?? '').trim();
  const category = String(body.category ?? existing.category ?? '').trim();
  if (!name || !category) throw new Error('Company name and category are required');
  const logo = String(body.logo ?? existing.logo ?? '').trim();
  if (logo && !/^https?:\/\//i.test(logo)) throw new Error('Logo URL must use HTTP or HTTPS');

  return {
    name,
    category,
    description: String(body.description ?? existing.description ?? '').trim(),
    logo,
    location: String(body.location ?? existing.location ?? '').trim(),
    requirements: body.requirements === undefined ? existing.requirements : normalizeRequirements(body.requirements),
  };
};

const providerOnly = (req, res) => {
  if (req.user.role === 'provider') return true;
  res.status(403).json({ success: false, message: 'Only provider accounts can manage companies' });
  return false;
};

const isValidObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value));

export const getMyCompanies = async (req, res) => {
  if (!providerOnly(req, res)) return;
  try {
    const { status, search } = req.query;
    const query = { providerId: req.user._id, isArchived: false };
    if (['pending', 'approved', 'rejected'].includes(status)) query.status = status;
    if (search?.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { category: { $regex: escaped, $options: 'i' } },
      ];
    }
    const companies = await Company.find(query).sort({ createdAt: -1 }).lean();
    const applicationCounts = await CompanyApplication.aggregate([
      { $match: { companyId: { $in: companies.map((company) => company._id) } } },
      { $group: {
        _id: '$companyId',
        applicants: { $sum: 1 },
        pending: { $sum: { $cond: [{ $in: ['$status', ['submitted', 'under_review']] }, 1, 0] } },
      } },
    ]);
    const countByCompany = new Map(applicationCounts.map((entry) => [String(entry._id), entry]));
    return res.status(200).json({
      success: true,
      count: companies.length,
      data: companies.map((company) => ({
        ...company,
        applicantCount: countByCompany.get(String(company._id))?.applicants || 0,
        pendingApplicationCount: countByCompany.get(String(company._id))?.pending || 0,
      })),
    });
  } catch (error) {
    console.error('[Company Error - Provider List]:', error);
    return res.status(500).json({ success: false, message: 'Failed to load your companies' });
  }
};

export const createCompany = async (req, res) => {
  if (!providerOnly(req, res)) return;
  try {
    const provider = await User.findById(req.user._id).select('role status businessVerification.status');
    if (!provider || provider.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Your provider account is not active' });
    }
    const payload = getCompanyPayload(req.body);
    const company = await Company.create({ ...payload, providerId: provider._id, status: 'pending' });
    return res.status(201).json({ success: true, message: 'Company submitted for review', data: company });
  } catch (error) {
    if (isInputError(error)) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('[Company Error - Create]:', error);
    return res.status(500).json({ success: false, message: 'Failed to create company' });
  }
};

export const getMyCompany = async (req, res) => {
  if (!providerOnly(req, res)) return;
  if (!isValidObjectId(req.params.companyId)) return res.status(400).json({ success: false, message: 'Invalid company ID' });
  try {
    const company = await Company.findOne({ _id: req.params.companyId, providerId: req.user._id, isArchived: false });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    return res.status(200).json({ success: true, data: company });
  } catch (error) {
    console.error('[Company Error - Provider Detail]:', error);
    return res.status(500).json({ success: false, message: 'Failed to load company' });
  }
};

export const updateMyCompany = async (req, res) => {
  if (!providerOnly(req, res)) return;
  if (!isValidObjectId(req.params.companyId)) return res.status(400).json({ success: false, message: 'Invalid company ID' });
  try {
    const company = await Company.findOne({ _id: req.params.companyId, providerId: req.user._id, isArchived: false });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    Object.assign(company, getCompanyPayload(req.body, company));
    if (company.status === 'approved') {
      company.status = 'pending';
      company.reviewedAt = undefined;
      company.reviewedBy = undefined;
    }
    await company.save();
    return res.status(200).json({ success: true, message: 'Company updated and returned to review', data: company });
  } catch (error) {
    if (isInputError(error)) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('[Company Error - Update]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update company' });
  }
};

export const archiveMyCompany = async (req, res) => {
  if (!providerOnly(req, res)) return;
  if (!isValidObjectId(req.params.companyId)) return res.status(400).json({ success: false, message: 'Invalid company ID' });
  try {
    const company = await Company.findOneAndUpdate(
      { _id: req.params.companyId, providerId: req.user._id, isArchived: false },
      { $set: { isArchived: true, archivedAt: new Date() } },
      { new: true }
    );
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    return res.status(200).json({ success: true, message: 'Company archived; application history was retained' });
  } catch (error) {
    console.error('[Company Error - Archive]:', error);
    return res.status(500).json({ success: false, message: 'Failed to archive company' });
  }
};

export const getPublicCompanies = async (req, res) => {
  try {
    const verifiedProviders = await User.find({
      role: 'provider',
      status: 'active',
      isArchived: { $ne: true },
      'businessVerification.status': 'approved',
    }).select('_id name');
    const providerById = new Map(verifiedProviders.map((provider) => [String(provider._id), provider]));
    const companies = await Company.find({
      providerId: { $in: [...providerById.keys()] },
      status: 'approved',
      isArchived: false,
    }).sort({ name: 1 }).lean();

    return res.status(200).json({
      success: true,
      count: companies.length,
      data: companies.map((company) => ({
        ...company,
        id: String(company._id),
        ownerName: providerById.get(String(company.providerId))?.name || '',
      })),
    });
  } catch (error) {
    console.error('[Company Error - Public Directory]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve company directory' });
  }
};

export const getPublicCompany = async (req, res) => {
  if (!isValidObjectId(req.params.companyId)) return res.status(400).json({ success: false, message: 'Invalid company ID' });
  try {
    const company = await Company.findOne({ _id: req.params.companyId, status: 'approved', isArchived: false }).lean();
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    const provider = await User.findOne({
      _id: company.providerId,
      role: 'provider',
      status: 'active',
      isArchived: { $ne: true },
      'businessVerification.status': 'approved',
    }).select('name');
    if (!provider) return res.status(404).json({ success: false, message: 'Company not found' });
    return res.status(200).json({ success: true, data: { ...company, id: String(company._id), ownerName: provider.name } });
  } catch (error) {
    console.error('[Company Error - Public Detail]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve company' });
  }
};