// Review service handling reviews, ratings, and reporting
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/AppError.js';
import { computeTrustScore } from '../utils/trustScore.js';
import { logger } from '../utils/logger.js';
import { normalizeInstagramHandle } from '../utils/normalizeInstagramHandle.js';
import { recordAuditLog } from '../utils/auditLog.js';
import { generateVendorSummary } from './ai.service.js';
import type { CreateReviewPayload, UpdateReviewPayload, ReviewResponse, CreateReportPayload } from '../types/review.js';
import type { Prisma } from '@prisma/client';

const EDIT_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours

/**
 * Create a new review for a vendor.
 *
 * - If vendorId is provided, uses it directly.
 * - If vendor identifiers are provided instead, looks up or auto-creates the vendor.
 * - After saving the review, recalculates the vendor's trust score.
 * - Triggers AI summary regeneration asynchronously.
 *
 * Source: agents/skills/vendor-search/SKILL.md — Vendor Auto-Creation
 */
export async function createReview(
  userId: string,
  payload: CreateReviewPayload,
): Promise<ReviewResponse> {
  const { rating, reviewText, transactionChannel, orderDate } = payload;

  // Determine vendor — either by ID or by identifier lookup/creation
  let vendorId = payload.vendorId;

  if (!vendorId) {
    vendorId = await findOrCreateVendor(payload);
  }

  // Create the review inside a transaction to prevent TOCTOU race conditions
  // (ownership check + insert are atomic — prevents self-review bypass via
  // vendor claiming their profile between the check and the insert)
  let review;
  try {
    review = await prisma.$transaction(async (tx) => {
      const vendor = await tx.vendor.findUnique({ where: { id: vendorId } });
      if (!vendor) {
        throw new AppError('Vendor not found', 404);
      }

      // Prevent self-reviewing — defense-in-depth (route layer also enforces this)
      if (vendor.ownerId === userId) {
        throw new AppError('You cannot review your own business', 403);
      }

      // Check if user already reviewed this vendor
      const existingReview = await tx.review.findUnique({
        where: { vendorId_userId: { vendorId, userId } },
      });
      if (existingReview) {
        throw new AppError('You have already reviewed this vendor', 409);
      }

      return tx.review.create({
        data: {
          vendorId,
          userId,
          rating,
          reviewText,
          transactionChannel: transactionChannel ?? null,
          orderDate: orderDate ? new Date(orderDate) : null,
        },
        include: {
          user: { select: { displayName: true } },
        },
      });
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('You have already reviewed this vendor', 409);
    }
    throw error;
  }

  // Update vendor review count and recalculate trust score atomically
  await prisma.$transaction(async (tx) => {
    await tx.vendor.update({
      where: { id: vendorId },
      data: { reviewCount: { increment: 1 } },
    });
    await recalculateTrustScore(vendorId, tx);
  });

  // Trigger AI summary regeneration asynchronously (fire and forget)
  generateVendorSummary(vendorId).catch((error: unknown) => {
    logger.error('AI summary generation failed', error);
  });

  return {
    id: review.id,
    vendorId: review.vendorId,
    userId: review.userId,
    rating: review.rating,
    reviewText: review.reviewText,
    transactionChannel: review.transactionChannel,
    orderDate: review.orderDate?.toISOString() ?? null,
    verifiedBuyer: review.verifiedBuyer,
    isFlagged: review.isFlagged,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
    user: { displayName: review.user.displayName },
  };
}

/**
 * Update an existing review.
 * Enforces 48-hour edit window and ownership check.
 * Does NOT re-trigger AI summary regeneration (only new submissions do).
 */
export async function updateReview(
  reviewId: string,
  userId: string,
  payload: UpdateReviewPayload,
): Promise<ReviewResponse> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: { user: { select: { displayName: true } } },
  });

  if (!review) {
    throw new AppError('Review not found', 404);
  }

  // Ownership check
  if (review.userId !== userId) {
    throw new AppError('You can only edit your own reviews', 403);
  }

  // 48-hour edit window enforcement
  const elapsed = Date.now() - review.createdAt.getTime();
  if (elapsed > EDIT_WINDOW_MS) {
    throw new AppError('Reviews can only be edited within 48 hours of submission', 403);
  }

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: {
      ...(payload.rating !== undefined && { rating: payload.rating }),
      ...(payload.reviewText !== undefined && { reviewText: payload.reviewText }),
    },
    include: { user: { select: { displayName: true } } },
  });

  // Recalculate trust score if rating changed
  if (payload.rating !== undefined) {
    await recalculateTrustScore(review.vendorId);
  }

  return {
    id: updated.id,
    vendorId: updated.vendorId,
    userId: updated.userId,
    rating: updated.rating,
    reviewText: updated.reviewText,
    transactionChannel: updated.transactionChannel,
    orderDate: updated.orderDate?.toISOString() ?? null,
    verifiedBuyer: updated.verifiedBuyer,
    isFlagged: updated.isFlagged,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    user: { displayName: updated.user.displayName },
  };
}

