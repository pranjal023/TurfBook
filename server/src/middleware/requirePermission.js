import { can } from '../config/permissions.js';
import { AppError } from '../utils/AppError.js';

export const requirePermission = (...required) => (req, _res, next) => {
  if (!required.every((permission) => can(req.user.role, permission))) {
    throw new AppError('You do not have permission to do this', 403, 'FORBIDDEN');
  }
  next();
};