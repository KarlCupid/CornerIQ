import { buildNutritionReviewHistoryViewModel } from "../../engine/presentation/nutritionReviewHistoryViewModel";
import type { ISODateString, NutritionReviewHistoryViewModel, NutritionSafetyReview } from "../../engine/core/types";
import { assertUserId } from "../supabase/repositoryTypes";
import type { AthleteJourneyRepositories } from "../supabase/loadAthleteJourney";

export interface LoadNutritionSafetyReviewHistoryInput {
  userId: string;
  asOfDate: ISODateString;
  currentSafetyReview: NutritionSafetyReview;
  repositories: Pick<AthleteJourneyRepositories, "nutritionSafetyReview">;
  limit?: number | undefined;
}

export async function loadNutritionSafetyReviewHistory(input: LoadNutritionSafetyReviewHistoryInput): Promise<NutritionReviewHistoryViewModel> {
  const userId = assertUserId(input.userId, "loadNutritionSafetyReviewHistory");
  const repository = input.repositories.nutritionSafetyReview;
  const [activeReviews, reviewEvents] = repository
    ? await Promise.all([
        repository.listActiveNutritionSafetyReviews(userId),
        repository.listRecentNutritionSafetyReviewEvents(userId, input.limit ?? 25)
      ])
    : [[], []];
  return buildNutritionReviewHistoryViewModel({
    activeReviews,
    reviewEvents,
    currentSafetyReview: input.currentSafetyReview,
    asOfDate: input.asOfDate
  });
}
