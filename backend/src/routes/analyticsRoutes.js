import express from 'express';
import Application from '../models/Application.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

const computeSummary = (applications = []) => {
  const statusCounts = {
    Saved: 0,
    Applied: 0,
    Interviewing: 0,
    Offered: 0,
    Rejected: 0,
  };

  applications.forEach((app) => {
    if (statusCounts[app.status] !== undefined) {
      statusCounts[app.status] += 1;
    }
  });

  const hasApplied = (app) =>
    app.status !== 'Saved' ||
    (app.statusHistory || []).some((entry) => entry.status !== 'Saved');

  const reachedInterview = (app) =>
    app.status === 'Interviewing' ||
    app.status === 'Offered' ||
    (app.interviewDates && app.interviewDates.length > 0) ||
    (app.statusHistory || []).some(
      (entry) => entry.status === 'Interviewing' || entry.status === 'Offered'
    );

  const reachedOffer = (app) =>
    app.status === 'Offered' ||
    (app.statusHistory || []).some((entry) => entry.status === 'Offered');

  const submittedCount = applications.filter((app) => hasApplied(app)).length;
  const interviewedCount = applications.filter((app) => reachedInterview(app)).length;
  const offeredCount = applications.filter((app) => reachedOffer(app)).length;

  const baseForRates = submittedCount > 0 ? submittedCount : applications.length;
  const interviewRate =
    baseForRates > 0 ? Number(((interviewedCount / baseForRates) * 100).toFixed(1)) : 0;
  const offerRate =
    baseForRates > 0 ? Number(((offeredCount / baseForRates) * 100).toFixed(1)) : 0;

  let totalDays = 0;
  let transitionsCounted = 0;

  applications.forEach((app) => {
    const sortedHistory = [...(app.statusHistory || [])].sort(
      (a, b) => new Date(a.changedAt) - new Date(b.changedAt)
    );
    const appliedIdx = sortedHistory.findIndex((entry) => entry.status === 'Applied');

    if (appliedIdx !== -1 && appliedIdx < sortedHistory.length - 1) {
      const appliedTime = new Date(sortedHistory[appliedIdx].changedAt).getTime();
      const nextTime = new Date(sortedHistory[appliedIdx + 1].changedAt).getTime();
      totalDays += Math.max(0, (nextTime - appliedTime) / (1000 * 60 * 60 * 24));
      transitionsCounted += 1;
    }
  });

  const avgResponseDays =
    transitionsCounted > 0 ? Number((totalDays / transitionsCounted).toFixed(1)) : 0;

  return {
    totalApplications: applications.length,
    submittedCount,
    interviewedCount,
    offeredCount,
    interviewRate,
    offerRate,
    avgResponseDays,
    statusCounts,
  };
};

router.get('/summary', async (req, res) => {
  try {
    const applications = await Application.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    return res.status(200).json({
      success: true,
      data: computeSummary(applications),
    });
  } catch (error) {
    console.error('[Analytics Error - Summary]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to compute analytics summary',
    });
  }
});

export default router;
