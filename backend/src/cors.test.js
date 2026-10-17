import assert from 'node:assert/strict';
import { after, test } from 'node:test';

// server.js refuses to load without a JWT secret, and it skips dotenv when the
// VERCEL flag is present. Set both before importing so the test is hermetic.
process.env.JWT_SECRET = 'test-secret-long-enough-to-satisfy-the-api-000000';
process.env.VERCEL = '1';

const { default: app } = await import('./server.js');

// /api/health is used as the probe: it never touches the database, so it
// isolates the CORS middleware from query behaviour.
const server = app.listen(0);
const baseUrl = `http://127.0.0.1:${server.address().port}`;
after(() => server.close());

test('an unrecognised Origin is not turned into a 500', async () => {
  const response = await fetch(`${baseUrl}/api/health`, {
    headers: { Origin: 'https://not-an-allowed-origin.example' },
  });

  assert.notEqual(response.status, 500, 'a blocked origin must not surface as a server error');
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});

test('the deployed frontend origin is allowed', async () => {
  const origin = 'https://pathpoint-frontend.vercel.app';
  const response = await fetch(`${baseUrl}/api/health`, { headers: { Origin: origin } });

  assert.notEqual(response.status, 500);
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
});

test('requests without an Origin still pass through', async () => {
  const response = await fetch(`${baseUrl}/api/health`);

  assert.notEqual(response.status, 500);
});
