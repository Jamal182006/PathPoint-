import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';
import Company from '../models/Company.js';
import JobListing from '../models/JobListing.js';
import JobApplication from '../models/JobApplication.js';
import CompanyApplication from '../models/CompanyApplication.js';
import PinnedItem from '../models/PinnedItem.js';
import { listPins, pinItem, unpinItem } from './pinController.js';

let memoryServer;
const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

before(async () => {
  memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri());
  await Promise.all([User, Company, JobListing, JobApplication, CompanyApplication, PinnedItem].map((model) => model.createIndexes()));
});

beforeEach(async () => {
  await Promise.all([User, Company, JobListing, JobApplication, CompanyApplication, PinnedItem].map((model) => model.deleteMany({})));
});

after(async () => {
  await mongoose.disconnect();
  await memoryServer.stop();
});

test('pins are unique, applicant-owned, and resolve current listing/status updates', async () => {
  const applicant = await User.create({ name: 'Pin Owner', email: 'pin-owner@example.com', password: 'Testpass1' });
  const otherApplicant = await User.create({ name: 'Pin Other', email: 'pin-other@example.com', password: 'Testpass1' });
  const provider = await User.create({ name: 'Pin Provider', email: 'pin-provider@example.com', password: 'Testpass1', role: 'provider' });
  const company = await Company.create({ providerId: provider._id, name: 'Tracked Company', category: 'Health', status: 'approved' });
  const job = await JobListing.create({ companyId: company._id, providerId: provider._id, title: 'Care Coordinator', description: 'Coordinate care', employmentType: 'full_time', status: 'open', reviewStatus: 'approved' });
  const jobApplication = await JobApplication.create({ jobId: job._id, companyId: company._id, applicantId: applicant._id, applicant: { name: applicant.name, email: applicant.email }, status: 'interview_scheduled', statusHistory: [{ status: 'interview_scheduled', changedAt: new Date('2026-10-01') }] });
  const companyApplication = await CompanyApplication.create({ companyId: company._id, applicantId: applicant._id, status: 'rejected', providerNote: 'Role filled', rejectedAt: new Date('2026-10-02'), statusHistory: [{ status: 'rejected', changedAt: new Date('2026-10-02') }] });

  const pinCompany = response();
  await pinItem({ user: { _id: applicant._id, role: 'user' }, body: { itemType: 'company', itemId: String(company._id) } }, pinCompany);
  assert.equal(pinCompany.statusCode, 200);

  const duplicate = response();
  await pinItem({ user: { _id: applicant._id, role: 'user' }, body: { itemType: 'company', itemId: String(company._id) } }, duplicate);
  assert.equal(duplicate.statusCode, 200);
  assert.equal(await PinnedItem.countDocuments({ userId: applicant._id }), 1);

  const pinJob = response();
  await pinItem({ user: { _id: applicant._id, role: 'user' }, body: { itemType: 'job', itemId: String(job._id) } }, pinJob);
  const pinApplication = response();
  await pinItem({ user: { _id: applicant._id, role: 'user' }, body: { itemType: 'application', itemId: String(jobApplication._id), applicationKind: 'job' } }, pinApplication);
  const pinCompanyApplication = response();
  await pinItem({ user: { _id: applicant._id, role: 'user' }, body: { itemType: 'application', itemId: String(companyApplication._id), applicationKind: 'company' } }, pinCompanyApplication);

  const forbidden = response();
  await pinItem({ user: { _id: otherApplicant._id, role: 'user' }, body: { itemType: 'application', itemId: String(jobApplication._id), applicationKind: 'job' } }, forbidden);
  assert.equal(forbidden.statusCode, 404);

  const list = response();
  await listPins({ user: { _id: applicant._id, role: 'user' } }, list);
  assert.equal(list.body.count, 4);
  const companyCard = list.body.data.find((item) => item.itemType === 'company');
  assert.match(companyCard.latestUpdate, /New job posted/);
  const applicationCard = list.body.data.find((item) => item.itemId === String(jobApplication._id));
  assert.equal(applicationCard.status, 'Interview');

  const deniedUnpin = response();
  await unpinItem({ user: { _id: otherApplicant._id, role: 'user' }, params: { itemType: 'company', itemId: String(company._id) }, query: {} }, deniedUnpin);
  assert.equal(deniedUnpin.statusCode, 404);

  const unpin = response();
  await unpinItem({ user: { _id: applicant._id, role: 'user' }, params: { itemType: 'application', itemId: String(companyApplication._id) }, query: { applicationKind: 'company' } }, unpin);
  assert.equal(unpin.statusCode, 200);

  await Company.updateOne({ _id: company._id }, { $set: { isArchived: true } });
  const afterArchive = response();
  await listPins({ user: { _id: applicant._id, role: 'user' } }, afterArchive);
  assert.equal(afterArchive.body.count, 2);
  assert.equal(await PinnedItem.countDocuments({ userId: applicant._id }), 2);
});
