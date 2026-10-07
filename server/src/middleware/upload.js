import multer from 'multer';
import { AppError } from '../utils/AppError.js';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const uploadImages = multer({
  storage: multer.memoryStorage(),            
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) =>
    ALLOWED.has(file.mimetype)
      ? cb(null, true)
      : cb(new AppError('Only JPEG, PNG or WebP images are allowed', 400, 'INVALID_FILE_TYPE')),
}).array('images', 5);