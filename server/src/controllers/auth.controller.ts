import type { IncomingMessage, ServerResponse } from 'node:http';
import * as authService from '../services/auth.service.js';
import { parseBody } from '../utils/parseBody.js';
import { sendJson, sendError } from '../utils/response.js';
import { handleControllerError } from '../utils/controllerWrapper.js';
import { AppError } from '../utils/AppError.js';
import { env } from '../utils/env.js';
import { logger } from '../utils/logger.js';
import {
  validateRegistrationInput,
  validatePassword,
  validateSocialUrls,
  validateVendorTextFields,
  validateImageField,
} from '../utils/validation.js';
import { setTokenCookie, clearTokenCookie, parseCookies } from '../utils/cookie.js';
import {
  getClientIpAddress,
  isAdminLockedOut,
  recordFailedAdminAttempt,
  clearFailedAdminAttempts,
} from '../middleware/rateLimit.middleware.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import type {
  RegisterPayload,
  RegisterVendorPayload,
  LoginPayload,
  VerifyEmailPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  ChangePasswordPayload,
} from '../types/auth.js';

export async function handleRegister(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await parseBody<RegisterPayload>(req);

    if (body.role && !['BUYER', 'VENDOR'].includes(body.role)) {
      sendError(res, 400, 'Invalid user role');
      return;
    }

    if (!validateRegistrationInput(body, res)) return;

    const result = await authService.register(body);
    setTokenCookie(res, result.token, env.COOKIE_MAX_AGE_SECONDS);
    sendJson(res, 201, result);
  } catch (error) {
    handleControllerError(res, error, 'Register');
  }
}

export async function handleRegisterVendor(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await parseBody<RegisterVendorPayload>(req);

    if (!validateRegistrationInput(body, res)) return;

    if (!body.businessName || !body.category || !body.state || !body.city || !body.description) {
      sendError(res, 400, 'Business Name, Category, State, City, and Description are required');
      return;
    }

    const textError = validateVendorTextFields(body);
    if (textError) {
      sendError(res, 400, textError);
      return;
    }

    if (body.bankAccountLast4 && body.bankAccountLast4.replace(/[^0-9]/g, '').length !== 4) {
      sendError(res, 400, 'Bank account must be a 4-digit number');
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

    const result = await authService.registerVendor(body);
    setTokenCookie(res, result.token, env.COOKIE_MAX_AGE_SECONDS);
    sendJson(res, 201, result);
  } catch (error) {
    handleControllerError(res, error, 'RegisterVendor');
  }
}

export async function handleLogin(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await parseBody<LoginPayload>(req);

    if (!body.email || !body.password) {
      sendError(res, 400, 'Email and password are required');
      return;
    }

    if (body.email.length > 255) {
      sendError(res, 400, 'Email must be under 255 characters');
      return;
    }

    if (body.password.length > 128) {
      sendError(res, 400, 'Password must be under 128 characters');
      return;
    }

    const result = await authService.login(body);
    setTokenCookie(res, result.token, env.COOKIE_MAX_AGE_SECONDS);
    sendJson(res, 200, result);
  } catch (error) {
    handleControllerError(res, error, 'Login');
  }
}

export async function handleAdminLogin(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const ip = getClientIpAddress(req);

  try {
    const lockedOut = await isAdminLockedOut(ip);
    if (lockedOut) {
      sendError(res, 429, 'Too many failed login attempts. You are temporarily locked out for 15 minutes.');
      return;
    }

    if (env.ADMIN_IP_ALLOWLIST) {
      const allowedIps = env.ADMIN_IP_ALLOWLIST.split(',').map((item) => item.trim());
      if (!allowedIps.includes(ip)) {
        sendError(res, 403, 'Forbidden: IP address not allowed');
        return;
      }
    }

    const body = await parseBody<LoginPayload>(req);

    if (!body.email || !body.password) {
      sendError(res, 400, 'Email and password are required');
      return;
    }

    if (body.email.length > 255) {
      sendError(res, 400, 'Email must be under 255 characters');
      return;
    }

    if (body.password.length > 128) {
      sendError(res, 400, 'Password must be under 128 characters');
      return;
    }

    const result = await authService.login(body);

    if (result.user.role !== 'ADMIN') {
      await recordFailedAdminAttempt(ip);
      sendError(res, 401, 'Invalid email or password');
      return;
    }

    await clearFailedAdminAttempts(ip);
    setTokenCookie(res, result.token, env.COOKIE_MAX_AGE_SECONDS);
    sendJson(res, 200, result);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 401) {
      await recordFailedAdminAttempt(ip);
      sendError(res, 401, 'Invalid email or password');
    } else if (error instanceof AppError && error.statusCode === 403) {
      await recordFailedAdminAttempt(ip);
      sendError(res, 403, error.message);
    } else {
      handleControllerError(res, error, 'AdminLogin');
    }
  }
}

