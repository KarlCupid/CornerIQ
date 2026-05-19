import type { AthleteJourney } from "../core/types";

export function getJourneyId(journey: AthleteJourney): string {
  return journey.athlete.athleteId;
}
