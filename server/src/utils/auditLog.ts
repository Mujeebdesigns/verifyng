import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { logger } from './logger.js';

/**
 * Record a sensitive admin action (ban, promote, delete, claim decisions, etc.)
 * so a compromised or malicious admin credential leaves a trace.
 *
 * Never blocks or fails the calling action — logging failures are swallowed
 * and reported, since an audit-log write hiccup must not stop a legitimate
 * admin operation from completing.
 */
export async function recordAuditLog(params: {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    logger.error('Failed to record audit log', error);
  }
}
