# Skill: vendor-search-and-directory

Use this skill when building or modifying any vendor discovery features — the main search input lookup, the directory browsing grid, state/category/claims filtering, and the featured vendors component.

---

## Before You Start

1. Read `agents/rules/architecture.md` — search and directory follow Route → Controller → Service
2. Read `agents/rules/code-style.md` — guidelines on code style, response formatting, and TypeScript usage

---

## 1. What Vendor Discovery Does

VerifyNG supports two vendor discovery methods:

1.  **Search Lookup (Public):** Matches exact/partial identifiers to check reputation or prevent duplicate vendor registration.
2.  **Directory Browse (Public):** Allows compound dynamic filtering by category, state, verified claims status, and trust score range, supporting paginated list browsing with sorting.

---

## 2. API Specifications

### Search Lookup

```
GET /api/vendors/search?q=chicfinds&page=1&limit=10
```

**Query parameters:** `q` (string, required, min 2 chars), `page` (default 1), `limit` (default 10, max 20)

**Response:**
```json
{
  "data": [
    {
      "id": "cuid",
      "businessName": "ChicFinds NG",
      "instagramHandle": "chicfinds_ng",
      "phoneNumber": "08031234567",
      "bankAccountLast4": "4821",
      "trustScore": 8.1,
      "trustLabel": "Mostly Reliable",
      "reviewCount": 42,
      "scamFlag": false,
      "moderationFlag": false
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

### Directory Browse

```
GET /api/vendors?category=Fashion&state=Lagos&claimStatus=CLAIMED&trustScoreMin=7.0&sort=trustScore_desc&page=1&limit=12
```

**Query parameters:**
- `category` — optional string filter (e.g. `Fashion`, `Electronics`, `Beauty`, `Food`)
- `state` — optional state filter (e.g. `Lagos`, `Abuja`, `Rivers`)
- `claimStatus` — optional verified badge filter (`UNCLAIMED` | `PENDING_APPROVAL` | `CLAIMED`)
- `trustScoreMin` — optional minimum trust score (0.0–10.0)
- `trustScoreMax` — optional maximum trust score (0.0–10.0)
- `sort` — optional sort order (`featured_desc` (default), `trustScore_desc`, `trustScore_asc`, `reviewCount_desc`, `newest`, `oldest`)
- `page` — page number (default 1)
- `limit` — results per page (default 12, max 50)

**Response:**
```json
{
  "data": [
    {
      "id": "cuid",
      "businessName": "Lagos Wearhouse",
      "instagramHandle": "lagoswearhouse",
      "phoneNumber": "08012345678",
      "bankAccountLast4": "9988",
      "trustScore": 8.7,
      "trustLabel": "Highly Trusted",
      "reviewCount": 14,
      "scamFlag": false,
      "state": "Lagos",
      "category": "Fashion",
      "claimStatus": "CLAIMED",
      "featured": true
    }
  ],
  "pagination": { "page": 1, "limit": 12, "total": 1, "totalPages": 1 }
}
```

### Featured Vendors

```
GET /api/vendors/featured
```

**Behavior:** Fetches top 3 vendors with `featured: true` ordered by `trustScore DESC` for display on the Home page.

---

## 3. Input Normalisation

Before running lookup search queries, normalize raw inputs to optimize match rates:

```typescript
// server/src/utils/normaliseSearchQuery.ts

export function normaliseSearchQuery(raw: string): string {
  let q = raw.trim();

  // Strip @ from Instagram handles
  if (q.startsWith('@')) {
    q = q.slice(1);
  }

  // Normalise Nigerian phone numbers to local format (08XXXXXXXXX)
  if (q.startsWith('+234')) {
    q = '0' + q.slice(4);
  }

  // Remove non-alphanumeric characters except spaces and underscores
  q = q.replace(/[^a-zA-Z0-9 _]/g, '').trim();

  return q.toLowerCase();
}
```

---

## 4. Service Implementations

```typescript
// server/src/services/vendor.service.ts
import { prisma } from '../utils/prisma';
import { normaliseSearchQuery } from '../utils/normaliseSearchQuery';
import { AppError } from '../utils/AppError';
import type { ClaimStatus, Prisma } from '@prisma/client';
import type { VendorSearchResult, VendorDirectoryResult } from '../types/vendor';

/**
 * Lookup search using pattern matching ILIKE.
 * Raw query used because Prisma does not natively support multi-field ILIKE with OR.
 */
