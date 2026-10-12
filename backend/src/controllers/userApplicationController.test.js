import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import User from '../models/User.js';
import Company from '../models/Company.js';
import JobListing from '../models/JobListing.js';
import JobApplication from '../models/JobApplication.js';
import CompanyApplication from '../models/CompanyApplication.js';
import { deleteUserApplication, listUserApplications, updateUserApplication } from './userApplicationController.js';
import { saveJobApplicationDraft, submitJobApplication } from './jobApplicationController.js';

let replicaSet;
const response = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

before(async () => {
  replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replicaSet.getUri());
  await Promise.all([User, Company, JobListing, JobApplication, CompanyApplication].map((model) => model.createIndexes()));
});

beforeEach(async () => {
  await Promise.all([User, Company, JobListing, JobApplication, CompanyApplication].map((model) => model.deleteMany({})));
});

after(async () => {
  await mongoose.disconnect();
  await replicaSet.stop();
});

test('combined application feed scopes to applicant, normalizes status, searches and paginates', async () => {
  const applicant = await User.create({ name: 'Feed Owner', email: 'feed-owner@example.com', password: 'Testpass1' });
  const otherApplicant = await User.create({ name: 'Other Owner', email: 'other-owner@example.com', password: 'Testpass1' });
  const company = await Company.create({ providerId: (await User.create({ name: 'Provider', email: 'feed-provider@example.com', password: 'Testpass1', role: 'provider' }))._id, name: 'Northwind', category: 'Technology' });
  const job = await JobListing.create({ companyId: company._id, providerId: company.providerId, title: 'Support Engineer', description: 'Support customers', employmentType: 'full_time' });
  await JobApplication.create({ jobId: job._id, companyId: company._id, applicantId: applicant._id, applicant: { name: applicant.name, email: applicant.email }, status: 'rejected', submittedAt: new Date('2026-09-01T00:00:00Z') });
  await CompanyApplication.create({ companyId: company._id, applicantId: applicant._id, status: 'interview_scheduled', createdAt: new Date('2026-09-02T00:00:00Z') });
  await JobApplication.create({ jobId: job._id, companyId: company._id, applicantId: otherApplicant._id, applicant: { name: otherApplicant.name, email: otherApplicant.email }, status: 'accepted' });

  const listResponse = response();
  await listUserApplications({ user: { _id: applicant._id, role: 'user' }, query: { search: 'northwind', page: '1', limit: '1' } }, listResponse);
  assert.equal(listResponse.statusCode, 200);
  assert.equal(listResponse.body.count, 2);
  assert.equal(listResponse.body.data.length, 1);
  assert.equal(listResponse.body.pages, 2);

  const interviewResponse = response();
  await listUserApplications({ user: { _id: applicant._id, role: 'user' }, query: { status: 'interview' } }, interviewResponse);
  assert.equal(interviewResponse.body.count, 1);
  assert.equal(interviewResponse.body.data[0].status, 'interview');
  assert.equal(interviewResponse.body.data[0].displayStatus, 'Interview');

  const activeResponse = response();
  await listUserApplications({ user: { _id: applicant._id, role: 'user' }, query: { status: 'active' } }, activeResponse);
  assert.equal(activeResponse.body.count, 1);
  assert.equal(activeResponse.body.data[0].status, 'interview');

  const rejectedResponse = response();
  await listUserApplications({ user: { _id: applicant._id, role: 'user' }, query: { status: 'rejected' } }, rejectedResponse);
  assert.equal(rejectedResponse.body.count, 1);
  assert.equal(rejectedResponse.body.data[0].title, 'Support Engineer');
  assert.equal(rejectedResponse.body.data[0].organization, 'Northwind');
});