/**
 * Delete a review.
 * Recalculates trust score and updates AI summaries/flags if reviews drop below threshold.
 */
export async function deleteReview(
  reviewId: string,
  userId: string,
): Promise<{ message: string }> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new AppError('Review not found', 404);
  }

  // Ownership check
  if (review.userId !== userId) {
    throw new AppError('You can only delete your own reviews', 403);
  }

  // 48-hour edit/delete window enforcement
  const elapsed = Date.now() - review.createdAt.getTime();
  if (elapsed > EDIT_WINDOW_MS) {
    throw new AppError('Reviews can only be deleted within 48 hours of submission', 403);
  }

  // Delete the review
  await prisma.review.delete({
    where: { id: reviewId },
  });

  await recordAuditLog({
    actorId: userId,
    action: 'DELETE_REVIEW',
    targetType: 'Review',
    targetId: reviewId,
    metadata: { vendorId: review.vendorId },
  });

  // Decrement vendor's review count
  const vendor = await prisma.vendor.update({
    where: { id: review.vendorId },
    data: { reviewCount: { decrement: 1 } },
  });

  // Recalculate trust score
  await recalculateTrustScore(review.vendorId);

  // Handle threshold checks for AI summaries
  if (vendor.reviewCount < 3) {
    // Delete existing summary
    await prisma.vendorSummary.deleteMany({
      where: { vendorId: review.vendorId },
    });
    // Reset scam and moderation flags
    await prisma.vendor.update({
      where: { id: review.vendorId },
      data: { scamFlag: false, moderationFlag: false },
    });
  } else {
    // Regenerate AI summary asynchronously
    generateVendorSummary(review.vendorId).catch((error: unknown) => {
      logger.error('AI summary generation failed after review delete', error);
    });
  }

  return { message: 'Review deleted successfully' };
}


/**
 * Report a vendor.
 */
export async function reportVendor(
  vendorId: string,
  userId: string,
  payload: CreateReportPayload,
): Promise<{ message: string }> {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    throw new AppError('Vendor not found', 404);
  }

  const existingReport = await prisma.report.findFirst({
    where: { vendorId, userId },
  });
  if (existingReport) {
    throw new AppError('You have already submitted a report for this vendor', 409);
  }

  await prisma.report.create({
    data: {
      vendorId,
      userId,
      reason: payload.reason,
      description: payload.description ?? null,
    },
  });

  return { message: 'Report submitted successfully' };
}

/**
 * Find or auto-create a vendor based on provided identifiers.
 * Uses findFirst (not upsert) due to non-unique lookups on handle/phone.
 */
