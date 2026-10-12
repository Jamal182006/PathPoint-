import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';
import Company from '../models/Company.js';
import {
  checkUsernameAvailability,
  register,
  updateMyProfile,
  updateMyResume,
  getMyResume,
  deleteMyResume,
  requestLoginCode,
  verifyLoginCode,
  getProfileCustomization,
  updateProfileCustomization,
} from './authController.js';
import { createCompany, getPublicCompanies } from './companyController.js';
import { fillMissingUserProfile } from '../utils/userProfileMigration.js';

process.env.JWT_SECRET ||= 'test-only-jwt-secret-that-is-at-least-32-characters';

let memoryServer;
const response = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

before(async () => {
  memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri());
  await User.createIndexes();
});

beforeEach(async () => Promise.all([User.deleteMany({}), Company.deleteMany({})]));

after(async () => {
  await mongoose.disconnect();
  await memoryServer.stop();
});

const validRegistration = (overrides = {}) => ({
  role: 'user',
  username: 'Candidate_One',
  email: 'candidate.one@example.com',
  firstName: 'Candidate',
  middleName: '',
  lastName: 'One',
  dateOfBirth: '1995-04-12',
  gender: 'prefer_not_to_say',
  password: 'StrongPass8',
  country: 'United States',
  province: 'California',
  city: 'Oakland',
  streetAddress: '100 Main Street',
  postalCode: '94612',
  education: 'Bachelor degree',
  employmentStatus: 'Seeking work',
  bio: 'Interested in community health.',
  confirmPassword: 'StrongPass8',
  ...overrides,
});

test('registration persists normalized usernames and profile data without returning a password hash', async () => {
  const res = response();
  await register({ body: validRegistration() }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.user.username, 'candidate_one');
  assert.equal(res.body.user.firstName, 'Candidate');
  assert.equal(res.body.user.name, 'Candidate One');
  const today = new Date();
  const expectedAge = today.getFullYear() - 1995 - (today.getMonth() < 3 || (today.getMonth() === 3 && today.getDate() < 12) ? 1 : 0);
  assert.equal(res.body.user.age, expectedAge);
  assert.equal(res.body.user.password, undefined);
  assert.doesNotMatch(JSON.stringify(res.body), /passwordHash|\$2[aby]\$/);

  const stored = await User.findOne({ username: 'candidate_one' }).select('+password');
  assert.notEqual(stored.password, 'StrongPass8');
  assert.equal(await stored.matchPassword('StrongPass8'), true);
});

test('registration rejects underage accounts and weak passwords on the server', async () => {
  const underage = response();
  await register({ body: validRegistration({ dateOfBirth: '2012-01-01' }) }, underage);
  assert.equal(underage.statusCode, 400);
  assert.match(underage.body.message, /18 years old/i);

  const weakPassword = response();
  await register({ body: validRegistration({ username: 'another_user', password: 'short' }) }, weakPassword);
  assert.equal(weakPassword.statusCode, 400);
  assert.match(weakPassword.body.message, /8 characters/i);

  const mismatchedConfirmation = response();
  await register({ body: validRegistration({ username: 'confirmation_user', confirmPassword: 'DifferentPass9' }) }, mismatchedConfirmation);
  assert.equal(mismatchedConfirmation.statusCode, 400);
  assert.match(mismatchedConfirmation.body.message, /passwords do not match/i);
});

test('provider signup flows through verification and publishes its company into the applicant directory', async () => {
  const registration = response();
  const businessDocument = Buffer.from('%PDF-1.4\nDemo verification document').toString('base64');
  await register({ body: validRegistration({
    role: 'provider',
    username: 'provider_smoke',
    email: 'provider.smoke@example.com',
    firstName: 'Provider',
    lastName: 'Smoke',
    businessName: 'Northstar Demo',
    businessType: 'Education',
    businessAddress: '200 Center Street, Oakland',
    businessRegistrationNumber: 'DEMO-REG-001',
    contactPerson: 'Provider Smoke',
    businessDocument: { fileName: 'registration.pdf', mimeType: 'application/pdf', data: businessDocument },
  }) }, registration);
  assert.equal(registration.statusCode, 201);
  assert.equal(registration.body.user.businessVerification.status, 'pending');
  assert.equal(registration.body.user.businessName, 'Northstar Demo');
  assert.equal(registration.body.user.businessVerification.documentData, undefined);

  const provider = await User.findById(registration.body.user.id);
  provider.businessVerification.status = 'approved';
  await provider.save({ validateBeforeSave: false });
  const created = response();
  await createCompany({ user: provider, body: { name: 'Northstar Demo', category: 'Education', location: 'Oakland' } }, created);
  assert.equal(created.statusCode, 201);
  assert.equal(created.body.data.status, 'pending');

  const directory = response();
  await getPublicCompanies({}, directory);
  assert.equal(directory.statusCode, 200);
  assert.equal(directory.body.count, 1);
  assert.equal(directory.body.data[0].name, 'Northstar Demo');
  assert.equal(directory.body.data[0].status, 'pending');
});

