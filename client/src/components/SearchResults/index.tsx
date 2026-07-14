import React from 'react';
import { SearchResultItem } from '../SearchResultItem/index.js';
import { Button } from '../Button/index.js';
import type { VendorSearchResult } from '../../types/vendor.js';
import styles from './SearchResults.module.css';

interface SearchResultsProps {
  results: VendorSearchResult[];
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  page = 1,
  totalPages = 1,
  onPageChange,
}) => {
  if (results.length === 0) return null;

  return (
    <div>
      <div className={styles.grid}>
        {results.map((vendor) => (
          <SearchResultItem key={vendor.id} vendor={vendor} />
        ))}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem' }}>
          <Button
            variant="secondary"
            disabled={page === 1}
            onClick={() => onPageChange?.(page - 1)}
          >
            ← Previous
          </Button>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-sub-500)' }}>
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page === totalPages}
            onClick={() => onPageChange?.(page + 1)}
          >
            Next →
          </Button>
        </div>
      )}
    </div>
  );
};
