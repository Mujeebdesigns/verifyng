/**
 * Normalise a vendor search query before database lookup.
 * Handles Instagram handles (@), Nigerian phone number formats (+234/0),
 * and general cleanup (lowercase, trim, special characters).
 *
 * Source: agents/skills/vendor-search/SKILL.md — Input Normalisation
 */
export function normaliseSearchQuery(raw: string): string {
  let query = raw.trim().toLowerCase();

  // Strip leading @ from Instagram handles
  if (query.startsWith('@')) {
    query = query.slice(1);
  }

  // Convert +234 prefix to local 0 prefix for Nigerian phone numbers
  if (query.startsWith('+234')) {
    query = '0' + query.slice(4);
  }

  // Remove common separators from phone numbers (spaces, dashes, dots)
  if (/^\d[\d\s\-\.]+$/.test(query)) {
    query = query.replace(/[\s\-\.]/g, '');
  }

  return query;
}
