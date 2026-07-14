# AGENTS.md — VerifyNG

This file provides context for the AI agent assisting with the development of VerifyNG. Read this file fully before taking any action on the codebase.

---

## What is VerifyNG?

VerifyNG is a community-powered vendor reputation platform that helps Nigerians make safer decisions when buying from online vendors. Users search for vendors by business name, Instagram handle, phone number, or bank account details and access reviews, trust ratings, and AI-generated summaries contributed by the buying community.

This is a **full web application**. AI is one feature within the platform — not the product itself.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 |
| Language | TypeScript (frontend + backend) |
| Backend | Node.js with TypeScript (no Express) |
| ORM | Prisma |
| Database | PostgreSQL |
| Authentication | JWT (jsonwebtoken) + bcrypt |
| AI Feature | Provider-agnostic (see `agents/skills/ai-integration/SKILL.md`) |
| Email | Resend or Nodemailer |
| Frontend Hosting | Vercel |
| Backend + DB Hosting | Railway or Render |
| Marketing / Landing Page | HTML, CSS, JavaScript (static — separate from React app) |

---

## Project Structure

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
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   ├── index.html
│   └── package.json
├── server/                        ← Node.js backend
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   ├── prisma/                    ← Prisma lives at server root, NOT inside src/
│   │   ├── schema.prisma
│   │   └── migrations/            ← Never edit migration files manually
│   └── package.json
```

---

## Core Features (MVP)

1. **User Authentication** — Registration, login, email verification, password reset using JWT and bcrypt, with role-based routing (Buyers, Vendors, Admin)
2. **Vendor Search & Directory** — Search by name/handle/phone/bank last 4, and browse profiles via a directory page filtered by Category, State, and claim status
3. **Vendor Profile Page** — Displays trust score, AI summary, contact buttons (WhatsApp, Instagram), and customer reviews
4. **Vendor Onboarding & Claiming** — Vendors register and claim their profiles, add social links and descriptions, and copy sharing links to generate reviews
5. **User Reviews and Ratings** — Structured review submission with 1–5 star rating and review text (vendors cannot review themselves)
6. **Trust Score System** — Weighted score (0.0–10.0) computed from community review signals
7. **AI Review Summaries** — Auto-generated vendor summaries triggered when new reviews are submitted
8. **Vendor Dashboard** — Displays trust overview stats and allows editing profile details
9. **Admin Dashboard** — Moderates scam reports and review flags, and verifies vendor claims
10. **Support Contact Form** — Public contact support section for support ticket routing

---

## Database Models (Prisma)

### User
- id, email, passwordHash, displayName, role (BUYER | VENDOR | ADMIN), isVerified, createdAt, updatedAt

### VerificationToken
- id, userId, token, type (EMAIL_VERIFICATION | PASSWORD_RESET), expiresAt, createdAt

### Vendor
- id, businessName, instagramHandle, phoneNumber, bankAccountLast4, ownerId (User reference), claimStatus (UNCLAIMED | PENDING_APPROVAL | CLAIMED), claimedAt, state, city, category, description, whatsappUrl, tiktokUrl, facebookUrl, linkedinUrl, featured, trustScore, trustLabel, reviewCount, scamFlag, moderationFlag, createdAt, updatedAt

### Review
- id, vendorId, userId, rating, reviewText, transactionChannel, orderDate, verifiedBuyer, isFlagged, createdAt, updatedAt

### VendorSummary
- id, vendorId, summaryText, deliveryReliability, customerSatisfaction, recurringComplaints, trustPatterns, scamReason, generatedAt, reviewCountAtGeneration

### Report
- id, vendorId, userId, reason, description, status (PENDING | REVIEWED | DISMISSED), createdAt

### ContactMessage
- id, name, email, subject, message, status (PENDING | RESOLVED), createdAt

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/vendors/search?q= | No | Search vendors |
| GET | /api/vendors | No | List directory with page, limit, state, and category filters |
| GET | /api/vendors/featured | No | Fetch featured vendors for the Home page |
| GET | /api/vendors/:id | No | Get vendor profile details |
| GET | /api/vendors/:id/reviews | No | Get vendor reviews |
| GET | /api/vendors/:id/summary | No | Get vendor AI summary |
| POST | /api/vendors/:id/claim | Yes (Vendor) | Claim an unclaimed profile |
| PUT | /api/vendors/:id | Yes (Vendor) | Update claimed vendor bio, location, and socials |
| POST | /api/reviews | Yes (Buyer) | Create review (vendor cannot review self) |
| PUT | /api/reviews/:id | Yes (Buyer) | Edit review within 48h |
| POST | /api/vendors/:id/report | Yes (Buyer) | File report for scam/moderation |
| POST | /api/auth/register | No | Create account (with role parameter) |
| POST | /api/auth/login | No | Log in and receive token with encoded role |
| POST | /api/auth/logout | Yes | Log out and revoke session |
| GET | /api/auth/me | Yes | Get logged-in user profile details |
| POST | /api/auth/verify-email | No | Verify email address |
| POST | /api/auth/forgot-password | No | Request password reset |
| POST | /api/auth/reset-password | No | Reset password |
| POST | /api/contact | No | Submit support form contact message |
| GET | /api/admin/stats | Yes (Admin) | Fetch analytics and counts dashboard stats |
| GET | /api/admin/claims | Yes (Admin) | List pending profile claims |
| POST | /api/admin/claims/:id/approve | Yes (Admin) | Approve claims |
| POST | /api/admin/claims/:id/reject | Yes (Admin) | Reject claims |
| GET | /api/admin/reports | Yes (Admin) | List disputes moderation queue |
| PUT | /api/admin/reports/:id/resolve | Yes (Admin) | Resolve pending reports |
| PUT | /api/admin/vendors/:id/feature | Yes (Admin) | Toggle featured visibility |
| GET | /api/admin/users | Yes (Admin) | List all users with pagination |
| PUT | /api/admin/users/:id/ban | Yes (Admin) | Ban user (set isVerified to false) |
| DELETE | /api/admin/users/:id | Yes (Admin) | Cascade-delete user, reviews, and reports |
| PUT | /api/admin/users/:id/promote | Yes (Admin) | Promote user to ADMIN role |
| GET | /api/admin/reviews/flagged | Yes (Admin) | List flagged reviews for moderation |

**Pagination:** `GET /api/vendors/:id/reviews` must support pagination via `?page=` and `?limit=` query parameters. Default limit is 10 reviews per page. Never return all reviews in a single response.

---

## Design System

The design system is defined in `tokens/tokens.css` as CSS custom properties. All colours, typography, shadows, and grid values come from this file. **`tokens/tokens.css` is the single source of truth — always reference the file directly for exact values. Do not rely on values listed here as they may become stale if tokens are updated.** Run `node convert-tokens.js` at the project root to regenerate `tokens/tokens.css` from the JSON token files.

**Primary font:** Plus Jakarta Sans (loaded from Google Fonts)

**Primary colour token names and their intended use:**
- `--color-primary-primary-base` — main brand green; used for CTAs, links, trust badges
- `--color-primary-primary-dark` — hover and active states
- `--color-primary-primary-darker` — footer backgrounds, deep surfaces
- `--color-primary-primary-light` — illustrations, icon fills
- `--color-primary-primary-lighter` — card tints, score backgrounds, table headers

**Key supporting token names and their intended use:**
- `--color-state-error` — scam alerts, destructive actions
- `--color-state-warning` — caution states
- `--color-state-success` — success states
- `--color-bg-white-0` — card backgrounds
- `--color-bg-weak-100` — page background
- `--color-text-main-900` — primary text

Always use CSS variables from `tokens/tokens.css`. Never hardcode hex values in component styles.

---

## Agent Behaviour Rules

### Always
- Read the relevant file in `agents/rules/` before starting any task
- Read the relevant skill file in `agents/skills/` before working on auth, AI integration, database migrations, vendor search and directory, vendor onboarding, or admin dashboard
- Use TypeScript for all frontend and backend files — no plain `.js` files in `client/src/` or `server/src/`
- Use CSS variables from `tokens/tokens.css` for all style values
- Use Prisma for all database access — no raw SQL except where Prisma does not support the operation (e.g. full-text search)
- Validate all user inputs at the API layer before they reach the database
- Handle errors explicitly — no silent failures, no empty catch blocks
- Follow the folder structure defined in this file — do not create new top-level folders without confirmation

### Never
- Use Express or any third-party HTTP framework — the backend uses native Node.js HTTP (a lightweight custom router in `server/src/utils/` is encouraged to avoid routing boilerplate)
- Store full bank account numbers anywhere in the codebase, database, or logs
- Hardcode secrets, API keys, or credentials — all secrets go in environment variables
- Write `any` types in TypeScript without explicit justification in a comment
- Edit files inside `prisma/migrations/` manually — migrations are generated by Prisma only
- Make the AI provider a hard dependency — the AI feature must degrade gracefully if the provider is unavailable
- Mix concerns between layers — controllers call services, services call Prisma, routes call controllers

### When in Doubt
- Check the relevant `agents/rules/` file first — architecture, code style, design system, and security rules are all there
- For auth, AI integration, migrations, or vendor search — check the relevant `agents/skills/` file
- Ask before creating new abstractions or introducing new dependencies

---

## Environment Variables

The following environment variables are required. They must never be committed to the repository. A `.env.example` file must exist at the project root containing all variable names with empty values — this is the reference for any developer or agent setting up the project.

```
# Server (required — startup fails if missing)
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=

