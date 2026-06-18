import { makeConfidence } from "../core/confidence";
import { dateOnlyInTimeZone, daysBetween, isWithinInclusive } from "../core/dates";
import type { AthleteJourney, PhaseState } from "../core/types";

export function resolvePhase(journey: AthleteJourney, asOfDate: string): PhaseState {
  const fight = journey.activeFightOpportunity;
  const tournament = journey.activeTournament;

  if (tournament && isWithinInclusive(asOfDate, tournament.tournamentStartDate, tournament.tournamentEndDate)) {
    return {
      phase: "tournament",
      daysUntilBout: daysBetween(asOfDate, tournament.possibleBoutDates[0] ?? tournament.tournamentStartDate),
      daysUntilWeighIn: 0,
      reason: "Active tournament dates own the phase.",
      confidence: makeConfidence(0.88, ["tournament dates are active"])
    };
  }

  if (!fight || fight.status === "canceled" || fight.status === "completed") {
    return {
      phase: journey.activePhase ?? "build",
      daysUntilBout: null,
      daysUntilWeighIn: null,
      reason: "No active fight requires camp timing, so the athlete remains in build/maintenance planning.",
      confidence: makeConfidence(0.72, ["no active fight context"])
    };
  }

  const daysUntilBout = daysBetween(asOfDate, fight.boutDate);
  const daysUntilWeighIn = fight.weighInDateTime ? daysBetween(asOfDate, dateOnlyInTimeZone(fight.weighInDateTime, fight.timezone)) : null;

  if (daysUntilBout === 0) {
    return {
      phase: "bout_day",
      daysUntilBout,
      daysUntilWeighIn,
      reason: "Bout date is today.",
      confidence: makeConfidence(0.9, ["bout date is known"])
    };
  }

  if (daysUntilWeighIn === 0) {
    return {
      phase: "weigh_in_day",
      daysUntilBout,
      daysUntilWeighIn,
      reason: "Weigh-in date is today.",
      confidence: makeConfidence(0.88, ["weigh-in date is known"])
    };
  }

  if (daysUntilWeighIn !== null && daysUntilWeighIn < 0 && daysUntilBout > 0) {
    return {
      phase: "post_weigh_in",
      daysUntilBout,
      daysUntilWeighIn,
      reason: "Weigh-in is complete and bout is upcoming.",
      confidence: makeConfidence(0.82, ["weigh-in and bout dates are known"])
    };
  }

  if (daysUntilBout <= 7) {
    return {
      phase: "fight_week",
      daysUntilBout,
      daysUntilWeighIn,
      reason: "Bout is within seven days.",
      confidence: makeConfidence(0.82, ["fight date is close"])
    };
  }

  if (fight.status === "short_notice" || daysUntilBout <= 21) {
    return {
      phase: "short_notice_camp",
      daysUntilBout,
      daysUntilWeighIn,
      reason: "Fight timing gives a short-notice camp.",
      confidence: makeConfidence(0.78, ["short-notice fight context"])
    };
  }

  return {
    phase: "camp",
    daysUntilBout,
    daysUntilWeighIn,
    reason: "Confirmed fight context sets camp planning.",
    confidence: makeConfidence(0.84, ["fight context is active"])
  };
}
