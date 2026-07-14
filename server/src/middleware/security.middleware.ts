import type { ServerResponse } from 'node:http';

/**
 * Set security headers on every HTTP response.
 * Called in the main request handler before routing.
 */
export function setSecurityHeaders(res: ServerResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  // Strict-Transport-Security (HSTS): Enforce HTTPS for 1 year
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Content-Security-Policy (CSP): Strict policy for JSON API responses
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
}

