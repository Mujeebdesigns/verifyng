import type { IncomingMessage, ServerResponse } from 'node:http';
import * as adminService from '../services/admin.service.js';
import { sendJson, sendError } from '../utils/response.js';
import { parseBody } from '../utils/parseBody.js';
import { handleControllerError, parsePagination } from '../utils/controllerWrapper.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export async function handleGetStats(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const stats = await adminService.getStats();
    sendJson(res, 200, stats);
  } catch (error) {
    handleControllerError(res, error, 'handleGetStats');
  }
}

export async function handleGetClaims(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const { page, limit } = parsePagination(req.url ?? '');
    const result = await adminService.getClaims(page, limit);
    sendJson(res, 200, result);
  } catch (error) {
    handleControllerError(res, error, 'handleGetClaims');
  }
}

export async function handleApproveClaim(
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
    const authReq = req as AuthenticatedRequest;
    const result = await adminService.approveClaim(id, authReq.userId);
    sendJson(res, 200, { message: 'Claim approved successfully', vendor: result });
  } catch (error) {
    handleControllerError(res, error, 'handleApproveClaim');
  }
}

export async function handleRejectClaim(
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
    const authReq = req as AuthenticatedRequest;
    const result = await adminService.rejectClaim(id, authReq.userId);
    sendJson(res, 200, { message: 'Claim rejected successfully', vendor: result });
  } catch (error) {
    handleControllerError(res, error, 'handleRejectClaim');
  }
}

export async function handleGetReports(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const { page, limit } = parsePagination(req.url ?? '');
    const result = await adminService.getReports(page, limit);
    sendJson(res, 200, result);
  } catch (error) {
    handleControllerError(res, error, 'handleGetReports');
  }
}

export async function handleResolveReport(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  try {
    const { id } = params;
    if (!id) {
      sendError(res, 400, 'Report ID is required');
      return;
    }

    const body = await parseBody<{ status?: string }>(req);
    if (!body.status || !['REVIEWED', 'DISMISSED'].includes(body.status)) {
      sendError(res, 400, 'Valid status (REVIEWED or DISMISSED) is required');
      return;
    }

    const result = await adminService.resolveReport(id, body.status as 'REVIEWED' | 'DISMISSED');
    sendJson(res, 200, { message: 'Report resolved successfully', report: result });
  } catch (error) {
    handleControllerError(res, error, 'handleResolveReport');
  }
}

export async function handleToggleFeatured(
  _req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  try {
    const { id } = params;
    if (!id) {
      sendError(res, 400, 'Vendor ID is required');
      return;
    }
    const result = await adminService.toggleFeatured(id);
    sendJson(res, 200, { message: 'Featured status updated', vendor: result });
  } catch (error) {
    handleControllerError(res, error, 'handleToggleFeatured');
  }
}

export async function handleGetUsers(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const { page, limit } = parsePagination(req.url ?? '');
    const result = await adminService.getUsers(page, limit);
    sendJson(res, 200, result);
  } catch (error) {
    handleControllerError(res, error, 'handleGetUsers');
  }
}

export async function handleBanUser(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  try {
    const { id } = params;
    if (!id) {
      sendError(res, 400, 'User ID is required');
      return;
    }
    const authReq = req as AuthenticatedRequest;
    if (id === authReq.userId) {
      sendError(res, 400, 'Cannot perform this action on your own account');
      return;
    }
    const result = await adminService.banUser(id, authReq.userId);
    sendJson(res, 200, { message: 'User banned successfully', user: result });
  } catch (error) {
    handleControllerError(res, error, 'handleBanUser');
  }
}

export async function handleUnbanUser(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  try {
    const { id } = params;
    if (!id) {
      sendError(res, 400, 'User ID is required');
      return;
    }
    const authReq = req as AuthenticatedRequest;
    const result = await adminService.unbanUser(id, authReq.userId);
    sendJson(res, 200, { message: 'User unbanned successfully', user: result });
  } catch (error) {
    handleControllerError(res, error, 'handleUnbanUser');
  }
}

export async function handleDeleteUser(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  try {
    const { id } = params;
    if (!id) {
      sendError(res, 400, 'User ID is required');
      return;
    }
    const authReq = req as AuthenticatedRequest;
    if (id === authReq.userId) {
      sendError(res, 400, 'Cannot perform this action on your own account');
      return;
    }
    await adminService.deleteUser(id, authReq.userId);
    sendJson(res, 200, { message: 'User deleted successfully' });
  } catch (error) {
    handleControllerError(res, error, 'handleDeleteUser');
  }
}

export async function handlePromoteUser(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  try {
    const { id } = params;
    if (!id) {
      sendError(res, 400, 'User ID is required');
      return;
    }
    const authReq = req as AuthenticatedRequest;
    if (id === authReq.userId) {
      sendError(res, 400, 'Cannot perform this action on your own account');
      return;
    }
    const result = await adminService.promoteUser(id, authReq.userId);
    sendJson(res, 200, { message: 'User promoted successfully', user: result });
  } catch (error) {
    handleControllerError(res, error, 'handlePromoteUser');
  }
}

export async function handleGetFlaggedReviews(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const { page, limit } = parsePagination(req.url ?? '');
    const result = await adminService.getFlaggedReviews(page, limit);
    sendJson(res, 200, result);
  } catch (error) {
    handleControllerError(res, error, 'handleGetFlaggedReviews');
  }
}
