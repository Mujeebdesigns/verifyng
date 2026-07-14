/**
 * Parse URL query string into a key-value record.
 * Returns an empty object if no query string is present.
 */
export function parseQuery(url: string): Record<string, string> {
  const idx = url.indexOf('?');
  if (idx === -1) return {};

  const params: Record<string, string> = {};
  const searchParams = new URLSearchParams(url.slice(idx));
  for (const [key, value] of searchParams) {
    params[key] = value;
  }
  return params;
}
