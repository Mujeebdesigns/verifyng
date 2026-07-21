import { prisma } from '../utils/prisma.js';
import { normaliseSearchQuery } from '../utils/normaliseSearchQuery.js';
import { normalizeInstagramHandle } from '../utils/normalizeInstagramHandle.js';
import { AppError } from '../utils/AppError.js';
import { env } from '../utils/env.js';
import { toVendorSearchResult, toVendorDetail } from '../utils/vendorMapper.js';
import type { ClaimStatus, Prisma } from '@prisma/client';
import type {
  VendorSearchResult,
  VendorDetail,
  VendorSummaryApiResponse,
  PaginatedResponse,
  CreateVendorPayload,
  UpdateVendorPayload,
} from '../types/vendor.js';
import type { ReviewResponse } from '../types/review.js';

/**
 * Search vendors by business name, Instagram handle, phone number, or bank account last 4.
 * Uses parameterized ILIKE queries for flexible matching.
 *
 * Source: agents/skills/vendor-search/SKILL.md
 */
export async function search(
  rawQuery: string,
  page: number,
  limit: number,
): Promise<PaginatedResponse<VendorSearchResult>> {
  const query = normaliseSearchQuery(rawQuery);

  if (query.length < 2) {
    throw new AppError('Search query must be at least 2 characters', 400);
  }

  const skip = (page - 1) * limit;
  // Escape LIKE wildcards so user input can't inject % / _ patterns
  // (parameterization already prevents SQLi; this prevents wildcard abuse)
  const escaped = query.replace(/[\\%_]/g, (c) => `\\${c}`);
  const searchPattern = `%${escaped}%`;

  // Use parameterized raw query for ILIKE across multiple fields
  const vendors = await prisma.$queryRaw<VendorSearchResult[]>`
    SELECT id, "businessName", "instagramHandle", "phoneNumber", "bankAccountLast4",
           "trustScore", "trustLabel", "reviewCount", "scamFlag", "moderationFlag",
           "state", "category", "claimStatus", "featured", "description", "coverImage", "logoImage"
    FROM "Vendor"
    WHERE LOWER("businessName") LIKE LOWER(${searchPattern})
       OR LOWER("instagramHandle") LIKE LOWER(${searchPattern})
       OR "phoneNumber" LIKE ${searchPattern}
       OR "bankAccountLast4" LIKE ${searchPattern}
    ORDER BY "reviewCount" DESC, "trustScore" DESC
    LIMIT ${limit}
    OFFSET ${skip}
  `;

  const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count
    FROM "Vendor"
    WHERE LOWER("businessName") LIKE LOWER(${searchPattern})
       OR LOWER("instagramHandle") LIKE LOWER(${searchPattern})
       OR "phoneNumber" LIKE ${searchPattern}
       OR "bankAccountLast4" LIKE ${searchPattern}
  `;

  const total = Number(countResult[0].count);

  return {
    data: vendors,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get vendor details by ID.
 * viewerUserId (from optional auth) is only used to compute isOwnedByViewer.
 */
export async function getById(id: string, viewerUserId: string | null = null): Promise<VendorDetail> {
  const vendor = await prisma.vendor.findUnique({
    where: { id },
  });

  if (!vendor) {
    throw new AppError('Vendor not found', 404);
  }

  return toVendorDetail(vendor, viewerUserId);
}

/**
 * Get vendor reviews with pagination.
 */
export async function getReviews(
  vendorId: string,
  page: number,
  limit: number,
): Promise<PaginatedResponse<ReviewResponse>> {
  // Verify vendor exists
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    throw new AppError('Vendor not found', 404);
  }

  const skip = (page - 1) * limit;

  const [reviews, total] = await prisma.$transaction([
    prisma.review.findMany({
      where: { vendorId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { displayName: true },
        },
      },
    }),
    prisma.review.count({ where: { vendorId } }),
  ]);

  return {
    data: reviews.map((review) => ({
      id: review.id,
      vendorId: review.vendorId,
      userId: review.userId,
      rating: review.rating,
      reviewText: review.reviewText,
      transactionChannel: review.transactionChannel,
      orderDate: review.orderDate?.toISOString() ?? null,
      verifiedBuyer: review.verifiedBuyer,
      isFlagged: review.isFlagged,
      vendorReplyText: review.vendorReplyText,
      vendorRepliedAt: review.vendorRepliedAt?.toISOString() ?? null,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
      user: { displayName: review.user.displayName },
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
 * Get the AI-generated summary for a vendor.
 * This reads from the VendorSummary table — it does NOT call the AI service.
 */
export async function getVendorSummary(vendorId: string): Promise<VendorSummaryApiResponse> {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    throw new AppError('Vendor not found', 404);
  }

  if (vendor.reviewCount < 3) {
    return { status: 'insufficient_data' };
  }

  const summary = await prisma.vendorSummary.findUnique({
    where: { vendorId },
  });

  if (!summary) {
    if (vendor.reviewCount >= 3) {
      return { status: 'generating' };
    }
    return { status: 'insufficient_data' };
  }

  return {
    status: 'ready',
    data: {
      id: summary.id,
      vendorId: summary.vendorId,
      summaryText: summary.summaryText ?? '',
      deliveryReliability: summary.deliveryReliability,
      customerSatisfaction: summary.customerSatisfaction,
      recurringComplaints: Array.isArray(summary.recurringComplaints)
        ? (summary.recurringComplaints as string[]).join('; ')
        : null,
      trustPatterns: summary.trustPatterns,
      scamReason: summary.scamReason,
      generatedAt: summary.generatedAt.toISOString(),
      reviewCountAtGeneration: summary.reviewCountAtGeneration,
    },
  };
}

/** Platform slugs accepted by the directory filter, mapped to their vendor field. */
export const PLATFORM_FIELDS = {
  instagram: 'instagramHandle',
  whatsapp: 'whatsappUrl',
  tiktok: 'tiktokUrl',
  facebook: 'facebookUrl',
} as const;

export type PlatformSlug = keyof typeof PLATFORM_FIELDS;

interface DirectoryParams {
  category?: string;
  state?: string;
  claimStatus?: string;
  trustScoreMin?: number;
  trustScoreMax?: number;
  platforms?: PlatformSlug[];
  sort?: string;
  page: number;
  limit: number;
}

const SORT_OPTIONS: Record<string, Prisma.VendorOrderByWithRelationInput[]> = {
  featured_desc: [{ featured: 'desc' }, { reviewCount: 'desc' }, { trustScore: 'desc' }],
  trustScore_desc: [{ trustScore: 'desc' }, { reviewCount: 'desc' }],
  trustScore_asc: [{ trustScore: 'asc' }, { reviewCount: 'desc' }],
  reviewCount_desc: [{ reviewCount: 'desc' }, { trustScore: 'desc' }],
  newest: [{ createdAt: 'desc' }],
  oldest: [{ createdAt: 'asc' }],
};

/**
 * List vendors in directory with filters and sorting
 */
export async function listDirectory(params: DirectoryParams): Promise<PaginatedResponse<VendorSearchResult>> {
  const { category, state, claimStatus, trustScoreMin, trustScoreMax, platforms, sort, page, limit } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.VendorWhereInput = {};
  if (category) where.category = category;
  if (state) where.state = state;
  if (claimStatus) where.claimStatus = claimStatus as ClaimStatus;
  if (trustScoreMin !== undefined || trustScoreMax !== undefined) {
    where.trustScore = {
      ...(trustScoreMin !== undefined ? { gte: trustScoreMin } : {}),
      ...(trustScoreMax !== undefined ? { lte: trustScoreMax } : {}),
    };
  }
  // Platform filter: vendor must be present on at least one selected platform
  if (platforms && platforms.length > 0) {
    where.OR = platforms.map((slug) => ({
      [PLATFORM_FIELDS[slug]]: { not: null },
    }));
  }

  const orderBy = SORT_OPTIONS[sort ?? 'featured_desc'] ?? SORT_OPTIONS.featured_desc;

  const [vendors, total] = await prisma.$transaction([
    prisma.vendor.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.vendor.count({ where }),
  ]);

  return {
    data: vendors.map(toVendorSearchResult),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/** Fields returned for featured-vendor cards (matches VendorSearchResult). */
const FEATURED_VENDOR_SELECT = {
  id: true,
  businessName: true,
  category: true,
  state: true,
  trustScore: true,
  trustLabel: true,
  reviewCount: true,
  instagramHandle: true,
  phoneNumber: true,
  bankAccountLast4: true,
  scamFlag: true,
  moderationFlag: true,
  claimStatus: true,
  featured: true,
  description: true,
  coverImage: true,
  logoImage: true,
} satisfies Prisma.VendorSelect;

/**
 * Fetch top featured vendors.
 * Falls back to highest-rated vendors when no vendors are flagged as featured
 * (e.g., after DB reset or fresh deployment).
 */
export async function getFeaturedVendors() {
  const featured = await prisma.vendor.findMany({
    where: { featured: true },
    orderBy: { trustScore: 'desc' },
    take: env.FEATURED_VENDOR_COUNT,
    select: FEATURED_VENDOR_SELECT,
  });

  if (featured.length > 0) return featured;

  return prisma.vendor.findMany({
    where: { trustScore: { gt: 0 } },
    orderBy: { trustScore: 'desc' },
    take: env.FEATURED_VENDOR_COUNT,
    select: FEATURED_VENDOR_SELECT,
  });
}

/**
 * Onboard a new vendor from scratch
 */
export async function createVendorProfile(userId: string, payload: CreateVendorPayload) {
  const existing = await prisma.vendor.findFirst({ where: { ownerId: userId } });
  if (existing) {
    throw new AppError('You already have a vendor profile', 409);
  }

  const bankLast4 = payload.bankAccountLast4
    ? payload.bankAccountLast4.replace(/[^0-9]/g, '').slice(-4)
    : null;

  return prisma.vendor.create({
    data: {
      businessName: payload.businessName,
      category: payload.category,
      state: payload.state,
      city: payload.city,
      description: payload.description,
      instagramHandle: payload.instagramHandle ? normalizeInstagramHandle(payload.instagramHandle) : null,
      phoneNumber: payload.phoneNumber ?? null,
      whatsappUrl: payload.whatsappUrl ?? null,
      tiktokUrl: payload.tiktokUrl ?? null,
      facebookUrl: payload.facebookUrl ?? null,
      linkedinUrl: payload.linkedinUrl ?? null,
      coverImage: payload.coverImage ?? null,
      logoImage: payload.logoImage ?? null,
      bankAccountLast4: bankLast4,
      ownerId: userId,
      claimStatus: 'PENDING_APPROVAL',
    },
  });
}

/**
 * Claim an unclaimed vendor profile
 */
export async function claimProfile(vendorId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const vendor = await tx.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) {
      throw new AppError('Vendor profile not found', 404);
    }
    if (vendor.ownerId) {
      throw new AppError('This vendor has already been claimed', 409);
    }

    const userVendor = await tx.vendor.findFirst({ where: { ownerId: userId } });
    if (userVendor) {
      throw new AppError('You already own a vendor profile', 400);
    }

    return tx.vendor.update({
      where: { id: vendorId },
      data: {
        ownerId: userId,
        claimStatus: 'PENDING_APPROVAL',
      },
    });
  });
}

const ALLOWED_UPDATE_FIELDS = [
  'description',
  'category',
  'state',
  'city',
  'instagramHandle',
  'whatsappUrl',
  'tiktokUrl',
  'facebookUrl',
  'linkedinUrl',
  'coverImage',
  'logoImage',
] as const;

/**
 * Update vendor profile details.
 * Only allowlisted fields may be updated — prevents mass assignment of
 * trustScore, scamFlag, featured, claimStatus, etc.
 */
export async function updateVendorProfile(vendorId: string, userId: string, payload: UpdateVendorPayload) {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    throw new AppError('Vendor profile not found', 404);
  }
  if (vendor.ownerId !== userId) {
    throw new AppError('Forbidden: You do not own this vendor profile', 403);
  }

  const filtered: Record<string, unknown> = {};
  for (const key of ALLOWED_UPDATE_FIELDS) {
    if (key in payload) {
      filtered[key] = (payload as Record<string, unknown>)[key];
    }
  }
  if (typeof filtered.instagramHandle === 'string' && filtered.instagramHandle) {
    filtered.instagramHandle = normalizeInstagramHandle(filtered.instagramHandle);
  }

  return prisma.vendor.update({
    where: { id: vendorId },
    data: filtered,
  });
}

/**
 * Get vendor profile by owner (user) ID
 */
export async function getByOwnerId(ownerId: string) {
  const vendor = await prisma.vendor.findFirst({
    where: { ownerId },
  });
  if (!vendor) {
    throw new AppError('Vendor profile not found', 404);
  }
  return vendor;
}

