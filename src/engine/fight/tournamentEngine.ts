import { makeConfidence } from "../core/confidence";
import type { BodyMassTrend, TournamentDetails, TournamentStrategy } from "../core/types";
import { createRiskFlag } from "../safety/riskSafetyEngine";

export function resolveTournamentStrategy(details: TournamentDetails | null, trend?: BodyMassTrend): TournamentStrategy {
  if (!details) {
    return {
      status: "not_applicable",
      strategyMode: "no_cut_recommended",
      dailyPriorities: [],
      riskFlags: [],
      athleteFacingSummary: "No tournament strategy active.",
      confidence: makeConfidence(0.72, ["no tournament context"])
    };
  }

  const trendKgPerWeek = trend?.trendKgPerWeek ?? null;
  const riskFlags =
    details.dailyWeighIns && trendKgPerWeek !== null && trendKgPerWeek < -1
      ? [
          createRiskFlag(
            "tournament",
            "short_notice_unsafe_loss",
            "high",
            "Tournament week should avoid large repeated dehydration cycles.",
            { trendKgPerWeek },
            true
          )
        ]
      : [];
  const dailyPriorities = details.dailyWeighIns
    ? ["Stay near weight between bouts", "Restore glycogen without a next-morning miss", "Use fluids plus electrolytes, not plain water overload"]
    : ["Protect bout-day digestion", "Keep familiar travel foods available", "Log morning weight and symptoms"];

  if (details.dailyWeighIns) {
    return {
      status: riskFlags.length > 0 ? "unsafe" : "active",
      strategyMode: "stay_near_weight",
      dailyPriorities,
      riskFlags,
      athleteFacingSummary: "Tournament mode keeps you near weight between bouts and avoids large daily cuts.",
      confidence: makeConfidence(0.78, ["daily weigh-ins resolved"])
    };
  }

  return {
    status: "active",
    strategyMode: details.strategyMode,
    dailyPriorities,
    riskFlags,
    athleteFacingSummary: "Tournament mode protects bout-day fueling and travel logistics.",
    confidence: makeConfidence(0.68, ["tournament details resolved"])
  };
}

export function tournamentStrategy(details: TournamentDetails | null): string {
  return resolveTournamentStrategy(details).athleteFacingSummary;
}
