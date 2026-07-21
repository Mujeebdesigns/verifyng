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
  turnstileToken?: string;
}

/** PUT /api/reviews/:id request body */
export interface UpdateReviewPayload {
  rating?: number;
  reviewText?: string;
}

/** PUT /api/reviews/:id/reply request body */
export interface ReplyToReviewPayload {
  replyText: string;
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
  vendorReplyText: string | null;
  vendorRepliedAt: string | null;
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
  vendorReplyText: string | null;
  vendorRepliedAt: string | null;
  createdAt: string;
  updatedAt: string;
  vendor: {
    businessName: string | null;
  };
}

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

/** POST /api/vendors/:id/report request body */
export interface CreateReportPayload {
  reason: string;
  description?: string;
}
