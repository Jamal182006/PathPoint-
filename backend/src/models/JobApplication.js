import mongoose from 'mongoose';

const jobResponseSchema = new mongoose.Schema(
  {
    requirementId: { type: mongoose.Schema.Types.ObjectId, required: true },
    requirementTitle: { type: String, trim: true, maxlength: 120 },
    responseType: { type: String, enum: ['file', 'text'], required: true },
    value: { type: String, trim: true, maxlength: 5000, default: '' },
    storageKey: { type: String, select: false },
    fileName: { type: String, trim: true, maxlength: 255 },
    mimeType: { type: String, enum: ['application/pdf', 'image/jpeg', 'image/png'] },
    fileSize: { type: Number, min: 1 },
    uploadedAt: { type: Date },
    documentData: { type: Buffer, select: false },
  },
  { _id: true }
);

const resumeSchema = new mongoose.Schema(
  {
    fileName: { type: String, trim: true, maxlength: 255 },
    mimeType: { type: String, enum: ['application/pdf', 'image/jpeg', 'image/png'] },
    fileSize: { type: Number, min: 1 },
    uploadedAt: { type: Date },
    documentData: { type: Buffer, select: false },
  },
  { _id: false }
);

const applicantSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, trim: true, maxlength: 40, default: '' },
    address: { type: String, trim: true, maxlength: 300, default: '' },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: ['draft', 'submitted', 'under_review', 'shortlisted', 'interview_scheduled', 'accepted', 'hired', 'rejected', 'withdrawn'], required: true },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const jobApplicationSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobListing', required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    applicantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    applicant: { type: applicantSnapshotSchema, required: true },
    draftStep: { type: Number, min: 1, max: 4, default: 1 },
    experience: { type: String, trim: true, maxlength: 5000, default: '' },
    coverLetter: { type: String, trim: true, maxlength: 5000, default: '' },
    resume: { type: resumeSchema, default: undefined },
    responses: { type: [jobResponseSchema], default: [] },
    status: { type: String, enum: ['draft', 'submitted', 'under_review', 'shortlisted', 'interview_scheduled', 'accepted', 'hired', 'rejected', 'withdrawn'], default: 'submitted', index: true },
    submittedAt: { type: Date },
    providerNote: { type: String, trim: true, maxlength: 2000, default: '' },
    applicantNote: { type: String, trim: true, maxlength: 2000, default: '' },
    interviewDate: { type: Date },
    rejectedAt: { type: Date },
    withdrawnAt: { type: Date },
    archivedAt: { type: Date },
    statusHistory: { type: [statusHistorySchema], default: [] },
  },
  { timestamps: true }
);

jobApplicationSchema.index({ jobId: 1, applicantId: 1 }, { unique: true });
jobApplicationSchema.index({ jobId: 1, status: 1, createdAt: -1 });
jobApplicationSchema.index({ applicantId: 1, updatedAt: -1 });
jobApplicationSchema.index({ applicantId: 1, status: 1, updatedAt: -1 });
jobApplicationSchema.index({ companyId: 1, status: 1, createdAt: -1 });

const JobApplication = mongoose.model('JobApplication', jobApplicationSchema);

export default JobApplication;