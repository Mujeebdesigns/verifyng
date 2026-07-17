import jwt from 'jsonwebtoken';
import { env } from './env.js';
import { AppError } from './AppError.js';
import type { JwtPayload } from '../types/auth.js';

const TWO_FACTOR_PURPOSE = '2fa_challenge';

/**
 * Generate a signed JWT containing userId and displayName.
 * Expiry is controlled by JWT_EXPIRES_IN environment variable.
 */
export function generateToken(payload: JwtPayload): string {
  const rawExpiresIn = process.env.JWT_EXPIRES_IN!;
  const expiresIn: string | number = isNaN(Number(rawExpiresIn))
    ? rawExpiresIn
    : Number(rawExpiresIn);
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

/**
 * Verify and decode a JWT.
 * Throws if the token is invalid, expired, or tampered with.
 */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

/**
 * Short-lived (5 min) token proving the password step passed, issued between
 * password verification and the TOTP code step so the user isn't asked to
 * re-solve the captcha / re-enter the password. Not a session — it only
 * authorises completing 2FA for this specific user.
 */
export function generateTwoFactorChallenge(userId: string): string {
  return jwt.sign({ userId, purpose: TWO_FACTOR_PURPOSE }, env.JWT_SECRET, { expiresIn: '5m' });
}

/** Verify a 2FA challenge token and return the userId it was issued for. */
export function verifyTwoFactorChallenge(token: string): string {
  let decoded: { userId?: string; purpose?: string };
  try {
    decoded = jwt.verify(token, env.JWT_SECRET) as { userId?: string; purpose?: string };
  } catch {
    throw new AppError('Your 2FA session expired. Please log in again.', 401);
  }
  if (decoded.purpose !== TWO_FACTOR_PURPOSE || !decoded.userId) {
    throw new AppError('Invalid 2FA challenge.', 401);
  }
  return decoded.userId;
}
