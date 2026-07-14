import type { ServerResponse } from 'node:http';
import { sendError } from './response.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
// 64 chars keeps every password comfortably under bcrypt's 72-BYTE input cap
// (some Unicode characters are multi-byte) so no password is ever silently
// truncated — two different passwords must never hash identically.
const PASSWORD_MAX_LENGTH = 64;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9])/;
const PASSWORD_POLICY_MESSAGE =
  'Password must be 8-64 characters and include an uppercase letter, a lowercase letter, a number, and a special character';

export interface RegistrationInput {
  email: string;
  password: string;
  displayName: string;
}

export function validateRegistrationInput(
  body: RegistrationInput,
  res: ServerResponse,
): boolean {
  if (!body.email || !body.password || !body.displayName) {
    sendError(res, 400, 'Email, password, and display name are required');
    return false;
  }

  if (!EMAIL_REGEX.test(body.email) || body.email.length > 255) {
    sendError(res, 400, 'Invalid email format');
    return false;
  }

  if (body.password.length < PASSWORD_MIN_LENGTH || body.password.length > PASSWORD_MAX_LENGTH) {
    sendError(res, 400, `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`);
    return false;
  }

  if (!PASSWORD_REGEX.test(body.password)) {
    sendError(res, 400, PASSWORD_POLICY_MESSAGE);
    return false;
  }

  if (body.displayName.trim().length < 2 || body.displayName.length > 50) {
    sendError(res, 400, 'Display name must be between 2 and 50 characters');
    return false;
  }

  return true;
}

export function validateRating(rating: unknown, res: ServerResponse): number | null {
  const r = Number(rating);
  if (isNaN(r) || r < 1 || r > 5 || !Number.isInteger(r)) {
    sendError(res, 400, 'Rating must be an integer between 1 and 5');
    return null;
  }
  return r;
}

export function validateReviewText(text: string, res: ServerResponse): string | null {
  const trimmed = text.trim();
  if (trimmed.length < 30 || trimmed.length > 1000) {
    sendError(res, 400, 'Review text must be between 30 and 1000 characters');
    return null;
  }
  return trimmed;
}

export function validatePassword(password: string, res: ServerResponse): boolean {
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    sendError(res, 400, `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`);
    return false;
  }

  if (!PASSWORD_REGEX.test(password)) {
    sendError(res, 400, PASSWORD_POLICY_MESSAGE);
    return false;
  }

  return true;
}

const SOCIAL_URL_DOMAINS = {
  tiktokUrl: { domains: ['tiktok.com'], label: 'TikTok' },
  facebookUrl: { domains: ['facebook.com', 'fb.com', 'fb.me'], label: 'Facebook' },
  linkedinUrl: { domains: ['linkedin.com', 'lnkd.in'], label: 'LinkedIn' },
} as const;

function isSafeHttpsUrl(url: string, domains: readonly string[]): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    return domains.some((d) => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

/**
 * Validate vendor social links before they're ever persisted.
 *
 * These values are later rendered as raw `<a href>` on the public vendor
 * profile page, so anything other than a real https:// link to the expected
 * platform (e.g. a `javascript:` URI) must be rejected here — this is the
 * only thing standing between a malicious vendor and stored XSS against
 * every visitor who clicks their profile's social links.
 *
 * WhatsApp is the one exception: the UI invites either a wa.me/whatsapp.com
 * link OR a bare phone number ("Link or Number"), so it accepts both forms.
 */
export function validateSocialUrls(body: {
  whatsappUrl?: string | null;
  tiktokUrl?: string | null;
  facebookUrl?: string | null;
  linkedinUrl?: string | null;
}): string | null {
  if (body.whatsappUrl) {
    const looksLikeUrl = /^https?:\/\//i.test(body.whatsappUrl);
    if (looksLikeUrl) {
      if (!isSafeHttpsUrl(body.whatsappUrl, ['wa.me', 'whatsapp.com'])) {
        return 'WhatsApp URL must be a valid https://wa.me or https://whatsapp.com link';
      }
    } else if (!/^[0-9+\s()-]{7,20}$/.test(body.whatsappUrl)) {
      return 'WhatsApp must be a valid phone number or a wa.me / whatsapp.com link';
    }
  }

  for (const key of ['tiktokUrl', 'facebookUrl', 'linkedinUrl'] as const) {
    const value = body[key];
    if (!value) continue;
    const { domains, label } = SOCIAL_URL_DOMAINS[key];
    if (!isSafeHttpsUrl(value, domains)) {
      return `${label} URL must be a valid https://${domains[0]} link`;
    }
  }

  return null;
}

/** Validate a base64 data-URI image or an https:// image link. */
export function validateImageField(value: string | null | undefined, label: string): string | null {
  if (!value) return null;
  if (value.length > 2_000_000) {
    return `${label} is too large`;
  }
  if (value.startsWith('data:image/')) return null;
  if (/^https:\/\//i.test(value)) return null;
  return `${label} must be an uploaded image or a valid https:// link`;
}

/** Shared length checks for vendor profile text fields (registration and edits). */
export function validateVendorTextFields(body: {
  businessName?: string;
  category?: string;
  state?: string;
  city?: string;
  description?: string;
}): string | null {
  if (body.businessName !== undefined) {
    if (body.businessName.trim().length < 2 || body.businessName.length > 100) {
      return 'Business name must be between 2 and 100 characters';
    }
  }

  if (body.category !== undefined && body.category.length > 50) {
    return 'Category must be under 50 characters';
  }

  if (body.state !== undefined && body.state.length > 50) {
    return 'State must be under 50 characters';
  }

  if (body.city !== undefined && body.city.length > 50) {
    return 'City must be under 50 characters';
  }

  if (body.description !== undefined) {
    if (body.description.trim().length < 10 || body.description.length > 500) {
      return 'Description must be between 10 and 500 characters';
    }
  }

  return null;
}
