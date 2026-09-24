import mongoose from 'mongoose';
import User from '../models/User.js';

let memoryServer = null;

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
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pathpoint';
  const isProduction = process.env.NODE_ENV === 'production';
  const allowMemoryFallback =
    process.env.MONGODB_ALLOW_MEMORY_FALLBACK === 'true' ||
    !isProduction;

  if (isProduction && !process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI must be configured for production. Use your MongoDB Atlas connection string.');
  }

  const maskedUri = uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)[^@]+@/, '$1****@');

  try {
    console.log(`[MongoDB] Connecting to: ${maskedUri}`);

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
    });

    console.log(`[MongoDB] Connected successfully to database: ${mongoose.connection.name}`);
    await ensureDefaultAdmin();
  } catch (err) {
    console.warn(`[MongoDB] Standard connection to ${maskedUri} failed: ${err.message}`);

    if (!allowMemoryFallback) {
      throw err;
    }

    // Keep local development convenient when MongoDB is not installed or running.
    try {
      console.log('[MongoDB] Attempting in-memory MongoDB server for instant zero-config usage...');
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create({
        instance: { dbName: 'pathpoint' },
      });
      const memoryUri = memoryServer.getUri();
      await mongoose.connect(memoryUri);
      console.log(`[MongoDB] In-memory MongoDB running and connected at: ${memoryUri}`);
      await ensureDefaultAdmin();
    } catch (fallbackErr) {
      console.error('[MongoDB] In-memory fallback failed or not installed:', fallbackErr.message);
      console.error('\n' + '='.repeat(60));
      console.error('[MongoDB Setup Guidance]');
      console.error('Local MongoDB is not running on port 27017.');
      console.error('To connect your database:');
      console.error('1. Start your local MongoDB service (mongod), OR');
      console.error('2. Paste your free MongoDB Atlas cloud URI into pathpoint-backend/.env:');
      console.error('   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/pathpoint');
      console.error('='.repeat(60) + '\n');
      throw fallbackErr;
    }
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
