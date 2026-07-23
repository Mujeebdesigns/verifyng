# Skill: vendor-onboarding

Use this skill when building or modifying vendor-specific flows — registering as a vendor, claiming unclaimed profiles, updating vendor profile information (bio, socials, location), and displaying the vendor dashboard.

---

## Onboarding and Role Selection

Users register with the optional `role` parameter set to `VENDOR`. A registered user with the role `VENDOR` has a 1-to-1 relationship with a `Vendor` record in the database.

---

## Vendor Registration Flow (Full)

```
1. User navigates to /register and selects "Register as a Vendor"
2. Form collects: email, password, displayName, role=VENDOR
3. POST /api/auth/register — account created with role=VENDOR, isVerified=false, no Vendor record yet
4. Verification email sent — user must verify before proceeding
5. On first login after verification, vendor is redirected to vendor onboarding wizard:
   a. Step 1: Business name, category, state, city
   b. Step 2: Social links (WhatsApp, Instagram, TikTok, Facebook, LinkedIn)
   c. Step 3: Business description, cover image, logo
6. POST /api/vendors (auto-creates Vendor record linked to user's id)
7. Land on /vendor-dashboard with "Awaiting verification" badge
8. Admin approves the profile (claimStatus → CLAIMED)
```

### New Vendor Self-Onboarding API

For vendors who want to create a new profile from scratch (not claim an existing one):

```
POST /api/vendors
```

**Auth:** Yes (VENDOR role only)
**Payload:**
```json
{
  "businessName": "Premium Shoes NG",
  "category": "Fashion",
  "state": "Lagos",
  "city": "Lekki",
  "description": "Premium shoe vendor based in Lekki",
  "instagramHandle": "premium_shoes_ng",
  "whatsappUrl": "https://wa.me/2348012345678",
  "tiktokUrl": "",
  "facebookUrl": "",
  "linkedinUrl": ""
}
```

```typescript
// server/src/services/vendor.service.ts
export async function createVendorProfile(userId: string, payload: CreateVendorPayload) {
  // One vendor profile per user
  const existing = await prisma.vendor.findFirst({ where: { ownerId: userId } });
  if (existing) throw new AppError('You already have a vendor profile', 409);

  return prisma.vendor.create({
    data: {
      ...payload,
      ownerId: userId,
      claimStatus: 'PENDING_APPROVAL',
    },
  });
}
```

---

## Claiming an Unclaimed Profile

When a business profile exists because buyers reviewed it, but the vendor has not claimed it:
1.  **Vendor clicks "Claim Profile"** on the profile page `/vendors/:id`.
2.  **API call is triggered:** `POST /api/vendors/:id/claim`.
3.  **State updates:** `claimStatus` transitions from `UNCLAIMED` to `PENDING_APPROVAL`, and the vendor user ID is linked to the `ownerId` of the Vendor model.
4.  **Admin reviews claim:** After approval, `claimStatus` becomes `CLAIMED`, unlocking full dashboard capabilities.

```typescript
// server/src/services/vendor.service.ts
import { prisma } from '../utils/prisma';
import { AppError } from '../utils/AppError';

export async function claimProfile(vendorId: string, userId: string) {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) throw new AppError('Vendor profile not found', 404);
  if (vendor.ownerId) throw new AppError('This vendor has already been claimed', 409);

  return prisma.vendor.update({
    where: { id: vendorId },
    data: {
      ownerId: userId,
      claimStatus: 'PENDING_APPROVAL',
    },
  });
}
```

---

## Profile Updates API

A claimed vendor can modify their description, state, city, category, and direct social messaging URLs.

```
PUT /api/vendors/:id
```

**Payload:**
```json
{
  "description": "Premium shoe vendor based in Lekki",
  "category": "Fashion",
  "state": "Lagos",
  "city": "Lekki",
  "whatsappUrl": "https://wa.me/2348012345678",
  "instagramHandle": "premium_shoes_ng",
  "tiktokUrl": "",
  "facebookUrl": ""
}
```

*Note: Enforce that only the logged-in user whose `id` matches the vendor's `ownerId` can invoke this update.*

---

## Vendor Dashboard (`/vendor-dashboard`)

When the vendor accesses `/vendor-dashboard`, they see a dashboard composed of the following sections:

### Stats Overview
| Widget | Data Source |
|---|---|
| Trust Score | `vendor.trustScore` + `vendor.trustLabel` |
| Total Reviews | `vendor.reviewCount` |
| Profile Status | `vendor.claimStatus` (UNCLAIMED / PENDING_APPROVAL / CLAIMED) |
| Scam Flags | `vendor.scamFlag` + `vendor.moderationFlag` |
| Profile Views (future) | Tracked via analytics table (post-MVP) |

### Review List
- Displayed in reverse date order with pagination (same as public `/vendors/:id/reviews`)
- Includes star rating, review text, verified buyer badge, and date
- Vendors **cannot** reply to reviews (MVP scope)

### Edit Profile Section
- Editable fields: description, category, state, city, social URLs, instagramHandle
- Uses `PUT /api/vendors/:id` endpoint
- Read-only fields: businessName (locked after admin approval), trustScore, reviewCount

### Share Your Trust Link

A key growth loop is the **trust widget** in the Vendor Dashboard:
*   Provide a quick copy snippet: `https://verifyng.com/vendors/:id`
*   Add a prominent CTA copy: *"Copy Link to Instagram Bio to Collect Reviews!"*
*   Provide pre-built sharing templates (e.g. WhatsApp status templates: *"Vouch for us on VerifyNG! Click here to leave a review"*)

### Vendor Dashboard Data Flow

```
GET /api/auth/me → read user.role + userId
  ↓
Find vendor by ownerId = userId in vendor service (internal lookup, not a separate public endpoint)
  ↓
GET /api/vendors/:id/reviews → load review list
  ↓
Render dashboard with stats, reviews, and edit form
```

**Note:** The directory endpoint `GET /api/vendors` serves public browsing. The vendor dashboard must use an internal lookup (`prisma.vendor.findFirst({ where: { ownerId: userId } })`) to resolve the vendor's profile — not a query param on the public directory endpoint.
