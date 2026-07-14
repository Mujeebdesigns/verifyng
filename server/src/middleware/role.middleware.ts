import type { ServerResponse } from 'node:http';
import { sendError } from '../utils/response.js';
import type { AuthenticatedRequest } from './auth.middleware.js';
import type { UserRole } from '../types/auth.js';

/**
 * Middleware wrapper to enforce specific user roles.
 * Must be used in route handlers after authentication has succeeded.
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: ServerResponse, next: () => void) => {
    const userRole = req.role;

    if (!userRole || !allowedRoles.includes(userRole as UserRole)) {
      sendError(res, 403, 'Forbidden: Insufficient permissions');
      return;
    }

    next();
  };
}
