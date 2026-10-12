import ActivityLog from '../models/ActivityLog.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

export const notifyUser = async (userId, message, link = '') => {
  try {
    return await Notification.create({ userId, message, link });
  } catch (error) {
    console.error('[Notification Error]:', error.message);
    return null;
  }
};

export const notifyAdmins = async (message, link = '') => {
  try {
    const admins = await User.find({ role: 'admin', status: 'active', isArchived: { $ne: true } }).select('_id').lean();
    await Promise.all(admins.map((admin) => notifyUser(admin._id, message, link)));
  } catch (error) {
    console.error('[Notification Error - Admins]:', error.message);
  }
};

export const recordActivity = async (actorId, action, targetId = '', targetType = '') => {
  try {
    return await ActivityLog.create({ actorId: actorId || null, action, targetId: String(targetId || ''), targetType });
  } catch (error) {
    console.error('[Activity Log Error]:', error.message);
    return null;
  }
};
