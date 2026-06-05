export const REVIEWER_ROLES = ["coach", "clinician", "dietitian", "admin"] as const;
export const REVIEWER_TARGET_STATUSES = ["reviewer_reviewing", "cleared_by_reviewer", "not_cleared"] as const;

export type ReviewerRole = (typeof REVIEWER_ROLES)[number];
export type ReviewerTargetStatus = (typeof REVIEWER_TARGET_STATUSES)[number];

export interface ReviewNutritionSafetyPolicyInput {
  callerUserId: string;
  reviewerRole: string;
  relationshipActive: boolean;
  requestedStatus: string;
}

export function evaluateReviewNutritionSafetyPolicy(input: ReviewNutritionSafetyPolicyInput): { allowed: boolean; reason: string } {
  if (!input.callerUserId) {
    return { allowed: false, reason: "Authenticated reviewer identity is required." };
  }
  if (!REVIEWER_ROLES.includes(input.reviewerRole as ReviewerRole)) {
    return { allowed: false, reason: "Unsupported reviewer role." };
  }
  if (!input.relationshipActive) {
    return { allowed: false, reason: "Active relationship permission is required before reviewer action." };
  }
  if (!REVIEWER_TARGET_STATUSES.includes(input.requestedStatus as ReviewerTargetStatus)) {
    return { allowed: false, reason: "Unsupported nutrition review transition." };
  }
  return { allowed: true, reason: "Trusted reviewer transition is allowed and must be audited." };
}
