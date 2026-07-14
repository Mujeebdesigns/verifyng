# code-style.md — VerifyNG

This file defines the code style and conventions for the VerifyNG codebase. Apply these rules to every file you create or modify.

---

## Language

- TypeScript is used for all files in `client/src/` and `server/src/`
- The `landing/` folder uses plain JavaScript — no TypeScript
- All TypeScript must compile without errors — never use `// @ts-ignore` or `// @ts-nocheck`
- Never use `any` as a type without a comment explaining why it cannot be avoided

---

## TypeScript Conventions

### Types and Interfaces

- Use `interface` for object shapes that describe data structures
- Use `type` for unions, intersections, and aliases
- Name interfaces with PascalCase: `VendorProfile`, `ReviewPayload`, `TrustScore`
- All API request and response shapes must be typed — no untyped `fetch` calls
- Export types from `types/` folders — never define types inline inside component or service files

```typescript
// ✅ Correct
interface Vendor {
  id: string;
  businessName: string | null;
  trustScore: number;
  trustLabel: string;
  reviewCount: number;
  scamFlag: boolean;
}

// ❌ Wrong
const vendor: any = await fetchVendor(id);
```

### Null and Undefined

- Prefer `null` over `undefined` for intentionally absent values — this aligns with Prisma's nullable field convention
- Use optional chaining `?.` and nullish coalescing `??` instead of manual null checks where possible

```typescript
// ✅ Correct
const name = vendor?.businessName ?? 'Unknown Vendor';

// ❌ Wrong
const name = vendor && vendor.businessName ? vendor.businessName : 'Unknown Vendor';
```

### Async / Await

- Always use `async/await` — never use `.then().catch()` chains
- Always wrap async operations in `try/catch` — no silent failures

```typescript
// ✅ Correct
try {
  const vendor = await vendorService.findById(id);
  return vendor;
} catch (error) {
  throw new Error(`Failed to fetch vendor: ${error instanceof Error ? error.message : String(error)}`);
}

// ❌ Wrong
vendorService.findById(id).then(vendor => vendor).catch(err => console.log(err));
```

---

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Files (components) | PascalCase | `VendorCard.tsx` |
| Files (hooks) | camelCase with `use` prefix | `useVendorSearch.ts` |
| Files (services) | camelCase with `.service` suffix | `vendor.service.ts` |
| Files (routes) | camelCase with `.routes` suffix | `vendor.routes.ts` |
| Files (controllers) | camelCase with `.controller` suffix | `vendor.controller.ts` |
| Files (middleware) | camelCase with `.middleware` suffix | `auth.middleware.ts` |
| React components | PascalCase | `VendorCard`, `TrustScoreBadge` |
| Variables and functions | camelCase | `getTrustScore`, `vendorId` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_REVIEWS_PER_PAGE` |
| TypeScript interfaces | PascalCase | `VendorProfile` |
| TypeScript types | PascalCase | `TrustLabel` |
| CSS class names | kebab-case | `.vendor-card`, `.trust-badge` |
| CSS module classes | camelCase (accessed as `styles.vendorCard`) | `styles.vendorCard` |
| Database fields (Prisma) | camelCase | `businessName`, `trustScore` |
| Environment variables | SCREAMING_SNAKE_CASE | `JWT_SECRET`, `DATABASE_URL` |

---

## File Structure Conventions

### React Components and Pages

Every component and page lives in its own folder:

```
components/
└── VendorCard/
    ├── index.tsx              ← Component code
    └── VendorCard.module.css  ← Scoped styles
```

```
pages/
└── VendorProfile/
    ├── index.tsx              ← Page code
    └── VendorProfile.module.css  ← Scoped styles
```

### Component Structure (inside index.tsx)

Follow this order inside every component file:

1. Imports (external libraries first, then internal)
2. Type definitions (props interface)
3. Component function
4. Export

```typescript
// 1. Imports
import { useState } from 'react';
import type { Vendor } from '../../types/vendor';
import styles from './VendorCard.module.css';

// 2. Types
interface VendorCardProps {
  vendor: Vendor;
  onClick?: () => void;
}

// 3. Component
function VendorCard({ vendor, onClick }: VendorCardProps) {
  return (
    <div className={styles.card} onClick={onClick}>
      <span>{vendor.businessName}</span>
    </div>
  );
}

// 4. Export
export default VendorCard;
```

---

## Import Order

Enforce this import order in every file:

1. Node built-in modules
2. External packages
3. Internal absolute imports (from `src/`)
4. Relative imports
5. Type imports (using `import type`)

```typescript
// ✅ Correct order
import http from 'node:http';
import bcrypt from 'bcrypt';
import { prisma } from '../../utils/prisma';
import { AppError } from '../utils/AppError';
import { hashPassword } from './auth.utils';
import type { RegisterPayload } from '../../types/auth';
```

---

## Error Handling

- All errors thrown from services must be typed — use a custom `AppError` class
- Controllers catch service errors and map them to appropriate HTTP status codes
- Never expose raw database errors or stack traces to the client

```typescript
// server/src/utils/AppError.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// In a service
if (!vendor) {
  throw new AppError('Vendor not found', 404);
}

// In a controller
import { sendJson, sendError } from '../utils/response';
import { AppError } from '../utils/AppError';

try {
  const vendor = await vendorService.findById(id);
  sendJson(res, 200, vendor);
} catch (error) {
  if (error instanceof AppError) {
    sendError(res, error.statusCode, error.message);
  } else {
    sendError(res, 500, 'Internal server error');
  }
}
```

---

## Comments

- Write comments for non-obvious logic only — do not comment what the code already says clearly
- Use JSDoc comments for exported functions and types that form a public API (services, utilities, types). Skip JSDoc for trivial React components, obvious getters, or internal helpers where the code is self-documenting
- Mark todos with `// TODO:` and technical debt with `// FIXME:`

```typescript
// ✅ Correct — explains why, not what
// Recency bias: reviews from the last 90 days are weighted 1.5x
const recencyMultiplier = isRecent(review.createdAt) ? 1.5 : 1.0;

// ❌ Wrong — states the obvious
// Add 1 to the count
count++;
```

---

## What to Avoid

- No `var` — use `const` by default, `let` only when reassignment is needed
- No `console.log` in committed code — use a proper logger utility
- No commented-out code blocks — delete unused code, use version control
- No magic numbers — assign numeric constants to named constants
- No duplicate code — extract repeated logic into shared utilities or hooks
- No default exports from `types/` files — always use named exports for types

---

*Last updated: June 2026 — VerifyNG MVP v1.0*
