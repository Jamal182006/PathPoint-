import mongoose from 'mongoose';

const workLogReminderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  enabled: { type: Boolean, default: false },
  dayOfWeek: { type: Number, min: 0, max: 6, default: 5 },
  nextRunAt: { type: Date, default: null },
  lastNotifiedAt: { type: Date, default: null },
}, { timestamps: true });

workLogReminderSchema.index({ enabled: 1, nextRunAt: 1 });

export default mongoose.model('WorkLogReminder', workLogReminderSchema);
