import { useState, useEffect, useCallback } from 'react';
import { vendorService } from '../services/vendor.service.js';
import { MIN_QUERY_LENGTH, DEBOUNCE_MS, DEFAULT_PAGE_LIMIT } from '../utils/constants.js';
import type { VendorSearchResult } from '../types/vendor.js';

export function useVendorSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<VendorSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const handler = setTimeout(() => {
      const cleaned = query.trim();
      if (cleaned.length >= MIN_QUERY_LENGTH && cleaned !== debouncedQuery) {
        setLoading(true);
      }
      setDebouncedQuery(cleaned);
      setPage(1);
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(handler);
    };
  }, [query, debouncedQuery]);

  const fetchResults = useCallback(async (q: string, p: number) => {
    if (q.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await vendorService.search(q, p, DEFAULT_PAGE_LIMIT);
      setResults(res.data);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search vendors');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch results when debounced query or page changes
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchResults(debouncedQuery, page);
  }, [debouncedQuery, page, fetchResults]);

  return {
    query,
    setQuery,
    debouncedQuery,
    results,
    loading,
    error,
    page,
    setPage,
    totalPages,
    total,
    refreshSearch: () => fetchResults(debouncedQuery, page),
  };
}
