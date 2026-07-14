/**
 * VerifyNG Server Entry Point.
 *
 * Uses native Node.js HTTP — no Express or third-party HTTP frameworks.
 * Environment validation runs on import of env.ts (fails fast on missing vars).
 */

// Validate environment variables first — throws before anything else runs
import './utils/env.js';

import http from 'node:http';
import { corsMiddleware } from './middleware/cors.middleware.js';
import { setSecurityHeaders } from './middleware/security.middleware.js';
import { registerAuthRoutes } from './routes/auth.routes.js';
import { registerVendorRoutes } from './routes/vendor.routes.js';
import { registerReviewRoutes } from './routes/review.routes.js';
import { registerAdminRoutes } from './routes/admin.routes.js';
import { registerContactRoutes } from './routes/contact.routes.js';
import { createRouter } from './utils/router.js';
import { sendJson, sendError } from './utils/response.js';
import { AppError } from './utils/AppError.js';
import { env } from './utils/env.js';
import { logger } from './utils/logger.js';

const router = createRouter();

// Base health check route
router.get('/', (_req, res) => {
  sendJson(res, 200, {
    status: 'online',
    message: 'VerifyNG API Server is running successfully.',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Register all route modules
registerAuthRoutes(router);
registerVendorRoutes(router);
registerReviewRoutes(router);
registerAdminRoutes(router);
registerContactRoutes(router);

const server = http.createServer(async (req, res) => {
  try {
    // Apply CORS headers and handle preflight
    const isPreflightHandled = corsMiddleware(req, res);
    if (isPreflightHandled) return;

    // Apply security headers to every response
    setSecurityHeaders(res);

    // Attempt to resolve the request against registered routes
    const matched = await router.resolve(req, res);
    if (!matched) {
      sendError(res, 404, 'Not found');
    }
  } catch (error) {
    if (error instanceof AppError) {
      sendError(res, error.statusCode, error.message);
    } else {
      logger.error('Unhandled server error', error);
      sendError(res, 500, 'Internal server error');
    }
  }
});

server.listen(env.PORT, () => {
  logger.info(`VerifyNG server running on http://localhost:${env.PORT}`);
});
