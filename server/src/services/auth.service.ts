import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma.js';
import { generateToken } from '../utils/jwt.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email.js';
import { AppError } from '../utils/AppError.js';
import { env } from '../utils/env.js';
import { logger } from '../utils/logger.js';
import { normalizeInstagramHandle } from '../utils/normalizeInstagramHandle.js';
import { recordAuditLog } from '../utils/auditLog.js';
import type {
  RegisterPayload,
  RegisterVendorPayload,
  LoginPayload,
  VerifyEmailPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  ChangePasswordPayload,
  AuthResponse,
  UserProfile,
} from '../types/auth.js';

const BCRYPT_ROUNDS = env.BCRYPT_ROUNDS;
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
const RESET_TOKEN_EXPIRY_HOURS = 1;

const DUMMY_HASH = '$2b$12$AAAAAAAAAAAAAAAAAAAAAAu4jxV3GUvP9BKW1lC6zG2PKnEuWgWvO';

/**
 * Register a new user.
 * Creates user + verification token atomically, then sends verification email.
 */
export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { email, password, displayName, role = 'BUYER' } = payload;
  const safeRole = ['BUYER', 'VENDOR'].includes(role) ? role : 'BUYER';

  // Check for existing user
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError('An account with this email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const rawVerificationToken = crypto.randomBytes(32).toString('hex');
  const hashedVerificationToken = crypto.createHash('sha256').update(rawVerificationToken).digest('hex');
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  // Atomic: create user + verification token in a single transaction
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email,
        passwordHash,
        displayName,
        role: safeRole,
      },
    });

    await tx.verificationToken.create({
      data: {
        userId: newUser.id,
        token: hashedVerificationToken,
        type: 'EMAIL_VERIFICATION',
        expiresAt,
      },
    });

    return newUser;
  });

  // Send verification email (non-blocking — don't fail registration if email fails)
  sendVerificationEmail(email, rawVerificationToken).catch((error) => {
    logger.error('Failed to send verification email', error);
  });

  const jwt = generateToken({ userId: user.id, displayName: user.displayName, role: user.role, tokenVersion: user.tokenVersion });

  return {
    token: jwt,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt.toISOString(),
    },
  };
}

/**
 * Register a new vendor and their profile.
 * Creates user, vendor profile, and verification token atomically.
 */
export async function registerVendor(payload: RegisterVendorPayload): Promise<AuthResponse> {
  const {
    email,
    password,
    displayName,
    businessName,
    instagramHandle,
    phoneNumber,
    state,
    city,
    category,
    description,
    whatsappUrl,
    tiktokUrl,
    facebookUrl,
    linkedinUrl,
    coverImage,
    logoImage,
  } = payload;

  // Check for existing user
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError('An account with this email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const rawVerificationToken = crypto.randomBytes(32).toString('hex');
  const hashedVerificationToken = crypto.createHash('sha256').update(rawVerificationToken).digest('hex');
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  // Transaction: create user + verification token + vendor profile
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email,
        passwordHash,
        displayName,
        role: 'VENDOR',
      },
    });

    await tx.verificationToken.create({
      data: {
        userId: newUser.id,
        token: hashedVerificationToken,
        type: 'EMAIL_VERIFICATION',
        expiresAt,
      },
    });

    await tx.vendor.create({
      data: {
        businessName,
        instagramHandle: instagramHandle ? normalizeInstagramHandle(instagramHandle) : null,
        phoneNumber: phoneNumber || null,
        ownerId: newUser.id,
        claimStatus: 'PENDING_APPROVAL',
        state: state || null,
        city: city || null,
        category: category || null,
        description: description || null,
        whatsappUrl: whatsappUrl || null,
        tiktokUrl: tiktokUrl || null,
        facebookUrl: facebookUrl || null,
        linkedinUrl: linkedinUrl || null,
        coverImage: coverImage || null,
        logoImage: logoImage || null,
      },
    });

    return newUser;
  }, {
    // Vendor writes include base64 images; give the transaction more room than
    // the 5s default so a larger write doesn't expire mid-flight. Client-side
    // compression keeps images small, so this is defensive headroom.
    timeout: 20000,
  });

  // Send verification email
  sendVerificationEmail(email, rawVerificationToken).catch((error) => {
    logger.error('Failed to send verification email', error);
  });

  const jwt = generateToken({ userId: user.id, displayName: user.displayName, role: user.role, tokenVersion: user.tokenVersion });

  return {
    token: jwt,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt.toISOString(),
    },
  };
}