async function findOrCreateVendor(payload: CreateReviewPayload): Promise<string> {
  const { businessName, instagramHandle, phoneNumber, bankAccountLast4 } = payload;

  if (!businessName && !instagramHandle && !phoneNumber && !bankAccountLast4) {
    throw new AppError('At least one vendor identifier is required (vendorId, businessName, instagramHandle, phoneNumber, or bankAccountLast4)', 400);
  }

  // Truncate bank account to last 4 digits
  const bankLast4 = bankAccountLast4 ? bankAccountLast4.slice(-4) : undefined;
  // Normalise once — buyers sometimes paste a full profile URL instead of a
  // bare username; this keeps both the lookup and auto-create in sync with
  // however the handle was originally stored on the vendor record.
  const normalizedHandle = instagramHandle ? normalizeInstagramHandle(instagramHandle) : undefined;

  let existingVendor = null;

  // 1. Prioritize Instagram handle (unique identifier)
  if (normalizedHandle) {
    existingVendor = await prisma.vendor.findFirst({
      where: { instagramHandle: { equals: normalizedHandle, mode: 'insensitive' } },
    });
  }

  // 2. Next, check Phone number (unique identifier)
  if (!existingVendor && phoneNumber) {
    existingVendor = await prisma.vendor.findFirst({
      where: { phoneNumber },
    });
  }

  // 3. Next, check Business Name. If bankLast4 is also provided, match BOTH to be safe
  if (!existingVendor && businessName) {
    if (bankLast4) {
      existingVendor = await prisma.vendor.findFirst({
        where: {
          businessName: { equals: businessName, mode: 'insensitive' },
          bankAccountLast4: bankLast4,
        },
      });
    } else {
      existingVendor = await prisma.vendor.findFirst({
        where: { businessName: { equals: businessName, mode: 'insensitive' } },
      });
    }
  }

  // 4. Fallback: if only bankLast4 is provided, look up by it, but ensure other identifiers are null to prevent hijacking
  if (!existingVendor && bankLast4 && !businessName && !instagramHandle && !phoneNumber) {
    existingVendor = await prisma.vendor.findFirst({
      where: {
        bankAccountLast4: bankLast4,
        businessName: null,
        instagramHandle: null,
        phoneNumber: null,
      },
    });
  }

  if (existingVendor) {
    return existingVendor.id;
  }

  // Auto-create new vendor
  const newVendor = await prisma.vendor.create({
    data: {
      businessName: businessName ?? null,
      instagramHandle: normalizedHandle ?? null,
      phoneNumber: phoneNumber ?? null,
      bankAccountLast4: bankLast4 ?? null,
    },
  });

  return newVendor.id;
}

/**
 * Recalculate and update a vendor's trust score from all their reviews.
 * Pass a transaction client via `db` to run inside an existing transaction;
 * defaults to the global Prisma client otherwise.
 */
async function recalculateTrustScore(
  vendorId: string,
  db: Prisma.TransactionClient = prisma,
): Promise<void> {
  const reviews = await db.review.findMany({
    where: { vendorId },
    select: { rating: true, verifiedBuyer: true, createdAt: true },
  });

  const { score, label } = computeTrustScore(reviews);

  await db.vendor.update({
    where: { id: vendorId },
    data: { trustScore: score, trustLabel: label },
  });
}

/**
 * Get reviews written by a specific user, with vendor info.
 */
export interface MyReview {
  id: string;
  vendorId: string;
  userId: string;
  rating: number;
  reviewText: string;
  transactionChannel: string | null;
  orderDate: string | null;
  verifiedBuyer: boolean;
  isFlagged: boolean;
  createdAt: string;
  updatedAt: string;
  vendor: {
    businessName: string | null;
  };
}

export async function getMyReviews(
  userId: string,
  page: number,
  limit: number,
  filters?: {
    search?: string;
    rating?: string;
    channel?: string;
    sortBy?: string;
  }
): Promise<{ reviews: MyReview[]; total: number; totalPages: number }> {
  const skip = (page - 1) * limit;

  const where: Prisma.ReviewWhereInput = { userId };

  if (filters?.search) {
    const s = filters.search.trim();
    if (s) {
      where.OR = [
        { reviewText: { contains: s, mode: 'insensitive' } },
        { vendor: { businessName: { contains: s, mode: 'insensitive' } } },
      ];
    }
  }

  if (filters?.rating) {
    const r = parseInt(filters.rating, 10);
    if (!isNaN(r)) {
      where.rating = r;
    }
  }

  if (filters?.channel) {
    const c = filters.channel.trim();
    if (c) {
      where.transactionChannel = { equals: c, mode: 'insensitive' };
    }
  }

  let orderBy: Prisma.ReviewOrderByWithRelationInput = { createdAt: 'desc' };
  if (filters?.sortBy === 'asc') {
    orderBy = { createdAt: 'asc' };
  } else if (filters?.sortBy === 'desc') {
    orderBy = { createdAt: 'desc' };
  }

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        vendor: { select: { businessName: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);

  const mapped: MyReview[] = reviews.map((r) => ({
    id: r.id,
    vendorId: r.vendorId,
    userId: r.userId,
    rating: r.rating,
    reviewText: r.reviewText,
    transactionChannel: r.transactionChannel,
    orderDate: r.orderDate?.toISOString() ?? null,
    verifiedBuyer: r.verifiedBuyer,
    isFlagged: r.isFlagged,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    vendor: { businessName: r.vendor.businessName },
  }));

  return {
    reviews: mapped,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
