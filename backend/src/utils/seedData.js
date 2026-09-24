import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Application from '../models/Application.js';
import connectDB from '../config/db.js';

dotenv.config();

const seed = async () => {
  try {
    await connectDB();

    console.log('[Seed] Clearing existing Users and Applications...');
    await User.deleteMany({});
    await Application.deleteMany({});

    const admin = await User.create({
      name: 'Dr. Sarah Lin',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin',
      title: 'Director of Career Services',
      status: 'active',
    });

    console.log('[Seed] Default admin account created:');
    console.log(`  - Admin: ${admin.email} (admin123)`);
    console.log('[Seed] Database seeding completed successfully! ✨');
    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]:', err);
    process.exit(1);
  }
};

seed();
