import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import morgan from 'morgan';
import helmet from 'helmet';
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
import workLogReminderRoutes from './routes/workLogReminderRoutes.js';
import cronRoutes from './routes/cronRoutes.js';

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
  'https://pathpoint-frontend.vercel.app',
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
      // Unknown origin: omit the CORS headers instead of throwing. Throwing
      // reaches the error handler as a 500, which broke every write request
      // once the app was served through the Vercel proxy: the browser attaches
      // an Origin header to every non-GET request, including same-origin ones.
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsers
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true, limit: '8mb' }));

// Security headers via Helmet (centralized, maintained). Manual fallbacks kept
// as defense-in-depth in case Helmet is ever disabled.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "https://nominatim.openstreetmap.org"],
        fontSrc: ["'self'", "data:"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  })
);
// Keep geolocation usable for the address map (Helmet's default Permissions-Policy
// would disable it).
app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=()');
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
app.use('/api/work-log-reminders', workLogReminderRoutes);
app.use('/api/cron', cronRoutes);
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
