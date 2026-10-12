import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Company from '../models/Company.js';
import CompanyApplication from '../models/CompanyApplication.js';
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
  'SEED_APPLICANT_THREE_EMAIL',
  'SEED_APPLICANT_THREE_PASSWORD',
  'SEED_APPLICANT_FOUR_EMAIL',
  'SEED_APPLICANT_FOUR_PASSWORD',
  'SEED_APPLICANT_FIVE_EMAIL',
  'SEED_APPLICANT_FIVE_PASSWORD',
];

const pngDocument = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

const ensureUser = async ({ name, email, password, role, ...profile }) => {
  const normalizedEmail = email.trim().toLowerCase();
  if (profile.dateOfBirth && profile.age == null) {
    const today = new Date();
    const birthDate = new Date(profile.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) age -= 1;
    profile.age = age;
  }
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    if (existing.role !== role) {
      throw new Error(`Seed account ${normalizedEmail} already exists with a different role; no data was changed.`);
    }
    let changed = false;
    for (const [key, value] of Object.entries(profile)) {
      if (key === 'businessVerification' || key === 'password' || value == null) continue;
      const current = existing.get(key);
      const isEmpty = current == null || current === '' || (typeof current === 'object' && !Object.keys(current.toObject?.() || current).length);
      if (isEmpty) {
        existing.set(key, value);
        changed = true;
      }
    }
    if (changed) await existing.save({ validateBeforeSave: false });
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
      username: process.env.BOOTSTRAP_ADMIN_USERNAME || 'pathpoint_admin',
      firstName: 'PathPoint',
      lastName: 'Administrator',
      email: process.env.BOOTSTRAP_ADMIN_EMAIL,
      password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
      role: 'admin',
      dateOfBirth: '1980-05-12',
      gender: 'prefer_not_to_say',
      country: 'United States',
      province: 'California',
      city: 'Oakland',
      streetAddress: '100 Admin Way',
      postalCode: '94612',
      title: 'Career Services Administrator',
    }),
    await ensureUser({
      name: 'Approved Provider',
      username: 'approved_provider',
      firstName: 'Approved',
      lastName: 'Provider',
      email: process.env.SEED_APPROVED_PROVIDER_EMAIL,
      password: process.env.SEED_APPROVED_PROVIDER_PASSWORD,
      role: 'provider',
      dateOfBirth: '1985-03-18',
      gender: 'prefer_not_to_say',
      phoneCountryCode: '+65',
      phone: '+65 6123 4567',
      country: 'Singapore',
      province: 'Central Region',
      city: 'Singapore',
      streetAddress: '10 Northstar Avenue',
      postalCode: '018956',
      occupation: 'Business owner',
      employmentStatus: 'Self-employed',
      bio: 'Education provider supporting learners and career changers.',
      businessProfile: { companyName: 'Northstar Learning', industry: 'Education', location: 'Singapore', description: 'Seed company for testing the applicant pipeline.' },
      businessName: 'Northstar Learning',
      businessType: 'Education',
      businessAddress: 'Singapore',
      contactPerson: 'Approved Provider',
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
      username: 'pending_provider',
      firstName: 'Pending',
      lastName: 'Provider',
      email: process.env.SEED_PENDING_PROVIDER_EMAIL,
      password: process.env.SEED_PENDING_PROVIDER_PASSWORD,
      role: 'provider',
      dateOfBirth: '1987-09-07',
      gender: 'prefer_not_to_say',
      phoneCountryCode: '+65',
      phone: '+65 6234 5678',
      country: 'Singapore',
      province: 'Central Region',
      city: 'Singapore',
      streetAddress: '20 Harbor Road',
      postalCode: '018960',
      occupation: 'Studio owner',
      employmentStatus: 'Self-employed',
      bio: 'Creative studio awaiting business verification.',
      businessProfile: { companyName: 'Harbor Studio', industry: 'Design', location: 'Singapore', description: 'Seed company awaiting provider verification.' },
      businessName: 'Harbor Studio',
      businessType: 'Design',
      businessAddress: 'Singapore',
      contactPerson: 'Pending Provider',
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
      username: 'applicant_one',
      firstName: 'Applicant',
      lastName: 'One',
      email: process.env.SEED_APPLICANT_ONE_EMAIL,
      password: process.env.SEED_APPLICANT_ONE_PASSWORD,
      role: 'user',
      careerTrack: 'Software Engineering',
      dateOfBirth: '1992-02-11',
      gender: 'prefer_not_to_say',
      phoneCountryCode: '+65',
      phone: '+65 6345 6789',
      country: 'Singapore',
      province: 'Central Region',
      city: 'Singapore',
      streetAddress: '31 Orchard Road',
      postalCode: '238888',
      education: 'Bachelor degree',
      occupation: 'Junior developer',
      employmentStatus: 'Seeking work',
      bio: 'Early-career developer interested in accessible products.',
    }),
    await ensureUser({
      name: 'Applicant Two',
      username: 'applicant_two',
      firstName: 'Applicant',
      lastName: 'Two',
      email: process.env.SEED_APPLICANT_TWO_EMAIL,
      password: process.env.SEED_APPLICANT_TWO_PASSWORD,
      role: 'user',
      careerTrack: 'Product Design',
      dateOfBirth: '1994-06-21',
      gender: 'prefer_not_to_say',
      phoneCountryCode: '+65',
      phone: '+65 6456 7890',
      country: 'Singapore',
      province: 'Central Region',
      city: 'Singapore',
      streetAddress: '42 Marina View',
      postalCode: '018961',
      education: 'Bachelor degree',
      occupation: 'Product designer',
      employmentStatus: 'Employed',
      bio: 'Product designer focused on research-led digital experiences.',
    }),
    await ensureUser({ name: 'Applicant Three', username: 'applicant_three', firstName: 'Applicant', lastName: 'Three', email: process.env.SEED_APPLICANT_THREE_EMAIL, password: process.env.SEED_APPLICANT_THREE_PASSWORD, role: 'user', careerTrack: 'Healthcare', dateOfBirth: '1991-08-03', gender: 'prefer_not_to_say', phoneCountryCode: '+1', phone: '555 012 1003', country: 'United States', province: 'California', city: 'Oakland', streetAddress: '53 Lake Merritt Boulevard', postalCode: '94612', education: 'Associate degree', occupation: 'Care assistant', employmentStatus: 'Seeking work', bio: 'Healthcare worker building patient-care experience.' }),
    await ensureUser({ name: 'Applicant Four', username: 'applicant_four', firstName: 'Applicant', lastName: 'Four', email: process.env.SEED_APPLICANT_FOUR_EMAIL, password: process.env.SEED_APPLICANT_FOUR_PASSWORD, role: 'user', careerTrack: 'Education', dateOfBirth: '1996-11-16', gender: 'prefer_not_to_say', phoneCountryCode: '+1', phone: '555 012 1004', country: 'United States', province: 'California', city: 'Oakland', streetAddress: '64 Lakeshore Avenue', postalCode: '94610', education: 'Master degree', occupation: 'Teaching assistant', employmentStatus: 'Student', bio: 'Educator interested in inclusive learning.' }),
    await ensureUser({ name: 'Applicant Five', username: 'applicant_five', firstName: 'Applicant', lastName: 'Five', email: process.env.SEED_APPLICANT_FIVE_EMAIL, password: process.env.SEED_APPLICANT_FIVE_PASSWORD, role: 'user', careerTrack: 'Operations', dateOfBirth: '1993-01-27', gender: 'prefer_not_to_say', phoneCountryCode: '+1', phone: '555 012 1005', country: 'United States', province: 'California', city: 'Oakland', streetAddress: '75 Broadway', postalCode: '94607', education: 'Bachelor degree', occupation: 'Operations coordinator', employmentStatus: 'Employed', bio: 'Operations coordinator with logistics and service experience.' }),
  ];

  const [approvedProvider, pendingProvider] = [entries[1].user, entries[2].user];
  const applicants = entries.slice(3).map(({ user }) => user);
  const companySeeds = [
    { key: 'northstar-learning', provider: approvedProvider, name: 'Northstar Learning', category: 'Education', status: 'approved' },
    { key: 'cedar-health', provider: approvedProvider, name: 'Cedar Health', category: 'Healthcare', status: 'approved' },
    { key: 'brightpath-tech', provider: approvedProvider, name: 'Brightpath Tech', category: 'Technology', status: 'approved' },
    { key: 'harbor-studio', provider: pendingProvider, name: 'Harbor Studio', category: 'Design', status: 'pending' },
    { key: 'fieldstone-care', provider: approvedProvider, name: 'Fieldstone Care', category: 'Healthcare', status: 'pending' },
    { key: 'summit-trades', provider: pendingProvider, name: 'Summit Trades', category: 'Skilled Trades', status: 'rejected' },
  ];
  const companies = [];
  for (const seedCompany of companySeeds) {
    const company = await Company.findOneAndUpdate(
      { migrationKey: `seed-company-${seedCompany.key}` },
      { $setOnInsert: {
        migrationKey: `seed-company-${seedCompany.key}`,
        providerId: seedCompany.provider._id,
        name: seedCompany.name,
        category: seedCompany.category,
        description: `${seedCompany.name} demo listing for testing the shared applicant and provider workflow.`,
        location: 'Singapore',
        status: seedCompany.status,
        rejectionReason: seedCompany.status === 'rejected' ? 'Please provide additional business details.' : '',
        requirements: [{ type: 'text', title: 'Relevant experience', description: 'Briefly describe your experience.', isRequired: true, order: 0 }],
        isArchived: false,
      } },
      { upsert: true, new: true }
    );
    companies.push(company);
  }

  const applicationStatuses = ['submitted', 'under_review', 'changes_requested', 'approved', 'rejected'];
  for (let index = 0; index < applicants.length; index += 1) {
    const company = companies[index % 3];
    const requirementId = company.requirements[0]._id;
    await CompanyApplication.updateOne(
      { companyId: company._id, applicantId: applicants[index]._id },
      { $setOnInsert: {
        companyId: company._id,
        applicantId: applicants[index]._id,
        status: applicationStatuses[index],
        formData: { [String(requirementId)]: `${index + 1} years of relevant experience` },
        providerNote: applicationStatuses[index] === 'changes_requested' ? 'Please add more detail about your recent experience.' : '',
      } },
      { upsert: true }
    );
  }

  console.log(`[Seed] Complete. ${entries.filter(({ created }) => created).length} accounts created; ${companies.length} companies and ${applicants.length} sample applications ready. Existing accounts were preserved.`);
};

try {
  await seed();
} catch (error) {
  console.error('[Seed Error]:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
