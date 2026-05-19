import type { TournamentDetails } from "../core/types";

export function tournamentStrategy(details: TournamentDetails | null): string {
  if (!details) {
    return "No tournament strategy active.";
  }
  if (details.dailyWeighIns) {
    return "Tournament mode keeps the athlete near weight between bouts.";
  }
  return "Tournament mode protects bout-day fueling and travel logistics.";
}
