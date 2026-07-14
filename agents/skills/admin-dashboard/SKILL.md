# Skill: admin-dashboard

Use this skill when implementing or modifying any administrator capabilities — stats dashboards, review flags, dispute reports moderation, claims verification, and user management.

---

## Overview

The Admin Dashboard provides operations control. Only users with the role `ADMIN` can access these services.

---

## Admin Moderation Endpoints

All admin endpoints must reside under `/api/admin/` and require both `authMiddleware` and `requireRole(['ADMIN'])`.

| Endpoint | Method | Description |
|---|---|---|
| `/api/admin/stats` | GET | Global aggregates (users count, reviews count, pending claims) |
| `/api/admin/claims` | GET | List pending claim requests from vendors |
| `/api/admin/claims/:id/approve` | POST | Approve claim (set status to `CLAIMED` and verify profile) |
| `/api/admin/claims/:id/reject` | POST | Reject claim (clear `ownerId` and set to `UNCLAIMED`) |
| `/api/admin/reports` | GET | List pending spam/scam reports |
| `/api/admin/reports/:id/resolve` | PUT | Mark report as reviewed or dismissed |
| `/api/admin/vendors/:id/feature`| PUT | Toggle `featured` flag for directory visibility |

### GET /api/admin/stats Response

```json
{
  "totalUsers": 1204,
  "totalVendors": 342,
  "totalReviews": 1890,
  "pendingClaims": 12,
  "pendingReports": 7,
  "flaggedReviews": 4,
  "recentSignups": 45,
  "recentSignupsPeriod": "last 7 days"
}
```

```typescript
// server/src/services/admin.service.ts
import { prisma } from '../utils/prisma';

export async function getAdminStats() {
  const [
    totalUsers,
    totalVendors,
    totalReviews,
    pendingClaims,
    pendingReports,
    flaggedReviews,
    recentSignups,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.vendor.count(),
    prisma.review.count(),
    prisma.vendor.count({ where: { claimStatus: 'PENDING_APPROVAL' } }),
    prisma.report.count({ where: { status: 'PENDING' } }),
    prisma.review.count({ where: { isFlagged: true } }),
    prisma.user.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
  ]);

  return {
    totalUsers,
    totalVendors,
    totalReviews,
    pendingClaims,
    pendingReports,
    flaggedReviews,
    recentSignups,
    recentSignupsPeriod: 'last 7 days',
  };
}
```

---

## Verification Approval Flow

When approving a claim:
1.  Verify the requester possesses authentic details.
2.  Trigger atomic database update:
    *   Set `claimStatus` to `CLAIMED`.
    *   Set `claimedAt` to `new Date()`.
3.  Send confirmation email notifying the vendor.

```typescript
// server/src/services/admin.service.ts
import { prisma } from '../utils/prisma';
import { AppError } from '../utils/AppError';

export async function approveVendorClaim(vendorId: string) {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor || !vendor.ownerId) {
    throw new AppError('Vendor claim request not found', 404);
  }

  return prisma.$transaction([
    prisma.vendor.update({
      where: { id: vendorId },
      data: {
        claimStatus: 'CLAIMED',
        claimedAt: new Date(),
      },
    }),
    prisma.user.update({
      where: { id: vendor.ownerId },
      data: { isVerified: true } // Auto-verify account when claim is approved
    })
  ]);
}
```

---

## Reports Moderation Flow

When a buyer flags a review or vendor:
*   A `Report` is created inside the database (`status: PENDING`).
*   Admin reviews it on `/admin-dashboard`.
*   If valid scam/spam: Admin deletes the matching review or toggles `scamFlag: true` / `moderationFlag: true` on the Vendor profile, then updates report to `REVIEWED`.
*   If invalid: Admin sets report to `DISMISSED`.

---

## User Management

The admin must be able to manage registered users through the dashboard:

```
GET /api/admin/users?page=1&limit=20
```

**Response:**
```json
{
  "data": [
    {
      "id": "cuid",
      "email": "user@example.com",
      "displayName": "Jane Doe",
      "role": "BUYER",
      "isVerified": true,
      "createdAt": "2026-01-15T10:30:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1204, "totalPages": 61 }
}
```

### User Actions

| Action | Endpoint | Description |
|---|---|---|
| Ban user | `PUT /api/admin/users/:id/ban` | Set `isVerified: false`, preventing login |
| Delete user | `DELETE /api/admin/users/:id` | Cascade-delete user, their reviews, and reports |
| Promote to admin | `PUT /api/admin/users/:id/promote` | Set `role: ADMIN` |

---

## Admin Dashboard Page (`/admin-dashboard`)

The admin dashboard frontend page consists of the following sections:

### 1. Stats Bar
Horizontal summary cards across the top showing: Total Users, Total Vendors, Total Reviews, Pending Claims, Pending Reports. Each card is a stat number with a label.

### 2. Pending Claims Table
List of vendors with `claimStatus: PENDING_APPROVAL`. Columns: Business Name, Submitted By, Date, Approve/Reject buttons.

### 3. Reports Moderation Queue
List of reports with `status: PENDING`. Columns: Vendor, Reported By, Reason, Description, Date, Resolve/Dismiss buttons.

### 4. User List (collapsible section)
Searchable, paginated table of all users. Columns: Email, Display Name, Role, Verified, Joined Date, Actions (Ban, Promote, Delete).

### 5. Review Moderation
List of reviews with `isFlagged: true`. Columns: Vendor, Reviewer, Rating, Review Text (truncated), Date, Approve/Remove buttons.

### Admin Dashboard Page Data Flow

```
GET /api/admin/stats → renders stat cards
GET /api/admin/claims → renders pending claims table
GET /api/admin/reports → renders reports moderation queue
GET /api/admin/users → renders user management table
GET /api/admin/reviews/flagged → renders review moderation queue
```
