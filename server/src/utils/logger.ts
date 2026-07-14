/**
 * Simple, zero-dependency structured logger.
 * Outputs clean JSON in production (Railway/Docker/GCP friendly)
 * and readable, colored text in development.
 */

const isProd = process.env.NODE_ENV === 'production';

export const logger = {
  info(message: string, meta?: Record<string, unknown>): void {
    if (isProd) {
      console.log(JSON.stringify({ level: 'info', message, timestamp: new Date().toISOString(), ...meta }));
    } else {
      console.log(`\x1b[32m[INFO]\x1b[0m ${new Date().toLocaleTimeString()} - ${message}`, meta ? JSON.stringify(meta) : '');
    }
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    if (isProd) {
      console.warn(JSON.stringify({ level: 'warn', message, timestamp: new Date().toISOString(), ...meta }));
    } else {
      console.warn(`\x1b[33m[WARN]\x1b[0m ${new Date().toLocaleTimeString()} - ${message}`, meta ? JSON.stringify(meta) : '');
    }
  },

  error(message: string, error?: unknown, meta?: Record<string, unknown>): void {
    const errorDetails = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : error;

    if (isProd) {
      console.error(JSON.stringify({
        level: 'error',
        message,
        error: errorDetails,
        timestamp: new Date().toISOString(),
        ...meta,
      }));
    } else {
      console.error(
        `\x1b[31m[ERROR]\x1b[0m ${new Date().toLocaleTimeString()} - ${message}`,
        error ?? '',
        meta ? JSON.stringify(meta) : ''
      );
    }
  },
};
