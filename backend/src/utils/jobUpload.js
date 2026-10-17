import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const uploadDirectory = process.env.VERCEL
  ? path.resolve('/tmp/pathpoint/private-uploads/job-applications')
  : path.resolve(backendDirectory, 'private-uploads', 'job-applications');

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
  // Each text answer (cover letter, experience, question responses) is sent as
  // its own multipart field and may contain up to 5000 characters. A tight
  // fieldSize rejected valid unicode answers, so allow the same headroom as the
  // company application upload.
  limits: { fileSize: 10 * 1024 * 1024, files: 25, fields: 60, fieldSize: 128 * 1024 },
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
