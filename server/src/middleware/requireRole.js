import { AppError } from '../utils/AppError.js';

export const requireRole = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) throw new AppError('You cannot do this', 403, 'FORBIDDEN');
  next();
};