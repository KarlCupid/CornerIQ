import type { ISODateString, NutritionSafetyReview, NutritionSafetyReviewEvent, PersistedNutritionSafetyReview } from "../core/types";

export interface NutritionReviewHistoryActiveReview {
  reviewId: string;
  status: PersistedNutritionSafetyReview["status"];
  reviewType: PersistedNutritionSafetyReview["reviewType"];
  severity: PersistedNutritionSafetyReview["severity"];
  hardStop: boolean;
  reasons: readonly string[];
  blockingFlags: readonly string[];
  suggestedNextSteps: readonly string[];
  requestedAt: string;
  canAcknowledge: boolean;
  canSelfClear: false;
}

export interface NutritionReviewHistoryEventView {
  date: string;
  eventType: NutritionSafetyReviewEvent["eventType"];
  actorType: NutritionSafetyReviewEvent["actorType"];
  summary: string;
}

export interface NutritionReviewHistoryViewModel {
  title: string;
  activeReviewCount: number;
  hardStopReviewCount: number;
  latestReviewSummary: string;
  activeReviews: readonly NutritionReviewHistoryActiveReview[];
  historyEvents: readonly NutritionReviewHistoryEventView[];
  noHistoryCopy: string;
  safetyCopy: string;
  reviewerFutureCopy: string;
}

function uniqueActiveReviews(
  activeReviews: readonly PersistedNutritionSafetyReview[],
  currentSafetyReview: NutritionSafetyReview
): readonly PersistedNutritionSafetyReview[] {
  const byId = new Map<string, PersistedNutritionSafetyReview>();
  for (const review of activeReviews) {
    byId.set(review.id, review);
  }
  if (currentSafetyReview.activeReview) {
    byId.set(currentSafetyReview.activeReview.id, currentSafetyReview.activeReview);
  }
  return [...byId.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function eventSummary(event: NutritionSafetyReviewEvent): string {
  const reason = typeof event.eventPayload.reason === "string" ? event.eventPayload.reason : null;
  const message = typeof event.eventPayload.message === "string" ? event.eventPayload.message : null;
  const summary = reason ?? message;
  if (summary) {
    return `${event.eventType.replaceAll("_", " ")} by ${event.actorType}: ${summary}`;
  }
  if (event.eventType === "acknowledged") {
    return "Acknowledged by athlete. This does not clear the plan.";
  }
  if (event.eventType === "cleared_by_reviewer") {
    return "Permissioned reviewer clear event is persisted.";
  }
  return `${event.eventType.replaceAll("_", " ")} by ${event.actorType}.`;
}

export function buildNutritionReviewHistoryViewModel(input: {
  activeReviews: readonly PersistedNutritionSafetyReview[];
  reviewEvents: readonly NutritionSafetyReviewEvent[];
  currentSafetyReview: NutritionSafetyReview;
  asOfDate: ISODateString;
}): NutritionReviewHistoryViewModel {
  const activeReviews = uniqueActiveReviews(input.activeReviews, input.currentSafetyReview);
  const hardStopReviewCount = activeReviews.filter((review) => review.hardStop).length;
  const latestReview = activeReviews[0] ?? null;
  return {
    title: "Nutrition review history",
    activeReviewCount: activeReviews.length,
    hardStopReviewCount,
    latestReviewSummary: latestReview
      ? `${latestReview.reviewType.replaceAll("_", " ")} review is ${latestReview.status.replaceAll("_", " ")} as of ${input.asOfDate}.`
      : "No active nutrition safety review is loaded.",
    activeReviews: activeReviews.map((review) => ({
      reviewId: review.id,
      status: review.status,
      reviewType: review.reviewType,
      severity: review.severity,
      hardStop: review.hardStop,
      reasons: review.reasons,
      blockingFlags: review.blockingFlags,
      suggestedNextSteps: review.suggestedNextSteps,
      requestedAt: review.createdAt,
      canAcknowledge: review.status === "requested" || review.status === "blocked",
      canSelfClear: false
    })),
    historyEvents: [...input.reviewEvents]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((event) => ({
        date: event.createdAt.slice(0, 10),
        eventType: event.eventType,
        actorType: event.actorType,
        summary: eventSummary(event)
      })),
    noHistoryCopy: "No review events are loaded yet. Active hard stops still remain active.",
    safetyCopy: "This does not clear the plan. Athletes cannot self-clear nutrition hard stops.",
    reviewerFutureCopy: "Reviewer-clear workflow is not exposed in the app yet. A future permissioned reviewer event must be persisted before any clear state is shown."
  };
}
