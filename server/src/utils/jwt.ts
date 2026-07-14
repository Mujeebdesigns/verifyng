import jwt from 'jsonwebtoken';
import { env } from './env.js';
import type { JwtPayload } from '../types/auth.js';

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
