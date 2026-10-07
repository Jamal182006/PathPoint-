import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import morgan from 'morgan';
import connectDB from './config/db.js';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import providerRoutes from './routes/providerRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import workLogRoutes from './routes/workLogRoutes.js';

// Load the backend environment regardless of the process working directory.
dotenv.config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env'),
});

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters before the API can start.');
}

const app = express();
const PORT = process.env.PORT || 5000;

// CORS setup
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:3000',
];
if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
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

// Request logging in development
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/work-logs', workLogRoutes);
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
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start the API only after MongoDB is ready.
const server = await connectDB()
  .then(() => app.listen(PORT, () => {
    console.log(`\n🚀 PathPoint API server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`📡 Base API URL: http://localhost:${PORT}/api`);
    console.log(`🩺 Health Check: http://localhost:${PORT}/api/health\n`);
  }))
  .catch((err) => {
    console.error(`[MongoDB] API startup stopped: ${err.message}`);
    process.exitCode = 1;
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection]:', err);
});

export default app;
