import Notification from '../models/Notification.js';
import WorkLogReminder from '../models/WorkLogReminder.js';

const PHILIPPINES_OFFSET_MS = 8 * 60 * 60 * 1000;
const REMINDER_HOUR = 9;

export const nextWorkLogReminderAt = (dayOfWeek, from = new Date()) => {
  const philippinesNow = new Date(from.getTime() + PHILIPPINES_OFFSET_MS);
  const daysUntil = (dayOfWeek - philippinesNow.getUTCDay() + 7) % 7;
  const targetLocal = new Date(Date.UTC(
    philippinesNow.getUTCFullYear(), philippinesNow.getUTCMonth(), philippinesNow.getUTCDate() + daysUntil,
    REMINDER_HOUR, 0, 0, 0
  ));
  if (targetLocal.getTime() <= philippinesNow.getTime()) targetLocal.setUTCDate(targetLocal.getUTCDate() + 7);
  return new Date(targetLocal.getTime() - PHILIPPINES_OFFSET_MS);
};

export const dispatchDueWorkLogReminders = async (now = new Date()) => {
  const due = await WorkLogReminder.find({ enabled: true, nextRunAt: { $lte: now } }).limit(500).lean();
  let sent = 0;

  for (const reminder of due) {
    const nextRunAt = nextWorkLogReminderAt(reminder.dayOfWeek, now);
    const claimed = await WorkLogReminder.findOneAndUpdate(
      { _id: reminder._id, enabled: true, nextRunAt: reminder.nextRunAt },
      { $set: { nextRunAt, lastNotifiedAt: now } },
      { new: true }
    );
    if (!claimed) continue;

    try {
      await Notification.create({
        userId: reminder.userId,
        message: 'It’s time to update your work log. Record your recent shifts, projects, and hours.',
        link: '/work-log',
      });
      sent += 1;
    } catch (error) {
      console.error('[Work Log Reminder] Notification delivery failed:', error.message);
      await WorkLogReminder.updateOne(
        { _id: reminder._id, nextRunAt },
        { $set: { nextRunAt: reminder.nextRunAt, lastNotifiedAt: reminder.lastNotifiedAt || null } }
      );
    }
  }

  return { checked: due.length, sent };
};
