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
  eventLabel: string;
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
  qualifiedSupportCopy: string;
  urgentSupportCopy: string;
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
  if (event.eventType === "acknowledged" || event.eventType === "acknowledged_by_athlete") {
    return "Acknowledged by athlete. This does not clear the plan.";
  }
  if (event.eventType === "reviewer_reviewing" || event.eventType === "reviewer_assigned" || event.eventType === "reviewer_note") {
    return "Qualified support event is recorded outside the athlete app controls.";
  }
  if (event.eventType === "cleared_by_reviewer" || event.eventType === "not_cleared") {
    return "Qualified support status event is recorded. Athlete self-clear remains unavailable.";
  }
  return `${event.eventType.replaceAll("_", " ")} by ${event.actorType}.`;
}

function statusDisplay(status: PersistedNutritionSafetyReview["status"]): PersistedNutritionSafetyReview["status"] {
  if (status === "acknowledged") {
    return "acknowledged_by_athlete";
  }
  if (status === "in_review" || status === "reviewer_reviewing" || status === "not_cleared" || status === "blocked") {
    return "requested";
  }
  if (status === "cleared_by_reviewer") {
    return "superseded";
  }
  return status;
}

function eventLabel(eventType: NutritionSafetyReviewEvent["eventType"]): string {
  if (eventType === "reviewer_reviewing" || eventType === "reviewer_assigned" || eventType === "reviewer_note") {
    return "qualified support";
  }
  if (eventType === "cleared_by_reviewer" || eventType === "not_cleared") {
    return "support status";
  }
  return eventType.replaceAll("_", " ");
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
      ? `${latestReview.reviewType.replaceAll("_", " ")} review is ${statusDisplay(latestReview.status).replaceAll("_", " ")} as of ${input.asOfDate}.`
      : "No active nutrition safety stop is loaded.",
    activeReviews: activeReviews.map((review) => ({
      reviewId: review.id,
      status: statusDisplay(review.status),
      reviewType: review.reviewType,
      severity: review.severity,
      hardStop: review.hardStop,
      reasons: review.reasons,
      blockingFlags: review.blockingFlags,
      suggestedNextSteps: review.suggestedNextSteps,
      requestedAt: review.createdAt,
      canAcknowledge: review.status === "requested" || review.status === "blocked" || review.status === "not_cleared",
      canSelfClear: false
    })),
    historyEvents: [...input.reviewEvents]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((event) => ({
        date: event.createdAt.slice(0, 10),
        eventType: event.eventType,
        eventLabel: eventLabel(event.eventType),
        actorType: event.actorType,
        summary: eventSummary(event)
      })),
    noHistoryCopy: "No review events are loaded yet. Active safety stops still remain active.",
    safetyCopy: "You cannot clear nutrition safety stops yourself.",
    qualifiedSupportCopy: "CornerIQ cannot clear safety stops in the app. Seek qualified support outside the app when a safety stop is active.",
    urgentSupportCopy: "For urgent symptoms or unsafe weight concerns, stop and seek qualified support outside the app."
  };
}
