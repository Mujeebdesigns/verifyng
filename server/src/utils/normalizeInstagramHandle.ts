/**
 * Normalise a vendor-supplied Instagram identifier before it is stored.
 *
 * Vendors sometimes paste a full profile URL instead of a bare username.
 * Cleaning this at write time means every consumer (display, search,
 * outbound links) can trust that a stored handle is always a bare username.
 * Mirrors client/src/utils/social.ts — keep the two in sync.
 */
export function normalizeInstagramHandle(raw: string): string {
  const trimmed = raw.trim().replace(/^@+/, '');

  const fromUrl = trimmed.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  if (fromUrl) return fromUrl[1];

  return trimmed
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split(/[/?#]/)[0];
}
