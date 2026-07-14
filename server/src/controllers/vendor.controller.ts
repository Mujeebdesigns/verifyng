import type { IncomingMessage, ServerResponse } from 'node:http';
import * as vendorService from '../services/vendor.service.js';
import { parseQuery } from '../utils/parseQuery.js';
import { sendJson, sendError } from '../utils/response.js';
import { parseBody } from '../utils/parseBody.js';
import { handleControllerError, parsePagination } from '../utils/controllerWrapper.js';
import { tryGetUserId, type AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { validateSocialUrls, validateVendorTextFields, validateImageField } from '../utils/validation.js';
import type { CreateVendorPayload, UpdateVendorPayload } from '../types/vendor.js';

export async function handleSearch(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const queryParams = parseQuery(req.url ?? '');
    const q = queryParams.q ?? '';

    if (!q || q.trim().length < 2) {
      sendError(res, 400, 'Search query must be at least 2 characters');
      return;
    }

    // maxPage raised well above the admin default (100) — this is a public
    // catalogue endpoint that must stay browsable as the vendor count grows
    // into the thousands, not just the first ~1,000 results.
    const { page, limit } = parsePagination(req.url ?? '', 10, 5000);
    const result = await vendorService.search(q, page, limit);
    sendJson(res, 200, result);
  } catch (error) {
    handleControllerError(res, error, 'Search');
  }
}

export async function handleGetVendor(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  try {
    const { id } = params;
    if (!id) {
      sendError(res, 400, 'Vendor ID is required');
      return;
    }

    // Optional auth: lets the response include isOwnedByViewer for logged-in owners
    const viewerUserId = tryGetUserId(req);
    const result = await vendorService.getById(id, viewerUserId);
    sendJson(res, 200, result);
  } catch (error) {
    handleControllerError(res, error, 'GetVendor');
  }
}

export async function handleGetReviews(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  try {
    const { id: vendorId } = params;
    if (!vendorId) {
      sendError(res, 400, 'Vendor ID is required');
      return;
    }

    // maxPage raised well above the admin default (100) — a popular vendor
    // can accumulate thousands of reviews and must stay fully browsable.
    const { page, limit } = parsePagination(req.url ?? '', 10, 5000);
    const result = await vendorService.getReviews(vendorId, page, limit);
    sendJson(res, 200, result);
  } catch (error) {
    handleControllerError(res, error, 'GetReviews');
  }
}

export async function handleGetSummary(
  _req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  try {
    const { id: vendorId } = params;
    if (!vendorId) {
      sendError(res, 400, 'Vendor ID is required');
      return;
    }

    const result = await vendorService.getVendorSummary(vendorId);
    sendJson(res, 200, result);
  } catch (error) {
    handleControllerError(res, error, 'GetSummary');
  }
}

export async function handleListDirectory(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const queryParams = parseQuery(req.url ?? '');
    // maxPage raised well above the admin default (100) — this is a public
    // catalogue endpoint that must stay browsable as the vendor count grows
    // into the thousands, not just the first ~1,200 results.
    const { page, limit } = parsePagination(req.url ?? '', 12, 5000);

    const minRaw = queryParams.trustScoreMin ? parseFloat(queryParams.trustScoreMin) : NaN;
    const maxRaw = queryParams.trustScoreMax ? parseFloat(queryParams.trustScoreMax) : NaN;

    // Parse comma-separated platform slugs, keeping only known values
    const platforms = queryParams.platforms
      ? queryParams.platforms
          .split(',')
          .map((p) => p.trim().toLowerCase())
          .filter((p): p is vendorService.PlatformSlug => p in vendorService.PLATFORM_FIELDS)
      : undefined;

    const result = await vendorService.listDirectory({
      category: queryParams.category,
      state: queryParams.state,
      claimStatus: queryParams.claimStatus,
      sort: queryParams.sort,
      trustScoreMin: !isNaN(minRaw) ? minRaw : undefined,
      trustScoreMax: !isNaN(maxRaw) ? maxRaw : undefined,
      platforms: platforms && platforms.length > 0 ? platforms : undefined,
      page,
      limit,
    });
    sendJson(res, 200, result);
  } catch (error) {
    handleControllerError(res, error, 'ListDirectory');
  }
}

export async function handleGetFeaturedVendors(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const result = await vendorService.getFeaturedVendors();
    sendJson(res, 200, result);
  } catch (error) {
    handleControllerError(res, error, 'GetFeaturedVendors');
  }
}

export async function handleCreateVendorProfile(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const body = await parseBody<CreateVendorPayload>(req);

    if (!body.businessName || !body.category || !body.state || !body.city || !body.description) {
      sendError(res, 400, 'Missing required vendor profile parameters');
      return;
    }

    const textError = validateVendorTextFields(body);
    if (textError) {
      sendError(res, 400, textError);
      return;
    }

    const urlError = validateSocialUrls(body);
    if (urlError) {
      sendError(res, 400, urlError);
      return;
    }

    const imageError = validateImageField(body.coverImage, 'Cover image') ?? validateImageField(body.logoImage, 'Logo image');
    if (imageError) {
      sendError(res, 400, imageError);
      return;
    }

    const result = await vendorService.createVendorProfile(authReq.userId, body);
    sendJson(res, 201, result);
  } catch (error) {
    handleControllerError(res, error, 'CreateVendorProfile');
  }
}

export async function handleClaimProfile(req: IncomingMessage, res: ServerResponse, params: Record<string, string>): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id: vendorId } = params;
    if (!vendorId) {
      sendError(res, 400, 'Vendor ID is required');
      return;
    }

    const result = await vendorService.claimProfile(vendorId, authReq.userId);
    sendJson(res, 200, result);
  } catch (error) {
    handleControllerError(res, error, 'ClaimProfile');
  }
}

export async function handleUpdateVendorProfile(req: IncomingMessage, res: ServerResponse, params: Record<string, string>): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id: vendorId } = params;
    if (!vendorId) {
      sendError(res, 400, 'Vendor ID is required');
      return;
    }

    const body = await parseBody<UpdateVendorPayload>(req);

    const textError = validateVendorTextFields(body);
    if (textError) {
      sendError(res, 400, textError);
      return;
    }

    const urlError = validateSocialUrls(body);
    if (urlError) {
      sendError(res, 400, urlError);
      return;
    }

    const imageError = validateImageField(body.coverImage, 'Cover image') ?? validateImageField(body.logoImage, 'Logo image');
    if (imageError) {
      sendError(res, 400, imageError);
      return;
    }

    const result = await vendorService.updateVendorProfile(vendorId, authReq.userId, body);
    sendJson(res, 200, result);
  } catch (error) {
    handleControllerError(res, error, 'UpdateVendorProfile');
  }
}

export async function handleGetMyVendorProfile(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const result = await vendorService.getByOwnerId(authReq.userId);
    sendJson(res, 200, result);
  } catch (error) {
    handleControllerError(res, error, 'GetMyVendorProfile');
  }
}
