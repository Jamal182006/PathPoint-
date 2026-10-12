import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';
import WorkLog from '../models/WorkLog.js';
import { createWorkLog, deleteWorkLog, listWorkLogs, updateWorkLog } from './workLogController.js';

let memoryServer;
const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

before(async () => {
  memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri());
  await Promise.all([User, WorkLog].map((model) => model.createIndexes()));
});

beforeEach(async () => {
  await Promise.all([User, WorkLog].map((model) => model.deleteMany({})));
});

after(async () => {
  await mongoose.disconnect();
  await memoryServer.stop();
});

test('work-log save flow validates, persists, updates, lists, and deletes only owner records', async () => {
  const owner = await User.create({ name: 'Work Owner', email: 'work-owner@example.com', password: 'Testpass1' });
  const other = await User.create({ name: 'Work Other', email: 'work-other@example.com', password: 'Testpass1' });
  const request = { user: { _id: owner._id } };

  const invalid = response();
  await createWorkLog({ ...request, body: { title: 'Invalid', category: 'unknown', startedAt: '2026-10-12' } }, invalid);
  assert.equal(invalid.statusCode, 400);

  const missingDuration = response();
  await createWorkLog({ ...request, body: { title: 'No duration', category: 'general', startedAt: '2026-10-12' } }, missingDuration);
  assert.equal(missingDuration.statusCode, 400);

  const created = response();
  await createWorkLog({ ...request, body: { title: 'Fence repair', category: 'repair', startedAt: '2026-10-12', hours: 2.5, payAmount: 125 } }, created);
  assert.equal(created.statusCode, 201);
  assert.equal(created.body.data.category, 'repair');
  const recordId = String(created.body.data._id);

  const listed = response();
  await listWorkLogs({ ...request, query: { search: 'fence' } }, listed);
  assert.equal(listed.body.count, 1);
  assert.equal(listed.body.data[0].category, 'repair');

  const deniedUpdate = response();
  await updateWorkLog({ user: { _id: other._id }, params: { id: recordId }, body: { title: 'Changed' } }, deniedUpdate);
  assert.equal(deniedUpdate.statusCode, 404);

  const updated = response();
  await updateWorkLog({ ...request, params: { id: recordId }, body: { category: 'cleaning', notes: 'Completed safely.' } }, updated);
  assert.equal(updated.statusCode, 200);
  assert.equal(updated.body.data.category, 'cleaning');

  const deleted = response();
  await deleteWorkLog({ ...request, params: { id: recordId } }, deleted);
  assert.equal(deleted.statusCode, 200);
  assert.equal(await WorkLog.countDocuments({ userId: owner._id }), 0);
});
