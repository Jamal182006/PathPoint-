import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import User from '../models/User.js';
import Application from '../models/Application.js';
import { importApplications } from './applicationImportController.js';

let replicaSet;
const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

before(async () => {
  replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replicaSet.getUri());
  await Promise.all([User, Application].map((model) => model.createIndexes()));
});

beforeEach(async () => {
  await Promise.all([User, Application].map((model) => model.deleteMany({})));
});

after(async () => {
  await mongoose.disconnect();
  await replicaSet.stop();
});

test('application import validates, skips duplicates, scopes records, and replaces atomically', async () => {
  const owner = await User.create({ name: 'Import Owner', email: 'import-owner@example.com', password: 'Testpass1' });
  const other = await User.create({ name: 'Import Other', email: 'import-other@example.com', password: 'Testpass1' });
  const applications = [
    { company: 'Northwind', role: 'Analyst', status: 'Applied', dateApplied: '2026-10-01T00:00:00.000Z' },
    { company: 'Contoso', role: 'Designer', status: 'Interviewing', dateApplied: '2026-10-02T00:00:00.000Z' },
  ];

  const invalid = response();
  await importApplications({ user: { _id: owner._id, role: 'user' }, body: { applications: [{ company: 'No role' }] } }, invalid);
  assert.equal(invalid.statusCode, 400);

  const first = response();
  await importApplications({ user: { _id: owner._id, role: 'user' }, body: { applications } }, first);
  assert.equal(first.statusCode, 200);
  assert.equal(first.body.data.imported, 2);

  const duplicate = response();
  await importApplications({ user: { _id: owner._id, role: 'user' }, body: { applications } }, duplicate);
  assert.equal(duplicate.body.data.imported, 0);
  assert.equal(duplicate.body.data.skipped, 2);

  const replacement = response();
  await importApplications({ user: { _id: owner._id, role: 'user' }, body: { applications: [{ company: 'Fabrikam', role: 'Technician', status: 'Saved' }], replace: true } }, replacement);
  assert.equal(replacement.body.data.replaced, true);
  assert.equal(await Application.countDocuments({ userId: owner._id }), 1);
  assert.equal(await Application.countDocuments({ userId: other._id }), 0);
  assert.equal(await Application.findOne({ userId: owner._id }).then((item) => item.company), 'Fabrikam');
});
