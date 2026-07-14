# Skill: ai-integration

Use this skill when building or modifying the AI review summarization and scam pattern detection feature in VerifyNG.

---

## Before You Start

1. Read `agents/rules/architecture.md` — the AI feature is a background service called from `server/src/services/`
2. Read `agents/rules/security.md` — the AI provider is an external dependency; API keys go in environment variables
3. Confirm: the AI feature is **one feature within the app** — it does not interact with users directly

---

## What the AI Feature Does

The AI feature receives vendor review data and returns structured outputs that appear on vendor profile pages:

- A plain-language **review summary** (max 150 words)
- A **trust score** (0.0–10.0) with a label
- **Breakdown cards**: delivery reliability, customer satisfaction, recurring complaints, trust patterns
- A **scam flag** if scam patterns are detected in the review data
- A **moderation flag** if fake or coordinated reviews are suspected

---

## Provider-Agnostic Design

The AI provider is not yet decided. The integration is designed so that swapping providers requires changes only to one file: `server/src/services/ai.provider.ts`.

All other services call `ai.service.ts` — which calls `ai.provider.ts`. The rest of the codebase never imports from `ai.provider.ts` directly.

```
vendor.service.ts
  ↓ triggers on new review
ai.service.ts          ← provider-agnostic orchestration
  ↓
ai.provider.ts         ← the only file that changes when switching providers
  ↓
AI Provider API (TBD)
```

---

## File Structure

```
server/src/services/
├── ai.service.ts       ← orchestration: triggers, thresholds, fallback logic
└── ai.provider.ts      ← provider-specific API call (swap this to change providers)
```

---

## Input Structure

The AI feature receives a structured payload built from the Prisma database:

```typescript
// server/src/types/ai.ts

export interface AiReviewInput {
  vendorId: string;
  vendorName: string | null;
  reviews: AiReview[];
  totalReviewCount: number;
}

export interface AiReview {
  reviewId: string;
  rating: number;           // 1–5
  reviewText: string;
  dateSubmitted: Date;
  verifiedBuyer: boolean;
}

export interface AiSummaryOutput {
  status: AiOutputStatus;
  trustScore: {
    score: number | null;
    label: string | null;
    basedOn: number;
  };
  reviewSummary: string | null;
  breakdown: {
    deliveryReliability: string | null;
    customerSatisfaction: string | null;
    recurringComplaints: string[];
    trustPatterns: string | null;
  };
  classifications: AiReviewClassification[];
  scamFlag: {
    triggered: boolean;
    reason: string | null;
  };
  moderationFlag: {
    triggered: boolean;
    reason: string | null;
  };
  generatedAt: Date;
}

export interface AiReviewClassification {
  reviewId: string;
  scamPattern: 'non_delivery' | 'blocked' | 'wrong_item' | 'none';
}

export type AiOutputStatus =
  | 'success'
  | 'insufficient_data'
  | 'vendor_not_found'
  | 'ambiguous_match'
  | 'inconclusive_summary'
  | 'scam_flag_triggered'
  | 'summary_unavailable';
```

---

## AI Service — Orchestration

