import type { IncomingMessage } from 'node:http';
import { AppError } from './AppError.js';
import { env } from './env.js';

/**
 * Parse the JSON body of an incoming HTTP request.
 * Validates Content-Type header and body size.
 * Rejects with AppError(400) if the body is not valid JSON or content type is wrong.
 * Caches the parsed body on the request object to allow multiple calls on the same request.
 */
const MAX_BODY_SIZE_BYTES = env.MAX_BODY_SIZE;

export function parseBody<T>(req: IncomingMessage): Promise<T> {
  const cachedReq = req as IncomingMessage & { _cachedBody?: unknown };

  if (cachedReq._cachedBody !== undefined) {
    return Promise.resolve(cachedReq._cachedBody as T);
  }

  const contentType = req.headers['content-type'] ?? '';
  if (!contentType.includes('application/json')) {
    return Promise.reject(new AppError('Content-Type must be application/json', 415));
  }

  return new Promise((resolve, reject) => {
    let body = '';
    let bytesReceived = 0;

    req.on('data', (chunk: Buffer) => {
      if (bytesReceived > MAX_BODY_SIZE_BYTES) return;
      bytesReceived += chunk.length;
      if (bytesReceived > MAX_BODY_SIZE_BYTES) {
        req.destroy();
        reject(new AppError('Payload too large', 413));
        return;
      }
      body += chunk.toString();
    });

    req.on('end', () => {
      if (bytesReceived > MAX_BODY_SIZE_BYTES) return;
      if (body.length === 0) {
        reject(new AppError('Empty request body', 400));
        return;
      }

      try {
        const parsed = JSON.parse(body);
        cachedReq._cachedBody = parsed;
        resolve(parsed as T);
      } catch {
        reject(new AppError('Invalid JSON body', 400));
      }
    });

    req.on('error', reject);
  });
}
