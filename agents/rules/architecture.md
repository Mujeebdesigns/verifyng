# architecture.md — VerifyNG

This file defines the architecture rules for the VerifyNG codebase. Read this before creating any file, folder, or module.

---

## Overview

VerifyNG is split into two independent units that live in the same monorepo:

- `client/` — React 18 frontend (TypeScript)
- `server/` — Node.js backend with TypeScript (no Express)

These two units are **never mixed**. No server code imports from `client/`. No client code imports from `server/`.

There used to be a third unit, `landing/`, a static HTML/CSS/JS marketing page that duplicated the client's `Home` page. It was retired — `client/src/pages/Home` is now the single homepage, avoiding two parallel implementations of the same marketing content drifting out of sync.

---

## Monorepo Structure

```
verifyng/
├── AGENTS.md
├── .env.example
├── .gitignore
├── convert-tokens.js
├── agents/
│   ├── rules/
│   │   ├── architecture.md
│   │   ├── code-style.md
│   │   ├── design-system.md
│   │   └── security.md
│   └── skills/
│       ├── auth-flow/
│       │   └── SKILL.md
│       ├── ai-integration/
│       │   └── SKILL.md
│       ├── db-migration-runner/
│       │   └── SKILL.md
│       ├── vendor-search-and-directory/
│       │   └── SKILL.md
│       ├── vendor-onboarding/
│       │   └── SKILL.md
│       └── admin-dashboard/
│           └── SKILL.md
├── tokens/
│   ├── color-tokens.json
│   ├── typography-tokens.json
│   ├── shadow-tokens.json
│   ├── grid-tokens.json
│   └── tokens.css
├── client/                        ← React frontend
└── server/                        ← Node.js backend
```

Each of `client/` and `server/` has its own `package.json`. They are independent Node packages. Do not create a root-level `package.json` that merges them.

---

## Client Architecture (`client/`)

```
client/
├── public/
│   └── favicon.svg
├── src/
│   ├── assets/          ← Static assets: images, icons, fonts
│   ├── components/      ← Reusable UI components
│   │   └── [ComponentName]/
│   │       ├── index.tsx
│   │       └── [ComponentName].module.css
│   ├── pages/           ← One folder per route/page
│   │   └── [PageName]/
│   │       ├── index.tsx
│   │       └── [PageName].module.css
│   ├── hooks/           ← Custom React hooks (use[HookName].ts)
│   ├── services/        ← API call functions (fetch wrappers)
│   ├── types/           ← Shared TypeScript interfaces and types
│   └── utils/           ← Pure utility functions
├── index.html
├── tsconfig.json
└── package.json
```

### Client Rules

- **Components** live in `components/`. Each component gets its own folder with `index.tsx` and a CSS module file.
- **Pages** live in `pages/`. Each page maps to one application route:
  - `/` — Home (Public search, hero, and marketing content)
  - `/vendors/:id` — Vendor Profile Page (Public lookup with trust signals and contact links)
  - `/directory` — Vendor Directory Page (Public discover flow with state/category filters)
  - `/login` & `/register` — Authentication Pages (Select role: VENDOR or BUYER on signup)
  - `/dashboard` — Buyer Dashboard (Track reviews submitted)
  - `/vendor-dashboard` — Vendor Dashboard (Manage claimed profile, view stats, copy link)
  - `/admin-dashboard` — Admin Dashboard (Verification queue, reports moderation queue)
  - `/contact` — Support and Feedback Page
- **API calls** are made only from `services/` — never directly inside components or hooks.
- **Custom hooks** live in `hooks/` and follow the `use[Name].ts` naming pattern.
- **Shared types** live in `types/` and are imported wherever needed. Never define types inline inside component files.
- **No business logic in components** — components render UI and call hooks. Logic lives in hooks and services.
- **CSS Modules** are used for component-level styles. Global styles and token imports live in `src/index.css`.
- **Role Guards (AuthGuard / RoleGuard)**: Pages that are dashboard-specific must use route guards wrapping the components in `App.tsx` (e.g. restrict `/admin-dashboard` to `ADMIN` only, and `/vendor-dashboard` to `VENDOR` only).

---

## Server Architecture (`server/`)

```
server/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── routes/          ← Route registration only — no logic
│   ├── controllers/     ← Request/response handling
│   ├── middleware/      ← Auth, validation, rate limiting, error handling
│   ├── services/        ← Business logic and Prisma queries
│   ├── types/           ← Shared TypeScript interfaces and types
│   └── utils/           ← Pure utility functions (e.g. JWT helpers, score calculator)
├── tsconfig.json
└── package.json
```

### Server Layer Rules — Strict

The server follows a strict 4-layer architecture. Each layer has one responsibility and calls only the layer below it:

```
Request → Route → Controller → Service → Prisma (Database)
```

| Layer | Responsibility | What it must NOT do |
|---|---|---|
| `routes/` | Register URL paths and HTTP methods; attach middleware | Contain any logic; call services directly |
| `controllers/` | Parse request; call service; send response | Query the database directly; contain business logic |
| `services/` | Business logic; Prisma queries; trust score computation | Parse HTTP requests; send HTTP responses |
| `middleware/` | Auth verification; input validation; rate limiting; error handling | Contain business logic |

