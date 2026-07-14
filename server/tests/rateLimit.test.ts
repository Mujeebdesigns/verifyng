import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { prisma } from '../src/utils/prisma.js';
import {
  loginRateLimit,
  isAdminLockedOut,
  recordFailedAdminAttempt,
  clearFailedAdminAttempts,
} from '../src/middleware/rateLimit.middleware.js';

function fakeReq(ip: string): IncomingMessage {
  return {
    headers: {},
    socket: { remoteAddress: ip },
  } as unknown as IncomingMessage;
}

function fakeRes() {
  const state = { status: 0, body: '' };
  const res = {
    writeHead(status: number) {
      state.status = status;
      return res;
    },
    end(body?: string) {
      state.body = body ?? '';
    },
    setHeader() {},
  } as unknown as ServerResponse;
  return { res, state };
}

async function cleanup() {
  await prisma.rateLimit.deleteMany({ where: { key: { contains: 'vitest' } } });
}

beforeAll(cleanup);
afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe('loginRateLimit', () => {
  // Default: 10 attempts per 15 minutes per IP
  it('allows up to the limit then blocks with 429', async () => {
    const ip = '10.99.0.vitest1';

    for (let i = 0; i < 10; i++) {
      const { res } = fakeRes();
      expect(await loginRateLimit(fakeReq(ip), res)).toBe(true);
    }

    const { res, state } = fakeRes();
    expect(await loginRateLimit(fakeReq(ip), res)).toBe(false);
    expect(state.status).toBe(429);
  });

  it('tracks different IPs independently', async () => {
    const { res } = fakeRes();
    expect(await loginRateLimit(fakeReq('10.99.0.vitest2'), res)).toBe(true);
  });

  it('ignores spoofed forwarding headers when TRUST_PROXY is not enabled', async () => {
    const req = {
      headers: { 'x-forwarded-for': '10.99.0.vitest1' }, // exhausted IP, spoofed
      socket: { remoteAddress: '10.99.0.vitest3' }, // fresh real IP
    } as unknown as IncomingMessage;

    const { res } = fakeRes();
    // Must key on the socket address (fresh) → allowed
    expect(await loginRateLimit(req, res)).toBe(true);
  });
});

describe('admin lockout', () => {
  const ip = '10.99.0.vitest-admin';

  it('locks out after 5 failed attempts', async () => {
    expect(await isAdminLockedOut(ip)).toBe(false);
    for (let i = 0; i < 5; i++) {
      await recordFailedAdminAttempt(ip);
    }
    expect(await isAdminLockedOut(ip)).toBe(true);
  });

  it('clears on successful login', async () => {
    await clearFailedAdminAttempts(ip);
    expect(await isAdminLockedOut(ip)).toBe(false);
  });
});
