/** Trust score label derived from the numeric score range */
export type TrustLabel =
  | 'Highly Trusted'
  | 'Mostly Reliable'
  | 'Proceed with Caution'
  | 'Poor Track Record'
  | 'High Risk';

export type ClaimStatus = 'UNCLAIMED' | 'PENDING_APPROVAL' | 'CLAIMED';

/** Vendor data returned in search and directory results */
export interface VendorSearchResult {
  id: string;
  businessName: string | null;
  instagramHandle: string | null;
  phoneNumber: string | null;
  trustScore: number;
  trustLabel: string;
  reviewCount: number;
  scamFlag: boolean;
  moderationFlag: boolean;
  state: string | null;
  city: string | null;
  category: string | null;
  claimStatus: ClaimStatus;
  featured: boolean;
  description: string | null;
  coverImage: string | null;
  logoImage: string | null;
}

/** Full vendor detail for the profile page */
export interface VendorDetail {
  id: string;
  businessName: string | null;
  instagramHandle: string | null;
  phoneNumber: string | null;
  /** Whether the requesting user owns this vendor profile (false for anonymous viewers). */
  isOwnedByViewer: boolean;
  claimStatus: ClaimStatus;
  claimedAt: string | null;
  state: string | null;
  city: string | null;
  category: string | null;
  description: string | null;
  whatsappUrl: string | null;
  tiktokUrl: string | null;
  facebookUrl: string | null;
  linkedinUrl: string | null;
  featured: boolean;
  trustScore: number;
  trustLabel: string;
  reviewCount: number;
  profileViews: number;
  scamFlag: boolean;
  moderationFlag: boolean;
  coverImage: string | null;
  logoImage: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Payload for creating a new vendor profile */
export interface CreateVendorPayload {
  businessName: string;
  category: string;
  state: string;
  city: string;
  description: string;
  instagramHandle?: string;
  phoneNumber?: string;
  whatsappUrl?: string;
  tiktokUrl?: string;
  facebookUrl?: string;
  linkedinUrl?: string;
  coverImage?: string;
  logoImage?: string;
}

/** Payload for updating an existing vendor profile */
export interface UpdateVendorPayload {
  description?: string;
  category?: string;
  state?: string;
  city?: string;
  instagramHandle?: string;
  whatsappUrl?: string;
  tiktokUrl?: string;
  facebookUrl?: string;
  linkedinUrl?: string;
  coverImage?: string;
  logoImage?: string;
}

/** Vendor AI summary response */
export interface VendorSummaryResponse {
  id: string;
  vendorId: string;
  summaryText: string;
  deliveryReliability: string | null;
  customerSatisfaction: string | null;
  recurringComplaints: string | null;
  trustPatterns: string | null;
  scamReason: string | null;
  generatedAt: string;
  reviewCountAtGeneration: number;
}

/** AI summary status response — returned by GET /api/vendors/:id/summary */
export type VendorSummaryApiResponse =
  | { status: 'ready'; data: VendorSummaryResponse }
  | { status: 'insufficient_data' }
  | { status: 'generating' }
  | { status: 'unavailable' };

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
