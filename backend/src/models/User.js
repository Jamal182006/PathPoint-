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

const userSchema = new mongoose.Schema(
  {
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
    phone: { type: String, trim: true, maxlength: 40, default: '' },
    address: { type: String, trim: true, maxlength: 300, default: '' },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters long'],
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
    delete ret.trustedDevices;
    if (ret.businessVerification) delete ret.businessVerification.documentData;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);

export default User;
