import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import crypto from 'node:crypto';

// Prevent any real email traffic from the register/forgot flows
vi.mock('../src/utils/email.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendAdminNotification: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from '../src/utils/prisma.js';
import {
  register,
  login,
  resetPassword,
  blacklistToken,
  isTokenBlacklisted,
} from '../src/services/auth.service.js';
import { AppError } from '../src/utils/AppError.js';

const EMAIL = 'vitest-auth@test.local';
const PASSWORD = 'Testpass1';

async function cleanup() {
  await prisma.verificationToken.deleteMany({});
  await prisma.blacklistedToken.deleteMany({});
  await prisma.user.deleteMany({ where: { email: { endsWith: '@test.local' } } });
}

beforeAll(cleanup);
afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe('register', () => {
  it('creates a user and returns a token', async () => {
    const res = await register({ email: EMAIL, password: PASSWORD, displayName: 'Vitest User' });
    expect(res.token).toBeTruthy();
    expect(res.user.email).toBe(EMAIL);
    expect(res.user.isVerified).toBe(false);
  });

  it('rejects duplicate emails with 409', async () => {
    await expect(
      register({ email: EMAIL, password: PASSWORD, displayName: 'Dupe' }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('coerces unknown roles to BUYER', async () => {
    const res = await register({
      email: 'vitest-role@test.local',
      password: PASSWORD,
      displayName: 'Role Probe',
      // @ts-expect-error deliberately passing a forbidden role
      role: 'ADMIN',
    });
    expect(res.user.role).toBe('BUYER');
  });
});

describe('login', () => {
  it('rejects unknown emails with 401', async () => {
    await expect(
      login({ email: 'nobody@test.local', password: PASSWORD }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('rejects wrong passwords with 401', async () => {
    await expect(
      login({ email: EMAIL, password: 'Wrongpass1' }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('rejects unverified users with 403', async () => {
    await expect(
      login({ email: EMAIL, password: PASSWORD }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('succeeds once verified', async () => {
    await prisma.user.update({ where: { email: EMAIL }, data: { isVerified: true } });
    const res = await login({ email: EMAIL, password: PASSWORD });
    expect(res.token).toBeTruthy();
  });

  it('rejects banned users with 403 even with correct credentials', async () => {
    await prisma.user.update({ where: { email: EMAIL }, data: { isBanned: true } });
    await expect(
      login({ email: EMAIL, password: PASSWORD }),
    ).rejects.toMatchObject({ statusCode: 403, message: expect.stringContaining('suspended') });
  });
});

describe('resetPassword cannot lift a ban (H1 regression pin)', () => {
  it('reset succeeds but the user stays banned', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
    expect(user.isBanned).toBe(true);

    // Plant a valid reset token directly
    const raw = crypto.randomBytes(32).toString('hex');
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token: crypto.createHash('sha256').update(raw).digest('hex'),
        type: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const result = await resetPassword({ token: raw, newPassword: 'Newpass99' });
    expect(result.message).toMatch(/reset/i);

    const after = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
    expect(after.isBanned).toBe(true); // ban survives the reset
    expect(after.tokenVersion).toBeGreaterThan(user.tokenVersion); // sessions invalidated

    await expect(
      login({ email: EMAIL, password: 'Newpass99' }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('token blacklist', () => {
  it('round-trips a blacklisted token', async () => {
    const token = 'some.jwt.token-for-blacklist-test';
    expect(await isTokenBlacklisted(token)).toBe(false);
    await blacklistToken(token);
    expect(await isTokenBlacklisted(token)).toBe(true);
  });
});

describe('AppError shape', () => {
  it('service errors are AppError instances with status codes', async () => {
    try {
      await login({ email: 'nobody@test.local', password: PASSWORD });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
    }
  });
});
