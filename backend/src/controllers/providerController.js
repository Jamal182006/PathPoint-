import User from '../models/User.js';
import { parseBusinessDocument } from '../utils/businessVerification.js';

const publicBusinessProfile = (user) => ({
  id: user._id.toString(),
  ownerName: user.name,
  ...user.businessProfile.toObject(),
});

export const getProviderDirectory = async (req, res) => {
  try {
    const providers = await User.find({
      role: 'provider',
      status: 'active',
      'businessVerification.status': 'approved',
      'businessProfile.companyName': { $exists: true, $ne: '' },
    })
      .select('name businessProfile')
      .sort({ 'businessProfile.companyName': 1 });

    return res.status(200).json({
      success: true,
      count: providers.length,
      data: providers.map(publicBusinessProfile),
    });
  } catch (error) {
    console.error('[Provider Error - Directory]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve provider directory' });
  }
};

export const updateMyBusinessProfile = async (req, res) => {
  if (req.user.role !== 'provider') {
    return res.status(403).json({ success: false, message: 'Only provider accounts can update a business profile' });
  }

  const { companyName, industry, location = '', description = '', website = '' } = req.body;
  if (!companyName?.trim() || !industry?.trim()) {
    return res.status(400).json({ success: false, message: 'Business name and industry are required' });
  }

  try {
    const changedOrganization = req.user.businessProfile?.companyName !== companyName.trim()
      || req.user.businessProfile?.industry !== industry.trim();
    req.user.businessProfile = { companyName, industry, location, description, website };
    if (changedOrganization && req.user.businessVerification?.status === 'approved') {
      req.user.businessVerification.status = 'pending';
      req.user.businessVerification.reviewedAt = undefined;
      req.user.businessVerification.reviewedBy = undefined;
    }
    await req.user.save();

    return res.status(200).json({
      success: true,
      message: 'Business profile updated',
      data: publicBusinessProfile(req.user),
      verification: req.user.businessVerification?.toJSON(),
    });
  } catch (error) {
    console.error('[Provider Error - Update Profile]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update business profile' });
  }
};

export const submitBusinessVerificationDocument = async (req, res) => {
  if (req.user.role !== 'provider') {
    return res.status(403).json({ success: false, message: 'Only provider accounts can submit verification documents' });
  }

  try {
    req.user.businessVerification = {
      ...parseBusinessDocument(req.body.businessDocument),
      status: 'pending',
      submittedAt: new Date(),
      rejectionReason: '',
    };
    await req.user.save();
    return res.status(200).json({
      success: true,
      message: 'Verification document submitted for review',
      data: req.user.toJSON().businessVerification,
    });
  } catch (error) {
    if (error.message.startsWith('Upload ') || error.message.startsWith('Document ') || error.message.startsWith('The uploaded') || error.message.startsWith('The document')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('[Provider Error - Verification Document]:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit verification document' });
  }
};
