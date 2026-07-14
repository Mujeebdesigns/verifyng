import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/AppError.js';
import { recordAuditLog } from '../utils/auditLog.js';

function maskEmail(email: string): string {
  const atIdx = email.indexOf('@');
  if (atIdx <= 1) return email;
  const local = email.slice(0, atIdx);
  const domain = email.slice(atIdx);
  const visible = Math.max(1, Math.min(2, local.length - 2));
  return local.slice(0, visible) + '***' + domain;
}

/**
 * Fetch analytics and counts dashboard stats.
 */
export async function getStats() {
  const [
    totalUsers,
    totalVendors,
    totalReviews,
    pendingReports,
    pendingClaims,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.vendor.count(),
    prisma.review.count(),
    prisma.report.count({ where: { status: 'PENDING' } }),
    prisma.vendor.count({ where: { claimStatus: 'PENDING_APPROVAL' } }),
  ]);

  const flaggedReviews = await prisma.review.count({ where: { isFlagged: true } });

  const recentSignups = await prisma.user.count({
    where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
  });

  return {
    totalUsers,
    totalVendors,
    totalReviews,
    pendingClaims,
    pendingReports,
    flaggedReviews,
    recentSignups,
    recentSignupsPeriod: 'last 7 days',
  };
}

/**
 * List pending vendor claims with pagination.
 */
