import mongoose from 'mongoose';

const submittedFileSchema = new mongoose.Schema(
  {
    requirementId: { type: mongoose.Schema.Types.ObjectId, required: true },
    requirementTitle: { type: String, trim: true, maxlength: 120, default: '' },
    storageKey: { type: String, required: true, select: false },
    fileName: { type: String, required: true, trim: true, maxlength: 255 },
    mimeType: { type: String, required: true, enum: ['application/pdf', 'image/jpeg', 'image/png'] },
    fileSize: { type: Number, required: true, min: 1 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const companyApplicationSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    applicantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['submitted', 'under_review', 'interview_scheduled', 'accepted', 'rejected'],
      default: 'submitted',
      index: true,
    },
    submittedFiles: { type: [submittedFileSchema], default: [] },
    providerNote: { type: String, trim: true, maxlength: 2000, default: '' },
    interviewDate: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

companyApplicationSchema.index({ companyId: 1, applicantId: 1 }, { unique: true });
companyApplicationSchema.index({ applicantId: 1, updatedAt: -1 });
companyApplicationSchema.index({ companyId: 1, status: 1, createdAt: -1 });

const CompanyApplication = mongoose.model('CompanyApplication', companyApplicationSchema);

export default CompanyApplication;