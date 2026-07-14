/**
 * Normalise a stored Instagram identifier for display.
 *
 * Vendors sometimes paste a full profile URL instead of a bare username.
 * This extracts the username from any of the shapes we see in the wild:
 *   "handle"                                  → "handle"
 *   "@handle"                                 → "handle"
 *   "instagram.com/handle"                    → "handle"
 *   "https://www.instagram.com/handle/?igsh=" → "handle"
 */
export function normalizeInstagramHandle(raw: string): string {
  const trimmed = raw.trim().replace(/^@+/, '');

  const fromUrl = trimmed.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  if (fromUrl) return fromUrl[1];

  // Not an instagram.com URL — strip stray protocol/host noise and path/query tails
  return trimmed
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split(/[/?#]/)[0];
}

/**
 * Defense-in-depth guard for any stored value rendered as an `<a href>`.
 * The server validates vendor social links before they're persisted, but a
 * link is never trusted at render time too — this rejects `javascript:` and
 * any other non-http(s) scheme so a bad value can never execute as a click.
 */
export function isSafeHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
