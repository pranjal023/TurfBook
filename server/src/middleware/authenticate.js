import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { verifyAccessToken } from '../utils/tokens.js';

export async function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError('Authentication required', 401, 'UNAUTHENTICATED');
  }

  let payload;
  try {
    payload = verifyAccessToken(header.slice(7));
  } catch {
    
    throw new AppError('Invalid or expired token', 401, 'TOKEN_INVALID');
  }

  const user = await User.findById(payload.sub).select('role tenantId isActive');
  if (!user || !user.isActive) throw new AppError('Account unavailable', 401, 'UNAUTHENTICATED');

  req.user = { id: user._id.toString(), role: user.role, tenantId: user.tenantId?.toString() ?? null };
  next();
}