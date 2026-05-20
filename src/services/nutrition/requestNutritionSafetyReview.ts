import type { ISODateString, NutritionSafetyReview } from "../../engine/core/types";
import type { AthleteJourneyRepositories } from "../supabase/loadAthleteJourney";
import { assertUserId } from "../supabase/repositoryTypes";

export type NutritionSafetyReviewRequestResult =
  | {
      status: "requested";
      eventId: string;
      hardStopRemains: boolean;
      message: string;
    }
  | {
      status: "not_required";
      hardStopRemains: false;
      message: string;
    };

export interface NutritionSafetyReviewRepositories {
  journey: Pick<AthleteJourneyRepositories["journey"], "appendEvent">;
}

export async function requestNutritionSafetyReview(input: {
  userId: string;
  asOfDate: ISODateString;
  review: NutritionSafetyReview;
  repositories: NutritionSafetyReviewRepositories;
}): Promise<NutritionSafetyReviewRequestResult> {
  const userId = assertUserId(input.userId, "requestNutritionSafetyReview");
  if (!input.review.required) {
    return {
      status: "not_required",
      hardStopRemains: false,
      message: "No nutrition safety review is required right now."
    };
  }

  const event = await input.repositories.journey.appendEvent(userId, "NutritionSafetyReviewRequested", {
    asOfDate: input.asOfDate,
    reasons: input.review.reasons,
    blockingFlags: input.review.blockingFlags,
    hardStopRemains: input.review.blockingFlags.length > 0,
    source: "fuel_command_center"
  });

  return {
    status: "requested",
    eventId: event.id,
    hardStopRemains: input.review.blockingFlags.length > 0,
    message: "Review need logged. Hard stops remain active until a future explicit review workflow clears them."
  };
}