### Naming Conventions — Server

- Route files: `[resource].routes.ts` (e.g. `vendor.routes.ts`)
- Controller files: `[resource].controller.ts` (e.g. `vendor.controller.ts`)
- Service files: `[resource].service.ts` (e.g. `vendor.service.ts`)
- Middleware files: `[name].middleware.ts` (e.g. `auth.middleware.ts`)

### Required Utility Helpers

Create these in `server/src/utils/` — they are used across all route handlers:

```typescript
// utils/response.ts — send JSON responses
import type { ServerResponse } from 'node:http';

export function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

export function sendError(res: ServerResponse, status: number, message: string): void {
  sendJson(res, status, { error: message });
}
```

```typescript
// utils/parseBody.ts — parse JSON request body
import type { IncomingMessage } from 'node:http';
import { AppError } from './AppError';

export function parseBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try { resolve(JSON.parse(body) as T); }
      catch { reject(new AppError('Invalid JSON body', 400)); }
    });
    req.on('error', reject);
  });
}
```

```typescript
// utils/AppError.ts — typed application errors
export class AppError extends Error {
  constructor(public message: string, public statusCode: number) {
    super(message);
    this.name = 'AppError';
  }
}
```

```typescript
// utils/parseQuery.ts — parse URL query string
import type { IncomingMessage } from 'node:http';

export function parseQuery(url: string): Record<string, string> {
  const idx = url.indexOf('?');
  if (idx === -1) return {};

  const params: Record<string, string> = {};
  const searchParams = new URLSearchParams(url.slice(idx));
  for (const [key, value] of searchParams) {
    params[key] = value;
  }
  return params;
}
```

```typescript
// utils/router.ts — lightweight request router
import type { IncomingMessage, ServerResponse } from 'node:http';

type RouteHandler = (req: IncomingMessage, res: ServerResponse, params: Record<string, string>) => void | Promise<void>;

interface Route {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
}

export function createRouter() {
  const routes: Route[] = [];

  function addRoute(method: string, path: string, handler: RouteHandler) {
    const paramNames: string[] = [];
    const patternStr = path.replace(/:(\w+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    routes.push({
      method,
      pattern: new RegExp(`^${patternStr}$`),
      paramNames,
      handler,
    });
  }

  return {
    get: (path: string, handler: RouteHandler) => addRoute('GET', path, handler),
    post: (path: string, handler: RouteHandler) => addRoute('POST', path, handler),
    put: (path: string, handler: RouteHandler) => addRoute('PUT', path, handler),
    delete: (path: string, handler: RouteHandler) => addRoute('DELETE', path, handler),
    resolve(req: IncomingMessage, res: ServerResponse) {
      const method = req.method ?? 'GET';
      const url = req.url ?? '/';

      for (const route of routes) {
        if (route.method !== method) continue;
        const match = url.match(route.pattern);
        if (!match) continue;

        const params: Record<string, string> = {};
        route.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(match[i + 1]);
        });

        return route.handler(req, res, params);
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    },
  };
}
```

### Standard HTTP Status Codes

| Scenario | Code |
|---|---|
| Success (data returned) | 200 |
| Resource created | 201 |
| Validation failure | 400 |
| Unauthenticated | 401 |
| Forbidden | 403 |
| Not found | 404 |
| Rate limited | 429 |
| Server error | 500 |

### Pagination Pattern

All list endpoints must support pagination — never return all records in one response:

```typescript
const page = Math.max(1, parseInt(query.page as string) || 1);
const limit = Math.min(50, Math.max(1, parseInt(query.limit as string) || 10));
const skip = (page - 1) * limit;

const [items, total] = await prisma.$transaction([
  prisma.review.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
  prisma.review.count(),
]);

return {
  data: items,
  pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
};
```

---

## Data Flow

```
Client (React)
    ↓ HTTP fetch via services/
Server (Node.js)
    ↓ Route → Controller → Service
Prisma ORM
    ↓
PostgreSQL Database
```

For the AI summarization feature:

```
New review submitted
    ↓
Review saved to database (Prisma)
    ↓
AI service triggered (server/src/services/ai.service.ts)
    ├──→ AI provider API called → Summary saved to VendorSummary table
    └──→ Trust score recomputed locally (no AI) → saved to Vendor table
```

---

## Key Architecture Constraints

- **No Express** — the backend uses Node.js native `http.createServer()`. Route matching is handled manually or with a lightweight custom router.
- **No shared code between client and server** — if types need to be shared, duplicate them in both `client/src/types/` and `server/src/types/`. Do not create a shared `packages/` folder without explicit confirmation.
- **Prisma is the only database interface** — no raw SQL except for PostgreSQL full-text search queries where Prisma does not provide native support.
- **Environment variables are never imported directly in components** — all env access on the client goes through a single `src/utils/config.ts` file that exports typed constants.
- **All async functions use try/catch** — no unhandled promise rejections anywhere in the codebase.


