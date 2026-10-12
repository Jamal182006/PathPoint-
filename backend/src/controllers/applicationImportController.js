import mongoose from 'mongoose';
import Application from '../models/Application.js';

const allowedStatuses = new Set(['Saved', 'Applied', 'Interviewing', 'Offered', 'Rejected']);
const cleanString = (value, maximum, required = false) => {
  if (value === undefined || value === null) return required ? '' : '';
  if (typeof value !== 'string' && typeof value !== 'number') throw Object.assign(new Error('Application fields must be text'), { statusCode: 400 });
  const result = String(value).trim();
  if (required && !result) throw Object.assign(new Error('Company and role are required for imported applications'), { statusCode: 400 });
  return result.slice(0, maximum);
};
const dateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw Object.assign(new Error('Imported application date is invalid'), { statusCode: 400 });
  return date;
};
const normalizeImport = (raw, userId) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Object.assign(new Error('Each application must be an object'), { statusCode: 400 });
  const company = cleanString(raw.company, 160, true);
  const role = cleanString(raw.role, 160, true);
  const status = raw.status || 'Saved';
  if (!allowedStatuses.has(status)) throw Object.assign(new Error(`Unsupported application status: ${status}`), { statusCode: 400 });
  const dateApplied = dateKey(raw.dateApplied || new Date());
  const history = Array.isArray(raw.statusHistory) ? raw.statusHistory.slice(0, 100).map((entry) => {
    if (!allowedStatuses.has(entry?.status)) throw Object.assign(new Error('Imported application history contains an invalid status'), { statusCode: 400 });
    return { status: entry.status, changedAt: dateKey(entry.changedAt || dateApplied) };
  }) : [{ status, changedAt: dateApplied }];
  return {
    userId,
    company,
    role,
    salaryRange: cleanString(raw.salaryRange, 120),
    dateApplied,
    status,
    statusHistory: history.length ? history : [{ status, changedAt: dateApplied }],
    jobDescriptionNotes: cleanString(raw.jobDescriptionNotes, 5000),
    contactPerson: cleanString(raw.contactPerson, 160),
    resumeVersion: cleanString(raw.resumeVersion, 255),
    resumeUrl: cleanString(raw.resumeUrl, 1000),
    interviewDates: Array.isArray(raw.interviewDates) ? raw.interviewDates.slice(0, 100).map((entry) => {
      if (entry && typeof entry === 'object' && entry.date) return { date: dateKey(entry.date), round: cleanString(entry.round, 120), interviewer: cleanString(entry.interviewer, 160) };
      return { date: dateKey(entry), round: 'General Interview', interviewer: '' };
    }) : [],
  };
};
const duplicateKey = (application) => `${application.company.toLowerCase()}|${application.role.toLowerCase()}|${application.dateApplied.toISOString().slice(0, 10)}`;

export const importApplications = async (req, res) => {
  if (req.user.role !== 'user') return res.status(403).json({ success: false, message: 'Applicant account access is required' });
  const source = req.body?.applications;
  const replace = req.body?.replace === true;
  if (!Array.isArray(source) || !source.length || source.length > 500) return res.status(400).json({ success: false, message: 'Provide between 1 and 500 applications to import' });

  let normalized;
  try {
    normalized = source.map((item) => normalizeImport(item, req.user._id));
  } catch (error) {
    return res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }

  const session = await mongoose.startSession();
  try {
    let imported = 0;
    let skipped = 0;
    await session.withTransaction(async () => {
      if (replace) await Application.deleteMany({ userId: req.user._id }, { session });
      const existing = replace ? [] : await Application.find({ userId: req.user._id }).select('company role dateApplied').session(session).lean();
      const seen = new Set(existing.map(duplicateKey));
      const records = normalized.filter((item) => {
        const key = duplicateKey(item);
        if (seen.has(key)) { skipped += 1; return false; }
        seen.add(key);
        return true;
      });
      if (records.length) await Application.insertMany(records, { session, ordered: true });
      imported = records.length;
    });
    return res.status(200).json({ success: true, message: 'Applications imported', data: { imported, skipped, replaced: replace } });
  } catch (error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ success: false, message: error.message });
    console.error('[Application Import Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to import applications' });
  } finally {
    await session.endSession();
  }
};
