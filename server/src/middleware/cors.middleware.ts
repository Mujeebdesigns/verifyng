import type { IncomingMessage, ServerResponse } from 'node:http';
import { env } from '../utils/env.js';

/**
 * CORS middleware for native Node.js HTTP.
 * Allowed origins come from CORS_ORIGINS env var (comma-separated).
 */
export function corsMiddleware(req: IncomingMessage, res: ServerResponse): boolean {
  const origin = req.headers.origin ?? '';

  const isProd = process.env.NODE_ENV === 'production';
  const isLocalhost = !isProd && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'));

  if (!origin) {
    // No origin header (e.g. curl, non-browser clients) — skip setting CORS origin
  } else if (env.CORS_ORIGINS.includes(origin) || isLocalhost) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }

  return false;
}
