import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import { fillMissingUserProfile } from './userProfileMigration.js';

const backendDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: resolve(backendDirectory, '.env') });

const migrate = async () => {
  await connectDB();
  const usedUsernames = new Set((await User.find({ username: { $type: 'string' } }).select('username').lean())
    .map(({ username }) => String(username).toLowerCase()));
  let updated = 0;
  let unchanged = 0;

  const users = User.find({}).cursor();
  for await (const user of users) {
    const changed = fillMissingUserProfile(user, usedUsernames);
    if (changed) {
      await user.save({ validateBeforeSave: false });
      updated += 1;
    } else {
      unchanged += 1;
    }
  }

  console.log(`User profile migration complete: ${updated} updated, ${unchanged} already current.`);
};

try {
  await migrate();
} catch (error) {
  console.error('[User Profile Migration Error]:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}