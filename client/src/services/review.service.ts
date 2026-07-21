import { api } from './api.js';
import type {
  CreateReviewPayload,
  UpdateReviewPayload,
  ReplyToReviewPayload,
  ReviewResponse,
  CreateReportPayload,
  MyReviewResponse,
  PaginatedResponse,
} from '../types/review.js';

export const reviewService = {
  /**
   * Get the authenticated user's own reviews.
   */
  async getMyReviews(
    page = 1,
    limit = 10,
    filters?: {
      search?: string;
      rating?: string;
      channel?: string;
      sortBy?: string;
    }
  ): Promise<PaginatedResponse<MyReviewResponse>> {
    let url = `/reviews/me?page=${page}&limit=${limit}`;
    if (filters) {
      if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`;
      if (filters.rating) url += `&rating=${encodeURIComponent(filters.rating)}`;
      if (filters.channel) url += `&channel=${encodeURIComponent(filters.channel)}`;
      if (filters.sortBy) url += `&sortBy=${encodeURIComponent(filters.sortBy)}`;
    }
    return api.get<PaginatedResponse<MyReviewResponse>>(url);
  },

  /**
   * Submit a new review for a vendor.
   * Auto-creates the vendor if identifiers are provided and vendorId is omitted.
   */
  async createReview(payload: CreateReviewPayload): Promise<ReviewResponse> {
    return api.post<ReviewResponse>('/reviews', payload);
  },

  /**
   * Update an existing review within the 48-hour window.
   */
  async updateReview(
    reviewId: string,
    payload: UpdateReviewPayload
  ): Promise<ReviewResponse> {
    return api.put<ReviewResponse>(`/reviews/${reviewId}`, payload);
  },

  /**
   * Attach or update the vendor's reply to a review on their own profile.
   */
  async replyToReview(
    reviewId: string,
    payload: ReplyToReviewPayload
  ): Promise<ReviewResponse> {
    return api.put<ReviewResponse>(`/reviews/${reviewId}/reply`, payload);
  },

  /**
   * Report a vendor for moderation or scam behaviour.
   */
  async reportVendor(
    vendorId: string,
    payload: CreateReportPayload
  ): Promise<{ message: string }> {
    return api.post<{ message: string }>(`/vendors/${vendorId}/report`, payload);
  },

  /**
   * Delete an existing review.
   */
  async deleteReview(reviewId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/reviews/${reviewId}`);
  },
};
