import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import CompanyApplication from '../models/CompanyApplication.js';
import JobApplication from '../models/JobApplication.js';
import PinnedItem from '../models/PinnedItem.js';
import WorkLog from '../models/WorkLog.js';

const backendDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: resolve(backendDirectory, '.env') });

const backfillStatusHistory = async (Model) => Model.updateMany({
  $or: [{ statusHistory: { $exists: false } }, { statusHistory: { $size: 0 } }],
}, [
  {
    $set: {
      statusHistory: {
        $let: {
          vars: { history: { $ifNull: ['$statusHistory', []] } },
          in: {
            $cond: [
              { $gt: [{ $size: '$$history' }, 0] },
              '$$history',
              [{ status: '$status', changedAt: { $ifNull: ['$updatedAt', '$createdAt'] } }],
            ],
          },
        },
      },
    },
  },
]);

const migrate = async () => {
  await connectDB();
  await Promise.all([
    backfillStatusHistory(JobApplication),
    backfillStatusHistory(CompanyApplication),
    JobApplication.updateMany({ status: 'rejected', $or: [{ rejectedAt: { $exists: false } }, { rejectedAt: null }] }, [
      { $set: { rejectedAt: { $ifNull: ['$updatedAt', '$createdAt'] } } },
    ]),
    CompanyApplication.updateMany({ status: 'rejected', $or: [{ rejectedAt: { $exists: false } }, { rejectedAt: null }] }, [
      { $set: { rejectedAt: { $ifNull: ['$updatedAt', '$createdAt'] } } },
    ]),
    WorkLog.updateMany({ $or: [{ category: { $exists: false } }, { category: null }, { category: '' }] }, { $set: { category: 'general' } }),
  ]);
  await PinnedItem.createIndexes();
  console.log('User-area migration complete: application history, rejection dates, work-log categories, pin collection/indexes ready.');
};

try {
  await migrate();
} catch (error) {
  console.error('[User-Area Migration Error]:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
