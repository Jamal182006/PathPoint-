import test from 'node:test';
import assert from 'node:assert/strict';
import { readJobDraft, removeJobDraft, writeJobDraft } from './jobDraftStorage.js';

const createStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};

test('job drafts persist form fields and the active step for reload recovery', () => {
  const storage = createStorage();
  assert.equal(writeJobDraft(storage, 'draft:company-1', { job: { title: 'Cafe Manager' }, currentStep: 2 }), true);
  const recovered = readJobDraft(storage, 'draft:company-1');
  assert.equal(recovered.job.title, 'Cafe Manager');
  assert.equal(recovered.currentStep, 2);
  assert.ok(recovered.savedAt > 0);
});

test('job draft recovery ignores malformed or unsupported saved data', () => {
  const storage = createStorage();
  storage.setItem('broken', '{');
  storage.setItem('old-version', JSON.stringify({ version: 0, job: { title: 'Old' } }));
  assert.equal(readJobDraft(storage, 'broken'), null);
  assert.equal(readJobDraft(storage, 'old-version'), null);
});

test('job drafts can be removed after submit or explicit discard', () => {
  const storage = createStorage();
  writeJobDraft(storage, 'draft:company-1', { job: { title: 'Cafe Manager' }, currentStep: 0 });
  removeJobDraft(storage, 'draft:company-1');
  assert.equal(readJobDraft(storage, 'draft:company-1'), null);
});
