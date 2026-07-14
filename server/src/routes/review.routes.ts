import type { IncomingMessage, ServerResponse } from 'node:http';
import type { createRouter } from '../utils/router.js';
import {
  handleGetMyReviews,
  handleCreateReview,
  handleUpdateReview,
  handleDeleteReview,
  handleReportVendor,
} from '../controllers/review.controller.js';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { reviewRateLimit, actionRateLimit, reportRateLimit } from '../middleware/rateLimit.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

/**
 * Register review and report related routes.
 */
export function registerReviewRoutes(router: ReturnType<typeof createRouter>): void {
  const buyerGuard = async (
    req: IncomingMessage,
    res: ServerResponse,
    next: (authReq: AuthenticatedRequest) => void | Promise<void>
  ) => {
    if (!(await authMiddleware(req, res))) return;
    const authReq = req as AuthenticatedRequest;

    let isAllowed = false;
    requireRole(['BUYER'])(authReq, res, () => {
      isAllowed = true;
    });

    if (isAllowed) {
      await next(authReq);
    }
  };

  router.get('/api/reviews/me', async (req, res) => {
    if (!(await authMiddleware(req, res))) return;
    return handleGetMyReviews(req, res);
  });

  router.post('/api/reviews', async (req, res) => {
    await buyerGuard(req, res, async (authReq) => {
      if (!(await reviewRateLimit(authReq.userId, res))) return;
      return handleCreateReview(authReq, res);
    });
  });

  router.put('/api/reviews/:id', async (req, res, params) => {
    if (!(await actionRateLimit(req, res))) return;
    await buyerGuard(req, res, (authReq) => handleUpdateReview(authReq, res, params));
  });

  router.delete('/api/reviews/:id', async (req, res, params) => {
    if (!(await actionRateLimit(req, res))) return;
    await buyerGuard(req, res, (authReq) => handleDeleteReview(authReq, res, params));
  });

  router.post('/api/vendors/:id/report', async (req, res, params) => {
    if (!(await reportRateLimit(req, res))) return;
    await buyerGuard(req, res, (authReq) => handleReportVendor(authReq, res, params));
  });
}
