import type { ISODateString, NutritionSafetyReview } from "../../engine/core/types";
import type { NutritionSafetyReviewRequest, NutritionSafetyReviewType } from "../../engine/nutrition/nutritionSafetyReviewTypes";
import type { AthleteJourneyRepositories } from "../supabase/loadAthleteJourney";
import { assertUserId } from "../supabase/repositoryTypes";

const ACTIVE_REVIEW_STATUSES = new Set(["requested", "acknowledged", "in_review", "blocked"]);

export type NutritionSafetyReviewRequestResult =
  | {
      status: "requested";
      reviewId: string;
      eventId: string;
      journeyEventId: string;
      hardStopRemains: boolean;
      message: string;
    }
  | {
      status: "already_active";
      reviewId: string;
      hardStopRemains: boolean;
      message: string;
    }
  | {
      status: "not_required";
      hardStopRemains: false;
      message: string;
    }
  | {
      status: "error";
      hardStopRemains: boolean;
      message: string;
    };

export type NutritionSafetyReviewAcknowledgeResult =
  | {
      status: "acknowledged";
      reviewId: string;
      eventId: string;
      hardStopRemains: boolean;
      message: string;
    }
  | {
      status: "error";
      reviewId: string;
      hardStopRemains: boolean;
      message: string;
    };

export interface NutritionSafetyReviewRepositories {
  journey: Pick<AthleteJourneyRepositories["journey"], "appendEvent">;
  nutritionSafetyReview: NonNullable<AthleteJourneyRepositories["nutritionSafetyReview"]>;
}

export interface BuildNutritionSafetyReviewRequestInput {
  userId: string;
  asOfDate: ISODateString;
  review: NutritionSafetyReview;
  engineVersion: string;
  inputHash: string;
  outputHash: string;
  reviewType?: NutritionSafetyReviewType | undefined;
  sourcePayload?: Record<string, unknown> | undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown nutrition safety review error";
}

function reviewTypeFrom(review: NutritionSafetyReview, sourcePayload: Record<string, unknown>): NutritionSafetyReviewType {
  const text = [...review.blockingFlags, ...review.reasons, JSON.stringify(sourcePayload)].join(" ").toLowerCase();
  if (text.includes("under") || text.includes("rapid_weight_loss") || text.includes("repeated_low_intake")) {
    return "under_fueling";
  }
  if (text.includes("cycle") || text.includes("bleeding") || text.includes("pregnancy")) {
    return "cycle_safety";
  }
  if (text.includes("rehydration") || text.includes("post_weigh_in")) {
    return "rehydration";
  }
  if (text.includes("tournament") || text.includes("daily weigh")) {
    return "tournament";
  }
  if (text.includes("fight_week") || text.includes("weigh_in")) {
    return "fight_week";
  }
  if (text.includes("medical") || text.includes("clinician")) {
    return "medical";
  }
  if (text.includes("weight") || text.includes("acute") || text.includes("class")) {
    return "weight_class";
  }
  return "general_nutrition";
}

export function buildNutritionSafetyReviewRequest(input: BuildNutritionSafetyReviewRequestInput): NutritionSafetyReviewRequest {
  const userId = assertUserId(input.userId, "requestNutritionSafetyReview.buildRequest");
  const hardStop = input.review.blockingFlags.length > 0 || Boolean(input.review.activeReview?.hardStop);
  const sourcePayload = {
    source: "fuel_command_center",
    ...(input.sourcePayload ?? {}),
    activeReviewId: input.review.activeReview?.id ?? null,
    activeReviewStatus: input.review.activeReview?.status ?? null
  };
  return {
    userId,
    asOfDate: input.asOfDate,
    reviewType: input.reviewType ?? reviewTypeFrom(input.review, sourcePayload),
    status: "requested",
    severity: hardStop ? "critical" : "high",
    hardStop,
    blockingFlags: [...new Set([...input.review.blockingFlags, ...(input.review.activeReview?.hardStop ? input.review.activeReview.blockingFlags : [])])],
    reasons: [...new Set(input.review.reasons.length > 0 ? input.review.reasons : input.review.activeReview?.reasons ?? ["Nutrition safety review is required."])],
    suggestedNextSteps: [...new Set(input.review.suggestedNextSteps)],
    sourcePayload,
    engineVersion: input.engineVersion,
    inputHash: input.inputHash,
    outputHash: input.outputHash
  };
}

