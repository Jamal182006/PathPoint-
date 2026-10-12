import express from 'express';
import { protect } from '../middleware/auth.js';
import { listMyNotifications, markAllNotificationsRead, markNotificationRead } from '../controllers/notificationController.js';

const router = express.Router();
router.use(protect);
router.get('/', listMyNotifications);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:notificationId/read', markNotificationRead);

export default router;
