/** POST /api/reviews request body */
export interface CreateReviewPayload {
  vendorId?: string;
  businessName?: string;
  instagramHandle?: string;
  phoneNumber?: string;
  bankAccountLast4?: string;
  rating: number;
  reviewText: string;
  transactionChannel?: string;
  orderDate?: string;
  /** Cloudflare Turnstile token — verified at the controller, not persisted. */
  turnstileToken?: string;
}

/** PUT /api/reviews/:id request body */
export interface UpdateReviewPayload {
  rating?: number;
  reviewText?: string;
}

/** Review as returned in API responses */
export interface ReviewResponse {
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
  user?: {
    displayName: string;
  };
}

/** Review returned by GET /api/reviews/me — includes vendor name */
export interface MyReviewResponse {
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

export type { PaginatedResponse } from './common.js';

/** POST /api/vendors/:id/report request body */
export interface CreateReportPayload {
  reason: string;
  description?: string;
}