export async function requestNutritionSafetyReview(input: {
  userId: string;
  asOfDate: ISODateString;
  review: NutritionSafetyReview;
  engineVersion: string;
  inputHash: string;
  outputHash: string;
  sourcePayload?: Record<string, unknown> | undefined;
  repositories: NutritionSafetyReviewRepositories;
}): Promise<NutritionSafetyReviewRequestResult> {
  const hardStopRemains = input.review.blockingFlags.length > 0 || Boolean(input.review.activeReview?.hardStop);
  try {
    const userId = assertUserId(input.userId, "requestNutritionSafetyReview");
    if (!input.review.required && !input.review.activeReview) {
      return {
        status: "not_required",
        hardStopRemains: false,
        message: "No nutrition safety review is required right now."
      };
    }

    const request = buildNutritionSafetyReviewRequest({
      userId,
      asOfDate: input.asOfDate,
      review: input.review,
      engineVersion: input.engineVersion,
      inputHash: input.inputHash,
      outputHash: input.outputHash,
      sourcePayload: input.sourcePayload
    });
    const persisted = await input.repositories.nutritionSafetyReview.upsertNutritionSafetyReview(request);
    if (persisted.lifecycle === "existing" && ACTIVE_REVIEW_STATUSES.has(persisted.review.status)) {
      return {
        status: "already_active",
        reviewId: persisted.review.id,
        hardStopRemains: persisted.review.hardStop,
        message: "Review is already active. Hard stops remain active until a future permissioned reviewer workflow clears them."
      };
    }

    const event = await input.repositories.nutritionSafetyReview.appendNutritionSafetyReviewEvent({
      userId,
      nutritionSafetyReviewId: persisted.review.id,
      eventType: "requested",
      actorType: "athlete",
      actorUserId: userId,
      eventPayload: {
        asOfDate: input.asOfDate,
        reviewType: persisted.review.reviewType,
        status: persisted.review.status,
        hardStopRemains: persisted.review.hardStop,
        source: "fuel_command_center"
      }
    });
    const journeyEvent = await input.repositories.journey.appendEvent(userId, "NutritionSafetyReviewRequested", {
      asOfDate: input.asOfDate,
      reviewId: persisted.review.id,
      eventId: event.id,
      reviewType: persisted.review.reviewType,
      reasons: persisted.review.reasons,
      blockingFlags: persisted.review.blockingFlags,
      hardStopRemains: persisted.review.hardStop,
      source: "fuel_command_center"
    });

    return {
      status: "requested",
      reviewId: persisted.review.id,
      eventId: event.id,
      journeyEventId: journeyEvent.id,
      hardStopRemains: persisted.review.hardStop,
      message: "Review need logged. Hard stops remain active until a future explicit review workflow clears them."
    };
  } catch (error) {
    return {
      status: "error",
      hardStopRemains,
      message: `Nutrition safety review request failed: ${errorMessage(error)}`
    };
  }
}

export async function acknowledgeNutritionSafetyReview(input: {
  userId: string;
  reviewId: string;
  repositories: Pick<NutritionSafetyReviewRepositories, "nutritionSafetyReview">;
}): Promise<NutritionSafetyReviewAcknowledgeResult> {
  try {
    const userId = assertUserId(input.userId, "acknowledgeNutritionSafetyReview");
    const review = await input.repositories.nutritionSafetyReview.acknowledgeNutritionSafetyReview(userId, input.reviewId);
    const event = await input.repositories.nutritionSafetyReview.appendNutritionSafetyReviewEvent({
      userId,
      nutritionSafetyReviewId: review.id,
      eventType: "acknowledged",
      actorType: "athlete",
      actorUserId: userId,
      eventPayload: {
        hardStopRemains: review.hardStop,
        reviewType: review.reviewType,
        source: "fuel_review_card"
      }
    });
    return {
      status: "acknowledged",
      reviewId: review.id,
      eventId: event.id,
      hardStopRemains: review.hardStop,
      message: "Review acknowledged. This does not clear the plan or remove a hard stop."
    };
  } catch (error) {
    return {
      status: "error",
      reviewId: input.reviewId,
      hardStopRemains: true,
      message: `Nutrition safety review acknowledgement failed: ${errorMessage(error)}`
    };
  }
}
