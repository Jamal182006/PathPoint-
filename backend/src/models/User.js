import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const businessProfileSchema = new mongoose.Schema(
  {
    companyName: { type: String, trim: true, maxlength: 120 },
    industry: { type: String, trim: true, maxlength: 100 },
    location: { type: String, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000 },
    website: { type: String, trim: true, maxlength: 200 },
  },
  { _id: false }
);

const businessVerificationSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['not_submitted', 'pending', 'approved', 'rejected'],
      default: 'not_submitted',
    },
    documentName: { type: String, trim: true, maxlength: 255 },
    documentMimeType: { type: String, enum: ['application/pdf', 'image/jpeg', 'image/png'] },
    documentSize: { type: Number, min: 1, max: 5 * 1024 * 1024 },
    documentData: { type: Buffer, select: false },
    submittedAt: { type: Date },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { _id: false }
);

const experienceSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 120, default: '' },
    company: { type: String, trim: true, maxlength: 120, default: '' },
    location: { type: String, trim: true, maxlength: 120, default: '' },
    startDate: { type: Date },
    endDate: { type: Date },
    current: { type: Boolean, default: false },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
  },
  { _id: true }
);

const educationHistorySchema = new mongoose.Schema(
  {
    school: { type: String, trim: true, maxlength: 160, default: '' },
    degree: { type: String, trim: true, maxlength: 120, default: '' },
    fieldOfStudy: { type: String, trim: true, maxlength: 120, default: '' },
    startDate: { type: Date },
    endDate: { type: Date },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { _id: true }
);

const profileResumeSchema = new mongoose.Schema(
  {
    fileName: { type: String, trim: true, maxlength: 255 },
    mimeType: { type: String, enum: ['application/pdf', 'image/jpeg', 'image/png'] },
    fileSize: { type: Number, min: 1, max: 5 * 1024 * 1024 },
    uploadedAt: { type: Date },
    documentData: { type: Buffer, select: false },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      match: /^[a-z0-9_]{3,20}$/,
      sparse: true,
      unique: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    firstName: { type: String, trim: true, maxlength: 80 },
    middleName: { type: String, trim: true, maxlength: 80, default: '' },
    lastName: { type: String, trim: true, maxlength: 80 },
    dateOfBirth: { type: Date },
    age: { type: Number, min: 0, max: 130 },
    gender: { type: String, enum: ['female', 'male', 'non_binary', 'prefer_not_to_say', ''], default: '' },
    avatar: { type: String, default: '' },
    phone: { type: String, trim: true, maxlength: 40, default: '' },
    phoneCountryCode: { type: String, trim: true, maxlength: 8, default: '+1' },
    address: { type: String, trim: true, maxlength: 300, default: '' },
    country: { type: String, trim: true, maxlength: 100, default: '' },
    province: { type: String, trim: true, maxlength: 100, default: '' },
    city: { type: String, trim: true, maxlength: 100, default: '' },
    barangay: { type: String, trim: true, maxlength: 100, default: '' },
    streetAddress: { type: String, trim: true, maxlength: 200, default: '' },
    postalCode: { type: String, trim: true, maxlength: 20, default: '' },
    education: { type: String, trim: true, maxlength: 100, default: '' },
    educationHistory: { type: [educationHistorySchema], default: [] },
    experience: { type: [experienceSchema], default: [] },
    skills: { type: [{ type: String, trim: true, maxlength: 80 }], default: [] },
    resume: { type: profileResumeSchema, default: undefined },
    occupation: { type: String, trim: true, maxlength: 120, default: '' },
    employmentStatus: { type: String, trim: true, maxlength: 80, default: '' },
    bio: { type: String, trim: true, maxlength: 2000, default: '' },
    businessName: { type: String, trim: true, maxlength: 120, default: '' },
    businessType: { type: String, trim: true, maxlength: 100, default: '' },
    businessAddress: { type: String, trim: true, maxlength: 300, default: '' },
    businessRegistrationNumber: { type: String, trim: true, maxlength: 100, default: '' },
    contactPerson: { type: String, trim: true, maxlength: 160, default: '' },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [8, 'Password must be at least 8 characters long'],
      maxlength: [72, 'Password cannot exceed 72 characters'],
      validate: {
        validator: (value) => Buffer.byteLength(value, 'utf8') <= 72,
        message: 'Password cannot exceed 72 UTF-8 bytes',
      },
      select: false, // Do not return password by default in queries
    },
    role: {
      type: String,
      enum: ['user', 'provider', 'admin'],
      default: 'user',
    },
    businessProfile: {
      type: businessProfileSchema,
      default: undefined,
    },
    businessVerification: {
      type: businessVerificationSchema,
      default: undefined,
    },
    careerTrack: {
      type: String,
      default: 'General',
      trim: true,
    },
    title: {
      type: String,
      default: '',
      trim: true,
    },
    profileInfo: {
      headline: { type: String, default: '', trim: true, maxlength: 160 },
      bio: { type: String, default: '', trim: true, maxlength: 2000 },
      targetRoles: [{ type: String, trim: true, maxlength: 80 }],
      desiredSalary: {
        min: { type: Number, min: 0, default: 0 },
        max: { type: Number, min: 0, default: 0 },
        currency: { type: String, default: 'USD', trim: true, maxlength: 12 },
      },
      workPreference: {
        type: String,
        enum: ['Remote', 'Hybrid', 'On-site', 'Flexible', ''],
        default: '',
      },
    },
    customization: {
      themePreset: {
        type: String,
        enum: ['light', 'dark', 'minimal', 'dark_modern', 'creative_tech'],
        default: 'light',
      },
      accentColor: {
        type: String,
        default: '#4F46E5',
        trim: true,
        maxlength: 20,
      },
      compactMode: { type: Boolean, default: false },
      notifications: { type: Boolean, default: true },
      showWelcomeBanner: { type: Boolean, default: true },
      avatarUrl: { type: String, default: '', trim: true, maxlength: 500 },
      bannerUrl: { type: String, default: '', trim: true, maxlength: 500 },
      profileTitle: { type: String, default: '', trim: true, maxlength: 120 },
      layoutBlocks: [
        {
          id: { type: String, required: true, trim: true },
          order: { type: Number, default: 0 },
          visible: { type: Boolean, default: true },
        },
      ],
    },
    privacySettings: {
      profileVisibility: {
        type: String,
        enum: ['private', 'counselors_only', 'public'],
        default: 'private',
      },
      shareResumeToPublic: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
    },
    isArchived: { type: Boolean, default: false, index: true },
    resetCode: {
      type: String,
      default: null,
    },
    resetCodeExpiresAt: {
      type: Date,
      default: null,
    },
    loginCode: {
      type: String,
      default: null,
    },
    loginCodeExpiresAt: {
      type: Date,
      default: null,
    },
    trustedDevices: [
      {
        tokenHash: {
          type: String,
          required: true,
        },
        expiresAt: {
          type: Date,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ 'businessVerification.status': 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Transform to JSON: expose id, exclude _id, __v, password
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    delete ret.passwordHash;
    delete ret.resetCode;
    delete ret.resetCodeExpiresAt;
    delete ret.loginCode;
    delete ret.loginCodeExpiresAt;
    delete ret.trustedDevices;
    if (ret.businessVerification) delete ret.businessVerification.documentData;
    if (ret.resume) delete ret.resume.documentData;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);

export default User;
