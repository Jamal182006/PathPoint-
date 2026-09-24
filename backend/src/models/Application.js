import mongoose from 'mongoose';

const interviewDateSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    round: { type: String, default: 'General Interview' },
    interviewer: { type: String, default: '' },
  },
  { _id: true }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      enum: ['Saved', 'Applied', 'Interviewing', 'Offered', 'Rejected'],
    },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    role: {
      type: String,
      required: [true, 'Job title / role is required'],
      trim: true,
    },
    salaryRange: {
      type: String,
      default: '',
      trim: true,
    },
    dateApplied: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Saved', 'Applied', 'Interviewing', 'Offered', 'Rejected'],
      default: 'Saved',
      index: true,
    },
    statusHistory: [statusHistorySchema],
    jobDescriptionNotes: {
      type: String,
      default: '',
    },
    contactPerson: {
      type: String,
      default: '',
      trim: true,
    },
    resumeVersion: {
      type: String,
      default: '',
    },
    resumeUrl: {
      type: String,
      default: '',
    },
    interviewDates: [interviewDateSchema],
  },
  {
    timestamps: true,
  }
);

// Format id and strip __v
applicationSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    ret.userId = ret.userId?.toString ? ret.userId.toString() : ret.userId;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Application = mongoose.model('Application', applicationSchema);

export default Application;
