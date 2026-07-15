# Skill: auth-flow

Use this skill whenever you are building or modifying any part of the authentication system in VerifyNG — registration, login, email verification, password reset, or protected route middleware.

---

## Before You Start

1. Read `agents/rules/security.md` — auth is the most security-critical part of the codebase
2. Read `agents/rules/architecture.md` — auth follows the same Route → Controller → Service → Prisma pattern (utilizing custom routing and native HTTP response helpers)

---

## Overview

VerifyNG uses **JWT (jsonwebtoken) + bcrypt** for authentication. There is no third-party auth service.

| Concern | Tool |
|---|---|
| Password hashing | bcrypt (cost factor: 12) |
| Token generation and verification | jsonwebtoken |
| Email verification | Brevo HTTPS API (token sent via email — see `server/src/utils/email.ts`) |
| Session model | Stateless JWT — token stored client-side |

---

## Auth Routes

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| POST | /api/auth/register | No | Create account + send verification email |
| POST | /api/auth/login | No | Verify credentials + return JWT |
| POST | /api/auth/logout | Yes | Client discards token (server is stateless) |
| GET | /api/auth/me | Yes | Return current user profile |
| POST | /api/auth/verify-email | No | Verify email with token from email |
| POST | /api/auth/forgot-password | No | Send password reset email |
| POST | /api/auth/reset-password | No | Reset password using token from email |

---

## Registration Flow

```
1. Receive: email, password, displayName, role (defaults to BUYER)
2. Validate inputs (see security.md for rules)
3. Check email is not already registered
4. Hash password with bcrypt (cost: 12)
5. Create User record in database (isVerified: false, role: BUYER | VENDOR)
6. Generate a secure email verification token (crypto.randomBytes)
7. Send verification email with token link
8. Return 201 with { message: 'Check your email to verify your account' }
   — do NOT return the JWT yet; user must verify email first
```

```typescript
// server/src/services/auth.service.ts

import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { prisma } from '../utils/prisma';
import { AppError } from '../utils/AppError';
import { generateToken } from '../utils/jwt';
import { sendVerificationEmail } from '../utils/email';
import type { RegisterPayload, LoginPayload } from '../types/auth';

export async function register(payload: RegisterPayload) {
  const { email, password, displayName, role = 'BUYER' } = payload;

  // Prevent self-assignment of ADMIN role; only BUYER and VENDOR are allowed on signup
  if (role !== 'BUYER' && role !== 'VENDOR') {
    throw new AppError('Invalid role', 400);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('An account with this email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const verificationToken = crypto.randomBytes(32).toString('hex');

  // Perform database updates in a transaction to guarantee atomicity
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email,
        passwordHash,
        displayName,
        isVerified: false,
        role,
      },
    });

    // Store the verification token with a 24-hour expiration
    await tx.verificationToken.create({
      data: {
        userId: newUser.id,
        token: verificationToken,
        type: 'EMAIL_VERIFICATION',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    return newUser;
  });

  // Send verification email (implementation in utils/email.ts)
  await sendVerificationEmail(email, verificationToken);

  return { message: 'Check your email to verify your account' };
}
```

---

## Login Flow

```
1. Receive: email, password
2. Find user by email — return 401 if not found (do not reveal whether email exists)
3. Compare password with bcrypt.compare
4. Return 401 if password does not match
5. Check isVerified — return 403 if email not verified
6. Generate JWT with payload: { userId, displayName, role }
7. Return 200 with { token, user: { id, email, displayName, role } }
```

```typescript
export async function login(payload: LoginPayload) {
  const { email, password } = payload;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, passwordHash: true, displayName: true, isVerified: true, role: true },
  });

  // Use same error for both "not found" and "wrong password" — prevents email enumeration
  if (!user || !user.passwordHash) {
    throw new AppError('Invalid email or password', 401);
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.isVerified) {
    throw new AppError('Please verify your email before logging in', 403);
  }

  const token = generateToken({ userId: user.id, displayName: user.displayName, role: user.role });

  return {
    token,
    user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
  };
}
```

