import Company from '../models/Company.js';
import CompanyApplication from '../models/CompanyApplication.js';
import User from '../models/User.js';
import { fileTypeFromBuffer } from 'file-type';
import { notifyAdmins, recordActivity } from '../utils/platformEvents.js';

const validRequirementTypes = new Set(['text', 'file', 'date', 'select', 'document', 'interview', 'dressCode', 'note']);
const validMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const isInputError = (error) => /required|requirement|document size|interview links|logo|website|location|size|organization type/i.test(error.message || '');

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
    const isFile = type === 'document' || type === 'file';
    const options = Array.isArray(requirement.options)
      ? [...new Set(requirement.options.map((option) => String(option).trim()).filter(Boolean))]
      : [];
    if (type === 'select' && (!options.length || options.length > 30)) {
      throw new Error('Select requirements need between 1 and 30 options');
    }
    if (isFile && (!Array.isArray(allowedFileTypes) || !allowedFileTypes.length || allowedFileTypes.some((mimeType) => !validMimeTypes.has(mimeType)))) {
      throw new Error('Document requirements must allow PDF, JPG, or PNG files');
    }

    const maxSizeMB = Number(requirement.maxSizeMB || 5);
    if (isFile && (!Number.isFinite(maxSizeMB) || maxSizeMB < 0.1 || maxSizeMB > 5)) {
      throw new Error('Document size limit must be between 0.1 and 5 MB');
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
      options: type === 'select' ? options : [],
      allowedFileTypes: isFile ? [...new Set(allowedFileTypes)] : [],
      maxSizeMB: isFile ? maxSizeMB : 5,
      order: Number.isInteger(Number(requirement.order)) ? Number(requirement.order) : index,
      interviewDate: requirement.interviewDate || undefined,
      interviewLocation: String(requirement.interviewLocation || '').trim(),
      interviewLink,
    };
  });
};

const getCompanyPayload = async (body, existing = {}) => {
  const organizationType = body.organizationType ?? existing.organizationType ?? 'company';
  if (!['company', 'business'].includes(organizationType)) throw new Error('Choose a valid organization type');
  const name = String(body.name ?? existing.name ?? '').trim();
  const category = String(body.category ?? existing.category ?? '').trim();
  if (!name || !category) throw new Error('Company name and category are required');
  const logo = String(body.logo ?? existing.logo ?? '').trim();
  if (logo && !/^https?:\/\//i.test(logo)) {
    const match = /^data:image\/(png|jpeg);base64,([a-z\d+/]+=*)$/i.exec(logo);
    if (!match) throw new Error('Logo must be an HTTP(S) URL or a PNG/JPG upload');
    const imageData = Buffer.from(match[2], 'base64');
    if (!imageData.length || imageData.length > 3 * 1024 * 1024) throw new Error('Logo image must be 3 MB or smaller');
    const detected = await fileTypeFromBuffer(imageData);
    if (!detected || detected.mime !== `image/${match[1].toLowerCase()}`) throw new Error('Logo image content does not match its file type');
  }
  const website = String(body.website ?? existing.website ?? '').trim();
  if (website && !/^https?:\/\//i.test(website)) throw new Error('Website must use HTTP or HTTPS');
  const locations = body.locations === undefined
    ? (existing.locations || [])
    : body.locations;
  if (!Array.isArray(locations) || locations.length > 20) throw new Error('Provide no more than 20 company locations');
  const latitudeValue = body.latitude ?? existing.latitude;
  const longitudeValue = body.longitude ?? existing.longitude;
  const latitude = latitudeValue === '' || latitudeValue == null ? undefined : Number(latitudeValue);
  const longitude = longitudeValue === '' || longitudeValue == null ? undefined : Number(longitudeValue);
  if ((latitude !== undefined && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90))
    || (longitude !== undefined && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))) {
    throw new Error('Location coordinates are invalid');
  }
  if ((latitude === undefined) !== (longitude === undefined)) throw new Error('Provide both latitude and longitude');

  return {
    organizationType,
    name,
    category,
    description: String(body.description ?? existing.description ?? '').trim(),
    logo,
    location: String(body.location ?? existing.location ?? '').trim(),
    formattedAddress: String(body.formattedAddress ?? existing.formattedAddress ?? '').trim().slice(0, 300),
    latitude,
    longitude,
    locations: [...new Set(locations.map((location) => String(location).trim().slice(0, 120)).filter(Boolean))],
    size: String(body.size ?? existing.size ?? '').trim().slice(0, 40),
    website,
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
        pending: { $sum: { $cond: [{ $in: ['$status', ['submitted', 'under_review', 'changes_requested']] }, 1, 0] } },
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
    const payload = await getCompanyPayload(req.body);
    const company = await Company.create({ ...payload, providerId: provider._id, status: 'pending' });
    await Promise.all([
      notifyAdmins(`${company.name} is waiting for verification.`, '/admin/companies?status=pending'),
      recordActivity(req.user._id, 'submitted a company for verification', company._id, 'company'),
    ]);
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
    Object.assign(company, await getCompanyPayload(req.body, company));
    if (company.status !== 'pending') {
      company.status = 'pending';
      company.rejectionReason = '';
      company.reviewedAt = undefined;
      company.reviewedBy = undefined;
    }
    await company.save();
    await Promise.all([
      notifyAdmins(`${company.name} was updated and needs verification.`, '/admin/companies?status=pending'),
      recordActivity(req.user._id, 'updated a company listing', company._id, 'company'),
    ]);
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
      status: { $in: ['pending', 'approved'] },
      isArchived: false,
    }).sort({ name: 1 }).lean();
    const applicantCounts = await CompanyApplication.aggregate([
      { $match: { companyId: { $in: companies.map(({ _id }) => _id) } } },
      { $group: { _id: '$companyId', count: { $sum: 1 } } },
    ]);
    const applicantCountByCompany = new Map(applicantCounts.map(({ _id, count }) => [String(_id), count]));

    return res.status(200).json({
      success: true,
      count: companies.length,
      data: companies.map((company) => ({
        ...company,
        id: String(company._id),
        ownerName: providerById.get(String(company.providerId))?.name || '',
        applicantCount: applicantCountByCompany.get(String(company._id)) || 0,
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
    const company = await Company.findOne({
      _id: req.params.companyId,
      status: { $in: ['pending', 'approved'] },
      isArchived: false,
    }).lean();
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