export async function search(rawQuery: string, page: number, limit: number) {
  if (!rawQuery || rawQuery.trim().length < 2) {
    throw new AppError('Search query must be at least 2 characters', 400);
  }

  const q = normaliseSearchQuery(rawQuery);
  const skip = (page - 1) * limit;
  const pattern = `%${q}%`;

  const vendors = await prisma.$queryRaw<VendorSearchResult[]>`
    SELECT
      id,
      "businessName",
      "instagramHandle",
      "phoneNumber",
      "bankAccountLast4",
      "trustScore",
      "trustLabel",
      "reviewCount",
      "scamFlag",
      "moderationFlag"
    FROM "Vendor"
    WHERE
      LOWER("businessName") LIKE ${pattern}
      OR LOWER("instagramHandle") LIKE ${pattern}
      OR "phoneNumber" LIKE ${pattern}
      OR "bankAccountLast4" = ${q}
    ORDER BY "reviewCount" DESC, "trustScore" DESC
    LIMIT ${limit}
    OFFSET ${skip}
  `;

  const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count
    FROM "Vendor"
    WHERE
      LOWER("businessName") LIKE ${pattern}
      OR LOWER("instagramHandle") LIKE ${pattern}
      OR "phoneNumber" LIKE ${pattern}
      OR "bankAccountLast4" = ${q}
  `;

  const total = Number(countResult[0].count);

  return {
    data: vendors,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

interface DirectoryParams {
  category?: string;
  state?: string;
  claimStatus?: string;
  trustScoreMin?: number;
  trustScoreMax?: number;
  sort?: string;
  page: number;
  limit: number;
}

const SORT_OPTIONS: Record<string, Prisma.VendorOrderByWithRelationInput[]> = {
  featured_desc: [{ featured: 'desc' }, { reviewCount: 'desc' }, { trustScore: 'desc' }],
  trustScore_desc: [{ trustScore: 'desc' }, { reviewCount: 'desc' }],
  trustScore_asc: [{ trustScore: 'asc' }, { reviewCount: 'desc' }],
  reviewCount_desc: [{ reviewCount: 'desc' }, { trustScore: 'desc' }],
  newest: [{ createdAt: 'desc' }],
  oldest: [{ createdAt: 'asc' }],
};

/**
 * Filtered directory list query with trust score range and sort options.
 */
export async function listDirectory(params: DirectoryParams) {
  const { category, state, claimStatus, trustScoreMin, trustScoreMax, sort, page, limit } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.VendorWhereInput = {};
  if (category) where.category = category;
  if (state) where.state = state;
  if (claimStatus) where.claimStatus = claimStatus as ClaimStatus;
  if (trustScoreMin !== undefined || trustScoreMax !== undefined) {
    where.trustScore = {
      ...(trustScoreMin !== undefined ? { gte: trustScoreMin } : {}),
      ...(trustScoreMax !== undefined ? { lte: trustScoreMax } : {}),
    };
  }

  const orderBy = SORT_OPTIONS[sort ?? 'featured_desc'] ?? SORT_OPTIONS.featured_desc;

  const [vendors, total] = await prisma.$transaction([
    prisma.vendor.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.vendor.count({ where }),
  ]);

  return {
    data: vendors,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Featured vendors for the Home page.
 * Returns top 3 vendors with featured: true.
 */
export async function getFeaturedVendors() {
  return prisma.vendor.findMany({
    where: { featured: true },
    orderBy: { trustScore: 'desc' },
    take: 3,
    select: {
      id: true,
      businessName: true,
      category: true,
      state: true,
      trustScore: true,
      trustLabel: true,
      reviewCount: true,
      instagramHandle: true,
    },
  });
}
```

### Search Result Types

```typescript
// server/src/types/vendor.ts

export interface VendorSearchResult {
  id: string;
  businessName: string | null;
  instagramHandle: string | null;
  phoneNumber: string | null;
  bankAccountLast4: string | null;
  trustScore: number;
  trustLabel: string;
  reviewCount: number;
  scamFlag: boolean;
  moderationFlag: boolean;
}
```

---

## 5. Client Search Component Behaviour

The `SearchBar` component in `client/src/components/SearchBar/` must:

- Debounce input by 300ms before triggering a search API call — avoid firing on every keystroke
- Show a loading indicator while the request is in progress
- Show `EmptyState` component when no results are returned
- Show an error message if the API call fails
- Strip `@` from the input before sending — normalisation also happens server-side but strip it client-side for cleaner UX

```typescript
// client/src/hooks/useVendorSearch.ts

import { useState, useCallback, useEffect } from 'react';
import { searchVendors } from '../services/vendor.service';
import type { VendorSearchResult } from '../types/vendor';

export function useVendorSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VendorSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await searchVendors(q);
      setResults(data.data);
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce: wait 300ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      runSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, runSearch]);

  return { query, setQuery, results, isLoading, error };
}
```

---

## 6. Client Directory Page Architecture

The directory page (`client/src/pages/Directory/index.tsx`) must feature:

1.  **Sidebar Filters:** Accordion or checklist options representing categories and states.
2.  **Toggle Switch:** A checkbox for "Show Verified Vendors Only".
3.  **Sort Dropdown:** Sort by "Top Rated", "Most Reviewed", "Newest", "Oldest".
4.  **Result Layout:** Responsive grid (1 column mobile, 2 tablet, 3 desktop) showing vendor cards with badges, categories, trust labels, and locations.
5.  **No Results View:** A friendly screen suggesting users clear their filters or search for another vendor.

### useVendorDirectory Hook

All data fetching and filter state management must live in a custom hook:

```typescript
// client/src/hooks/useVendorDirectory.ts
import { useState, useEffect } from 'react';
import { fetchDirectory } from '../services/vendor.service';
import type { Vendor } from '../types/vendor';

interface DirectoryFilters {
  category?: string;
  state?: string;
  claimStatus?: 'CLAIMED' | 'UNCLAIMED';
  trustScoreMin?: number;
  trustScoreMax?: number;
  sort?: string;
}

export function useVendorDirectory() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filters, setFilters] = useState<DirectoryFilters>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchDirectory({ ...filters, page, limit: 12 })
      .then(data => {
        if (!cancelled) {
          setVendors(data.data);
          setTotalPages(data.pagination.totalPages);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load vendors');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [filters, page]);

  const updateFilter = (key: keyof DirectoryFilters, value: string | number | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // reset to first page when filters change
  };

  return { vendors, filters, updateFilter, page, setPage, totalPages, isLoading, error };
}
```

### Directory Page Data Flow

```
Filters changed → updateFilter() → useVendorDirectory re-fetches → grid re-renders
Sort changed → updateFilter('sort', 'trustScore_desc') → re-fetches → grid re-orders
Page clicked → setPage(n) → re-fetches with new offset → new page renders
```

---

## 7. Vendor Auto-Creation

When a review is submitted for a vendor that does not yet exist in the database, the vendor record is auto-created using the identifiers provided in the review form. This is handled in the review service, not the vendor service.

```typescript
// In review.service.ts — called before creating the review
// Because instagramHandle and phoneNumber are optional and not unique fields,
// a findFirst lookup is used to find existing vendors instead of a direct unique upsert.
let vendor = null;

if (instagramHandle) {
  vendor = await prisma.vendor.findFirst({
    where: { instagramHandle: { equals: instagramHandle, mode: 'insensitive' } },
  });
}

if (!vendor && phoneNumber) {
  vendor = await prisma.vendor.findFirst({
    where: { phoneNumber },
  });
}

// Fall back to business name lookup to prevent duplicate vendors
if (!vendor && businessName) {
  vendor = await prisma.vendor.findFirst({
    where: { businessName: { equals: businessName, mode: 'insensitive' } },
  });
}

if (!vendor) {
  vendor = await prisma.vendor.create({
    data: {
      businessName: businessName ?? null,
      instagramHandle: instagramHandle ?? null,
      phoneNumber: phoneNumber ?? null,
      bankAccountLast4: bankAccountLast4 ?? null,
      reviewCount: 0,
    },
  });
}
```

Note: Vendor lookup checks for existing records using `findFirst` on handles and phone numbers, preventing duplicate vendors. Because these fields are not unique at the schema level (due to many vendors lacking one or both), direct unique `upsert` queries are not supported by Prisma.

---

## 8. Rate Limiting on Search

Apply rate limiting specifically to the search endpoint to prevent scraping:

- Maximum 20 search requests per IP per minute
- Return `429 Too Many Requests` when exceeded
- Rate limiter implemented in `middleware/rateLimit.middleware.ts`
