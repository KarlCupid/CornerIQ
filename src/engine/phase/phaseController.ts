import { makeConfidence } from "../core/confidence";
import { dateOnlyInTimeZone, daysBetween, isWithinInclusive } from "../core/dates";
import type { AthleteJourney, PhaseState } from "../core/types";
import type { ReadinessState } from "../readiness/types";
import type { RiskFlag } from "../safety/types";

const standalonePhases = new Set<PhaseState["phase"]>(["onboarding", "build", "recovery", "deload", "maintenance"]);

function phaseAllowedWithoutFightOrTournament(phase: PhaseState["phase"] | null): phase is PhaseState["phase"] {
  return Boolean(phase && standalonePhases.has(phase));
}

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
    const explicitStandalonePhase = phaseAllowedWithoutFightOrTournament(journey.activePhase) ? journey.activePhase : null;
    return {
      phase: explicitStandalonePhase ?? "build",
      daysUntilBout: null,
      daysUntilWeighIn: null,
      reason: explicitStandalonePhase
        ? "No active fight requires camp timing, so the explicit standalone phase can own planning."
        : journey.activePhase
          ? "No active fight or tournament supports the requested competition phase, so the athlete remains in build/maintenance planning."
          : "No active fight requires camp timing, so the athlete remains in build/maintenance planning.",
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

export function applySafetyPhaseOverride(
  phase: PhaseState,
  input: {
    readiness: ReadinessState;
    safetyFlags: readonly RiskFlag[];
  }
): PhaseState {
  const activeFlags = input.safetyFlags.filter((flag) => flag.status === "active");
  const hardStops = activeFlags.filter((flag) => flag.hardStop || flag.severity === "critical");
  const hardStopIds = new Set([...hardStops.map((flag) => flag.id), ...input.readiness.hardStops.map((flag) => flag.id)]);
  if (hardStops.length > 0 || input.readiness.hardStops.length > 0) {
    return {
      ...phase,
      phase: "recovery",
      reason: `Critical safety override: ${hardStopIds.size} hard-stop signal(s) require recovery planning before fight timing.`,
      confidence: makeConfidence(0.86, ["active hard-stop safety evidence", ...phase.confidence.reasons])
    };
  }
  return phase;
}