---

## JWT Utilities

```typescript
// server/src/utils/jwt.ts

import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../types/auth';

// JWT_SECRET and JWT_EXPIRES_IN are validated at server startup in utils/env.ts
// (see agents/rules/security.md). At runtime these env vars are guaranteed to exist.
const secret = process.env.JWT_SECRET as string;
const expiresIn = process.env.JWT_EXPIRES_IN as string;

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}
```

---

## Auth Middleware

```typescript
// server/src/middleware/auth.middleware.ts

import type { IncomingMessage, ServerResponse } from 'node:http';
import { verifyToken } from '../utils/jwt';
import { sendError } from '../utils/response';

export interface AuthenticatedRequest extends IncomingMessage {
  userId?: string;
  displayName?: string;
  role?: string;
}

export function authenticate(
  req: AuthenticatedRequest,
  res: ServerResponse,
  next: () => void
): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 401, 'Authentication required');
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    req.displayName = payload.displayName;
    req.role = payload.role;
    next();
  } catch {
    sendError(res, 401, 'Invalid or expired token');
  }
}
```

### Role Authorization Middleware

To lock endpoints down to specific roles, define a role check wrapper:

```typescript
// server/src/middleware/role.middleware.ts
import type { ServerResponse } from 'node:http';
import { sendError } from '../utils/response';
import type { AuthenticatedRequest } from './auth.middleware';

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: ServerResponse, next: () => void) => {
    if (!req.role || !allowedRoles.includes(req.role)) {
      sendError(res, 403, 'Forbidden: Insufficient permissions');
      return;
    }
    next();
  };
}
```

### Using Auth Middleware with the Router

The router defined in `agents/rules/architecture.md` does not natively support middleware chains. Wrap the `authenticate` call inside the route handler:

```typescript
// server/src/routes/auth.routes.ts
import type { RouteHandler } from '../utils/router';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.middleware';

function requireAuth(handler: (req: AuthenticatedRequest, res: ServerResponse) => void): RouteHandler {
  return (req, res, _params) => {
    authenticate(req as AuthenticatedRequest, res, () => handler(req as AuthenticatedRequest, res));
  };
}

// Usage in route registration:
router.get('/api/auth/me', requireAuth(async (req, res) => {
  // req.userId and req.displayName are available here
}));
```

---

## Email Verification Flow

```
1. User clicks link in verification email: /verify-email?token=abc123
2. Client sends POST /api/auth/verify-email with { token }
3. Server looks up token and checks validity and expiry
4. If token is valid, updates isVerified to true and deletes the token record
5. Return 200 with { message: 'Email verified successfully' }
```

```typescript
export async function verifyEmail(token: string) {
  const tokenRecord = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!tokenRecord || tokenRecord.type !== 'EMAIL_VERIFICATION') {
    throw new AppError('Invalid or expired verification token', 400);
  }

  if (tokenRecord.expiresAt < new Date()) {
    await prisma.verificationToken.delete({ where: { id: tokenRecord.id } });
    throw new AppError('Verification token has expired', 400);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { isVerified: true },
    }),
    prisma.verificationToken.delete({
      where: { id: tokenRecord.id },
    }),
  ]);

  return { message: 'Email verified successfully' };
}
```

---

## Password Reset Flow

```
1. POST /api/auth/forgot-password — receive email; return 200 regardless of existence (prevents email enumeration)
2. Generate secure token (crypto.randomBytes), store with 1-hour expiry (deleting old reset tokens for that user)
3. Send password reset email containing link
4. POST /api/auth/reset-password — receive { token, newPassword }
5. Validate token exists, is correct type, and not expired
6. Hash new password (bcrypt cost 12), update user, and invalidate the reset token
```

