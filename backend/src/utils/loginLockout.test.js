import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_LOGIN_ATTEMPTS, LOCKOUT_MS, getLoginKey, getLockout, recordFailedLogin, resetLoginAttempts } from './loginLockout.js';

test('login lockout triggers after 5 failed attempts and lasts 60 seconds', () => {
  const key = getLoginKey('203.0.113.10', 'user@example.com');
  resetLoginAttempts(key);

  for (let i = 0; i < MAX_LOGIN_ATTEMPTS - 1; i += 1) {
    const status = recordFailedLogin(key);
    assert.equal(status, null);
  }

  const finalStatus = recordFailedLogin(key);
  assert.ok(finalStatus !== null);
  assert.ok(finalStatus <= LOCKOUT_MS / 1000);
  assert.ok(finalStatus > 0);

  const lockSeconds = getLockout(key);
  assert.ok(lockSeconds !== null);
  assert.ok(lockSeconds <= LOCKOUT_MS / 1000);
  assert.ok(lockSeconds > 0);

  resetLoginAttempts(key);
});