```typescript
// server/src/services/ai.service.ts

import { prisma } from '../utils/prisma';
import { callAiProvider } from './ai.provider';
import { computeTrustScore } from '../utils/trustScore';
import type { AiSummaryOutput, AiReview } from '../types/ai';
import type { Review } from '@prisma/client';

const MIN_REVIEWS_FOR_SUMMARY = 3;

export async function generateVendorSummary(vendorId: string): Promise<AiSummaryOutput> {
  // 1. Fetch vendor details to check existence and retrieve the business name
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { businessName: true },
  });

  if (!vendor) {
    return buildFallbackOutput('vendor_not_found', 0);
  }

  // 1b. Fetch reviews from database
  const reviews = await prisma.review.findMany({
    where: { vendorId, isFlagged: false },
    select: {
      id: true,
      rating: true,
      reviewText: true,
      createdAt: true,
      verifiedBuyer: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // 2. Enforce minimum review threshold
  if (reviews.length < MIN_REVIEWS_FOR_SUMMARY) {
    return buildFallbackOutput('insufficient_data', reviews.length);
  }

  // 3. Compute trust score locally (no AI needed for scoring)
  const trustScore = computeTrustScore(reviews);

  // Map database reviews to the expected AiReview structure
  const formattedReviews: AiReview[] = reviews.map(r => ({
    reviewId: r.id,
    rating: r.rating,
    reviewText: r.reviewText,
    dateSubmitted: r.createdAt,
    verifiedBuyer: r.verifiedBuyer,
  }));

  // 4. Call AI provider for natural language summary and classifications
  let aiOutput: AiSummaryOutput;
  try {
    aiOutput = await callAiProvider({
      vendorId,
      vendorName: vendor.businessName,
      reviews: formattedReviews,
      totalReviewCount: reviews.length,
    });
  } catch (error) {
    // 5. Graceful degradation — AI unavailable, return summary_unavailable state
    console.error('AI provider error for vendor', vendorId, error instanceof Error ? error.message : String(error));
    return buildFallbackOutput('summary_unavailable', reviews.length);
  }

  // 5b. Programmatically calculate scam flag to prevent LLM math inaccuracies
  const classifications = aiOutput.classifications ?? [];
  const totalReviews = reviews.length;

  if (totalReviews > 0) {
    const nonDeliveryCount = classifications.filter(c => c.scamPattern === 'non_delivery').length;
    const blockedCount = classifications.filter(c => c.scamPattern === 'blocked').length;
    const wrongItemCount = classifications.filter(c => c.scamPattern === 'wrong_item').length;

    const nonDeliveryPct = nonDeliveryCount / totalReviews;
    const blockedPct = blockedCount / totalReviews;
    const wrongItemPct = wrongItemCount / totalReviews;

    // Trigger criteria: 40%+ non-delivery, 20%+ blocked, 30%+ wrong item
    const scamTriggered = nonDeliveryPct >= 0.40 || blockedPct >= 0.20 || wrongItemPct >= 0.30;

    let scamReason: string | null = null;
    if (scamTriggered) {
      const reasons: string[] = [];
      if (nonDeliveryPct >= 0.40) {
        reasons.push(`${Math.round(nonDeliveryPct * 100)}% of reviews mention non-delivery after payment`);
      }
      if (blockedPct >= 0.20) {
        reasons.push(`${Math.round(blockedPct * 100)}% of reviews mention being blocked after payment`);
      }
      if (wrongItemPct >= 0.30) {
        reasons.push(`${Math.round(wrongItemPct * 100)}% of reviews mention receiving items different from listings`);
      }
      scamReason = `Suspicious scam patterns detected: ${reasons.join(', ')}.`;
    }

    aiOutput.scamFlag = {
      triggered: scamTriggered,
      reason: scamReason,
    };

    if (scamTriggered) {
      aiOutput.status = 'scam_flag_triggered';
    }
  }

  // 5c. Programmatically check moderation flag (near-identical reviews in short window)
  const moderationTriggered = checkSuspiciousReviewPattern(reviews, formattedReviews);
  if (moderationTriggered) {
    aiOutput.moderationFlag = {
      triggered: true,
      reason: 'Multiple reviews submitted close together with near-identical text',
    };
  }

  // 5d. Map locally computed trust score into the output
  aiOutput.trustScore = {
    score: trustScore.score,
    label: trustScore.label,
    basedOn: reviews.length,
  };

  // 6. Save summary to database
  await prisma.vendorSummary.upsert({
    where: { vendorId },
    create: {
      vendorId,
      summaryText: aiOutput.reviewSummary,
      deliveryReliability: aiOutput.breakdown.deliveryReliability,
      customerSatisfaction: aiOutput.breakdown.customerSatisfaction,
      recurringComplaints: aiOutput.breakdown.recurringComplaints,
      trustPatterns: aiOutput.breakdown.trustPatterns,
      scamReason: aiOutput.scamFlag.reason,
      generatedAt: new Date(),
      reviewCountAtGeneration: reviews.length,
    },
    update: {
      summaryText: aiOutput.reviewSummary,
      deliveryReliability: aiOutput.breakdown.deliveryReliability,
      customerSatisfaction: aiOutput.breakdown.customerSatisfaction,
      recurringComplaints: aiOutput.breakdown.recurringComplaints,
      trustPatterns: aiOutput.breakdown.trustPatterns,
      scamReason: aiOutput.scamFlag.reason,
      generatedAt: new Date(),
      reviewCountAtGeneration: reviews.length,
    },
  });

  // 7. Update vendor's cached trust score, scam flag, and moderation flag
  await prisma.vendor.update({
    where: { id: vendorId },
    data: {
      trustScore: trustScore.score,
      trustLabel: trustScore.label,
      scamFlag: aiOutput.scamFlag.triggered,
      moderationFlag: aiOutput.moderationFlag.triggered,
    },
  });

  return aiOutput;
}

/**
 * Check if multiple reviews were submitted in a short window
 * with near-identical text (suspected fake/coordinated reviews).
 */
function checkSuspiciousReviewPattern(
  dbReviews: Pick<Review, 'id' | 'createdAt' | 'reviewText'>[],
  _formattedReviews: AiReview[],
): boolean {
  const WINDOW_MS = 60 * 60 * 1000; // 1 hour
  const SIMILARITY_THRESHOLD = 3; // minimum matching reviews to trigger

  for (let i = 0; i < dbReviews.length; i++) {
    let matchCount = 1;

    for (let j = i + 1; j < dbReviews.length; j++) {
      const timeDiff = Math.abs(dbReviews[i].createdAt.getTime() - dbReviews[j].createdAt.getTime());
      if (timeDiff > WINDOW_MS) continue;

      const a = dbReviews[i].reviewText.trim().toLowerCase().slice(0, 60);
      const b = dbReviews[j].reviewText.trim().toLowerCase().slice(0, 60);
      
      // Enforce a minimum length of 15 characters to avoid false positives on common generic words
      if (a.length >= 15 && a === b) {
        matchCount++;
      }
    }

    if (matchCount >= SIMILARITY_THRESHOLD) {
      return true;
    }
  }

  return false;
}

function buildFallbackOutput(status: AiSummaryOutput['status'], reviewCount: number): AiSummaryOutput {
  return {
    status,
    trustScore: { score: null, label: null, basedOn: reviewCount },
    reviewSummary: null,
    breakdown: {
      deliveryReliability: null,
      customerSatisfaction: null,
      recurringComplaints: [],
      trustPatterns: null,
    },
    classifications: [],
    scamFlag: { triggered: status === 'scam_flag_triggered', reason: null },
    moderationFlag: { triggered: false, reason: null },
    generatedAt: new Date(),
  };
}
```

