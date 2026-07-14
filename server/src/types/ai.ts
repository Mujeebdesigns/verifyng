/** Input structure sent to the AI provider for summary generation */
export interface AiReviewInput {
  vendorId: string;
  vendorName: string | null;
  reviews: AiReview[];
  totalReviewCount: number;
}

/** Individual review data passed to the AI provider */
export interface AiReview {
  reviewId: string;
  rating: number;
  reviewText: string;
  dateSubmitted: Date;
  verifiedBuyer: boolean;
}

/** Classification of a single review returned by the AI provider */
export interface AiReviewClassification {
  reviewId: string;
  scamPattern: 'non_delivery' | 'blocked' | 'wrong_item' | 'none';
}

/** Full output from the AI provider (before programmatic scam/moderation checks) */
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

/** Status of the AI summary for a vendor */
export type AiOutputStatus =
  | 'success'
  | 'insufficient_data'
  | 'vendor_not_found'
  | 'ambiguous_match'
  | 'inconclusive_summary'
  | 'scam_flag_triggered'
  | 'summary_unavailable';
