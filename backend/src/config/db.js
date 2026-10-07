import mongoose from 'mongoose';
import Application from '../models/Application.js';
import Company from '../models/Company.js';
import CompanyApplication from '../models/CompanyApplication.js';
import JobListing from '../models/JobListing.js';
import JobApplication from '../models/JobApplication.js';
import WorkLog from '../models/WorkLog.js';
import User from '../models/User.js';

const ensureCollections = async () => {
  const models = [User, Application, Company, CompanyApplication, JobListing, JobApplication, WorkLog];
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
  if (!adminEmail || !adminPassword) return;

  const existingAdmin = await User.findOne({ email: adminEmail });
  if (existingAdmin) return;

  await User.create({
    name: process.env.BOOTSTRAP_ADMIN_NAME?.trim() || 'PathPoint Administrator',
    email: adminEmail,
    password: adminPassword,
    role: 'admin',
    status: 'active',
  });
  console.log(`[MongoDB] Bootstrap administrator created: ${adminEmail}`);
};

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI must be configured with a MongoDB Atlas connection string.');
  }

  if (!/^mongodb(?:\+srv)?:\/\//i.test(uri)) {
    throw new Error('Invalid MONGODB_URI. Use a mongodb:// or mongodb+srv:// connection string.');
  }

  const maskedUri = uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)[^@]+@/, '$1****@');

  try {
    console.log(`[MongoDB] Connecting to: ${maskedUri}`);

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
    });

    console.log(`[MongoDB] Connected successfully to database: ${mongoose.connection.name}`);
    await ensureCollections();
    await ensureDefaultAdmin();
  } catch (err) {
    console.error(`[MongoDB] Atlas connection to ${maskedUri} failed: ${err.message}`);
    throw err;
  }

  return mongoose.connection;
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

export default connectDB;
