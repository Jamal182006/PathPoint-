import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import { migrateLegacyProviderCompany } from './legacyCompanyMigration.js';

const backendDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: resolve(backendDirectory, '.env') });

const migrateCompanyProfiles = async () => {
  await connectDB();
  let migrated = 0;
  let alreadyMigrated = 0;

  const providers = User.find({
    role: 'provider',
    'businessProfile.companyName': { $type: 'string', $ne: '' },
  }).cursor();

  for await (const provider of providers) {
    const result = await migrateLegacyProviderCompany(provider);
    if (result.created) migrated += 1;
    else alreadyMigrated += 1;
  }

  console.log(`Company profile migration complete: ${migrated} created, ${alreadyMigrated} already migrated.`);
};

try {
  await migrateCompanyProfiles();
} catch (error) {
  console.error('[Company Migration Error]:', error.message);
  process.exitCode = 1;
} finally {
  const mongoose = await import('mongoose');
  await mongoose.default.disconnect();
}
