import express from 'express';
import { getDBStatus, getDBInfo } from '../config/db.js';

const router = express.Router();
const startTime = Date.now();

router.get('/health', (req, res) => {
  const dbInfo = getDBInfo();
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  const isHealthy = dbInfo.status === 'connected';
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unavailable',
    version: '1.0.0',
    uptimeSeconds,
    database: dbInfo.status,
    databaseName: dbInfo.databaseName,
    connectionType: dbInfo.connectionType,
    isMemoryFallback: dbInfo.isMemoryFallback,
    timestamp: new Date().toISOString(),
  });
});

export default router;
