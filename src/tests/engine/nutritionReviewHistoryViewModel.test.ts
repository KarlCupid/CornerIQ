import { describe, expect, it } from "vitest";
import type { NutritionSafetyReviewEvent, PersistedNutritionSafetyReview } from "../../engine/core/types";
import { buildNutritionReviewHistoryViewModel } from "../../engine/presentation/nutritionReviewHistoryViewModel";
import { fixtureAsOfDate } from "../fixtures/engineFixtures";

function review(overrides: Partial<PersistedNutritionSafetyReview> = {}): PersistedNutritionSafetyReview {
  return {
    id: "review_1",
    userId: "user_1",
    asOfDate: fixtureAsOfDate,
    reviewType: "weight_class",
    status: "requested",
    severity: "critical",
    hardStop: true,
    blockingFlags: ["acute_protocol_blocked"],
    reasons: ["Qualified review is required before weight-class pressure continues."],
    suggestedNextSteps: ["Keep regular meals and fluids steady."],
    sourcePayload: { source: "test" },
    reviewerUserId: null,
    reviewerRole: null,
    reviewedAt: null,
    engineVersion: "0.2.0",
    inputHash: "input",
    outputHash: "output",
    createdAt: "2026-05-19T00:00:00.000Z",
    updatedAt: "2026-05-19T00:00:00.000Z",
    ...overrides
  };
}

function event(overrides: Partial<NutritionSafetyReviewEvent> = {}): NutritionSafetyReviewEvent {
  return {
    id: "event_1",
    userId: "user_1",
    nutritionSafetyReviewId: "review_1",
    eventType: "requested",
    actorType: "engine",
    actorUserId: "user_1",
    eventPayload: { reason: "Engine requested review." },
    createdAt: "2026-05-19T01:00:00.000Z",
    ...overrides
  };
}

describe("nutritionReviewHistoryViewModel", () => {
  it("renders active hard-stop reviews and review events without a self-clear action", () => {
    const viewModel = buildNutritionReviewHistoryViewModel({
      activeReviews: [review()],
      reviewEvents: [event()],
      currentSafetyReview: {
        required: true,
        reasons: ["Review required."],
        blockingFlags: ["acute_protocol_blocked"],
        suggestedNextSteps: ["Keep food and fluids steady."],
        professionalReviewCopy: "Review required before this plan can continue."
      },
      asOfDate: fixtureAsOfDate
    });

    expect(viewModel.activeReviewCount).toBe(1);
    expect(viewModel.hardStopReviewCount).toBe(1);
    expect(viewModel.activeReviews[0]?.hardStop).toBe(true);
    expect(viewModel.activeReviews[0]?.canSelfClear).toBe(false);
    expect("clearAction" in (viewModel.activeReviews[0] ?? {})).toBe(false);
    expect(viewModel.historyEvents[0]?.summary).toContain("Engine requested review");
  });

  it("keeps acknowledged reviews active and still says the athlete cannot self-clear", () => {
    const viewModel = buildNutritionReviewHistoryViewModel({
      activeReviews: [review({ status: "acknowledged" })],
      reviewEvents: [event({ eventType: "acknowledged", actorType: "athlete", eventPayload: {} })],
      currentSafetyReview: {
        required: true,
        reasons: ["Review required."],
        blockingFlags: [],
        suggestedNextSteps: ["Watch symptoms."],
        professionalReviewCopy: "Review is active."
      },
      asOfDate: fixtureAsOfDate
    });

    expect(viewModel.activeReviews[0]?.status).toBe("acknowledged_by_athlete");
    expect(viewModel.activeReviews[0]?.canAcknowledge).toBe(false);
    expect(viewModel.safetyCopy).toContain("cannot self-clear");
    expect(viewModel.historyEvents[0]?.summary).toContain("does not clear the plan");
  });

  it("renders no-history and future reviewer copy without implying a review happened", () => {
    const viewModel = buildNutritionReviewHistoryViewModel({
      activeReviews: [],
      reviewEvents: [],
      currentSafetyReview: {
        required: false,
        reasons: [],
        blockingFlags: [],
        suggestedNextSteps: [],
        professionalReviewCopy: "No review gate active."
      },
      asOfDate: fixtureAsOfDate
    });

    expect(viewModel.noHistoryCopy).toContain("No review events");
    expect(viewModel.reviewerFutureCopy).toContain("server-side identity");
    expect(viewModel.urgentSupportCopy).toContain("urgent symptoms");
    expect(JSON.stringify(viewModel)).not.toContain("doctor approved");
  });
});