test('applicants can withdraw, annotate, and archive only their own submissions', async () => {
  const applicant = await User.create({ name: 'Lifecycle Owner', email: 'lifecycle-owner@example.com', password: 'Testpass1' });
  const otherApplicant = await User.create({ name: 'Lifecycle Other', email: 'lifecycle-other@example.com', password: 'Testpass1' });
  const application = await JobApplication.create({
    jobId: new mongoose.Types.ObjectId(),
    companyId: new mongoose.Types.ObjectId(),
    applicantId: applicant._id,
    applicant: { name: applicant.name, email: applicant.email },
    status: 'submitted',
    statusHistory: [{ status: 'submitted' }],
  });
  const params = { kind: 'job', id: String(application._id) };

  const denied = response();
  await updateUserApplication({ user: { _id: otherApplicant._id, role: 'user' }, params, body: { applicantNote: 'Not mine' } }, denied);
  assert.equal(denied.statusCode, 404);

  const withdrawn = response();
  await updateUserApplication({ user: { _id: applicant._id, role: 'user' }, params, body: { action: 'withdraw' } }, withdrawn);
  assert.equal(withdrawn.statusCode, 200);
  assert.equal(withdrawn.body.data.status, 'withdrawn');
  assert.ok(withdrawn.body.data.withdrawnAt);

  const annotated = response();
  await updateUserApplication({ user: { _id: applicant._id, role: 'user' }, params, body: { applicantNote: 'Follow up next week.' } }, annotated);
  assert.equal(annotated.statusCode, 200);
  assert.equal(annotated.body.data.applicantNote, 'Follow up next week.');

  const archived = response();
  await updateUserApplication({ user: { _id: applicant._id, role: 'user' }, params, body: { action: 'archive' } }, archived);
  assert.equal(archived.statusCode, 200);

  const archivedList = response();
  await listUserApplications({ user: { _id: applicant._id, role: 'user' }, query: { status: 'archived' } }, archivedList);
  assert.equal(archivedList.body.count, 1);
  assert.equal(archivedList.body.data[0].status, 'withdrawn');
});

test('permanent job deletion and application-capacity decrement commit together', async () => {
  const applicant = await User.create({ name: 'Delete Owner', email: 'delete-owner@example.com', password: 'Testpass1' });
  const provider = await User.create({ name: 'Delete Provider', email: 'delete-provider@example.com', password: 'Testpass1', role: 'provider' });
  const company = await Company.create({ providerId: provider._id, name: 'Delete Employer', category: 'Retail' });
  const job = await JobListing.create({ companyId: company._id, providerId: provider._id, title: 'Store Associate', description: 'Serve customers', employmentType: 'part_time', applicationCount: 1, slots: 2 });
  const application = await JobApplication.create({ jobId: job._id, companyId: company._id, applicantId: applicant._id, applicant: { name: applicant.name, email: applicant.email }, status: 'submitted' });

  const deleted = response();
  await deleteUserApplication({ user: { _id: applicant._id, role: 'user' }, params: { kind: 'job', id: String(application._id) } }, deleted);
  assert.equal(deleted.statusCode, 200);
  assert.equal(await JobApplication.countDocuments({ _id: application._id }), 0);
  assert.equal((await JobListing.findById(job._id)).applicationCount, 0);
});

test('rejected job applicants can reapply without taking an additional slot', async () => {
  const applicant = await User.create({ name: 'Reapply Owner', email: 'reapply-owner@example.com', password: 'Testpass1' });
  const provider = await User.create({ name: 'Reapply Provider', email: 'reapply-provider@example.com', password: 'Testpass1', role: 'provider' });
  const company = await Company.create({ providerId: provider._id, name: 'Reapply Employer', category: 'Technology' });
  const job = await JobListing.create({ companyId: company._id, providerId: provider._id, title: 'QA Analyst', description: 'Test software', employmentType: 'full_time', status: 'open', reviewStatus: 'approved', applicationCount: 1, slots: 1 });
  const application = await JobApplication.create({ jobId: job._id, companyId: company._id, applicantId: applicant._id, applicant: { name: applicant.name, email: applicant.email }, status: 'rejected', rejectedAt: new Date(), statusHistory: [{ status: 'submitted' }, { status: 'rejected' }] });
  const user = { _id: applicant._id, role: 'user', name: applicant.name, email: applicant.email };

  const draft = response();
  await saveJobApplicationDraft({ user, params: { jobId: String(job._id) }, body: { applicantName: applicant.name, applicantEmail: applicant.email, draftStep: '1' }, files: [] }, draft);
  assert.equal(draft.statusCode, 200);
  assert.equal(draft.body.data.status, 'draft');

  const submitted = response();
  await submitJobApplication({ user, params: { jobId: String(job._id) }, body: { applicantName: applicant.name, applicantEmail: applicant.email }, files: [] }, submitted);
  assert.equal(submitted.statusCode, 201);
  assert.equal(submitted.body.data.status, 'submitted');
  assert.equal(await JobApplication.countDocuments({ jobId: job._id, applicantId: applicant._id }), 1);
  assert.equal((await JobListing.findById(job._id)).applicationCount, 1);
  assert.deepEqual((await JobApplication.findById(application._id)).statusHistory.map(({ status }) => status), ['submitted', 'rejected', 'draft', 'submitted']);
});