export async function handleLogout(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    // Blacklist token from Bearer header if present
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      await authService.blacklistToken(token);
    }

    // Also blacklist token from cookie if present
    const cookies = parseCookies(req);
    if (cookies['__Host-token']) {
      await authService.blacklistToken(cookies['__Host-token']);
    }

    clearTokenCookie(res);
    sendJson(res, 200, { message: 'Logged out successfully' });
  } catch (error) {
    handleControllerError(res, error, 'Logout');
  }
}

export async function handleMe(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = await authService.getMe(authReq.userId);
    sendJson(res, 200, user);
  } catch (error) {
    handleControllerError(res, error, 'GetMe');
  }
}

export async function handleVerifyEmail(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await parseBody<VerifyEmailPayload>(req);

    if (!body.token) {
      sendError(res, 400, 'Verification token is required');
      return;
    }

    const result = await authService.verifyEmail(body);
    sendJson(res, 200, result);
  } catch (error) {
    handleControllerError(res, error, 'VerifyEmail');
  }
}

export async function handleForgotPassword(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await parseBody<ForgotPasswordPayload>(req);

    if (!body.email) {
      sendError(res, 400, 'Email is required');
      return;
    }

    const result = await authService.forgotPassword(body);
    sendJson(res, 200, result);
  } catch (error) {
    if (error instanceof AppError) {
      logger.warn('ForgotPassword AppError', { message: error.message });
    } else {
      logger.error('ForgotPassword unexpected error', error);
    }
    sendJson(res, 200, { message: 'If an account with that email exists, a password reset link has been sent.' });
  }
}

export async function handleResendVerification(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await parseBody<ForgotPasswordPayload>(req);

    if (!body.email) {
      sendError(res, 400, 'Email is required');
      return;
    }

    const result = await authService.resendVerificationEmail(body);
    sendJson(res, 200, result);
  } catch (error) {
    if (error instanceof AppError) {
      logger.warn('ResendVerification AppError', { message: error.message });
    } else {
      logger.error('ResendVerification unexpected error', error);
    }
    sendJson(res, 200, { message: 'If an account with that email exists and is unverified, a new verification link has been sent.' });
  }
}

export async function handleResetPassword(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await parseBody<ResetPasswordPayload>(req);

    if (!body.token || !body.newPassword) {
      sendError(res, 400, 'Token and new password are required');
      return;
    }

    if (!validatePassword(body.newPassword, res)) return;

    const result = await authService.resetPassword(body);
    sendJson(res, 200, result);
  } catch (error) {
    handleControllerError(res, error, 'ResetPassword');
  }
}

export async function handleChangePassword(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const body = await parseBody<ChangePasswordPayload>(req);

    if (!body.currentPassword || !body.newPassword) {
      sendError(res, 400, 'Current password and new password are required');
      return;
    }

    if (!validatePassword(body.newPassword, res)) return;

    const result = await authService.changePassword(authReq.userId, body);
    setTokenCookie(res, result.token, env.COOKIE_MAX_AGE_SECONDS);
    sendJson(res, 200, { message: 'Password changed successfully', token: result.token });
  } catch (error) {
    handleControllerError(res, error, 'ChangePassword');
  }
}

export async function handleLogoutOtherSessions(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const result = await authService.logoutOtherSessions(authReq.userId);
    setTokenCookie(res, result.token, env.COOKIE_MAX_AGE_SECONDS);
    sendJson(res, 200, { message: 'Logged out of all other devices', token: result.token });
  } catch (error) {
    handleControllerError(res, error, 'LogoutOtherSessions');
  }
}
