import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const backendDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: resolve(backendDirectory, '.env') });

const requiredSettings = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
const missingSettings = requiredSettings.filter((key) => !process.env[key]?.trim());

if (missingSettings.length) {
  console.error(`Missing SMTP settings: ${missingSettings.join(', ')}`);
  process.exitCode = 1;
} else {
  const port = Number(process.env.SMTP_PORT);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS.replace(/\s+/g, ''),
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  try {
    await transporter.verify();
    console.log('SMTP connection and authentication succeeded.');
  } catch (error) {
    console.error('SMTP verification failed:', JSON.stringify({
      code: error.code,
      responseCode: error.responseCode,
      command: error.command,
    }));
    process.exitCode = 1;
  }
}