test('username availability is case-insensitive and validates the format', async () => {
  await User.create({ username: 'candidate_one', name: 'Candidate One', email: 'candidate.one@example.com', password: 'StrongPass8' });

  const taken = response();
  await checkUsernameAvailability({ query: { username: 'CANDIDATE_ONE' } }, taken);
  assert.equal(taken.body.available, false);

  const available = response();
  await checkUsernameAvailability({ query: { username: 'new_candidate' } }, available);
  assert.equal(available.body.available, true);

  const invalid = response();
  await checkUsernameAvailability({ query: { username: 'ab' } }, invalid);
  assert.equal(invalid.statusCode, 400);
});

test('legacy profile migration fills missing fields idempotently and avoids username collisions', async () => {
  const first = await User.create({
    name: 'Legacy Provider',
    email: 'legacy.account@example.com',
    password: 'StrongPass8',
    role: 'provider',
    businessProfile: { companyName: 'Legacy Learning', industry: 'Education', location: 'Toronto' },
  });
  const second = await User.create({
    name: 'Another Legacy',
    email: 'legacy_account@example.com',
    password: 'StrongPass8',
    role: 'user',
  });
  const occupied = new Set();

  assert.equal(fillMissingUserProfile(first, occupied), true);
  await first.save({ validateBeforeSave: false });
  assert.equal(fillMissingUserProfile(second, occupied), true);
  await second.save({ validateBeforeSave: false });
  assert.equal(first.username, 'legacy_account');
  assert.equal(second.username, 'legacy_account_2');
  assert.equal(first.firstName, 'Legacy');
  assert.equal(first.lastName, 'Provider');
  assert.equal(first.businessName, 'Legacy Learning');
  assert.equal(first.businessType, 'Education');
  assert.equal(first.businessAddress, 'Toronto');
  assert.equal(fillMissingUserProfile(first, occupied), false);
});

test('login-code request and verification accept usernames with generic credential failures', async () => {
  const deviceToken = 'trusted-device-test-token';
  const tokenHash = crypto.createHash('sha256').update(deviceToken).digest('hex');
  const user = await User.create({
    username: 'candidate_one',
    name: 'Candidate One',
    email: 'candidate.one@example.com',
    password: 'StrongPass8',
    role: 'user',
    trustedDevices: [{ tokenHash, expiresAt: new Date(Date.now() + 60_000) }],
  });

  const login = response();
  await requestLoginCode({ ip: '127.0.0.1', body: { identifier: 'CANDIDATE_ONE', password: 'StrongPass8', deviceToken } }, login);
  assert.equal(login.statusCode, 200);
  assert.equal(login.body.user.username, 'candidate_one');
  assert.ok(login.body.token);
  assert.equal(login.body.user.password, undefined);

  const emailLogin = response();
  await requestLoginCode({ ip: '127.0.0.5', body: { identifier: 'CANDIDATE.ONE@EXAMPLE.COM', password: 'StrongPass8', deviceToken } }, emailLogin);
  assert.equal(emailLogin.statusCode, 200);
  assert.equal(emailLogin.body.user.username, 'candidate_one');

  user.loginCode = '123456';
  user.loginCodeExpiresAt = new Date(Date.now() + 60_000);
  await user.save({ validateBeforeSave: false });
  const verify = response();
  await verifyLoginCode({ ip: '127.0.0.2', body: { identifier: 'candidate_one', password: 'StrongPass8', code: '123456' } }, verify);
  assert.equal(verify.statusCode, 200);
  assert.equal(verify.body.user.id, String(user._id));

  const missingUser = response();
  await requestLoginCode({ ip: '127.0.0.3', body: { identifier: 'unknown_user', password: 'StrongPass8' } }, missingUser);
  const wrongPassword = response();
  await requestLoginCode({ ip: '127.0.0.4', body: { identifier: 'candidate_one', password: 'WrongPass8' } }, wrongPassword);
  assert.equal(missingUser.statusCode, 401);
  assert.equal(wrongPassword.statusCode, 401);
  assert.equal(missingUser.body.message, 'Invalid credentials');
  assert.equal(wrongPassword.body.message, 'Invalid credentials');
});

