import { api } from './api.js';
import type {
  VendorSearchResult,
  VendorDetail,
  VendorSummaryApiResponse,
  PaginatedResponse,
  CreateVendorPayload,
  UpdateVendorPayload,
} from '../types/vendor.js';
import type { ReviewResponse } from '../types/review.js';

export const vendorService = {
  /**
   * Search for vendors by business name, handle, phone, or bank account.
   */
  async search(
    query: string,
    page = 1,
    limit = 10
  ): Promise<PaginatedResponse<VendorSearchResult>> {
    const q = query.trim();
    return api.get<PaginatedResponse<VendorSearchResult>>(
      `/vendors/search?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`
    );
  },

  /**
   * List directory vendors with filtering.
   */
  async listDirectory(params: {
    category?: string;
    state?: string;
    claimStatus?: string;
    trustScoreMin?: number;
    trustScoreMax?: number;
    platforms?: string[];
    sort?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<VendorSearchResult>> {
    const queryParts: string[] = [];
    if (params.category) queryParts.push(`category=${encodeURIComponent(params.category)}`);
    if (params.state) queryParts.push(`state=${encodeURIComponent(params.state)}`);
    if (params.claimStatus) queryParts.push(`claimStatus=${encodeURIComponent(params.claimStatus)}`);
    if (params.trustScoreMin !== undefined) queryParts.push(`trustScoreMin=${params.trustScoreMin}`);
    if (params.trustScoreMax !== undefined) queryParts.push(`trustScoreMax=${params.trustScoreMax}`);
    if (params.platforms && params.platforms.length > 0) queryParts.push(`platforms=${encodeURIComponent(params.platforms.join(','))}`);
    if (params.sort) queryParts.push(`sort=${encodeURIComponent(params.sort)}`);
    if (params.page) queryParts.push(`page=${params.page}`);
    if (params.limit) queryParts.push(`limit=${params.limit}`);

    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return api.get<PaginatedResponse<VendorSearchResult>>(`/vendors${queryString}`);
  },

  /**
   * Get top 3 featured vendors.
   */
  async getFeaturedVendors(): Promise<VendorSearchResult[]> {
    return api.get<VendorSearchResult[]>('/vendors/featured');
  },

  /**
   * Get full details of a specific vendor.
   */
  async getById(id: string): Promise<VendorDetail> {
    return api.get<VendorDetail>(`/vendors/${id}`);
  },

  /**
   * Get paginated reviews for a vendor.
   */
  async getReviews(
    vendorId: string,
    page = 1,
    limit = 10
  ): Promise<PaginatedResponse<ReviewResponse>> {
    return api.get<PaginatedResponse<ReviewResponse>>(
      `/vendors/${vendorId}/reviews?page=${page}&limit=${limit}`
    );
  },

  /**
   * Get AI summary for a vendor.
   */
  async getSummary(vendorId: string): Promise<VendorSummaryApiResponse> {
    return api.get<VendorSummaryApiResponse>(`/vendors/${vendorId}/summary`);
  },

  /**
   * Create/onboard a vendor profile.
   */
  async createVendorProfile(payload: CreateVendorPayload): Promise<VendorDetail> {
    return api.post<VendorDetail>('/vendors', payload);
  },

  /**
   * Claim an unclaimed vendor profile.
   */
  async claimProfile(vendorId: string): Promise<VendorDetail> {
    return api.post<VendorDetail>(`/vendors/${vendorId}/claim`, {});
  },

  /**
   * Update vendor profile details.
   */
  async updateVendorProfile(vendorId: string, payload: UpdateVendorPayload): Promise<VendorDetail> {
    return api.put<VendorDetail>(`/vendors/${vendorId}`, payload);
  },

  /**
   * Get current logged-in vendor's profile.
   */
  async getMyVendorProfile(): Promise<VendorDetail> {
    return api.get<VendorDetail>('/vendors/dashboard/me');
  },
};
