import type { createRouter } from '../utils/router.js';
import {
  handleRegister,
  handleRegisterVendor,
  handleLogin,
  handleAdminLogin,
  handleLogout,
  handleMe,
  handleVerifyEmail,
  handleForgotPassword,
  handleResetPassword,
  handleResendVerification,
  handleChangePassword,
  handleLogoutOtherSessions,
} from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { loginRateLimit } from '../middleware/rateLimit.middleware.js';
import { actionRateLimit } from '../middleware/rateLimit.middleware.js';

/**
 * Register auth-related routes.
 */
export function registerAuthRoutes(router: ReturnType<typeof createRouter>): void {
  router.post('/api/auth/register', async (req, res) => {
    if (!(await actionRateLimit(req, res))) return;
    return handleRegister(req, res);
  });

  router.post('/api/auth/register-vendor', async (req, res) => {
    if (!(await actionRateLimit(req, res))) return;
    return handleRegisterVendor(req, res);
  });
  
  router.post('/api/auth/login', async (req, res) => {
    if (!(await loginRateLimit(req, res))) return;
    return handleLogin(req, res);
  });

  router.post('/api/auth/admin/login', async (req, res) => {
    if (!(await loginRateLimit(req, res))) return;
    return handleAdminLogin(req, res);
  });
  
  router.post('/api/auth/logout', async (req, res) => {
    if (!(await authMiddleware(req, res))) return;
    return handleLogout(req, res);
  });

  router.get('/api/auth/me', async (req, res) => {
    if (!(await authMiddleware(req, res))) return;
    return handleMe(req, res);
  });

  router.post('/api/auth/verify-email', async (req, res) => {
    if (!(await actionRateLimit(req, res))) return;
    return handleVerifyEmail(req, res);
  });

  router.post('/api/auth/forgot-password', async (req, res) => {
    if (!(await actionRateLimit(req, res))) return;
    return handleForgotPassword(req, res);
  });

  router.post('/api/auth/resend-verification', async (req, res) => {
    if (!(await actionRateLimit(req, res))) return;
    return handleResendVerification(req, res);
  });

  router.post('/api/auth/reset-password', async (req, res) => {
    if (!(await actionRateLimit(req, res))) return;
    return handleResetPassword(req, res);
  });

  router.post('/api/auth/change-password', async (req, res) => {
    if (!(await actionRateLimit(req, res))) return;
    if (!(await authMiddleware(req, res))) return;
    return handleChangePassword(req, res);
  });

  router.post('/api/auth/logout-other-sessions', async (req, res) => {
    if (!(await actionRateLimit(req, res))) return;
    if (!(await authMiddleware(req, res))) return;
    return handleLogoutOtherSessions(req, res);
  });
}