test('profile customization reads saved preferences and sanitizes unsafe text input', async () => {
  const user = await User.create({
    name: 'Profile User',
    email: 'profile.user@example.com',
    password: 'StrongPass8',
    role: 'user',
    profileInfo: {
      headline: 'Aspiring Full-Stack Developer',
      bio: 'Career-focused builder',
      targetRoles: ['Frontend Developer'],
      preferredWork: 'Remote',
      desiredSalary: { min: 50000, max: 70000, currency: 'USD' },
    },
    customization: {
      themePreset: 'dark_modern',
      accentColor: '#4F46E5',
      compactMode: true,
      layoutBlocks: [{ id: 'summary', order: 0, visible: true }],
    },
    privacySettings: { profileVisibility: 'counselors_only' },
  });

  const readRes = response();
  await getProfileCustomization({ user }, readRes);

  assert.equal(readRes.statusCode, 200);
  assert.equal(readRes.body.data.customization.themePreset, 'dark_modern');
  assert.equal(readRes.body.data.privacySettings.profileVisibility, 'counselors_only');
  assert.deepEqual(readRes.body.data.profileInfo.targetRoles, ['Frontend Developer']);

  const patchRes = response();
  await updateProfileCustomization({
    user,
    body: {
      profileInfo: {
        headline: 'Full-Stack <script>alert(1)</script> MERN Developer',
        bio: 'I build <b>accessible</b> products with secure APIs.',
        targetRoles: ['Frontend Engineer', 'Software Engineer'],
        desiredSalary: { min: 60000, max: 85000, currency: 'USD' },
        workPreference: 'Hybrid',
      },
      customization: {
        themePreset: 'creative_tech',
        accentColor: '#14B8A6',
        compactMode: false,
        layoutBlocks: [{ id: 'summary', order: 0, visible: true }, { id: 'skills', order: 1, visible: true }],
      },
      privacySettings: { profileVisibility: 'public' },
    },
  }, patchRes);

  assert.equal(patchRes.statusCode, 200);
  assert.equal(patchRes.body.data.profileInfo.headline, 'Full-Stack MERN Developer');
  assert.equal(patchRes.body.data.profileInfo.bio, 'I build accessible products with secure APIs.');
  assert.equal(patchRes.body.data.customization.themePreset, 'creative_tech');
  assert.equal(patchRes.body.data.privacySettings.profileVisibility, 'public');
  assert.equal(patchRes.body.data.customization.accentColor, '#14B8A6');
});

test('profile sections and resume persist in MongoDB without exposing resume bytes', async () => {
  const user = await User.create({
    name: 'Career Profile User',
    email: 'career.profile@example.com',
    password: 'StrongPass8',
    role: 'user',
  });
  const profileResponse = response();
  await updateMyProfile({
    user,
    body: {
      name: 'Career Profile User',
      bio: 'Accessible product designer and frontend engineer.',
      experience: [{ title: 'Frontend Developer', company: 'Northwind', startDate: '2022-01-01', current: true }],
      educationHistory: [{ school: 'State College', degree: 'BS', fieldOfStudy: 'Information Systems' }],
      skills: ['React', 'MongoDB'],
    },
  }, profileResponse);
  assert.equal(profileResponse.statusCode, 200);
  assert.deepEqual(profileResponse.body.user.skills, ['React', 'MongoDB']);
  assert.equal((await User.findById(user._id)).experience[0].title, 'Frontend Developer');
  assert.equal((await User.findById(user._id)).educationHistory[0].school, 'State College');

  const resumeBuffer = Buffer.from('%PDF-1.7\nMongo profile resume');
  const uploadResponse = response();
  await updateMyResume({
    user,
    file: { originalname: 'career-resume.pdf', mimetype: 'application/pdf', size: resumeBuffer.length, buffer: resumeBuffer },
  }, uploadResponse);
  assert.equal(uploadResponse.statusCode, 200);
  assert.equal(uploadResponse.body.resume.fileName, 'career-resume.pdf');
  assert.equal(uploadResponse.body.resume.documentData, undefined);

  const storedUser = await User.findById(user._id).select('+resume.documentData');
  assert.equal(storedUser.resume.documentData.toString(), resumeBuffer.toString());
  const downloadResponse = {
    headers: {},
    set(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    send(body) { this.body = body; return this; },
  };
  await getMyResume({ user, query: {} }, downloadResponse);
  assert.equal(downloadResponse.statusCode, undefined);
  assert.equal(downloadResponse.body.toString(), resumeBuffer.toString());
  assert.equal(downloadResponse.headers['X-Content-Type-Options'], 'nosniff');

  const deleteResponse = response();
  await deleteMyResume({ user }, deleteResponse);
  assert.equal(deleteResponse.statusCode, 200);
  assert.equal((await User.findById(user._id)).resume, undefined);
});
