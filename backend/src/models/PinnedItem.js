import mongoose from 'mongoose';

const pinnedItemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    itemType: { type: String, enum: ['company', 'job', 'application'], required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    applicationKind: { type: String, enum: ['job', 'company'] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

pinnedItemSchema.index({ userId: 1, itemType: 1, itemId: 1 }, { unique: true });
pinnedItemSchema.index({ userId: 1, createdAt: -1 });

const PinnedItem = mongoose.model('PinnedItem', pinnedItemSchema);

export default PinnedItem;
