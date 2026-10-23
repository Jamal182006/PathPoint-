import crypto from 'crypto';
import express from 'express';
import { dispatchDueWorkLogReminders } from '../utils/workLogReminders.js';

const router = express.Router();

router.get('/work-log-reminders', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  const authorization = req.get('authorization') || '';
  const provided = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!secret || provided.length !== secret.length || !crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(secret))) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const result = await dispatchDueWorkLogReminders();
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('[Work Log Reminder] Scheduled dispatch failed:', error);
    return res.status(500).json({ success: false, message: 'Reminder dispatch failed.' });
  }
});

export default router;
