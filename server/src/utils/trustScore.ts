import type { TrustLabel } from '../types/vendor.js';

interface ReviewForScore {
  rating: number;
  verifiedBuyer: boolean;
  createdAt: Date;
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const VERIFIED_BUYER_MULTIPLIER = 1.1;
const RECENCY_MULTIPLIER = 1.1;

/**
 * Compute the trust score (0.0–10.0) from community review data.
 *
 * Algorithm:
 * 1. Normalise each star rating (1–5) to a 0–10 scale
 * 2. Apply multipliers: verified buyer (1.1x), recency within 90 days (1.1x)
 * 3. Compute weighted average
 *
 * Source: AGENTS.md — Trust Score Weights
 */
export function computeTrustScore(reviews: ReviewForScore[]): {
  score: number;
  label: TrustLabel;
} {
  if (reviews.length === 0) {
    return { score: 0, label: 'High Risk' };
  }

  const now = Date.now();
  let weightedSum = 0;
  let totalWeight = 0;

  for (const review of reviews) {
    // Normalise 1–5 star rating to 0–10 scale
    const normalised = ((review.rating - 1) / 4) * 10;

    // Base weight
    let weight = 1.0;

    // Verified buyer multiplier
    if (review.verifiedBuyer) {
      weight *= VERIFIED_BUYER_MULTIPLIER;
    }

    // Recency multiplier: reviews within the last 90 days
    const ageMs = now - review.createdAt.getTime();
    if (ageMs <= NINETY_DAYS_MS) {
      weight *= RECENCY_MULTIPLIER;
    }

    weightedSum += normalised * weight;
    totalWeight += weight;
  }

  // Weighted average, capped at 10.0
  const score = Math.min(10, Math.round((weightedSum / totalWeight) * 10) / 10);

  return {
    score,
    label: getTrustLabel(score),
  };
}

/** Map a numeric trust score to its label. */
export function getTrustLabel(score: number): TrustLabel {
  if (score >= 8.5) return 'Highly Trusted';
  if (score >= 7.0) return 'Mostly Reliable';
  if (score >= 5.0) return 'Proceed with Caution';
  if (score >= 3.0) return 'Poor Track Record';
  return 'High Risk';
}
