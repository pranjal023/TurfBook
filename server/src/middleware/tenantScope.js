import { AppError } from '../utils/AppError.js';
import { runWithTenant } from '../utils/tenantContext.js';

export function tenantScope(req, _res, next) {
  if (!req.user.tenantId) throw new AppError('This action requires a business account', 403, 'NO_TENANT');
  runWithTenant(req.user.tenantId, next); 
}