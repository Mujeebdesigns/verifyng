import { api } from './api.js';
import type { PaginatedResponse, VendorDetail } from '../types/vendor.js';
import type { UserProfile } from '../types/auth.js';
import type { ReviewResponse } from '../types/review.js';

export interface AdminStats {
  usersCount: number;
  vendorsCount: number;
  reviewsCount: number;
  pendingReportsCount: number;
  pendingClaimsCount: number;
}

export interface AdminClaim {
  id: string;
  businessName: string | null;
  instagramHandle: string | null;
  phoneNumber: string | null;
  claimStatus: string;
  state: string | null;
  category: string | null;
  updatedAt: string;
  owner: {
    id: string;
    email: string;
    displayName: string;
  } | null;
}

export interface AdminReport {
  id: string;
  vendorId: string;
  userId: string;
  reason: string;
  description: string | null;
  status: string;
  createdAt: string;
  vendor: {
    id: string;
    businessName: string | null;
    instagramHandle: string | null;
  };
  user: {
    id: string;
    email: string;
    displayName: string;
  };
}

/** User row in the admin users table — includes moderation state. */
export interface AdminUser extends UserProfile {
  isBanned: boolean;
}

export interface FlaggedReviewResponse extends ReviewResponse {
  vendor: {
    id: string;
    businessName: string | null;
  };
  user: {
    id: string;
    displayName: string;
  };
}

export const adminService = {
  /**
   * Get administrative metrics.
   */
  async getStats(): Promise<AdminStats> {
    return api.get<AdminStats>('/admin/stats');
  },

  /**
   * Get pending vendor claims.
   */
  async getClaims(page = 1, limit = 10): Promise<PaginatedResponse<AdminClaim>> {
    return api.get<PaginatedResponse<AdminClaim>>(`/admin/claims?page=${page}&limit=${limit}`);
  },

  /**
   * Approve a vendor claim.
   */
  async approveClaim(vendorId: string): Promise<{ message: string; vendor: VendorDetail }> {
    return api.post<{ message: string; vendor: VendorDetail }>(`/admin/claims/${vendorId}/approve`, {});
  },

  /**
   * Reject a vendor claim.
   */
  async rejectClaim(vendorId: string): Promise<{ message: string; vendor: VendorDetail }> {
    return api.post<{ message: string; vendor: VendorDetail }>(`/admin/claims/${vendorId}/reject`, {});
  },

  /**
   * Get pending reports.
   */
  async getReports(page = 1, limit = 10): Promise<PaginatedResponse<AdminReport>> {
    return api.get<PaginatedResponse<AdminReport>>(`/admin/reports?page=${page}&limit=${limit}`);
  },

  /**
   * Resolve a report.
   */
  async resolveReport(reportId: string, status: 'REVIEWED' | 'DISMISSED'): Promise<{ message: string; report: AdminReport }> {
    return api.put<{ message: string; report: AdminReport }>(`/admin/reports/${reportId}/resolve`, { status });
  },

  /**
   * Toggle featured status of a vendor.
   */
  async toggleFeatured(vendorId: string): Promise<{ message: string; vendor: VendorDetail }> {
    return api.put<{ message: string; vendor: VendorDetail }>(`/admin/vendors/${vendorId}/feature`, {});
  },

  /**
   * List all users.
   */
  async getUsers(page = 1, limit = 10): Promise<PaginatedResponse<AdminUser>> {
    return api.get<PaginatedResponse<AdminUser>>(`/admin/users?page=${page}&limit=${limit}`);
  },

  /**
   * Ban a user (kills their active sessions).
   */
  async banUser(userId: string): Promise<{ message: string; user: { id: string; email: string; displayName: string; isVerified: boolean; isBanned: boolean } }> {
    return api.put<{ message: string; user: { id: string; email: string; displayName: string; isVerified: boolean; isBanned: boolean } }>(`/admin/users/${userId}/ban`, {});
  },

  /**
   * Lift a ban on a user.
   */
  async unbanUser(userId: string): Promise<{ message: string; user: { id: string; email: string; displayName: string; isVerified: boolean; isBanned: boolean } }> {
    return api.put<{ message: string; user: { id: string; email: string; displayName: string; isVerified: boolean; isBanned: boolean } }>(`/admin/users/${userId}/unban`, {});
  },

  /**
   * Delete a user.
   */
  async deleteUser(userId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/admin/users/${userId}`);
  },

  /**
   * Promote a user to admin.
   */
  async promoteUser(userId: string): Promise<{ message: string; user: { id: string; email: string; displayName: string; role: string } }> {
    return api.put<{ message: string; user: { id: string; email: string; displayName: string; role: string } }>(`/admin/users/${userId}/promote`, {});
  },

  /**
   * Get flagged reviews.
   */
  async getFlaggedReviews(page = 1, limit = 10): Promise<PaginatedResponse<FlaggedReviewResponse>> {
    return api.get<PaginatedResponse<FlaggedReviewResponse>>(`/admin/reviews/flagged?page=${page}&limit=${limit}`);
  },
};
