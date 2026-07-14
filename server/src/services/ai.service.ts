import { prisma } from '../utils/prisma.js';
import { callAiProvider } from './ai.provider.js';
import { computeTrustScore } from '../utils/trustScore.js';
import { logger } from '../utils/logger.js';
import type { AiReviewInput, AiSummaryOutput } from '../types/ai.js';

const MIN_REVIEWS_FOR_SUMMARY = 3;

// Scam detection thresholds — computed programmatically, never by LLM
const SCAM_THRESHOLDS = {
  nonDelivery: 0.4,        // 40%+ mention non-delivery
  blockedAfterPayment: 0.2, // 20%+ mention being blocked
  wrongItem: 0.3,           // 30%+ mention wrong items
} as const;

/**
 * Generate or update the AI summary for a vendor.
 *
 * Orchestration logic:
 * 1. Enforce minimum review threshold (3 reviews)
 * 2. Compute trust score locally (no AI dependency for scoring)
 * 3. Call AI provider for summary + review classifications
 * 4. Compute scam flags programmatically from AI classifications
 * 5. Check for suspicious review patterns (moderation flag)
 * 6. Upsert VendorSummary and update Vendor cached fields
 *
 * Source: agents/skills/ai-integration/SKILL.md
 */
export async function generateVendorSummary(vendorId: string): Promise<void> {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) return;

  const reviews = await prisma.review.findMany({
    where: { vendorId, isFlagged: false },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      rating: true,
      reviewText: true,
      verifiedBuyer: true,
      createdAt: true,
    },
  });

  // Enforce minimum review threshold
  if (reviews.length < MIN_REVIEWS_FOR_SUMMARY) {
    return;
  }

  // Compute trust score locally (no AI dependency)
  const { score, label } = computeTrustScore(reviews);

  // Update trust score immediately (even if AI call fails)
  await prisma.vendor.update({
    where: { id: vendorId },
    data: { trustScore: score, trustLabel: label },
  });

  // Build AI input
  const aiInput: AiReviewInput = {
    vendorId,
    vendorName: vendor.businessName,
    reviews: reviews.map((r) => ({
      reviewId: r.id,
      rating: r.rating,
      reviewText: r.reviewText,
      dateSubmitted: r.createdAt,
      verifiedBuyer: r.verifiedBuyer,
    })),
    totalReviewCount: reviews.length,
  };

  // Call AI provider — graceful degradation if unavailable
  let aiOutput: AiSummaryOutput | null = null;
  try {
    aiOutput = await callAiProvider(aiInput);
  } catch (error) {
    logger.error('AI provider call failed (degrading gracefully)', error);
    return; // Vendor profile remains accessible with raw reviews
  }

  if (!aiOutput) return;

  // Programmatically compute scam flags from AI classifications
  const totalReviews = aiOutput.classifications.length;
  let nonDeliveryCount = 0;
  let blockedCount = 0;
  let wrongItemCount = 0;

  for (const classification of aiOutput.classifications) {
    if (classification.scamPattern === 'non_delivery') nonDeliveryCount++;
    if (classification.scamPattern === 'blocked') blockedCount++;
    if (classification.scamPattern === 'wrong_item') wrongItemCount++;
  }

  const scamFlag =
    (totalReviews > 0 && nonDeliveryCount / totalReviews >= SCAM_THRESHOLDS.nonDelivery) ||
    (totalReviews > 0 && blockedCount / totalReviews >= SCAM_THRESHOLDS.blockedAfterPayment) ||
    (totalReviews > 0 && wrongItemCount / totalReviews >= SCAM_THRESHOLDS.wrongItem);

  // Determine scam reason
  let scamReason: string | null = null;
  if (scamFlag) {
    const reasons: string[] = [];
    if (nonDeliveryCount / totalReviews >= SCAM_THRESHOLDS.nonDelivery) {
      reasons.push(`${Math.round((nonDeliveryCount / totalReviews) * 100)}% of reviews report non-delivery after payment`);
    }
    if (blockedCount / totalReviews >= SCAM_THRESHOLDS.blockedAfterPayment) {
      reasons.push(`${Math.round((blockedCount / totalReviews) * 100)}% of reviews report being blocked after payment`);
    }
    if (wrongItemCount / totalReviews >= SCAM_THRESHOLDS.wrongItem) {
      reasons.push(`${Math.round((wrongItemCount / totalReviews) * 100)}% of reviews report receiving wrong items`);
    }
    scamReason = reasons.join('; ');
  }

  // Check for suspicious review patterns (moderation flag)
  const moderationFlag = detectSuspiciousPatterns(reviews);

  // Upsert vendor summary
  await prisma.vendorSummary.upsert({
    where: { vendorId },
    create: {
      vendorId,
      summaryText: aiOutput.reviewSummary,
      deliveryReliability: aiOutput.breakdown.deliveryReliability,
      customerSatisfaction: aiOutput.breakdown.customerSatisfaction,
      recurringComplaints: aiOutput.breakdown.recurringComplaints,
      trustPatterns: aiOutput.breakdown.trustPatterns,
      scamReason,
      reviewCountAtGeneration: reviews.length,
    },
    update: {
      summaryText: aiOutput.reviewSummary,
      deliveryReliability: aiOutput.breakdown.deliveryReliability,
      customerSatisfaction: aiOutput.breakdown.customerSatisfaction,
      recurringComplaints: aiOutput.breakdown.recurringComplaints,
      trustPatterns: aiOutput.breakdown.trustPatterns,
      scamReason,
      reviewCountAtGeneration: reviews.length,
      generatedAt: new Date(),
    },
  });

  // Update vendor flags
  await prisma.vendor.update({
    where: { id: vendorId },
    data: { scamFlag, moderationFlag },
  });
}

/**
 * Detect suspicious review patterns that trigger moderation flags.
 * Flags when multiple reviews are submitted in a short window with near-identical text.
 */
function detectSuspiciousPatterns(
  reviews: Array<{ reviewText: string; createdAt: Date }>,
): boolean {
  if (reviews.length < 3) return false;

  // Check for near-identical positive reviews submitted within a short window
  const SHORT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
  const SIMILARITY_THRESHOLD = 0.8;

  for (let i = 0; i < reviews.length; i++) {
    let similarCount = 0;
    for (let j = i + 1; j < reviews.length; j++) {
      const timeDiff = Math.abs(reviews[i].createdAt.getTime() - reviews[j].createdAt.getTime());
      if (timeDiff <= SHORT_WINDOW_MS) {
        const similarity = computeTextSimilarity(reviews[i].reviewText, reviews[j].reviewText);
        if (similarity >= SIMILARITY_THRESHOLD) {
          similarCount++;
        }
      }
    }
    // If 2+ near-identical reviews within the window, flag for moderation
    if (similarCount >= 2) {
      return true;
    }
  }

  return false;
}

/**
 * Simple text similarity based on word overlap (Jaccard similarity).
 * Sufficient for detecting copy-paste fake reviews.
 */
function computeTextSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));

  let intersection = 0;
  wordsA.forEach((word) => {
    if (wordsB.has(word)) {
      intersection++;
    }
  });

  const union = wordsA.size + wordsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