/**
 * Authenticate user with email and password.
 */
export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { email, password } = payload;

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      displayName: true,
      role: true,
      isVerified: true,
      isBanned: true,
      tokenVersion: true,
      createdAt: true,
    },
  });

  const passwordHash = user ? user.passwordHash : DUMMY_HASH;
  const passwordValid = await bcrypt.compare(password, passwordHash);

  if (!user || !passwordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  if (user.isBanned) {
    throw new AppError('Your account has been suspended. Contact support if you believe this is a mistake.', 403);
  }

  if (!user.isVerified) {
    throw new AppError('Please verify your email before logging in. Check your inbox for the verification link.', 403);
  }

  const jwt = generateToken({ userId: user.id, displayName: user.displayName, role: user.role, tokenVersion: user.tokenVersion });

  return {
    token: jwt,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt.toISOString(),
    },
  };
}

/**
 * Verify email using the verification token.
 */
export async function verifyEmail(payload: VerifyEmailPayload): Promise<{ message: string }> {
  const { token } = payload;
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  await prisma.$transaction(async (tx) => {
    const verificationToken = await tx.verificationToken.findUnique({
      where: { token: hashedToken },
    });

    if (!verificationToken) {
      throw new AppError('Invalid verification token', 400);
    }

    if (verificationToken.type !== 'EMAIL_VERIFICATION') {
      throw new AppError('Invalid token type', 400);
    }

    if (new Date() > verificationToken.expiresAt) {
      throw new AppError('Verification token has expired', 400);
    }

    // Atomic verify and delete inside the transaction context
    await tx.user.update({
      where: { id: verificationToken.userId },
      data: { isVerified: true },
    });

    await tx.verificationToken.delete({
      where: { id: verificationToken.id },
    });
  });

  return { message: 'Email verified successfully' };
}

/**
 * Initiate password reset.
 * Always returns 200 regardless of whether the email exists (prevents enumeration).
 */
export async function forgotPassword(payload: ForgotPasswordPayload): Promise<{ message: string }> {
  const { email } = payload;

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    // Delete any existing reset tokens for this user
    await prisma.verificationToken.deleteMany({
      where: { userId: user.id, type: 'PASSWORD_RESET' },
    });

    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token: hashedResetToken,
        type: 'PASSWORD_RESET',
        expiresAt,
      },
    });

    sendPasswordResetEmail(email, rawResetToken, user.role).catch((error) => {
      logger.error('Failed to send reset email', error);
    });
  } else {
    // Artificial delay to prevent timing-based email enumeration
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  // Always return generic response to prevent email enumeration
  return { message: 'If an account with that email exists, a password reset link has been sent.' };
}

/**
 * Resend the email verification link.
 * Always returns 200 regardless of whether the email exists or is already
 * verified (prevents enumeration) — mirrors forgotPassword.
 */
export async function resendVerificationEmail(payload: ForgotPasswordPayload): Promise<{ message: string }> {
  const { email } = payload;

  const user = await prisma.user.findUnique({ where: { email } });

  if (user && !user.isVerified) {
    // Delete any existing verification tokens for this user — the raw
    // token from the original email can never be recovered since only
    // its hash is stored, so a fresh one is issued in its place.
    await prisma.verificationToken.deleteMany({
      where: { userId: user.id, type: 'EMAIL_VERIFICATION' },
    });

    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const hashedVerificationToken = crypto.createHash('sha256').update(rawVerificationToken).digest('hex');
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token: hashedVerificationToken,
        type: 'EMAIL_VERIFICATION',
        expiresAt,
      },
    });

    sendVerificationEmail(email, rawVerificationToken).catch((error) => {
      logger.error('Failed to resend verification email', error);
    });
  } else {
    // Artificial delay to prevent timing-based email enumeration
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  // Always return generic response to prevent email enumeration
  return { message: 'If an account with that email exists and is unverified, a new verification link has been sent.' };
}

