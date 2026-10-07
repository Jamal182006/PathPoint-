import mongoose from 'mongoose';

const jobRequirementSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['file', 'text'], required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1500, default: '' },
    isRequired: { type: Boolean, default: true },
    allowedFileTypes: {
      type: [{ type: String, enum: ['application/pdf', 'image/jpeg', 'image/png'] }],
      default: [],
    },
    maxSizeMB: { type: Number, min: 0.1, max: 10, default: 5 },
    order: { type: Number, min: 0, default: 0 },
  },
  { _id: true }
);

const jobListingSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 10000 },
    requirements: { type: [jobRequirementSchema], default: [] },
    salaryType: { type: String, enum: ['fixed', 'range'], default: 'range' },
    salaryMin: { type: Number, min: 0 },
    salaryMax: { type: Number, min: 0 },
    salaryPayPeriod: { type: String, enum: ['hour', 'day', 'week', 'month', 'year', 'project'], default: 'month' },
    interviewerName: { type: String, trim: true, maxlength: 120, default: '' },
    interviewerPosition: { type: String, trim: true, maxlength: 120, default: '' },
    interviewerContact: { type: String, trim: true, maxlength: 200, default: '' },
    interviewDate: { type: Date },
    interviewLocation: { type: String, trim: true, maxlength: 300, default: '' },
    interviewLink: { type: String, trim: true, maxlength: 500, default: '' },
    slots: { type: Number, min: 1, max: 10000, default: 1 },
    applicationCount: { type: Number, min: 0, default: 0 },
    applicationDeadline: { type: Date },
    employmentType: { type: String, enum: ['full_time', 'part_time', 'contract', 'temporary', 'internship', 'casual'], required: true },
    location: { type: String, trim: true, maxlength: 200, default: '' },
    status: { type: String, enum: ['draft', 'open', 'closed'], default: 'draft', index: true },
    reviewStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    reviewReason: { type: String, trim: true, maxlength: 500, default: '' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    archivedAt: { type: Date },
  },
  { timestamps: true }
);

jobListingSchema.pre('validate', function validateJobDates(next) {
  const now = Date.now();
  if (this.salaryMin !== undefined && this.salaryMax !== undefined && this.salaryMin > this.salaryMax) {
    this.invalidate('salaryMax', 'Maximum salary must be greater than or equal to minimum salary');
  }
  if (this.salaryType === 'fixed' && this.salaryMin !== undefined && this.salaryMax !== undefined && this.salaryMin !== this.salaryMax) {
    this.invalidate('salaryMax', 'Fixed salary must use the same minimum and maximum amount');
  }
  if (this.interviewDate && this.interviewDate.getTime() < now) this.invalidate('interviewDate', 'Interview date cannot be in the past');
  if (this.applicationDeadline && this.applicationDeadline.getTime() < now) this.invalidate('applicationDeadline', 'Application deadline cannot be in the past');
  next();
});

jobListingSchema.index({ providerId: 1, archivedAt: 1, createdAt: -1 });
jobListingSchema.index({ reviewStatus: 1, status: 1, createdAt: -1 });
jobListingSchema.index({ companyId: 1, status: 1, reviewStatus: 1 });

const JobListing = mongoose.model('JobListing', jobListingSchema);

export default JobListing;