import mongoose from 'mongoose';

const requirementSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['document', 'interview', 'dressCode', 'note'],
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    isRequired: { type: Boolean, default: false },
    allowedFileTypes: {
      type: [{ type: String, enum: ['application/pdf', 'image/jpeg', 'image/png'] }],
      default: [],
    },
    maxSizeMB: { type: Number, min: 0.1, max: 10, default: 5 },
    order: { type: Number, min: 0, default: 0 },
    interviewDate: { type: Date },
    interviewLocation: { type: String, trim: true, maxlength: 300, default: '' },
    interviewLink: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true }
);

const companySchema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    migrationKey: { type: String, unique: true, sparse: true, select: false },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 3000, default: '' },
    category: { type: String, required: true, trim: true, maxlength: 100 },
    logo: { type: String, trim: true, maxlength: 2000, default: '' },
    location: { type: String, trim: true, maxlength: 200, default: '' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    rejectionReason: { type: String, trim: true, maxlength: 500, default: '' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    requirements: { type: [requirementSchema], default: [] },
    isArchived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date },
  },
  { timestamps: true }
);

companySchema.index({ providerId: 1, isArchived: 1, createdAt: -1 });
companySchema.index({ status: 1, isArchived: 1, category: 1 });

const Company = mongoose.model('Company', companySchema);

export default Company;