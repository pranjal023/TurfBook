import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { AppError } from './AppError.js';

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');


export function signAccessToken(user) {
  return jwt.sign({}, env.JWT_ACCESS_SECRET, {
    subject: user._id.toString(),
    expiresIn: env.ACCESS_TOKEN_TTL,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET); 
}

export async function issueRefreshToken(userId) {
  const token = crypto.randomBytes(48).toString('hex');
  await RefreshToken.create({
    userId,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000),
  });
  return token;
}

export async function rotateRefreshToken(rawToken) {
  const tokenHash = sha256(rawToken);

  const consumed = await RefreshToken.findOneAndUpdate(
    { tokenHash, usedAt: null, expiresAt: { $gt: new Date() } },
    { usedAt: new Date() }
  );

  if (!consumed) {
    const existing = await RefreshToken.findOne({ tokenHash });
    if (existing?.usedAt) {
    
      await RefreshToken.deleteMany({ userId: existing.userId });
    }
    throw new AppError('Invalid refresh token', 401, 'REFRESH_INVALID');
  }

  const refreshToken = await issueRefreshToken(consumed.userId);
  return { userId: consumed.userId, refreshToken };
}

export async function revokeRefreshToken(rawToken) {
  await RefreshToken.deleteOne({ tokenHash: sha256(rawToken) });
}