import mongoose from 'mongoose';

const workLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    category: { type: String, enum: ['general', 'cleaning', 'delivery', 'repair', 'care', 'other'], default: 'general', index: true },
    clientName: { type: String, trim: true, maxlength: 160, default: '' },
    location: { type: String, trim: true, maxlength: 200, default: '' },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date },
    hours: { type: Number, min: 0, max: 10000, default: 0 },
    days: { type: Number, min: 0, max: 3650, default: 0 },
    payAmount: { type: Number, min: 0, default: 0 },
    paymentStatus: { type: String, enum: ['paid', 'unpaid', 'pending'], default: 'pending', index: true },
    notes: { type: String, trim: true, maxlength: 3000, default: '' },
    status: { type: String, enum: ['ongoing', 'completed', 'cancelled'], default: 'ongoing', index: true },
  },
  { timestamps: true }
);

workLogSchema.index({ userId: 1, startedAt: -1 });
workLogSchema.index({ userId: 1, paymentStatus: 1, status: 1 });

const WorkLog = mongoose.model('WorkLog', workLogSchema);

export default WorkLog;