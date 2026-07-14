import type { createRouter } from '../utils/router.js';
import { handleCreateContactMessage } from '../controllers/contact.controller.js';
import { contactRateLimit } from '../middleware/rateLimit.middleware.js';

/**
 * Register contact endpoints.
 */
export function registerContactRoutes(router: ReturnType<typeof createRouter>): void {
  router.post('/api/contact', async (req, res) => {
    if (!(await contactRateLimit(req, res))) return;
    return handleCreateContactMessage(req, res);
  });
}
