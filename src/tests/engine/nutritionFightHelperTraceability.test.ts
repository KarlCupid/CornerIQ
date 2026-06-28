import { describe, expect, it } from "vitest";
import type { FightOpportunity, NutritionState, TournamentDetails } from "../../engine/core/types";
import type { AcuteProtocolStatus } from "../../engine/fight/types";
import { describeBout } from "../../engine/fight/boutContext";
import { fightWeekNutritionNote } from "../../engine/nutrition/fightWeekNutrition";
import { tournamentNutritionNote } from "../../engine/nutrition/tournamentNutrition";
import { weightCutProtocolSummary } from "../../engine/nutrition/weightCutProtocol";

const unsafeCutCopy = /\b(sauna|sweat\s*suit|sweatsuit|laxative|diuretic|extreme dehydration|make weight at all costs|water cut|dehydrate to|dry out)\b/i;

function nutritionWithStatus(status: AcuteProtocolStatus): NutritionState {
  return { acuteProtocolStatus: status } as NutritionState;
}

function tournament(overrides: Partial<TournamentDetails> = {}): TournamentDetails {
  return {
    tournamentStartDate: "2026-06-01",
    tournamentEndDate: "2026-06-03",
    possibleBoutDates: ["2026-06-01", "2026-06-02"],
    dailyWeighIns: true,
    weighInTimeEachDay: "08:00",
    sameDayBoutLikely: true,
    numberOfPotentialBouts: 2,
    rehydrationWindowHoursByDay: [4, 4],
    strategyMode: "stay_near_weight",
    ...overrides
  };
}

function fight(overrides: Partial<FightOpportunity> = {}): FightOpportunity {
  return {
    id: "fight_1",
    status: "confirmed",
    boutDate: "2026-06-20",
    weighInDateTime: "2026-06-19T10:00:00.000Z",
    weighInType: "day_before",
    amateurOrPro: "pro",
    rounds: 8,
    roundMinutes: 3,
    restSeconds: 60,
    targetWeightClass: { label: "147 lb", limitKg: 66.7 },
    contractedWeightKg: 66.7,
    allowanceKg: 0.2,
    timezone: "America/Vancouver",
    hydrationTestingRequired: false,
    ...overrides
  };
}

describe("nutrition and fight helper traceability", () => {
  it("summarizes fight-week helper states without unsafe cut instructions", () => {
    const blocked = fightWeekNutritionNote(nutritionWithStatus("blocked"));
    const reviewRequired = fightWeekNutritionNote(nutritionWithStatus("review_required"));
    const allowedEducation = fightWeekNutritionNote(nutritionWithStatus("eligible_education"));

    expect(blocked).toBe("No fight-week protocol. Safety gates block acute manipulation.");
    expect(reviewRequired).toBe("Fight-week protocol requires qualified review.");
    expect(allowedEducation).toBe("Fight-week support separates gut content, fuel, fluids, and rehydration.");
    expect(`${blocked} ${reviewRequired} ${allowedEducation}`).not.toMatch(unsafeCutCopy);
  });

  it("keeps the retained weight-cut summary aligned to acute protocol status", () => {
    for (const status of ["not_applicable", "eligible_education", "review_required", "blocked", "no_protocol"] as const) {
      expect(weightCutProtocolSummary(nutritionWithStatus(status))).toBe(status);
    }
  });

  it("describes tournament nutrition modes without daily dehydration pressure", () => {
    const noTournament = tournamentNutritionNote(null);
    const dailyWeighIns = tournamentNutritionNote(tournament());
    const nonDaily = tournamentNutritionNote(tournament({ dailyWeighIns: false, sameDayBoutLikely: false }));

    expect(noTournament).toBe("No tournament nutrition mode active.");
    expect(dailyWeighIns).toContain("Stay near weight between bouts");
    expect(dailyWeighIns).toContain("avoid large daily dehydration cycles");
    expect(nonDaily).toContain("Protect travel fuel");
    expect(`${noTournament} ${dailyWeighIns} ${nonDaily}`).not.toMatch(unsafeCutCopy);
  });

  it("describes active and absent bouts in a stable, boxing-specific format", () => {
    expect(describeBout(null)).toBe("No active bout.");
    expect(describeBout(fight())).toBe("8 rounds x 3 minutes at 147 lb");
    expect(describeBout(fight({ rounds: 3, roundMinutes: 2, targetWeightClass: { label: "64 kg", limitKg: 64 } }))).toBe("3 rounds x 2 minutes at 64 kg");
  });
});

