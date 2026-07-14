import type { IncomingMessage, ServerResponse } from 'node:http';
import jwt from 'jsonwebtoken';
import { env } from '../utils/env.js';
import { sendError } from '../utils/response.js';
import { prisma } from '../utils/prisma.js';
import type { JwtPayload } from '../types/auth.js';
import { isTokenBlacklisted } from '../services/auth.service.js';
import { parseCookies } from '../utils/cookie.js';

/**
 * Extend the IncomingMessage type to carry authenticated user info.
 * Controllers access req.userId and req.displayName after this middleware runs.
 */
export interface AuthenticatedRequest extends IncomingMessage {
  userId: string;
  displayName: string;
  role: string;
}

/**
 * In-memory LRU cache for blacklisted token checks.
 * Caches "not blacklisted" results for 5 seconds to reduce DB load.
 * On cache miss or expiry, falls through to DB check.
 */
const blacklistCache = new Map<string, { result: boolean; expiry: number }>();
const BLACKLIST_CACHE_TTL_MS = 5000;

function getCachedBlacklistStatus(tokenHash: string): boolean | null {
  const entry = blacklistCache.get(tokenHash);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    blacklistCache.delete(tokenHash);
    return null;
  }
  return entry.result;
}

function setCachedBlacklistStatus(tokenHash: string, result: boolean): void {
  blacklistCache.set(tokenHash, { result, expiry: Date.now() + BLACKLIST_CACHE_TTL_MS });
  // Prune old entries every 1000 sets
  if (blacklistCache.size > 1000) {
    const now = Date.now();
    for (const [key, entry] of blacklistCache) {
      if (now > entry.expiry) blacklistCache.delete(key);
    }
  }
}

/**
 * Extract the Bearer token from either:
 * 1. Authorization header (Bearer <token>)
 * 2. Cookie named "token"
 */
function extractToken(req: IncomingMessage): string | null {
  // 1. Check Authorization header first (explicit, preferred)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // 2. Fall back to httpOnly cookie with __Host- prefix
  const cookies = parseCookies(req);
  if (cookies['__Host-token']) {
    return cookies['__Host-token'];
  }

  return null;
}

/**
 * Best-effort identification for public routes (optional auth).
 * Returns the userId from a valid token, or null when absent/invalid.
 * Signature verification only — no DB checks — so use this solely for
 * cosmetic personalisation (e.g. "you own this profile"), never for
 * authorising reads or writes.
 */
export function tryGetUserId(req: IncomingMessage): string | null {
  const token = extractToken(req);
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    return decoded.userId;
  } catch {
    return null;
  }
}

/**
 * Auth middleware for protected routes.
 * Extracts and verifies the Bearer token from the Authorization header or cookie.
 * Attaches userId, displayName, and role to the request object.
 *
 * Returns true if authentication passed (request can proceed).
 * Returns false if authentication failed (response already sent with 401).
 */
export async function authMiddleware(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const token = extractToken(req);

  if (!token) {
    sendError(res, 401, 'Authentication required');
    return false;
  }

  // Check if token is blacklisted (revoked) — cache layer for performance
  const cachedResult = getCachedBlacklistStatus(token);
  let isRevoked: boolean;
  if (cachedResult !== null) {
    isRevoked = cachedResult;
  } else {
    isRevoked = await isTokenBlacklisted(token);
    setCachedBlacklistStatus(token, isRevoked);
  }

  if (isRevoked) {
    sendError(res, 401, 'Invalid or expired token');
    return false;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Verify user still exists, is not banned, and token version matches
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { isVerified: true, isBanned: true, tokenVersion: true, displayName: true, role: true },
    });

    if (!user) {
      sendError(res, 403, 'Account not found');
      return false;
    }

    if (user.isBanned) {
      sendError(res, 403, 'Your account has been suspended. Contact support if you believe this is a mistake.');
      return false;
    }

    if (!user.isVerified) {
      sendError(res, 403, 'Please verify your email before proceeding. Check your inbox for the verification link.');
      return false;
    }

    // Invalidate session if password was changed (token version mismatch)
    if (user.tokenVersion !== decoded.tokenVersion) {
      sendError(res, 401, 'Password has been changed. Please log in again.');
      return false;
    }

    // Attach user info to request for downstream use (using fresh DB values)
    (req as AuthenticatedRequest).userId = decoded.userId;
    (req as AuthenticatedRequest).displayName = user.displayName;
    (req as AuthenticatedRequest).role = user.role;

    return true;
  } catch {
    sendError(res, 401, 'Invalid or expired token');
    return false;
  }
}

