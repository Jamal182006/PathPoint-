import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  action: { type: String, required: true, trim: true, maxlength: 300 },
  targetId: { type: String, trim: true, maxlength: 100, default: '' },
  targetType: { type: String, trim: true, maxlength: 80, default: '' },
  createdAt: { type: Date, default: Date.now, index: true },
});

activityLogSchema.index({ createdAt: -1 });

export default mongoose.model('ActivityLog', activityLogSchema);
