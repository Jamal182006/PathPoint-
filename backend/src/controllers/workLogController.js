import WorkLog from '../models/WorkLog.js';

const validId = (id) => /^[a-f\d]{24}$/i.test(String(id));
const validStatuses = new Set(['ongoing', 'completed', 'cancelled']);
const validPaymentStatuses = new Set(['paid', 'unpaid', 'pending']);
const validCategories = new Set(['general', 'cleaning', 'delivery', 'repair', 'care', 'other']);
const badRequest = (message) => Object.assign(new Error(message), { statusCode: 400 });

const normalizeWorkLog = (body = {}) => {
  const title = String(body.title || '').trim();
  if (!title) throw badRequest('Work title is required');
  const startedAt = new Date(body.startedAt);
  const endedAt = body.endedAt ? new Date(body.endedAt) : undefined;
  if (Number.isNaN(startedAt.getTime())) throw badRequest('Work date is required');
  if (endedAt && (Number.isNaN(endedAt.getTime()) || endedAt < startedAt)) throw badRequest('End date cannot be before the start date');
  const hours = Number(body.hours || 0);
  const days = Number(body.days || 0);
  const payAmount = Number(body.payAmount || 0);
  if (![hours, days, payAmount].every(Number.isFinite) || hours < 0 || days < 0 || payAmount < 0) throw badRequest('Hours, days, and pay must be non-negative numbers');
  if (hours === 0 && days === 0) throw badRequest('Enter hours or days worked');
  const status = body.status || 'ongoing';
  const paymentStatus = body.paymentStatus || 'pending';
  const category = body.category || 'general';
  if (!validStatuses.has(status)) throw badRequest('Choose a valid work status');
  if (!validPaymentStatuses.has(paymentStatus)) throw badRequest('Choose a valid payment status');
  if (!validCategories.has(category)) throw badRequest('Choose a valid work category');

  return {
    title: title.slice(0, 160),
    category,
    clientName: String(body.clientName || '').trim().slice(0, 160),
    location: String(body.location || '').trim().slice(0, 200),
    startedAt,
    endedAt,
    hours,
    days,
    payAmount,
    paymentStatus,
    notes: String(body.notes || '').trim().slice(0, 3000),
    status,
  };
};

const ownerQuery = (req, id) => ({ _id: id, userId: req.user._id });

export const listWorkLogs = async (req, res) => {
  try {
    const { status, paymentStatus, from, to, search = '' } = req.query;
    const query = { userId: req.user._id };
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to
      ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(to) ? `${to}T23:59:59.999` : to)
      : undefined;
    if ((fromDate && Number.isNaN(fromDate.getTime())) || (toDate && Number.isNaN(toDate.getTime()))) {
      return res.status(400).json({ success: false, message: 'Date filters must be valid dates' });
    }
    if (fromDate && toDate && fromDate > toDate) {
      return res.status(400).json({ success: false, message: 'Start date filter cannot be after end date filter' });
    }
    if (validStatuses.has(status)) query.status = status;
    if (validPaymentStatuses.has(paymentStatus)) query.paymentStatus = paymentStatus;
    if (from || to) {
      query.startedAt = {};
      if (fromDate) query.startedAt.$gte = fromDate;
      if (toDate) query.startedAt.$lte = toDate;
      if (!Object.keys(query.startedAt).length) delete query.startedAt;
    }
    if (search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { clientName: { $regex: escaped, $options: 'i' } },
        { location: { $regex: escaped, $options: 'i' } },
      ];
    }
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const recordsQuery = WorkLog.find(query).sort({ startedAt: -1, createdAt: -1 });
    if (Number.isInteger(requestedLimit) && requestedLimit > 0) recordsQuery.limit(Math.min(requestedLimit, 100));
    const [records, totals] = await Promise.all([
      recordsQuery.lean(),
      WorkLog.aggregate([
        { $match: { userId: req.user._id } },
        { $group: {
          _id: null,
          totalEarnings: { $sum: '$payAmount' },
          totalHours: { $sum: '$hours' },
          unpaidBalance: { $sum: { $cond: [{ $in: ['$paymentStatus', ['unpaid', 'pending']] }, '$payAmount', 0] } },
          unpaidCount: { $sum: { $cond: [{ $in: ['$paymentStatus', ['unpaid', 'pending']] }, 1, 0] } },
        } },
      ]),
    ]);
    return res.status(200).json({ success: true, count: records.length, summary: totals[0] || { totalEarnings: 0, totalHours: 0, unpaidBalance: 0, unpaidCount: 0 }, data: records });
  } catch (error) {
    console.error('[Work Log Error - List]:', error);
    return res.status(500).json({ success: false, message: 'Failed to load work records' });
  }
};

export const createWorkLog = async (req, res) => {
  try {
    const workLog = await WorkLog.create({ ...normalizeWorkLog(req.body), userId: req.user._id });
    return res.status(201).json({ success: true, message: 'Work record created', data: workLog });
  } catch (error) {
    if (error.statusCode || error.name === 'ValidationError') return res.status(400).json({ success: false, message: error.message });
    console.error('[Work Log Error - Create]:', error);
    return res.status(500).json({ success: false, message: 'Failed to create work record' });
  }
};

export const getWorkLog = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid work record ID' });
  try {
    const workLog = await WorkLog.findOne(ownerQuery(req, req.params.id));
    if (!workLog) return res.status(404).json({ success: false, message: 'Work record not found' });
    return res.status(200).json({ success: true, data: workLog });
  } catch (error) {
    console.error('[Work Log Error - Get]:', error);
    return res.status(500).json({ success: false, message: 'Failed to load work record' });
  }
};

export const updateWorkLog = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid work record ID' });
  try {
    const workLog = await WorkLog.findOne(ownerQuery(req, req.params.id));
    if (!workLog) return res.status(404).json({ success: false, message: 'Work record not found' });
    Object.assign(workLog, normalizeWorkLog({ ...workLog.toObject(), ...req.body }));
    await workLog.save();
    return res.status(200).json({ success: true, message: 'Work record updated', data: workLog });
  } catch (error) {
    if (error.statusCode || error.name === 'ValidationError') return res.status(400).json({ success: false, message: error.message });
    console.error('[Work Log Error - Update]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update work record' });
  }
};

export const deleteWorkLog = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid work record ID' });
  try {
    const workLog = await WorkLog.findOneAndDelete(ownerQuery(req, req.params.id));
    if (!workLog) return res.status(404).json({ success: false, message: 'Work record not found' });
    return res.status(200).json({ success: true, message: 'Work record deleted' });
  } catch (error) {
    console.error('[Work Log Error - Delete]:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete work record' });
  }
};
