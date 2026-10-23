import Notification from '../models/Notification.js';
import { dispatchDueWorkLogReminders } from '../utils/workLogReminders.js';

const validId = (value) => /^[a-f\d]{24}$/i.test(String(value));

export const listMyNotifications = async (req, res) => {
  try {
    // Vercel cron remains the primary scheduler. This opportunistic sweep also
    // catches due reminders when an authenticated user opens the app after a
    // scheduled invocation was delayed or missed.
    try {
      await dispatchDueWorkLogReminders();
    } catch (reminderError) {
      console.error('[Work Log Reminder] Notification refresh sweep failed:', reminderError.message);
    }
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50).lean(),
      Notification.countDocuments({ userId: req.user._id, read: false }),
    ]);
    return res.status(200).json({ success: true, unreadCount, data: notifications });
  } catch (error) {
    console.error('[Notification Error - List]:', error);
    return res.status(500).json({ success: false, message: 'Failed to load notifications' });
  }
};

export const markNotificationRead = async (req, res) => {
  if (!validId(req.params.notificationId)) return res.status(400).json({ success: false, message: 'Invalid notification ID' });
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.notificationId, userId: req.user._id },
      { $set: { read: true } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    return res.status(200).json({ success: true, data: notification });
  } catch (error) {
    console.error('[Notification Error - Mark Read]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany({ userId: req.user._id, read: false }, { $set: { read: true } });
    return res.status(200).json({ success: true, updatedCount: result.modifiedCount });
  } catch (error) {
    console.error('[Notification Error - Mark All Read]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update notifications' });
  }
};
