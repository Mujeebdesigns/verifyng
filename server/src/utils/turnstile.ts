import type { IncomingMessage, ServerResponse } from 'node:http';
import { env } from './env.js';
import { logger } from './logger.js';
import { sendError } from './response.js';
import { getClientIpAddress } from '../middleware/rateLimit.middleware.js';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const VERIFY_TIMEOUT_MS = 10_000;

/**
 * Whether Turnstile (bot/CAPTCHA) enforcement is active. Enforcement is gated
 * on the secret key being configured, so local dev without the key keeps the
 * register/review flows working while production (with the key set) enforces it.
 */
export function isTurnstileEnabled(): boolean {
  return Boolean(env.TURNSTILE_SECRET_KEY);
}

/**
 * Verify a Turnstile token with Cloudflare's siteverify API.
 *
 * Fails closed on a network/API error (returns false) — a determined bot must
 * not be able to bypass the check by making verification itself fail. The
 * remoteIp is optional; passing the real client IP lets Cloudflare factor it in.
 */
export async function verifyTurnstileToken(token: string, remoteIp?: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) {
    // Not configured — treated as "not enforced" by callers via isTurnstileEnabled().
    return true;
  }

  if (!token || typeof token !== 'string') {
    return false;
  }

  try {
    const body = new URLSearchParams({
      secret: env.TURNSTILE_SECRET_KEY,
      response: token,
    });
    if (remoteIp && remoteIp !== 'unknown') {
      body.set('remoteip', remoteIp);
    }

    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });

    if (!response.ok) {
      logger.error('Turnstile siteverify returned non-OK', { status: response.status });
      return false;
    }

    const data = (await response.json()) as { success: boolean; 'error-codes'?: string[] };
    if (!data.success) {
      logger.warn('Turnstile verification failed', { errorCodes: data['error-codes'] });
    }
    return data.success === true;
  } catch (error) {
    logger.error('Turnstile verification request errored (failing closed)', error);
    return false;
  }
}

/**
 * Controller guard: enforce Turnstile on a request when enabled. Returns true
 * if the request may proceed (token valid, or enforcement disabled) and false
 * if it was rejected (response already sent). Keeps controllers to one line.
 */
export async function requireTurnstile(
  req: IncomingMessage,
  res: ServerResponse,
  token: string | undefined,
): Promise<boolean> {
  if (!isTurnstileEnabled()) return true;

  if (!token) {
    sendError(res, 400, 'Captcha verification is required');
    return false;
  }

  const passed = await verifyTurnstileToken(token, getClientIpAddress(req));
  if (!passed) {
    sendError(res, 403, 'Captcha verification failed. Please try again.');
    return false;
  }

  return true;
}
