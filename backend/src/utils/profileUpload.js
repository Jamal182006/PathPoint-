import multer from 'multer';

const acceptedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, callback) => {
    if (!acceptedMimeTypes.has(file.mimetype)) return callback(new Error('Resume must be a PDF, JPG, or PNG file'));
    return callback(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

export const profileResumeUpload = (req, res, next) => {
  upload.single('resume')(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.code === 'LIMIT_FILE_SIZE' ? 'Resume must be 5 MB or smaller' : error.message || 'Invalid resume upload',
      });
    }
    return next();
  });
};