# Email (optional — registration fails at point of use if unset)
RESEND_API_KEY=

# AI Feature (optional — summarization degrades gracefully if unset)
AI_API_KEY=
AI_API_URL=

# Client
VITE_API_BASE_URL=
```

Add `.env` to `.gitignore` immediately on project setup. Commit `.env.example` to the repository.

---

## Key Constraints

- **Mobile-first** — all UI must work on a 375px viewport and above; the majority of Nigerian users are on mobile
- **Bank account data** — only the last 4 digits of any bank account number may be stored; this is enforced at both the API validation layer and the Prisma model level
- **Minimum review threshold** — the AI summary feature must not run for vendors with fewer than 3 reviews; return an `insufficient_data` state instead
- **Review editing window** — users may edit their own reviews within 48 hours of submission only
- **Rate limiting** — maximum 5 review submissions per user per hour, and maximum 20 search requests per IP per minute; enforce at the API middleware layer
- **No anonymous reviews** — users must be authenticated to submit a review; search and read are publicly accessible
- **AI graceful degradation** — if the AI provider is unavailable, vendor profiles must still load with raw community reviews visible

---

## Trust Score Weights

The trust score (0.0–10.0) is computed entirely from community review data — no AI dependency. Scores are calculated by normalising star ratings (1–5) to a 0–10 scale, then applying the following multipliers:

| Signal | Weight |
|---|---|
| Average star rating (normalised 0–10) | 1.0x base |
| Verified buyer multiplier | 1.1x |
| Recency multiplier (reviews within last 90 days) | 1.1x |

All reviews are averaged using the product of their multipliers. Delivery reliability mentions and recurring complaint frequency are displayed as AI breakdown cards on the profile but are not factored into the numeric trust score (avoiding AI dependency for core scoring).

| Score Range | Label |
|---|---|
| 8.5 – 10.0 | Highly Trusted |
| 7.0 – 8.4 | Mostly Reliable |
| 5.0 – 6.9 | Proceed with Caution |
| 3.0 – 4.9 | Poor Track Record |
| 0.0 – 2.9 | High Risk |

---

## Scam Detection Rules

Trigger `scam_flag_triggered` when:
- 40%+ of reviews mention non-delivery after payment
- 20%+ of reviews mention being blocked after payment
- 30%+ of reviews mention receiving items different from listings

Trigger `moderation_flag` (not scam flag) when:
- Multiple reviews submitted in a short window with near-identical positive text (suspected fake reviews)

*Note: To avoid LLM math inaccuracies, review classification categories (non-delivery, blocked, wrong items) are extracted by the AI provider per review, but the final percentage thresholds and flags are computed programmatically by the backend.*