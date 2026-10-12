import test from 'node:test';
import assert from 'node:assert/strict';
import { validateJob } from './jobValidation.js';

const validJob = {
  title: 'Cafe Manager',
  category: 'Hospitality',
  description: 'Lead a cafe team.',
  slots: 2,
  currency: 'USD',
  salaryMin: 20,
  salaryMax: 30,
  requirements: [{ type: 'file', title: 'Resume', allowedFileTypes: ['application/pdf'] }],
};

test('job form validation accepts a complete valid listing', () => {
  assert.equal(validateJob(validJob), '');
});

test('job form validation rejects missing required fields and invalid opening counts', () => {
  assert.equal(validateJob({ ...validJob, title: '  ' }), 'Add a job title.');
  assert.equal(validateJob({ ...validJob, slots: 1.5 }), 'Openings must be a whole number between 1 and 10000.');
});

test('job form validation rejects invalid pay, currency, contact, location, and requirements', () => {
  assert.match(validateJob({ ...validJob, salaryMin: 40 }), /Minimum salary cannot exceed maximum salary/);
  assert.match(validateJob({ ...validJob, currency: 'US' }), /three-letter code/);
  assert.match(validateJob({ ...validJob, contactEmail: 'not-an-email' }), /valid contact email/);
  assert.match(validateJob({ ...validJob, latitude: 37 }), /both latitude and longitude/);
  assert.match(validateJob({ ...validJob, requirements: [{ type: 'file', title: '', allowedFileTypes: [] }] }), /Every requirement needs a title/);
});
