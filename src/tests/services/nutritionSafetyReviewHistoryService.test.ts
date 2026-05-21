import { describe, expect, it, vi } from "vitest";
import type { NutritionSafetyReviewEvent, PersistedNutritionSafetyReview } from "../../engine/core/types";
import { loadNutritionSafetyReviewHistory } from "../../services/nutrition/loadNutritionSafetyReviewHistory";
import type { AthleteJourneyRepositories } from "../../services/supabase/loadAthleteJourney";
import { RepositoryError } from "../../services/supabase/repositoryTypes";
import { fixtureAsOfDate } from "../fixtures/engineFixtures";

function review(): PersistedNutritionSafetyReview {
  return {
    id: "review_1",
    userId: "user_1",
    asOfDate: fixtureAsOfDate,
    reviewType: "under_fueling",
    status: "requested",
    severity: "high",
    hardStop: false,
    blockingFlags: [],
    reasons: ["Manual review requested."],
    suggestedNextSteps: ["Keep manual fuel logs coming."],
    sourcePayload: { source: "test" },
    reviewerUserId: null,
    reviewerRole: null,
    reviewedAt: null,
    engineVersion: "0.2.0",
    inputHash: "input",
    outputHash: "output",
    createdAt: "2026-05-19T00:00:00.000Z",
    updatedAt: "2026-05-19T00:00:00.000Z"
  };
}

function event(): NutritionSafetyReviewEvent {
  return {
    id: "event_1",
    userId: "user_1",
    nutritionSafetyReviewId: "review_1",
    eventType: "requested",
    actorType: "engine",
    actorUserId: "user_1",
    eventPayload: { reason: "Active and historical review event loaded." },
    createdAt: "2026-05-19T01:00:00.000Z"
  };
}

describe("loadNutritionSafetyReviewHistory", () => {
  it("loads active reviews and historical events into a view-model-ready shape", async () => {
    const repository = {
      listActiveNutritionSafetyReviews: vi.fn(async () => [review()]),
      listRecentNutritionSafetyReviewEvents: vi.fn(async () => [event()])
    };
    const viewModel = await loadNutritionSafetyReviewHistory({
      userId: "user_1",
      asOfDate: fixtureAsOfDate,
      currentSafetyReview: {
        required: false,
        reasons: [],
        blockingFlags: [],
        suggestedNextSteps: [],
        professionalReviewCopy: "No current review gate."
      },
      repositories: { nutritionSafetyReview: repository as unknown as NonNullable<AthleteJourneyRepositories["nutritionSafetyReview"]> },
      limit: 10
    });

    expect(repository.listActiveNutritionSafetyReviews).toHaveBeenCalledWith("user_1");
    expect(repository.listRecentNutritionSafetyReviewEvents).toHaveBeenCalledWith("user_1", 10);
    expect(viewModel.activeReviewCount).toBe(1);
    expect(viewModel.historyEvents[0]?.summary).toContain("Active and historical review event loaded");
    expect(viewModel.activeReviews[0]?.canSelfClear).toBe(false);
  });

  it("blocks missing user id before loading repository history", async () => {
    const repository = {
      listActiveNutritionSafetyReviews: vi.fn(),
      listRecentNutritionSafetyReviewEvents: vi.fn()
    };

    await expect(
      loadNutritionSafetyReviewHistory({
        userId: "",
        asOfDate: fixtureAsOfDate,
        currentSafetyReview: {
          required: false,
          reasons: [],
          blockingFlags: [],
          suggestedNextSteps: [],
          professionalReviewCopy: "No current review gate."
        },
        repositories: { nutritionSafetyReview: repository as unknown as NonNullable<AthleteJourneyRepositories["nutritionSafetyReview"]> }
      })
    ).rejects.toBeInstanceOf(RepositoryError);
    expect(repository.listActiveNutritionSafetyReviews).not.toHaveBeenCalled();
  });
});