---

## AI Provider — Swap This File to Change Providers

```typescript
// server/src/services/ai.provider.ts
// Replace the implementation inside callAiProvider() when switching providers.
// The function signature and return type must never change.

import type { AiReviewInput, AiSummaryOutput } from '../types/ai';

export async function callAiProvider(input: AiReviewInput): Promise<AiSummaryOutput> {
  const apiKey = process.env.AI_API_KEY;
  const apiUrl = process.env.AI_API_URL;

  if (!apiKey || !apiUrl) {
    throw new Error('AI provider not configured');
  }

  // Build the prompt from review data
  const reviewsText = input.reviews
    .map((r, i) => `ReviewId: "${r.reviewId}" | Rating: ${r.rating}/5 | Verified: ${r.verifiedBuyer} | Review: ${r.reviewText}`)
    .join('\n');

  const prompt = `
You are processing vendor review data for VerifyNG, a vendor reputation platform.
Analyze the following ${input.reviews.length} reviews for vendor "${input.vendorName ?? 'Unknown'}".

REVIEWS:
${reviewsText}

Return a JSON object with this exact structure and no other text:
{
  "status": "success",
  "reviewSummary": "150 words max plain-language summary",
  "breakdown": {
    "deliveryReliability": "short insight",
    "customerSatisfaction": "short insight",
    "recurringComplaints": ["complaint 1", "complaint 2"],
    "trustPatterns": "observed pattern"
  },
  "classifications": [
    ${input.reviews.map(r => `{"reviewId": "${r.reviewId}", "scamPattern": "none"}`).join(',\n    ')}
  ],
  "moderationFlag": {
    "triggered": false,
    "reason": null
  }
}

