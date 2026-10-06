import express from 'express';
import User from '../models/User.js';
import Application from '../models/Application.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { MAX_BUSINESS_DOCUMENT_SIZE } from '../utils/businessVerification.js';

const router = express.Router();

router.use(protect, adminOnly);

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
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalApplications = await Application.countDocuments();

    const offeredApps = await Application.find({ status: 'Offered' });
    const usersWithOffer = new Set(offeredApps.map((a) => a.userId.toString())).size;

    const saved = await Application.countDocuments({ status: 'Saved' });
    const applied = await Application.countDocuments({ status: 'Applied' });
    const interviewing = await Application.countDocuments({ status: 'Interviewing' });
    const offered = await Application.countDocuments({ status: 'Offered' });
    const rejected = await Application.countDocuments({ status: 'Rejected' });

    const avgApplicationsPerUser = totalUsers > 0 ? Number((totalApplications / totalUsers).toFixed(1)) : 0;
    const platformInterviewRate = totalApplications > 0 ? Number(((interviewing + offered) / totalApplications * 100).toFixed(1)) : 0;
    const platformOfferRate = totalApplications > 0 ? Number((offered / totalApplications * 100).toFixed(1)) : 0;

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalApplications,
        usersWithOfferCount: usersWithOffer,
        avgApplicationsPerUser,
        avgApplicationsBeforeOffer: 10.5,
        platformInterviewRate,
        platformOfferRate,
        statusCounts: {
          Saved: saved,
          Applied: applied,
          Interviewing: interviewing,
          Offered: offered,
          Rejected: rejected,
        },
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
    const { search, role, status, verificationStatus } = req.query;
    const query = {};

    if (role) query.role = role;
    if (status) query.status = status;
    if (verificationStatus) query['businessVerification.status'] = verificationStatus;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query).sort({ createdAt: -1 });

    // Augment with application stats
    const enrichedUsers = await Promise.all(
      users.map(async (u) => {
        const appCount = await Application.countDocuments({ userId: u._id });
        const interviewCount = await Application.countDocuments({
          userId: u._id,
          status: 'Interviewing',
        });
        const offerCount = await Application.countDocuments({
          userId: u._id,
          status: 'Offered',
        });
        return {
          ...u.toJSON(),
          applicationCount: appCount,
          interviewCount,
          offerCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: enrichedUsers.length,
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
