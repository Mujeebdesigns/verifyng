import type { Vendor, ClaimStatus } from '@prisma/client';
import type { VendorSearchResult, VendorDetail } from '../types/vendor.js';

export function toVendorSearchResult(vendor: Pick<
  Vendor,
  | 'id'
  | 'businessName'
  | 'instagramHandle'
  | 'phoneNumber'
  | 'bankAccountLast4'
  | 'trustScore'
  | 'trustLabel'
  | 'reviewCount'
  | 'scamFlag'
  | 'moderationFlag'
  | 'state'
  | 'category'
  | 'claimStatus'
  | 'featured'
  | 'description'
  | 'coverImage'
  | 'logoImage'
>): VendorSearchResult {
  return {
    id: vendor.id,
    businessName: vendor.businessName,
    instagramHandle: vendor.instagramHandle,
    phoneNumber: vendor.phoneNumber,
    bankAccountLast4: vendor.bankAccountLast4,
    trustScore: vendor.trustScore,
    trustLabel: vendor.trustLabel,
    reviewCount: vendor.reviewCount,
    scamFlag: vendor.scamFlag,
    moderationFlag: vendor.moderationFlag,
    state: vendor.state,
    category: vendor.category,
    claimStatus: vendor.claimStatus as ClaimStatus,
    featured: vendor.featured,
    description: vendor.description,
    coverImage: vendor.coverImage,
    logoImage: vendor.logoImage,
  };
}

export function toVendorDetail(vendor: Vendor, viewerUserId: string | null = null): VendorDetail {
  return {
    id: vendor.id,
    businessName: vendor.businessName,
    instagramHandle: vendor.instagramHandle,
    phoneNumber: vendor.phoneNumber,
    bankAccountLast4: vendor.bankAccountLast4,
    // Never expose the raw ownerId on the public endpoint — only whether
    // the current viewer is the owner.
    isOwnedByViewer: viewerUserId !== null && vendor.ownerId === viewerUserId,
    claimStatus: vendor.claimStatus,
    claimedAt: vendor.claimedAt?.toISOString() ?? null,
    state: vendor.state,
    city: vendor.city,
    category: vendor.category,
    description: vendor.description,
    whatsappUrl: vendor.whatsappUrl,
    tiktokUrl: vendor.tiktokUrl,
    facebookUrl: vendor.facebookUrl,
    linkedinUrl: vendor.linkedinUrl,
    featured: vendor.featured,
    trustScore: vendor.trustScore,
    trustLabel: vendor.trustLabel,
    reviewCount: vendor.reviewCount,
    profileViews: vendor.profileViews,
    scamFlag: vendor.scamFlag,
    moderationFlag: vendor.moderationFlag,
    coverImage: vendor.coverImage,
    logoImage: vendor.logoImage,
    createdAt: vendor.createdAt.toISOString(),
    updatedAt: vendor.updatedAt.toISOString(),
  };
}
