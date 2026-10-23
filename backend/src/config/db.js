import mongoose from 'mongoose';
import Application from '../models/Application.js';
import Company from '../models/Company.js';
import CompanyApplication from '../models/CompanyApplication.js';
import JobListing from '../models/JobListing.js';
import JobApplication from '../models/JobApplication.js';
import WorkLog from '../models/WorkLog.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import ActivityLog from '../models/ActivityLog.js';
import PinnedItem from '../models/PinnedItem.js';
import WorkLogReminder from '../models/WorkLogReminder.js';

let memoryServer = null;

const ensureCollections = async () => {
  const models = [User, Application, Company, CompanyApplication, JobListing, JobApplication, WorkLog, Notification, ActivityLog, PinnedItem, WorkLogReminder];
  const existingCollections = new Set(
    (await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray())
      .map(({ name }) => name)
  );

  for (const model of models) {
    if (!existingCollections.has(model.collection.collectionName)) {
      await model.createCollection();
    }
  }

  await Promise.all(models.map((model) => model.createIndexes()));
  console.log('[MongoDB] Required collections and indexes are ready:', models.map((model) => model.collection.collectionName).join(', '));
};

const ensureDefaultAdmin = async () => {
  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const adminName = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || 'PathPoint Administrator';
  const adminUsername = (process.env.BOOTSTRAP_ADMIN_USERNAME || 'pathpoint_admin').trim();
  const normalizedUsername = adminUsername.toLowerCase();
  if (!adminEmail || !adminPassword) return;

  // Match on either identifier. An account created before BOOTSTRAP_ADMIN_EMAIL
  // changed still carries the old email, so an email-only lookup misses it and
  // the subsequent create hits a duplicate-username error on every boot --
  // leaving the configured admin email with no account behind it, which signs
  // in as "Invalid credentials".
  let existingAdmin = await User.findOne({ email: adminEmail }).select('+password');
  if (!existingAdmin) {
    existingAdmin = await User.findOne({ username: normalizedUsername }).select('+password');
  }

  if (existingAdmin) {
    // Adopt the configured email, unless another account already owns it.
    const emailHeldByOther = await User.exists({ email: adminEmail, _id: { $ne: existingAdmin._id } });
    const targetEmail = emailHeldByOther ? existingAdmin.email : adminEmail;

    const needsRefresh =
      existingAdmin.name !== adminName ||
      existingAdmin.username !== normalizedUsername ||
      existingAdmin.email !== targetEmail ||
      existingAdmin.role !== 'admin' ||
      existingAdmin.status !== 'active';

    const passwordMatches = existingAdmin.password ? await existingAdmin.matchPassword(adminPassword) : false;
    if (needsRefresh || !passwordMatches) {
      existingAdmin.name = adminName;
      existingAdmin.username = normalizedUsername;
      existingAdmin.email = targetEmail;
      existingAdmin.role = 'admin';
      existingAdmin.status = 'active';
      existingAdmin.password = adminPassword;
      await existingAdmin.save();
      console.log(`[MongoDB] Bootstrap administrator refreshed: ${targetEmail}`);
    }
    return;
  }

  await User.create({
    name: adminName,
    username: normalizedUsername,
    email: adminEmail,
    password: adminPassword,
    role: 'admin',
    status: 'active',
  });
  console.log(`[MongoDB] Bootstrap administrator created: ${adminEmail}`);
};

export const connectDB = async () => {
  const fallbackEnabled = String(process.env.MONGODB_ALLOW_MEMORY_FALLBACK || '').toLowerCase() === 'true';
  const configuredUri = process.env.MONGODB_URI;

  const tryConnect = async (uri, label) => {
    if (!/^mongodb(?:\+srv)?:\/\//i.test(uri)) {
      throw new Error('Invalid MongoDB URI. Use a mongodb:// or mongodb+srv:// connection string.');
    }

    const maskedUri = uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)[^@]+@/, '$1****@');
    console.log(`[MongoDB] Connecting to: ${maskedUri}`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
    });
    console.log(`[MongoDB] Connected successfully to database: ${mongoose.connection.name} (${label})`);
    await ensureCollections();
    try {
      await ensureDefaultAdmin();
    } catch (error) {
      // A bootstrap-admin conflict (e.g. duplicate username) must never take down
      // the whole API: the database connection itself is still healthy.
      console.warn(`[MongoDB] Bootstrap administrator could not be applied: ${error.message}`);
    }
    return mongoose.connection;
  };

  const startMemoryFallback = async () => {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    return tryConnect(memoryServer.getUri(), 'memory-server fallback');
  };

  try {
    if (!configuredUri) {
      if (!fallbackEnabled) {
        throw new Error('MONGODB_URI must be configured with a MongoDB connection string.');
      }
      return await startMemoryFallback();
    }

    try {
      return await tryConnect(configuredUri, 'configured uri');
    } catch (err) {
      if (!fallbackEnabled) {
        throw err;
      }
      console.warn(`[MongoDB] Configured connection failed (${err.message}). Falling back to in-memory MongoDB.`);
      return await startMemoryFallback();
    }
  } catch (err) {
    console.error(`[MongoDB] Connection failed: ${err.message}`);
    throw err;
  }
};

export const getDBStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] || 'unknown';
};

export const getDBInfo = () => {
  const status = getDBStatus();
  return {
    status,
    databaseName: mongoose.connection.name || null,
    isMemoryFallback: Boolean(memoryServer),
    connectionType: memoryServer ? 'memory_fallback' : (mongoose.connection.readyState === 1 ? 'atlas_configured' : 'none'),
  };
};

export default connectDB;
