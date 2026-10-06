import mongoose from 'mongoose';
import Application from '../models/Application.js';
import User from '../models/User.js';

const ensureCollections = async () => {
  const models = [User, Application];
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
  console.log('[MongoDB] Required collections and indexes are ready: users, applications');
};

const ensureDefaultAdmin = async () => {
  try {
    const adminEmail = 'admin@example.com';
    const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase() });

    if (existingAdmin) {
      return;
    }

    await User.create({
      name: 'Dr. Sarah Lin',
      email: adminEmail,
      password: 'admin123',
      role: 'admin',
      title: 'Director of Career Services',
      status: 'active',
    });

    console.log('[MongoDB] Default admin account created: admin@example.com / admin123');
  } catch (error) {
    console.warn('[MongoDB] Unable to ensure default admin account:', error.message);
  }
};

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI must be configured with a MongoDB Atlas connection string.');
  }

  if (!/^mongodb(?:\+srv)?:\/\/.*mongodb\.net/i.test(uri)) {
    throw new Error('Only MongoDB Atlas connections are supported. Use a mongodb.net connection string.');
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
