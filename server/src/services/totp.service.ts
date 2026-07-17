import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/AppError.js';

// Allow one 30s step of clock skew either side so a code that ticks over
// mid-submit still verifies.
authenticator.options = { window: 1 };

const SERVICE_NAME = 'VerifyNG';
const BACKUP_CODE_COUNT = 8;
const BCRYPT_ROUNDS = 10;

/**
 * Begin TOTP enrollment: generate a secret and store it (NOT yet enabled), and
 * return the otpauth URI + a QR data URL for the user to scan. Enrollment is
 * only finalised by confirmTotpEnable() with a valid code, so a generated-but-
 * unconfirmed secret never gates login.
 */
export async function generateTotpSetup(userId: string): Promise<{ secret: string; otpauthUrl: string; qrDataUrl: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, totpEnabled: true } });
  if (!user) throw new AppError('User not found', 404);
  if (user.totpEnabled) throw new AppError('Two-factor authentication is already enabled', 409);

  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(user.email, SERVICE_NAME, secret);
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

  // Store the pending secret; totpEnabled stays false until confirmed.
  await prisma.user.update({ where: { id: userId }, data: { totpSecret: secret } });

  return { secret, otpauthUrl, qrDataUrl };
}

/**
 * Finalise enrollment: verify a code against the pending secret, then enable
 * 2FA and issue one-time backup codes (returned once, stored only as hashes).
 */
export async function confirmTotpEnable(userId: string, code: string): Promise<{ backupCodes: string[] }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { totpSecret: true, totpEnabled: true } });
  if (!user) throw new AppError('User not found', 404);
  if (user.totpEnabled) throw new AppError('Two-factor authentication is already enabled', 409);
  if (!user.totpSecret) throw new AppError('Start 2FA setup before confirming', 400);

  if (!authenticator.check(code, user.totpSecret)) {
    throw new AppError('Invalid code. Check your authenticator app and try again.', 400);
  }

  // Generate readable one-time backup codes (e.g. "3f9a-c2e1"), store hashes.
  const plainCodes: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const raw = crypto.randomBytes(4).toString('hex');
    plainCodes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
  }
  const hashed = await Promise.all(plainCodes.map((c) => bcrypt.hash(c, BCRYPT_ROUNDS)));

  await prisma.user.update({
    where: { id: userId },
    data: { totpEnabled: true, totpBackupCodes: hashed },
  });

  return { backupCodes: plainCodes };
}

/**
 * Verify a login-time code: first as a TOTP code, then as a one-time backup
 * code (consumed on use). Returns true if either matches.
 */
export async function verifyTotpCode(userId: string, code: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpSecret: true, totpEnabled: true, totpBackupCodes: true },
  });
  if (!user || !user.totpEnabled || !user.totpSecret) return false;

  const normalized = code.trim();

  // 1. Try as a TOTP code.
  if (authenticator.check(normalized, user.totpSecret)) {
    return true;
  }

  // 2. Try as a backup code — compare against each stored hash; consume on hit.
  for (const hash of user.totpBackupCodes) {
    if (await bcrypt.compare(normalized, hash)) {
      await prisma.user.update({
        where: { id: userId },
        data: { totpBackupCodes: user.totpBackupCodes.filter((h) => h !== hash) },
      });
      return true;
    }
  }

  return false;
}

/** Whether the user has 2FA fully enabled. */
export async function isTotpEnabled(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { totpEnabled: true } });
  return Boolean(user?.totpEnabled);
}

/** Disable 2FA and wipe all secrets/backup codes (requires a valid current code). */
export async function disableTotp(userId: string, code: string): Promise<void> {
  const ok = await verifyTotpCode(userId, code);
  if (!ok) throw new AppError('Invalid code. 2FA was not disabled.', 400);
  await prisma.user.update({
    where: { id: userId },
    data: { totpEnabled: false, totpSecret: null, totpBackupCodes: [] },
  });
}