RULES:
- Use plain English understandable to everyday Nigerian online shoppers
- Never use absolute verdicts like "confirmed scammer" or "guaranteed safe"
- Frame all insights as patterns observed from community data
- Classify the "scamPattern" for each review inside the "classifications" array. Set "scamPattern" to:
  * "non_delivery" if the review explicitly mentions non-delivery of items/services after payment.
  * "blocked" if the review explicitly mentions being blocked by the vendor after payment.
  * "wrong_item" if the review explicitly mentions receiving items completely different from what was ordered/listed.
  * "none" if none of these patterns are observed.
- Set moderationFlag.triggered to true if reviews appear coordinated, written by the same user, or fake
`;

  // --- Replace from here when switching providers ---
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      // Adjust this body structure for your chosen provider
      prompt,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI provider error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content ?? data.choices?.[0]?.message?.content ?? '';
  // --- Replace to here ---

  try {
    const parsed = JSON.parse(text);
    return {
      ...parsed,
      scamFlag: { triggered: false, reason: null }, // computed programmatically in service
      trustScore: { score: null, label: null, basedOn: input.reviews.length }, // computed separately
      generatedAt: new Date(),
    };
  } catch {
    throw new Error('AI provider returned invalid JSON');
  }
}
```

---

## Trust Score Computation (Local — No AI)

Trust score is computed locally from review data, not by the AI provider:

```typescript
// server/src/utils/trustScore.ts

interface ReviewForScoring {
  rating: number;
  verifiedBuyer: boolean;
  createdAt: Date;
}

interface TrustScoreResult {
  score: number;
  label: string;
}

export function computeTrustScore(reviews: ReviewForScoring[]): TrustScoreResult {
  if (reviews.length === 0) return { score: 0, label: 'Unrated' };

  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  let weightedSum = 0;
  let weightTotal = 0;

  for (const review of reviews) {
    const isRecent = review.createdAt >= ninetyDaysAgo;
    const isVerified = review.verifiedBuyer;
    const recencyWeight = isRecent ? 1.1 : 1.0;       // 10% recency signal
    const verifiedWeight = isVerified ? 1.1 : 1.0;    // 10% verified buyer signal
    const weight = recencyWeight * verifiedWeight;

    // Normalise 1–5 rating to 0–10 scale
    const normalised = (review.rating / 5) * 10;
    weightedSum += normalised * weight;
    weightTotal += weight;
  }

  const score = parseFloat((weightedSum / weightTotal).toFixed(1));
  const label = getTrustLabel(score);

  return { score, label };
}

function getTrustLabel(score: number): string {
  if (score >= 8.5) return 'Highly Trusted';
  if (score >= 7.0) return 'Mostly Reliable';
  if (score >= 5.0) return 'Proceed with Caution';
  if (score >= 3.0) return 'Poor Track Record';
  return 'High Risk';
}
```

---

## Fallback States — UI Display Reference

| Status | What the UI Shows |
|---|---|
| `insufficient_data` | "Not enough reviews yet. Check back as the community grows." |
| `vendor_not_found` | "This vendor hasn't been reviewed yet. Be the first to leave a review." |
| `summary_unavailable` | "Summary temporarily unavailable. Reviews are still visible below." |
| `scam_flag_triggered` | ⚠️ Scam Alert banner at top of profile |
| `inconclusive_summary` | Summary + caution note: "Reviews are mixed. Consider starting with a small order." |
| `success` | Full summary, breakdown cards, and trust score rendered |

---

## Trigger Conditions

The AI summarization feature is triggered:

1. **On every new review submission** — call `generateVendorSummary(vendorId)` at the end of the review service after saving the review
2. **On a 24-hour scheduled refresh** — for vendors with 10+ reviews (post-MVP; implement as a cron job)