export async function getClaims(page: number, limit: number) {
  const skip = (page - 1) * limit;

  const [claims, total] = await prisma.$transaction([
    prisma.vendor.findMany({
      where: { claimStatus: 'PENDING_APPROVAL' },
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        owner: {
          select: { id: true, email: true, displayName: true },
        },
      },
    }),
    prisma.vendor.count({ where: { claimStatus: 'PENDING_APPROVAL' } }),
  ]);

  return {
    data: claims.map((claim) => ({
      id: claim.id,
      businessName: claim.businessName,
      instagramHandle: claim.instagramHandle,
      phoneNumber: claim.phoneNumber,
      claimStatus: claim.claimStatus,
      state: claim.state,
      category: claim.category,
      updatedAt: claim.updatedAt.toISOString(),
      owner: claim.owner
        ? {
            id: claim.owner.id,
            email: maskEmail(claim.owner.email),
            displayName: claim.owner.displayName,
          }
        : null,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Approve a pending vendor claim.
 */
export async function approveClaim(vendorId: string, actorId: string) {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    throw new AppError('Vendor not found', 404);
  }
  if (vendor.claimStatus !== 'PENDING_APPROVAL') {
    throw new AppError('Vendor claim is not pending approval', 400);
  }

  const result = await prisma.vendor.update({
    where: { id: vendorId },
    data: {
      claimStatus: 'CLAIMED',
      claimedAt: new Date(),
    },
  });

  await recordAuditLog({ actorId, action: 'APPROVE_CLAIM', targetType: 'Vendor', targetId: vendorId });

  return result;
}

/**
 * Reject a pending vendor claim.
 */
export async function rejectClaim(vendorId: string, actorId: string) {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    throw new AppError('Vendor not found', 404);
  }
  if (vendor.claimStatus !== 'PENDING_APPROVAL') {
    throw new AppError('Vendor claim is not pending approval', 400);
  }

  const result = await prisma.vendor.update({
    where: { id: vendorId },
    data: {
      claimStatus: 'UNCLAIMED',
      ownerId: null,
      claimedAt: null,
    },
  });

  await recordAuditLog({ actorId, action: 'REJECT_CLAIM', targetType: 'Vendor', targetId: vendorId });

  return result;
}

/**
 * List pending moderation reports.
 */
export async function getReports(page: number, limit: number) {
  const skip = (page - 1) * limit;

  const [reports, total] = await prisma.$transaction([
    prisma.report.findMany({
      where: { status: 'PENDING' },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        vendor: {
          select: { id: true, businessName: true, instagramHandle: true },
        },
        user: {
          select: { id: true, email: true, displayName: true },
        },
      },
    }),
    prisma.report.count({ where: { status: 'PENDING' } }),
  ]);

  return {
    data: reports.map((report) => ({
      id: report.id,
      vendorId: report.vendorId,
      userId: report.userId,
      reason: report.reason,
      description: report.description,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
      vendor: {
        id: report.vendor.id,
        businessName: report.vendor.businessName,
        instagramHandle: report.vendor.instagramHandle,
      },
      user: {
        id: report.user.id,
        email: maskEmail(report.user.email),
        displayName: report.user.displayName,
      },
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Resolve a moderation report.
 */
export async function resolveReport(reportId: string, status: 'REVIEWED' | 'DISMISSED') {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) {
    throw new AppError('Report not found', 404);
  }

  return prisma.report.update({
    where: { id: reportId },
    data: { status },
  });
}

/**
 * Toggle the featured flag on a vendor profile.
 */
export async function toggleFeatured(vendorId: string) {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    throw new AppError('Vendor not found', 404);
  }

  return prisma.vendor.update({
    where: { id: vendorId },
    data: { featured: !vendor.featured },
  });
}

/**
 * List all users.
 */
export async function getUsers(page: number, limit: number) {
  const skip = (page - 1) * limit;

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isVerified: true,
        isBanned: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.user.count(),
  ]);

  return {
    data: users.map((user) => ({
      id: user.id,
      email: maskEmail(user.email),
      displayName: user.displayName,
      role: user.role,
      isVerified: user.isVerified,
      isBanned: user.isBanned,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Ban a user.
 * Sets the dedicated isBanned flag and bumps tokenVersion so all of the
 * user's existing sessions are invalidated immediately. Does NOT touch
 * isVerified — a ban is independent of email verification, and cannot be
 * lifted via the password-reset flow.
 */
export async function banUser(userId: string, actorId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const result = await prisma.user.update({
    where: { id: userId },
    data: {
      isBanned: true,
      tokenVersion: { increment: 1 },
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      isVerified: true,
      isBanned: true,
    },
  }).then((u) => ({ ...u, email: maskEmail(u.email) }));

  await recordAuditLog({ actorId, action: 'BAN_USER', targetType: 'User', targetId: userId });

  return result;
}

/**
 * Lift a ban on a user.
 */
export async function unbanUser(userId: string, actorId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const result = await prisma.user.update({
    where: { id: userId },
    data: { isBanned: false },
    select: {
      id: true,
      email: true,
      displayName: true,
      isVerified: true,
      isBanned: true,
    },
  }).then((u) => ({ ...u, email: maskEmail(u.email) }));

  await recordAuditLog({ actorId, action: 'UNBAN_USER', targetType: 'User', targetId: userId });

  return result;
}

/**
 * Cascade delete user, reviews, and reports.
 */
export async function deleteUser(userId: string, actorId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Clear vendor ownership links before deletion to satisfy constraints and maintain state
  await prisma.vendor.updateMany({
    where: { ownerId: userId },
    data: {
      ownerId: null,
      claimStatus: 'UNCLAIMED',
      claimedAt: null,
    },
  });

  // Prisma will automatically cascade-delete reviews, reports, and verification tokens
  await prisma.user.delete({
    where: { id: userId },
  });

  // Logged with metadata (not a targetId FK) since the user row no longer exists
  await recordAuditLog({
    actorId,
    action: 'DELETE_USER',
    targetType: 'User',
    targetId: userId,
    metadata: { email: maskEmail(user.email), displayName: user.displayName },
  });

  return { message: 'User deleted successfully' };
}

/**
 * Promote user to ADMIN role.
 */
export async function promoteUser(userId: string, actorId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const result = await prisma.user.update({
    where: { id: userId },
    data: { role: 'ADMIN' },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
    },
  }).then((u) => ({ ...u, email: maskEmail(u.email) }));

  await recordAuditLog({
    actorId,
    action: 'PROMOTE_USER',
    targetType: 'User',
    targetId: userId,
    metadata: { previousRole: user.role },
  });

  return result;
}

/**
 * List flagged reviews for moderation.
 */
export async function getFlaggedReviews(page: number, limit: number) {
  const skip = (page - 1) * limit;

  const [reviews, total] = await prisma.$transaction([
    prisma.review.findMany({
      where: { isFlagged: true },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        vendor: {
          select: { id: true, businessName: true },
        },
        user: {
          select: { id: true, displayName: true },
        },
      },
    }),
    prisma.review.count({ where: { isFlagged: true } }),
  ]);

  return {
    data: reviews.map((review) => ({
      id: review.id,
      vendorId: review.vendorId,
      userId: review.userId,
      rating: review.rating,
      reviewText: review.reviewText,
      verifiedBuyer: review.verifiedBuyer,
      isFlagged: review.isFlagged,
      createdAt: review.createdAt.toISOString(),
      vendor: {
        id: review.vendor.id,
        businessName: review.vendor.businessName,
      },
      user: {
        id: review.user.id,
        displayName: review.user.displayName,
      },
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
