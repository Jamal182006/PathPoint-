import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import multer from 'multer';

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const uploadDirectory = process.env.VERCEL
  ? path.resolve('/tmp/pathpoint/private-uploads/company-applications')
  : path.resolve(backendDirectory, 'private-uploads', 'company-applications');
fs.mkdirSync(uploadDirectory, { recursive: true });

const extensionByMimeType = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDirectory),
    filename: (_req, file, callback) => callback(null, `${randomUUID()}${extensionByMimeType[file.mimetype] || '.bin'}`),
  }),
  fileFilter: (_req, file, callback) => {
    if (!extensionByMimeType[file.mimetype]) {
      callback(new Error('Only PDF, JPG, and PNG documents are accepted'));
      return;
    }
    callback(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 20,
    fields: 5,
    fieldSize: 128 * 1024,
  },
});

export const getCompanyUploadDirectory = () => uploadDirectory;

export const companyApplicationUpload = (req, res, next) => {
  upload.any()(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.code === 'LIMIT_FILE_SIZE'
          ? 'Each document must be 5 MB or smaller'
          : error.message || 'Invalid document upload',
      });
    }
    return next();
  });
};