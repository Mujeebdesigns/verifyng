import { useState, useEffect, useCallback } from 'react';
import { vendorService } from '../services/vendor.service.js';
import type { VendorDetail, VendorSummaryResponse, VendorSummaryApiResponse } from '../types/vendor.js';
import type { ReviewResponse } from '../types/review.js';

export function useVendorProfile(vendorId: string | undefined) {
  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [summary, setSummary] = useState<VendorSummaryResponse | null>(null);
  const [summaryStatus, setSummaryStatus] = useState<VendorSummaryApiResponse['status'] | null>(null);

  const [loadingVendor, setLoadingVendor] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchVendor = useCallback(async () => {
    if (!vendorId) return;
    setLoadingVendor(true);
    setError(null);
    try {
      const data = await vendorService.getById(vendorId);
      setVendor(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch vendor details');
    } finally {
      setLoadingVendor(false);
    }
  }, [vendorId]);

  const fetchReviews = useCallback(async (p: number) => {
    if (!vendorId) return;
    setLoadingReviews(true);
    setReviewsError(null);
    try {
      const res = await vendorService.getReviews(vendorId, p, 10);
      setReviews(res.data);
      setTotalPages(res.pagination.totalPages);
    } catch (err) {
      setReviewsError(err instanceof Error ? err.message : 'Failed to fetch reviews');
    } finally {
      setLoadingReviews(false);
    }
  }, [vendorId]);

  const fetchSummary = useCallback(async () => {
    if (!vendorId) return;
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      const data = await vendorService.getSummary(vendorId);
      setSummaryStatus(data.status);
      if (data.status === 'ready') {
        setSummary(data.data);
      } else {
        setSummary(null);
      }
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : 'Failed to fetch summary');
    } finally {
      setLoadingSummary(false);
    }
  }, [vendorId]);

  // Initial fetch for vendor detail and summary
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchVendor();
    fetchSummary();
  }, [fetchVendor, fetchSummary]);

  // Fetch reviews when page changes
  useEffect(() => {
    fetchReviews(page);
  }, [page, fetchReviews]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchVendor(), fetchReviews(page), fetchSummary()]);
  }, [fetchVendor, fetchReviews, page, fetchSummary]);

  return {
    vendor,
    reviews,
    summary,
    summaryStatus,
    loading: loadingVendor || loadingReviews || loadingSummary,
    loadingVendor,
    loadingReviews,
    loadingSummary,
    error,
    reviewsError,
    summaryError,
    page,
    setPage,
    totalPages,
    refreshAll,
    refreshReviews: () => fetchReviews(page),
    refreshSummary: fetchSummary,
  };
}
