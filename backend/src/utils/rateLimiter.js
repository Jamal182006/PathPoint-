// Lightweight in-memory rate limiter for public endpoints.
//
// This mirrors the existing login-lockout approach: state lives per server
// instance, so on serverless platforms it is best-effort defence-in-depth
// rather than a hard guarantee. Combined with the fixed `trust proxy` setting,
// it still blocks the common brute-force / mass-signup patterns.
const buckets = new Map();
const MAX_BUCKETS = 10000;

const clientKey = (req) => {
  const forwarded = req.headers?.['x-forwarded-for'];
  const ip = req.ip || (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : forwarded) || 'unknown';
  return String(ip);
};

const sweep = (now) => {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
};

/**
 * Create an Express middleware that limits requests per client IP.
 * @param {{ windowMs: number, max: number, keyPrefix?: string }} options
 */
export const createRateLimiter = ({ windowMs, max, keyPrefix = 'rl' }) => (req, res, next) => {
  // Never throttle the test suite, which calls controllers directly.
  if (process.env.NODE_ENV === 'test') return next();

  const now = Date.now();
  sweep(now);

  const key = `${keyPrefix}:${clientKey(req)}`;
  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }

  entry.count += 1;
  if (entry.count > max) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({
      success: false,
      message: `Too many attempts. Please try again in ${retryAfter} seconds.`,
      retryAfter,
    });
  }

  return next();
};

export const resetRateLimiters = () => buckets.clear();
