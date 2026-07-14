import type { IncomingMessage, ServerResponse } from 'node:http';
import type { createRouter } from '../utils/router.js';
import {
  handleSearch,
  handleGetVendor,
  handleGetReviews,
  handleGetSummary,
  handleListDirectory,
  handleGetFeaturedVendors,
  handleCreateVendorProfile,
  handleClaimProfile,
  handleUpdateVendorProfile,
  handleGetMyVendorProfile,
} from '../controllers/vendor.controller.js';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { searchRateLimit, actionRateLimit, claimRateLimit, publicReadRateLimit } from '../middleware/rateLimit.middleware.js';

/**
 * Register vendor-related routes.
 */
export function registerVendorRoutes(router: ReturnType<typeof createRouter>): void {
  const vendorGuard = async (
    req: IncomingMessage,
    res: ServerResponse,
    next: (authReq: AuthenticatedRequest) => void | Promise<void>
  ) => {
    if (!(await authMiddleware(req, res))) return;
    const authReq = req as AuthenticatedRequest;

    let isAllowed = false;
    requireRole(['VENDOR', 'ADMIN'])(authReq, res, () => {
      isAllowed = true;
    });

    if (isAllowed) {
      await next(authReq);
    }
  };

  // NOTE: Static paths must be registered BEFORE parameterized paths (e.g. /:id)
  // because the router iterates routes in order and returns the first match.
  // /api/vendors/featured would match /api/vendors/:id if :id came first.

  // Public directory listing
  router.get('/api/vendors', async (req, res) => {
    if (!(await publicReadRateLimit(req, res))) return;
    return handleListDirectory(req, res);
  });

  // Featured vendors
  router.get('/api/vendors/featured', async (req, res) => {
    if (!(await publicReadRateLimit(req, res))) return;
    return handleGetFeaturedVendors(req, res);
  });

  // Public search (with rate limits)
  router.get('/api/vendors/search', async (req, res) => {
    if (!(await searchRateLimit(req, res))) return;
    return handleSearch(req, res);
  });

  // Get current logged-in vendor's profile
  router.get('/api/vendors/dashboard/me', async (req, res) => {
    await vendorGuard(req, res, (authReq) => handleGetMyVendorProfile(authReq, res));
  });

  // Get vendor by ID
  router.get('/api/vendors/:id', async (req, res, params) => {
    if (!(await publicReadRateLimit(req, res))) return;
    return handleGetVendor(req, res, params);
  });

  // Get reviews for vendor (paginated)
  router.get('/api/vendors/:id/reviews', async (req, res, params) => {
    if (!(await publicReadRateLimit(req, res))) return;
    return handleGetReviews(req, res, params);
  });

  // Get AI summary for vendor
  router.get('/api/vendors/:id/summary', async (req, res, params) => {
    if (!(await publicReadRateLimit(req, res))) return;
    return handleGetSummary(req, res, params);
  });

  // Create/onboard a vendor profile
  router.post('/api/vendors', async (req, res) => {
    if (!(await actionRateLimit(req, res))) return;
    await vendorGuard(req, res, (authReq) => handleCreateVendorProfile(authReq, res));
  });

  // Claim an unclaimed vendor profile
  router.post('/api/vendors/:id/claim', async (req, res, params) => {
    if (!(await claimRateLimit(req, res))) return;
    await vendorGuard(req, res, (authReq) => handleClaimProfile(authReq, res, params));
  });

  // Update vendor profile details
  router.put('/api/vendors/:id', async (req, res, params) => {
    if (!(await actionRateLimit(req, res))) return;
    await vendorGuard(req, res, (authReq) => handleUpdateVendorProfile(authReq, res, params));
  });
}
