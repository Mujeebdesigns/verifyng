import type { IncomingMessage, ServerResponse } from 'node:http';
import { sendError } from '../utils/response.js';
import { prisma } from '../utils/prisma.js';
import { env } from '../utils/env.js';
import { logger } from '../utils/logger.js';

const RATE_LIMIT_PUBLIC_READ_MAX = 60;
const RATE_LIMIT_PUBLIC_READ_WINDOW = 60_000;

const CLEANUP_INTERVAL_MS = env.RATE_LIMIT_CLEANUP_INTERVAL;
setInterval(async () => {
  try {
    const now = new Date();
    // Clean up expired rate limit entries, but preserve lockout entries
    // which use their own resetAt for the lockout window duration
    await prisma.rateLimit.deleteMany({
      where: {
        resetAt: { lt: now },
        NOT: { key: { startsWith: 'lockout:' } },
      },
    });
    // Lockout entries are cleaned separately — only when they've truly expired
    await prisma.rateLimit.deleteMany({
      where: {
        key: { startsWith: 'lockout:' },
        resetAt: { lt: now },
      },
    });
    await prisma.blacklistedToken.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });
    await prisma.verificationToken.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });
  } catch (error) {
    logger.error('Security tables cleanup task failed', error);
  }
}, CLEANUP_INTERVAL_MS).unref();

/**
 * Check if the request is within rate limits using PostgreSQL.
 * Uses atomic find/upsert transaction to avoid race conditions.
 */
async function checkLimit(key: string, maxRequests: number, windowMs: number): Promise<boolean> {
  const now = new Date();
  const resetAt = new Date(Date.now() + windowMs);

  try {
    const limit = await prisma.$transaction(async (tx) => {
      const entry = await tx.rateLimit.findUnique({
        where: { key },
      });

      if (!entry || entry.resetAt < now) {
        return await tx.rateLimit.upsert({
          where: { key },
          create: {
            key,
            count: 1,
            resetAt,
          },
          update: {
            count: 1,
            resetAt,
          },
        });
      }

      if (entry.count >= maxRequests) {
        return null;
      }

      return await tx.rateLimit.update({
        where: { key },
        data: {
          count: { increment: 1 },
        },
      });
    });

    return limit !== null;
  } catch (error) {
    logger.error('Rate limit query failed, failing closed', error);
    return false;
  }
}

/**
 * Extract client IP safely.
 *
 * Only trusts header-based IP forwarding when TRUST_PROXY=true. Critically, the
 * real client IP is read from the RIGHT of X-Forwarded-For, not the left:
 * Render (like most PaaS) APPENDS to XFF and never strips client-supplied
 * values, so the leftmost entry is attacker-controlled and the trustworthy IP
 * is the one the proxy itself appended. We count TRUST_PROXY_HOPS entries in
 * from the right (1 = Render only). cf-connecting-ip / x-real-ip are NOT
 * trusted — nothing in this deployment sets them, so any value is client-spoofed.
 *
 * Getting this wrong lets an attacker rotate a spoofed header to bypass every
 * IP-keyed rate limit (login brute-force, admin lockout, search, etc.).
 */
function getClientIp(req: IncomingMessage): string {
  if (process.env.TRUST_PROXY === 'true') {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean);
      const idx = parts.length - env.TRUST_PROXY_HOPS;
      if (idx >= 0 && parts[idx]) {
        return parts[idx];
      }
    }
  }

  // Default (or malformed/short XFF): use the direct connection address.
  return req.socket.remoteAddress ?? 'unknown';
}

/**
 * Rate limit middleware for review submissions.
 * Keyed by authenticated userId.
 * Returns true if allowed, false if rate limited.
 */
export async function reviewRateLimit(userId: string, res: ServerResponse): Promise<boolean> {
  const key = `ratelimit:review:${userId}`;
  const allowed = await checkLimit(key, env.RATE_LIMIT_REVIEW_MAX, env.RATE_LIMIT_REVIEW_WINDOW);

  if (!allowed) {
    sendError(res, 429, 'Too many review submissions. Maximum 5 per hour.');
    return false;
  }
  return true;
}

/**
 * Rate limit middleware for vendor search.
 * Keyed by client IP address.
 * Returns true if allowed, false if rate limited.
 */
export async function searchRateLimit(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const ip = getClientIp(req);
  const key = `ratelimit:search:${ip}`;
  const allowed = await checkLimit(key, env.RATE_LIMIT_SEARCH_MAX, env.RATE_LIMIT_SEARCH_WINDOW);

  if (!allowed) {
    sendError(res, 429, 'Too many search requests. Maximum 20 per minute.');
    return false;
  }
  return true;
}

/**
 * Rate limit middleware for authentication login attempts.
 * Keyed by client IP address.
 * Returns true if allowed, false if rate limited.
 */
