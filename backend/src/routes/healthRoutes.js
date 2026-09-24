import express from 'express';
import { getDBStatus } from '../config/db.js';

const router = express.Router();
const startTime = Date.now();

router.get('/health', (req, res) => {
  const dbStatus = getDBStatus();
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  res.status(200).json({
    status: 'healthy',
    version: '1.0.0',
    uptimeSeconds,
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

export default router;
