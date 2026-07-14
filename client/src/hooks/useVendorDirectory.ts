import { useState, useEffect, useCallback } from 'react';
import { vendorService } from '../services/vendor.service.js';
import type { VendorSearchResult } from '../types/vendor.js';

export interface DirectoryFilters {
  category: string;
  state: string;
  claimStatus: string;
  trustScoreMin: string;
  /** Comma-separated platform slugs, e.g. "instagram,whatsapp" */
  platforms: string;
  sort: string;
}

const defaultFilters: DirectoryFilters = {
  category: '',
  state: '',
  claimStatus: '',
  trustScoreMin: '',
  platforms: '',
  sort: 'featured_desc',
};

export function useVendorDirectory() {
  const [vendors, setVendors] = useState<VendorSearchResult[]>([]);
  const [filters, setFilters] = useState<DirectoryFilters>(defaultFilters);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVendors, setTotalVendors] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeFilterCount = Object.entries(filters).filter(
    ([key, val]) => key !== 'sort' && val !== ''
  ).length;

  const fetchDirectory = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await vendorService.listDirectory({
        category: filters.category || undefined,
        state: filters.state || undefined,
        claimStatus: filters.claimStatus || undefined,
        trustScoreMin: filters.trustScoreMin ? Number(filters.trustScoreMin) : undefined,
        platforms: filters.platforms ? filters.platforms.split(',') : undefined,
        sort: filters.sort,
        page,
        limit: 12,
      });
      setVendors(res.data);
      setTotalPages(res.pagination.totalPages);
      setTotalVendors(res.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vendors');
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  const updateFilter = useCallback((key: keyof DirectoryFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
    setPage(1);
  }, []);

  return {
    vendors,
    filters,
    updateFilter,
    clearFilters,
    page,
    setPage,
    totalPages,
    totalVendors,
    isLoading,
    error,
    activeFilterCount,
  };
}
