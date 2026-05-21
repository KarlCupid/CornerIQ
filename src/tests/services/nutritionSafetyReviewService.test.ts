import { describe, expect, it, vi } from "vitest";
import {
  acknowledgeNutritionSafetyReview,
  requestNutritionSafetyReview,
  type NutritionSafetyReviewRepositories
} from "../../services/nutrition/requestNutritionSafetyReview";
import type { NutritionSafetyReview, PersistedNutritionSafetyReview } from "../../engine/core/types";

const requiredReview: NutritionSafetyReview = {
  required: true,
  reasons: ["Same-day acute loss is blocked."],
  blockingFlags: ["acute_protocol_blocked"],
  suggestedNextSteps: ["Pause weight-class pressure."],
  professionalReviewCopy: "Review required before this plan can continue. The app will not let an athlete self-clear a hard stop."
};

function persistedReview(overrides: Partial<PersistedNutritionSafetyReview> = {}): PersistedNutritionSafetyReview {
  return {
    id: "review_1",
    userId: "user_1",
    asOfDate: "2026-05-19",
    reviewType: "weight_class",
    status: "requested",
    severity: "critical",
    hardStop: true,
    blockingFlags: ["acute_protocol_blocked"],
    reasons: ["Same-day acute loss is blocked."],
    suggestedNextSteps: ["Pause weight-class pressure."],
    sourcePayload: { source: "fuel_command_center" },
    reviewerUserId: null,
    reviewerRole: null,
    reviewedAt: null,
    engineVersion: "0.2.0",
    inputHash: "input_hash",
    outputHash: "output_hash",
    createdAt: "2026-05-19T00:00:00.000Z",
    updatedAt: "2026-05-19T00:00:00.000Z",
    ...overrides
  };
}

function repositories(overrides: Partial<NutritionSafetyReviewRepositories["nutritionSafetyReview"]> = {}): NutritionSafetyReviewRepositories {
  return {
    journey: { appendEvent: vi.fn(async () => ({ id: "journey_event_1" })) },
    nutritionSafetyReview: {
      upsertNutritionSafetyReview: vi.fn(async () => ({ lifecycle: "created" as const, review: persistedReview() })),
      listActiveNutritionSafetyReviews: vi.fn(),
      listNutritionSafetyReviews: vi.fn(),
      listNutritionSafetyReviewEvents: vi.fn(),
      listRecentNutritionSafetyReviewEvents: vi.fn(),
      getNutritionSafetyReviewById: vi.fn(),
      appendNutritionSafetyReviewEvent: vi.fn(async () => ({
        id: "review_event_1",
        userId: "user_1",
        nutritionSafetyReviewId: "review_1",
        eventType: "requested" as const,
        actorType: "athlete" as const,
        actorUserId: "user_1",
        eventPayload: {},
        createdAt: "2026-05-19T00:00:00.000Z"
      })),
      acknowledgeNutritionSafetyReview: vi.fn(async () => persistedReview({ status: "acknowledged" })),
      supersedeNutritionSafetyReviews: vi.fn(),
      ...overrides
    }
  };
}

describe("requestNutritionSafetyReview", () => {
  it("persists a review, appends review and journey events, and keeps hard stops active", async () => {
    const repo = repositories();
    const result = await requestNutritionSafetyReview({
      userId: "user_1",
      asOfDate: "2026-05-19",
      review: requiredReview,
      engineVersion: "0.2.0",
      inputHash: "input_hash",
      outputHash: "output_hash",
      repositories: repo
    });

    expect(result).toMatchObject({
      status: "requested",
      reviewId: "review_1",
      eventId: "review_event_1",
      journeyEventId: "journey_event_1",
      hardStopRemains: true
    });
    expect(repo.nutritionSafetyReview.upsertNutritionSafetyReview).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewType: "weight_class",
        hardStop: true,
        blockingFlags: ["acute_protocol_blocked"]
      })
    );
    expect(repo.nutritionSafetyReview.appendNutritionSafetyReviewEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "requested" }));
    expect(repo.journey.appendEvent).toHaveBeenCalledWith("user_1", "NutritionSafetyReviewRequested", expect.objectContaining({ reviewId: "review_1", hardStopRemains: true }));
  });

  it("returns already_active for idempotent duplicate requests", async () => {
    const repo = repositories({
      upsertNutritionSafetyReview: vi.fn(async () => ({ lifecycle: "existing" as const, review: persistedReview({ status: "acknowledged" }) }))
    });
    const result = await requestNutritionSafetyReview({
      userId: "user_1",
      asOfDate: "2026-05-19",
      review: requiredReview,
      engineVersion: "0.2.0",
      inputHash: "input_hash",
      outputHash: "output_hash",
      repositories: repo
    });

    expect(result).toMatchObject({ status: "already_active", reviewId: "review_1", hardStopRemains: true });
    expect(repo.nutritionSafetyReview.appendNutritionSafetyReviewEvent).not.toHaveBeenCalled();
    expect(repo.journey.appendEvent).not.toHaveBeenCalled();
  });

  it("does not create a self-clear event when no review is required", async () => {
    const repo = repositories();
    const result = await requestNutritionSafetyReview({
      userId: "user_1",
      asOfDate: "2026-05-19",
      review: {
        required: false,
        reasons: [],
        blockingFlags: [],
        suggestedNextSteps: [],
        professionalReviewCopy: "No professional review gate is active for today."
      },
      engineVersion: "0.2.0",
      inputHash: "input_hash",
      outputHash: "output_hash",
      repositories: repo
    });

    expect(result.status).toBe("not_required");
    expect(result.hardStopRemains).toBe(false);
    expect(repo.nutritionSafetyReview.upsertNutritionSafetyReview).not.toHaveBeenCalled();
    expect(repo.journey.appendEvent).not.toHaveBeenCalled();
  });

  it("returns a useful error when persistence fails", async () => {
    const repo = repositories({
      upsertNutritionSafetyReview: vi.fn(async () => {
        throw new Error("remote insert failed");
      })
    });
    const result = await requestNutritionSafetyReview({
      userId: "user_1",
      asOfDate: "2026-05-19",
      review: requiredReview,
      engineVersion: "0.2.0",
      inputHash: "input_hash",
      outputHash: "output_hash",
      repositories: repo
    });

    expect(result.status).toBe("error");
    expect(result.message).toContain("remote insert failed");
    expect(result.hardStopRemains).toBe(true);
  });

  it("blocks missing userId without calling persistence", async () => {
    const repo = repositories();
    const result = await requestNutritionSafetyReview({
      userId: "",
      asOfDate: "2026-05-19",
      review: requiredReview,
      engineVersion: "0.2.0",
      inputHash: "input_hash",
      outputHash: "output_hash",
      repositories: repo
    });

    expect(result.status).toBe("error");
    expect(repo.nutritionSafetyReview.upsertNutritionSafetyReview).not.toHaveBeenCalled();
  });

  it("acknowledges without clearing a hard stop and exposes no clear method", async () => {
    const repo = repositories();
    const result = await acknowledgeNutritionSafetyReview({
      userId: "user_1",
      reviewId: "review_1",
      repositories: { nutritionSafetyReview: repo.nutritionSafetyReview }
    });

    expect(result).toMatchObject({ status: "acknowledged", hardStopRemains: true });
    expect(repo.nutritionSafetyReview.acknowledgeNutritionSafetyReview).toHaveBeenCalledWith("user_1", "review_1");
    expect("clearNutritionSafetyReview" in repo.nutritionSafetyReview).toBe(false);
  });
});