```typescript
import { sendPasswordResetEmail } from '../utils/email';

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Prevent email enumeration: return generic success even if user does not exist
  if (!user) {
    return { message: 'If this email exists in our system, a password reset link has been sent' };
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.$transaction([
    // Clean up any old reset tokens for this user
    prisma.verificationToken.deleteMany({
      where: { userId: user.id, type: 'PASSWORD_RESET' },
    }),
    prisma.verificationToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        type: 'PASSWORD_RESET',
        expiresAt,
      },
    }),
  ]);

  await sendPasswordResetEmail(email, resetToken);

  return { message: 'If this email exists in our system, a password reset link has been sent' };
}

export async function resetPassword(payload: ResetPasswordPayload) {
  const { token, newPassword } = payload;

  const tokenRecord = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!tokenRecord || tokenRecord.type !== 'PASSWORD_RESET') {
    throw new AppError('Invalid or expired password reset token', 400);
  }

  if (tokenRecord.expiresAt < new Date()) {
    await prisma.verificationToken.delete({ where: { id: tokenRecord.id } });
    throw new AppError('Password reset token has expired', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  // Reset via email proves ownership of the email address.
  // If the user was previously unverified, the reset auto-verifies them.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: tokenRecord.userId },
      data: {
        passwordHash,
        isVerified: true,
      },
    }),
    prisma.verificationToken.delete({
      where: { id: tokenRecord.id },
    }),
  ]);

  return { message: 'Password reset successful' };
}
```

---

## Email Utilities

Used by both registration (verification email) and forgot-password (reset email). The real implementation (`server/src/utils/email.ts`) sends via **Brevo's HTTPS API** as the primary provider — SMTP is blocked on Render's free tier, so any raw-SMTP provider (Nodemailer, etc.) only works for local development. The example below illustrates the general shape; treat the actual file as the source of truth.

```typescript
// server/src/utils/email.ts

import { AppError } from './AppError';

const FROM_ADDRESS = 'VerifyNG <noreply@verifyng.com>';

/**
 * Send email verification link.
 * Called from auth.service.ts → register()
 */
export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const verificationUrl = `https://verifyng.com/verify-email?token=${token}`;

  // Example using Resend:
  // await resend.emails.send({
  //   from: FROM_ADDRESS,
  //   to,
  //   subject: 'Verify your email address',
  //   html: `<p>Click <a href="${verificationUrl}">here</a> to verify your email.</p>`,
  // });

  // Example using Nodemailer:
  // const transporter = nodemailer.createTransport({ ... });
  // await transporter.sendMail({
  //   from: FROM_ADDRESS,
  //   to,
  //   subject: 'Verify your email address',
  //   html: `<p>Click <a href="${verificationUrl}">here</a> to verify your email.</p>`,
  // });

  throw new AppError('Email provider not configured', 500);
}

/**
 * Send password reset link.
 * Called from auth.service.ts → forgotPassword()
 */
export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const resetUrl = `https://verifyng.com/reset-password?token=${token}`;

  // Same provider configuration as sendVerificationEmail above.
  // Replace the throw below with your chosen provider's send method.

  throw new AppError('Email provider not configured', 500);
}
```

---

## TypeScript Types for Auth

```typescript
// server/src/types/auth.ts

export interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
  role?: 'BUYER' | 'VENDOR';
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface JwtPayload {
  userId: string;
  displayName: string;
  role: 'BUYER' | 'VENDOR' | 'ADMIN';
}
```

---

## Security Rules (Auth-Specific)

- Never reveal whether an email is registered — use the same error message for "not found" and "wrong password"
- Never store plain text passwords or reset tokens
- Reset tokens and verification tokens must expire (1 hour and 24 hours respectively)
- Password reset via email auto-verifies the user — email ownership is proven by successfully following the reset link
- Use `crypto.randomBytes(32).toString('hex')` for all token generation — never `Math.random()`
- Always exclude `passwordHash` from Prisma `select` in any response that does not explicitly need it for comparison
