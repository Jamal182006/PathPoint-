import WorkLogReminder from '../models/WorkLogReminder.js';
import { nextWorkLogReminderAt } from '../utils/workLogReminders.js';

const serialize = (reminder) => ({
  enabled: reminder.enabled,
  dayOfWeek: reminder.dayOfWeek,
  nextRunAt: reminder.nextRunAt,
  lastNotifiedAt: reminder.lastNotifiedAt,
});

export const getMyWorkLogReminder = async (req, res) => {
  try {
    const reminder = await WorkLogReminder.findOne({ userId: req.user._id }).lean();
    return res.json({ success: true, data: reminder ? serialize(reminder) : { enabled: false, dayOfWeek: 5, nextRunAt: null, lastNotifiedAt: null } });
  } catch (error) {
    console.error('[Work Log Reminder] Load failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to load work log reminder.' });
  }
};

export const saveMyWorkLogReminder = async (req, res) => {
  const enabled = req.body?.enabled === true;
  const dayOfWeek = Number(req.body?.dayOfWeek);
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return res.status(400).json({ success: false, message: 'Choose a valid day of the week.' });
  }

  try {
    const reminder = await WorkLogReminder.findOneAndUpdate(
      { userId: req.user._id },
      { $set: {
        enabled,
        dayOfWeek,
        nextRunAt: enabled ? nextWorkLogReminderAt(dayOfWeek) : null,
      } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();
    return res.json({ success: true, data: serialize(reminder) });
  } catch (error) {
    console.error('[Work Log Reminder] Save failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to save work log reminder.' });
  }
};
