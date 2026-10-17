import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import morgan from 'morgan';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import providerRoutes from './routes/providerRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import workLogRoutes from './routes/workLogRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import pinRoutes from './routes/pinRoutes.js';

if (!process.env.VERCEL) {
  dotenv.config({
    path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env'),
  });
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters before the API can start.');
}

const app = express();
// Behind Vercel/servers the client IP arrives via X-Forwarded-For. Trusting a
// single proxy hop lets req.ip resolve to the real client so login lockouts and
// rate limiting key on the right value instead of one shared edge address.
app.set('trust proxy', 1);
// CORS setup
const allowedOrigins = [
  'https://pathpoint.vercel.app',
  'https://pathpoint-frontend-ewtr2s31q-path-point.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:3000',
];
// Support multiple CLIENT_URL values (comma or space separated)
if (process.env.CLIENT_URL) {
  process.env.CLIENT_URL.split(/[,\s]+/).forEach((url) => {
    const trimmed = url.trim();
    if (trimmed) allowedOrigins.push(trimmed);
  });
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin is not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsers
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true }));

// Security headers
app.use((_req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Request logging in development
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/work-logs', workLogRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/v1', profileRoutes);
app.use('/api/pins', pinRoutes);
app.use('/api/admin', adminRoutes);

// Root greeting / health check shortcut
app.get('/', (req, res) => {
  res.json({
    message: 'PathPoint API Server is running',
    docs: '/api/health',
  });
});

// 404 Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Resource not found at ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err.stack);

  // Malformed JSON bodies arrive as a SyntaxError with status 400.
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ success: false, message: 'Invalid request body.' });
  }

  const status = err.status || err.statusCode || 500;
  // Never leak internal error messages on server errors; keep 4xx messages
  // because they are written for the client (e.g. CORS rejections).
  const message = status >= 500 ? 'Internal Server Error' : (err.message || 'Request failed');
  return res.status(status).json({ success: false, message });
});

export default app;
