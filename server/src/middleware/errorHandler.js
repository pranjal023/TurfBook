import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

export function errorHandler(err, _req, res, _next) {
  let error = err;

  
  if (err instanceof ZodError) {
    error = new AppError('Validation failed', 400, 'VALIDATION_ERROR', z_issues(err));
  } else if (err instanceof mongoose.Error.ValidationError) {
    error = new AppError('Validation failed', 400, 'VALIDATION_ERROR',
      Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })));
  } else if (err instanceof mongoose.Error.CastError) {
    error = new AppError(`Invalid ${err.path}`, 400, 'INVALID_ID');
  } else if (err.code === 11000) {
    
    error = new AppError('Duplicate value', 409, 'DUPLICATE_KEY', err.keyValue);
  }

  const isKnown = error instanceof AppError;
  const statusCode = isKnown ? error.statusCode : 500;

  if (!isKnown) console.error(err); 
  res.status(statusCode).json({
    success: false,
    error: {
      code: isKnown ? error.code : 'INTERNAL_ERROR',
      message: isKnown ? error.message : 'Something went wrong',
      details: isKnown ? error.details : undefined,
      stack: env.NODE_ENV === 'development' ? err.stack : undefined,
    },
  });
}

function z_issues(zodError) {
  return zodError.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
}