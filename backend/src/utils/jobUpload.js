import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import multer from 'multer';

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const uploadDirectory = path.resolve(backendDirectory, 'private-uploads', 'job-applications');
await fs.mkdir(uploadDirectory, { recursive: true });

const extensionByMimeType = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, callback) => {
    if (!extensionByMimeType[file.mimetype]) return callback(new Error('Only PDF, JPG, and PNG documents are accepted'));
    return callback(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024, files: 25, fields: 30, fieldSize: 6000 },
});

export const getJobUploadDirectory = () => uploadDirectory;

export const jobApplicationUpload = (req, res, next) => {
  upload.any()(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.code === 'LIMIT_FILE_SIZE' ? 'Each document must be 10 MB or smaller' : error.message || 'Invalid document upload',
      });
    }
    return next();
  });
};
