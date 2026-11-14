const multer = require('multer');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Files are kept in memory and handed to utils/storage (Cloudinary or disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.upload.maxFileSizeMb * 1024 * 1024,
    files: env.upload.maxFiles,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(ApiError.badRequest('Only JPG, PNG, WEBP or GIF images are allowed'));
  },
});

/** Wraps multer so its errors become clean 400 responses */
const uploadImages = (field = 'images') => (req, res, next) => {
  upload.array(field, env.upload.maxFiles)(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const messages = {
        LIMIT_FILE_SIZE: `Each image must be under ${env.upload.maxFileSizeMb} MB`,
        LIMIT_FILE_COUNT: `You can upload at most ${env.upload.maxFiles} images`,
        LIMIT_UNEXPECTED_FILE: `Upload images using the "${field}" field (max ${env.upload.maxFiles})`,
      };
      return next(ApiError.badRequest(messages[err.code] || err.message));
    }
    next(err);
  });
};

module.exports = { uploadImages, ALLOWED_TYPES };
