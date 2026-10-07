import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Company from '../models/Company.js';
import connectDB from '../config/db.js';

dotenv.config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env'),
});

const requiredSeedValues = [
  'BOOTSTRAP_ADMIN_EMAIL',
  'BOOTSTRAP_ADMIN_PASSWORD',
  'SEED_APPROVED_PROVIDER_EMAIL',
  'SEED_APPROVED_PROVIDER_PASSWORD',
  'SEED_PENDING_PROVIDER_EMAIL',
  'SEED_PENDING_PROVIDER_PASSWORD',
  'SEED_APPLICANT_ONE_EMAIL',
  'SEED_APPLICANT_ONE_PASSWORD',
  'SEED_APPLICANT_TWO_EMAIL',
  'SEED_APPLICANT_TWO_PASSWORD',
];

const pngDocument = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

const ensureUser = async ({ name, email, password, role, ...profile }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    if (existing.role !== role) {
      throw new Error(`Seed account ${normalizedEmail} already exists with a different role; no data was changed.`);
    }
    return { user: existing, created: false };
  }

  const user = await User.create({ name, email: normalizedEmail, password, role, ...profile });
  return { user, created: true };
};

const seed = async () => {
  const missing = requiredSeedValues.filter((key) => !process.env[key]?.trim());
  if (missing.length) {
    throw new Error(`Set the following variables in backend/.env before seeding: ${missing.join(', ')}`);
  }

  await connectDB();

  const entries = [
    await ensureUser({
      name: process.env.BOOTSTRAP_ADMIN_NAME?.trim() || 'PathPoint Administrator',
      email: process.env.BOOTSTRAP_ADMIN_EMAIL,
      password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
      role: 'admin',
      title: 'Career Services Administrator',
    }),
    await ensureUser({
      name: 'Approved Provider',
      email: process.env.SEED_APPROVED_PROVIDER_EMAIL,
      password: process.env.SEED_APPROVED_PROVIDER_PASSWORD,
      role: 'provider',
      businessProfile: { companyName: 'Northstar Learning', industry: 'Education', location: 'Singapore', description: 'Seed company for testing the applicant pipeline.' },
      businessVerification: {
        status: 'approved',
        documentName: 'sample-business-document.png',
        documentMimeType: 'image/png',
        documentSize: pngDocument.length,
        documentData: pngDocument,
        submittedAt: new Date(),
        reviewedAt: new Date(),
      },
    }),
    await ensureUser({
      name: 'Pending Provider',
      email: process.env.SEED_PENDING_PROVIDER_EMAIL,
      password: process.env.SEED_PENDING_PROVIDER_PASSWORD,
      role: 'provider',
      businessProfile: { companyName: 'Harbor Studio', industry: 'Design', location: 'Singapore', description: 'Seed company awaiting provider verification.' },
      businessVerification: {
        status: 'pending',
        documentName: 'sample-business-document.png',
        documentMimeType: 'image/png',
        documentSize: pngDocument.length,
        documentData: pngDocument,
        submittedAt: new Date(),
      },
    }),
    await ensureUser({
      name: 'Applicant One',
      email: process.env.SEED_APPLICANT_ONE_EMAIL,
      password: process.env.SEED_APPLICANT_ONE_PASSWORD,
      role: 'user',
      careerTrack: 'Software Engineering',
    }),
    await ensureUser({
      name: 'Applicant Two',
      email: process.env.SEED_APPLICANT_TWO_EMAIL,
      password: process.env.SEED_APPLICANT_TWO_PASSWORD,
      role: 'user',
      careerTrack: 'Product Design',
    }),
  ];

  const [approvedProvider, pendingProvider] = [entries[1].user, entries[2].user];
  await Company.updateOne(
    { migrationKey: 'seed-approved-provider-company' },
    { $setOnInsert: {
      migrationKey: 'seed-approved-provider-company',
      providerId: approvedProvider._id,
      name: 'Northstar Learning',
      category: 'Education',
      description: 'Approved seed company for testing job discovery and applications.',
      location: 'Singapore',
      status: 'approved',
      isArchived: false,
    } },
    { upsert: true }
  );
  await Company.updateOne(
    { migrationKey: 'seed-pending-provider-company' },
    { $setOnInsert: {
      migrationKey: 'seed-pending-provider-company',
      providerId: pendingProvider._id,
      name: 'Harbor Studio',
      category: 'Design',
      description: 'Pending seed company. It must remain hidden from applicants.',
      location: 'Singapore',
      status: 'pending',
      isArchived: false,
    } },
    { upsert: true }
  );

  console.log(`[Seed] Complete. ${entries.filter(({ created }) => created).length} accounts created; existing accounts were preserved.`);
};

try {
  await seed();
} catch (error) {
  console.error('[Seed Error]:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
