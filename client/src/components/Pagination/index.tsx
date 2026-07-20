import React from 'react';
import { CustomSelect } from '../CustomSelect/index.js';
import styles from './Pagination.module.css';

interface PaginationProps {
  page: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

/**
 * Build the list of page tokens with ellipses: always the first and last page,
 * the current page and its neighbours, and a gap marker where pages are hidden.
 */
function getPageItems(current: number, total: number): Array<number | 'gap-left' | 'gap-right'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const items: Array<number | 'gap-left' | 'gap-right'> = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) items.push('gap-left');
  for (let i = left; i <= right; i++) items.push(i);
  if (right < total - 1) items.push('gap-right');
  items.push(total);
  return items;
}

const ChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
);
const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
);
const ChevronsLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" /></svg>
);
const ChevronsRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" /></svg>
);

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
}) => {
  const items = getPageItems(page, totalPages);
  const atStart = page <= 1;
  const atEnd = page >= totalPages;

  return (
    <div className={styles.bar}>
      <span className={styles.info}>Page {page} of {totalPages}</span>

      <div className={styles.pages}>
        <button type="button" className={styles.nav} onClick={() => onPageChange(1)} disabled={atStart} aria-label="First page">
          <ChevronsLeft />
        </button>
        <button type="button" className={styles.nav} onClick={() => onPageChange(page - 1)} disabled={atStart} aria-label="Previous page">
          <ChevronLeft />
        </button>

        {items.map((item) =>
          typeof item === 'number' ? (
            <button
              key={item}
              type="button"
              className={item === page ? styles.pageActive : styles.page}
              onClick={() => onPageChange(item)}
              aria-current={item === page ? 'page' : undefined}
            >
              {item}
            </button>
          ) : (
            <span key={item} className={styles.gap}>…</span>
          )
        )}

        <button type="button" className={styles.nav} onClick={() => onPageChange(page + 1)} disabled={atEnd} aria-label="Next page">
          <ChevronRight />
        </button>
        <button type="button" className={styles.nav} onClick={() => onPageChange(totalPages)} disabled={atEnd} aria-label="Last page">
          <ChevronsRight />
        </button>
      </div>

      <CustomSelect
        compact
        openUp
        ariaLabel="Rows per page"
        value={String(pageSize)}
        onChange={(v) => onPageSizeChange(Number(v))}
        options={pageSizeOptions.map((size) => ({ value: String(size), label: `${size} / page` }))}
      />
    </div>
  );
};

export default Pagination;
