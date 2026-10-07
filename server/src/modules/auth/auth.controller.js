import { env } from '../../config/env.js';
import { permissionsFor } from '../../config/permissions.js';
import { User } from '../../models/User.js';
import { AppError } from '../../utils/AppError.js';
import {
  signAccessToken, issueRefreshToken, rotateRefreshToken, revokeRefreshToken,
} from '../../utils/tokens.js';
import * as authService from './auth.service.js';

const REFRESH_COOKIE = 'refreshToken';

const cookieOptions = {
  httpOnly: true,                                  
  secure: env.NODE_ENV === 'production',           
  sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax', 
  path: '/api/auth',                                
  maxAge: env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  tenantId: user.tenantId ?? null,
  permissions: permissionsFor(user.role), 
});

async function startSession(res, user, status = 200) {
  const refreshToken = await issueRefreshToken(user._id);
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
  res.status(status).json({
    success: true,
    data: { accessToken: signAccessToken(user), user: publicUser(user) },
  });
}

export async function registerCustomer(req, res) {
  const user = await authService.registerCustomer(req.body);
  await startSession(res, user, 201);
}

export async function registerTenant(req, res) {
  const user = await authService.registerTenant(req.body);
  await startSession(res, user, 201);
}

export async function login(req, res) {
  const user = await authService.login(req.body);
  await startSession(res, user);
}

export async function refresh(req, res) {
  const raw = req.cookies[REFRESH_COOKIE];
  if (!raw) throw new AppError('No refresh token', 401, 'REFRESH_MISSING');

  const { userId, refreshToken } = await rotateRefreshToken(raw);
  const user = await User.findById(userId);
  if (!user || !user.isActive) throw new AppError('Account unavailable', 401, 'UNAUTHENTICATED');

  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
  res.json({ success: true, data: { accessToken: signAccessToken(user), user: publicUser(user) } });
}

export async function logout(req, res) {
  const raw = req.cookies[REFRESH_COOKIE];
  if (raw) await revokeRefreshToken(raw);
  res.clearCookie(REFRESH_COOKIE, cookieOptions);
  res.json({ success: true });
}

export async function me(req, res) {
  const user = await User.findById(req.user.id);
  res.json({ success: true, data: { user: publicUser(user) } });
}