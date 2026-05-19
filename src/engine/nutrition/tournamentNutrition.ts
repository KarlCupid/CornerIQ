import type { TournamentDetails } from "../core/types";

export function tournamentNutritionNote(details: TournamentDetails | null): string {
  if (!details) {
    return "No tournament nutrition mode active.";
  }
  return details.dailyWeighIns ? "Stay near weight between bouts and avoid large daily dehydration cycles." : "Protect travel fuel and bout-day digestion.";
}
