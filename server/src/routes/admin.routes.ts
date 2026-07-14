import type { IncomingMessage, ServerResponse } from 'node:http';
import type { createRouter } from '../utils/router.js';
import {
  handleGetStats,
  handleGetClaims,
  handleApproveClaim,
  handleRejectClaim,
  handleGetReports,
  handleResolveReport,
  handleToggleFeatured,
  handleGetUsers,
  handleBanUser,
  handleUnbanUser,
  handleDeleteUser,
  handlePromoteUser,
  handleGetFlaggedReviews,
} from '../controllers/admin.controller.js';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { actionRateLimit } from '../middleware/rateLimit.middleware.js';

/**
 * Register administrative routes protected by Auth & Role checks.
 * All mutation endpoints are rate-limited to prevent abuse.
 */
export function registerAdminRoutes(router: ReturnType<typeof createRouter>): void {
  const adminGuard = async (
    req: IncomingMessage,
    res: ServerResponse,
    next: (authReq: AuthenticatedRequest) => void | Promise<void>
  ) => {
    if (!(await authMiddleware(req, res))) return;
    const authReq = req as AuthenticatedRequest;

    let isAllowed = false;
    requireRole(['ADMIN'])(authReq, res, () => {
      isAllowed = true;
    });

    if (isAllowed) {
      await next(authReq);
    }
  };

  router.get('/api/admin/stats', async (req, res) => {
    await adminGuard(req, res, () => handleGetStats(req, res));
  });

  router.get('/api/admin/claims', async (req, res) => {
    await adminGuard(req, res, () => handleGetClaims(req, res));
  });

  router.post('/api/admin/claims/:id/approve', async (req, res, params) => {
    if (!(await actionRateLimit(req, res))) return;
    await adminGuard(req, res, () => handleApproveClaim(req, res, params));
  });

  router.post('/api/admin/claims/:id/reject', async (req, res, params) => {
    if (!(await actionRateLimit(req, res))) return;
    await adminGuard(req, res, () => handleRejectClaim(req, res, params));
  });

  router.get('/api/admin/reports', async (req, res) => {
    await adminGuard(req, res, () => handleGetReports(req, res));
  });

  router.put('/api/admin/reports/:id/resolve', async (req, res, params) => {
    if (!(await actionRateLimit(req, res))) return;
    await adminGuard(req, res, () => handleResolveReport(req, res, params));
  });

  router.put('/api/admin/vendors/:id/feature', async (req, res, params) => {
    if (!(await actionRateLimit(req, res))) return;
    await adminGuard(req, res, () => handleToggleFeatured(req, res, params));
  });

  router.get('/api/admin/users', async (req, res) => {
    await adminGuard(req, res, () => handleGetUsers(req, res));
  });

  router.put('/api/admin/users/:id/ban', async (req, res, params) => {
    if (!(await actionRateLimit(req, res))) return;
    await adminGuard(req, res, () => handleBanUser(req, res, params));
  });

  router.put('/api/admin/users/:id/unban', async (req, res, params) => {
    if (!(await actionRateLimit(req, res))) return;
    await adminGuard(req, res, () => handleUnbanUser(req, res, params));
  });

  router.delete('/api/admin/users/:id', async (req, res, params) => {
    if (!(await actionRateLimit(req, res))) return;
    await adminGuard(req, res, () => handleDeleteUser(req, res, params));
  });

  router.put('/api/admin/users/:id/promote', async (req, res, params) => {
    if (!(await actionRateLimit(req, res))) return;
    await adminGuard(req, res, () => handlePromoteUser(req, res, params));
  });

  router.get('/api/admin/reviews/flagged', async (req, res) => {
    await adminGuard(req, res, () => handleGetFlaggedReviews(req, res));
  });
}