/**
 * Reset password using a valid reset token.
 * Also verifies the user's email (if a user resets password, they own the email).
 */
export async function resetPassword(payload: ResetPasswordPayload): Promise<{ message: string }> {
  const { token, newPassword } = payload;
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  await prisma.$transaction(async (tx) => {
    const resetToken = await tx.verificationToken.findUnique({
      where: { token: hashedToken },
    });

    if (!resetToken) {
      throw new AppError('Invalid reset token', 400);
    }

    if (resetToken.type !== 'PASSWORD_RESET') {
      throw new AppError('Invalid token type', 400);
    }

    if (new Date() > resetToken.expiresAt) {
      throw new AppError('Reset token has expired', 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Atomic update and delete inside transaction context
    // Increment tokenVersion to invalidate all existing sessions
    await tx.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
        isVerified: true, // Password reset implicitly verifies email ownership
        tokenVersion: { increment: 1 },
      },
    });

    await tx.verificationToken.delete({
      where: { id: resetToken.id },
    });
  });

  return { message: 'Password reset successfully' };
}

/**
 * Change password for an authenticated user (requires the current password).
 * Bumps tokenVersion to invalidate every other outstanding session, then
 * issues a fresh token carrying the new version so the session making this
 * request isn't logged out by its own request.
 */
export async function changePassword(userId: string, payload: ChangePasswordPayload): Promise<{ token: string }> {
  const { currentPassword, newPassword } = payload;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, displayName: true, role: true },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const passwordValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!passwordValid) {
    throw new AppError('Current password is incorrect', 401);
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, tokenVersion: { increment: 1 } },
    select: { tokenVersion: true },
  });

  await recordAuditLog({ actorId: userId, action: 'CHANGE_PASSWORD', targetType: 'User', targetId: userId });

  const token = generateToken({
    userId,
    displayName: user.displayName,
    role: user.role,
    tokenVersion: updated.tokenVersion,
  });

  return { token };
}

/**
 * Invalidate every other active session by bumping tokenVersion, then issue
 * a fresh token for the current session so it stays signed in.
 */
export async function logoutOtherSessions(userId: string): Promise<{ token: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true, role: true },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
    select: { tokenVersion: true },
  });

  await recordAuditLog({ actorId: userId, action: 'LOGOUT_OTHER_SESSIONS', targetType: 'User', targetId: userId });

  const token = generateToken({
    userId,
    displayName: user.displayName,
    role: user.role,
    tokenVersion: updated.tokenVersion,
  });

  return { token };
}

/**
 * Issue a session for an admin who has already passed both the password check
 * and the 2FA code step (proven by a valid 2FA challenge token). Re-confirms
 * the account is still an active admin before minting the token.
 */
export async function issueAdminSession(userId: string): Promise<AuthResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, displayName: true, role: true, isVerified: true, isBanned: true, tokenVersion: true, createdAt: true },
  });

  if (!user || user.role !== 'ADMIN') {
    throw new AppError('Invalid email or password', 401);
  }
  if (user.isBanned) {
    throw new AppError('Your account has been suspended.', 403);
  }

  const token = generateToken({ userId: user.id, displayName: user.displayName, role: user.role, tokenVersion: user.tokenVersion });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt.toISOString(),
    },
  };
}

/**
 * Get the current authenticated user's profile.
 */
export async function getMe(userId: string): Promise<UserProfile> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      isVerified: true,
      createdAt: true,
      totpEnabled: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    isVerified: user.isVerified,
    createdAt: user.createdAt.toISOString(),
    totpEnabled: user.totpEnabled,
  };
}

/**
 * Blacklist a JWT token (revocation).
 */
export async function blacklistToken(token: string): Promise<void> {
  try {
    const decoded = jwt.decode(token) as { exp?: number };
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await prisma.blacklistedToken.upsert({
      where: { tokenHash },
      update: {},
      create: {
        tokenHash,
        expiresAt,
      },
    });
  } catch (error) {
    logger.error('Failed to blacklist token', error);
  }
}

/**
 * Check if a token has been blacklisted.
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const count = await prisma.blacklistedToken.count({
    where: { tokenHash },
  });
  return count > 0;
}

