import { describe, expect, it, vi } from "vitest";
import { requestNutritionSafetyReview } from "../../services/nutrition/requestNutritionSafetyReview";
import type { NutritionSafetyReview } from "../../engine/core/types";
import { RepositoryError } from "../../services/supabase/repositoryTypes";

const requiredReview: NutritionSafetyReview = {
  required: true,
  reasons: ["Same-day acute loss is blocked."],
  blockingFlags: ["acute_protocol_blocked"],
  suggestedNextSteps: ["Pause weight-class pressure."],
  professionalReviewCopy: "Review required before this plan can continue. The app will not let an athlete self-clear a hard stop."
};

describe("requestNutritionSafetyReview", () => {
  it("records a review-request event and keeps hard stops active", async () => {
    const appendEvent = vi.fn(async () => ({ id: "event_1" }));
    const result = await requestNutritionSafetyReview({
      userId: "user_1",
      asOfDate: "2026-05-19",
      review: requiredReview,
      repositories: { journey: { appendEvent } }
    });

    expect(result).toEqual({
      status: "requested",
      eventId: "event_1",
      hardStopRemains: true,
      message: "Review need logged. Hard stops remain active until a future explicit review workflow clears them."
    });
    expect(appendEvent).toHaveBeenCalledWith(
      "user_1",
      "NutritionSafetyReviewRequested",
      expect.objectContaining({
        blockingFlags: ["acute_protocol_blocked"],
        hardStopRemains: true,
        source: "fuel_command_center"
      })
    );
  });

  it("does not create a self-clear event when no review is required", async () => {
    const appendEvent = vi.fn(async () => ({ id: "event_1" }));
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
      repositories: { journey: { appendEvent } }
    });

    expect(result.status).toBe("not_required");
    expect(result.hardStopRemains).toBe(false);
    expect(appendEvent).not.toHaveBeenCalled();
  });

  it("blocks missing userId before persistence", async () => {
    await expect(
      requestNutritionSafetyReview({
        userId: "",
        asOfDate: "2026-05-19",
        review: requiredReview,
        repositories: { journey: { appendEvent: vi.fn() } }
      })
    ).rejects.toBeInstanceOf(RepositoryError);
  });
});