export async function loginRateLimit(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const ip = getClientIp(req);
  const key = `ratelimit:login:${ip}`;
  const allowed = await checkLimit(key, env.RATE_LIMIT_LOGIN_MAX, env.RATE_LIMIT_LOGIN_WINDOW);

  if (!allowed) {
    sendError(res, 429, 'Too many login attempts. Please try again after 15 minutes.');
    return false;
  }
  return true;
}

/**
 * Rate limit middleware for support contact messages.
 * Keyed by client IP address.
 * Returns true if allowed, false if rate limited.
 */
export async function contactRateLimit(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const ip = getClientIp(req);
  const key = `ratelimit:contact:${ip}`;
  const allowed = await checkLimit(key, 3, 3600000); // Max 3 requests per hour

  if (!allowed) {
    sendError(res, 429, 'Too many support messages. Maximum 3 per hour.');
    return false;
  }
  return true;
}

/**
 * Generic authenticated action rate limiter (keyed by IP for state-changing operations).
 * Returns true if allowed, false if rate limited.
 */
export async function actionRateLimit(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const ip = getClientIp(req);
  const key = `ratelimit:action:${ip}`;
  const allowed = await checkLimit(key, env.RATE_LIMIT_ACTION_MAX, env.RATE_LIMIT_ACTION_WINDOW);

  if (!allowed) {
    sendError(res, 429, 'Too many requests. Please slow down.');
    return false;
  }
  return true;
}

/**
 * Rate limit for vendor claims (keyed by user IP + endpoint to prevent abuse).
 */
export async function claimRateLimit(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const ip = getClientIp(req);
  const key = `ratelimit:claim:${ip}`;
  const allowed = await checkLimit(key, env.RATE_LIMIT_CLAIM_MAX, env.RATE_LIMIT_CLAIM_WINDOW);

  if (!allowed) {
    sendError(res, 429, 'Too many claim requests. Maximum 5 per hour.');
    return false;
  }
  return true;
}

/**
 * Rate limit for vendor reports (keyed by user IP).
 */
export async function reportRateLimit(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const ip = getClientIp(req);
  const key = `ratelimit:report:${ip}`;
  const allowed = await checkLimit(key, env.RATE_LIMIT_REPORT_MAX, env.RATE_LIMIT_REPORT_WINDOW);

  if (!allowed) {
    sendError(res, 429, 'Too many report submissions. Maximum 5 per hour.');
    return false;
  }
  return true;
}

/**
 * Safely extracts client IP address (exposed helper).
 */
export function getClientIpAddress(req: IncomingMessage): string {
  return getClientIp(req);
}

/**
 * Rate limit middleware for public read endpoints (vendor directory, profiles).
 * Keyed by client IP address.
 * Returns true if allowed, false if rate limited.
 */
export async function publicReadRateLimit(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const ip = getClientIp(req);
  const key = `ratelimit:pubread:${ip}`;
  const allowed = await checkLimit(key, RATE_LIMIT_PUBLIC_READ_MAX, RATE_LIMIT_PUBLIC_READ_WINDOW);

  if (!allowed) {
    sendError(res, 429, 'Too many requests. Maximum 60 per minute.');
    return false;
  }
  return true;
}

/**
 * Check if the admin IP address is currently locked out due to failed attempts.
 */
export async function isAdminLockedOut(ip: string): Promise<boolean> {
  const key = `lockout:admin:failed:${ip}`;
  const entry = await prisma.rateLimit.findUnique({
    where: { key },
  });
  if (entry && entry.count >= 5 && entry.resetAt > new Date()) {
    return true;
  }
  return false;
}

/**
 * Record a failed admin login attempt and potentially trigger a 15-minute lockout.
 */
export async function recordFailedAdminAttempt(ip: string): Promise<void> {
  const key = `lockout:admin:failed:${ip}`;
  const now = new Date();
  const lockoutDuration = 15 * 60 * 1000; // 15 minutes
  const resetAt = new Date(Date.now() + lockoutDuration);

  await prisma.$transaction(async (tx) => {
    const entry = await tx.rateLimit.findUnique({
      where: { key },
    });

    if (!entry || entry.resetAt < now) {
      await tx.rateLimit.upsert({
        where: { key },
        create: {
          key,
          count: 1,
          resetAt,
        },
        update: {
          count: 1,
          resetAt,
        },
      });
    } else {
      const newCount = entry.count + 1;
      await tx.rateLimit.update({
        where: { key },
        data: {
          count: { increment: 1 },
          resetAt: newCount >= 5 ? resetAt : entry.resetAt,
        },
      });
    }
  });
}

/**
 * Reset failed attempts on a successful admin login.
 */
export async function clearFailedAdminAttempts(ip: string): Promise<void> {
  const key = `lockout:admin:failed:${ip}`;
  await prisma.rateLimit.deleteMany({
    where: { key },
  });
}
