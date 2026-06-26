import { describe, expect, it } from "vitest";
import type { AthleteJourney, PerformanceState } from "../../engine/core/types";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import {
  amateur_elite_camp_same_day_weigh_in,
  amateur_novice_build,
  amateur_open_tournament,
  fixtureAsOfDate,
  menstruating_athlete_camp_heavy_symptoms,
  no_wearable_manual_only,
  pro_8_round_camp_day_before_weigh_in,
  underfueling_risk_camp
} from "../fixtures/engineFixtures";

type LaunchScenario = {
  assert?: (state: PerformanceState) => void;
  journey: AthleteJourney;
  name: string;
};

const unsafeFuelCopy = /\b(sauna|sweat\s*suit|sweatsuit|laxative|diuretic|extreme dehydration|make weight at all costs|water cut|dehydrate to)\b/i;
const generatedContactCopy = /generated\s+(sparring|contact)|contact drill|fight simulation|partner drill/i;
const trainingStopDomains = new Set(["training", "readiness", "medical", "cycle", "plan_integrity", "hydration", "fight", "tournament"]);

function redReadinessScenario(): AthleteJourney {
  const todayReadiness = no_wearable_manual_only.readinessHistory[0];
  if (!todayReadiness) {
    throw new Error("Fixture missing readiness history.");
  }
  return {
    ...no_wearable_manual_only,
    athlete: {
      ...no_wearable_manual_only.athlete,
      athleteId: "red_readiness_case"
    },
    readinessHistory: [
      {
        ...todayReadiness,
        energy1To5: 1,
        fainting: true,
        painNotes: ["Sharp knee pain"]
      }
    ]
  };
}

function noEquipmentScenario(): AthleteJourney {
  return {
    ...amateur_novice_build,
    athlete: {
      ...amateur_novice_build.athlete,
      athleteId: "no_equipment_boxer",
      equipmentAccess: []
    },
    protectedWorkouts: []
  };
}

function generatedSupportCopy(state: PerformanceState): string {
  return JSON.stringify(
    state.training.generatedSessions.map((session) => ({
      date: session.date,
      family: session.family,
      fuelDemand: session.fuelDemand,
      intensity: session.intensity,
      modifications: session.modifications,
      prescription: session.prescription,
      protects: session.protects,
      rationale: session.rationale,
      title: session.title
    }))
  );
}

function assertSharedLaunchStructure(state: PerformanceState) {
  expect(state.engineVersion).toBeTruthy();
  expect(state.outputHash).toBeTruthy();
  expect(state.viewModels.today.primaryAction.length).toBeGreaterThan(0);
  expect(state.viewModels.fuel.commandCenter.primaryFuelAction.length).toBeGreaterThan(0);
  expect(state.viewModels.fuel.commandCenter.safetyAction.length).toBeGreaterThan(0);
  expect(state.viewModels.train.todayRole.summary.length).toBeGreaterThan(0);
  expect(state.viewModels.train.todayRole.explanation.length).toBeGreaterThan(0);
  expect(state.viewModels.plan.weeklyTrainingStructure.length).toBeGreaterThan(0);
  expect(state.viewModels.plan.dayPlans).toHaveLength(7);
  expect(state.viewModels.profile.title).toBe("Boxer profile");

  expect(JSON.stringify(state.viewModels.fuel)).not.toMatch(unsafeFuelCopy);
  expect(generatedSupportCopy(state)).not.toMatch(generatedContactCopy);
  expect(JSON.stringify(state.viewModels.fuel.nutritionReviewHistory)).not.toContain('"canSelfClear":true');
  expect(JSON.stringify(state.viewModels)).not.toMatch(/missing data is safe|unknown means safe|self-clear hard stops: yes/i);

  if (state.athlete.wearablePreference === "manual_only") {
    expect(state.wearable.hasWearable).toBe(false);
    expect(state.wearable.explanation).toContain("No wearable needed");
  }

  if (state.safety.hardStops.some((flag) => trainingStopDomains.has(flag.domain)) || state.readiness.color === "red") {
    expect(state.training.todaySessions.every((session) => session.intensity !== "hard")).toBe(true);
    expect(state.viewModels.today.primaryAction.toLowerCase()).not.toMatch(/pause|review needed/);
  }
}

const scenarios: readonly LaunchScenario[] = [
  {
    name: "Amateur novice build phase",
    journey: amateur_novice_build,
    assert: (state) => {
      expect(state.athlete.boxingLevel).toBe("amateur_novice");
      expect(JSON.stringify(state.viewModels.train)).toContain("novice");
    }
  },
  {
    name: "Amateur open with sparring anchors",
    journey: no_wearable_manual_only,
    assert: (state) => {
      expect(state.training.protectedAnchors.some((anchor) => anchor.type === "sparring")).toBe(true);
      expect(state.training.todaySessions.every((session) => session.intensity === "easy" || session.intensity === "recovery")).toBe(true);
    }
  },
  {
    name: "Amateur tournament daily weigh-ins",
    journey: amateur_open_tournament,
    assert: (state) => {
      expect(state.tournamentContext?.dailyWeighIns).toBe(true);
      expect(JSON.stringify(state.viewModels.fuel.tournamentFuelPlan)).toContain("daily");
    }
  },
  {
    name: "Pro camp day-before weigh-in",
    journey: pro_8_round_camp_day_before_weigh_in,
    assert: (state) => {
      expect(state.fightContext?.weighInType).toBe("day_before");
      expect(state.athlete.amateurOrPro).toBe("pro");
    }
  },
  {
    name: "Same-day weigh-in amateur",
    journey: amateur_elite_camp_same_day_weigh_in,
    assert: (state) => {
      expect(state.fightContext?.weighInType).toBe("same_day");
      expect(state.athlete.amateurOrPro).toBe("amateur");
    }
  },
  {
    name: "Cycle-enabled athlete with high symptoms",
    journey: menstruating_athlete_camp_heavy_symptoms,
    assert: (state) => {
      expect(state.cycle.trackingEnabled).toBe(true);
      expect(state.cycle.symptomBurden).toBe("high");
      expect(["safety_review", "symptom_trim"]).toContain(state.viewModels.train.cycleTrainingDecision.status);
    }
  },
  {
    name: "Manual-only no wearable athlete",
    journey: no_wearable_manual_only,
    assert: (state) => {
      expect(state.wearable.hasWearable).toBe(false);
      expect(state.viewModels.profile.privacyNotes.join(" ")).toContain("Wearable data is optional");
    }
  },
  {
    name: "Under-fueling risk case",
    journey: underfueling_risk_camp,
    assert: (state) => {
      expect(state.viewModels.fuel.underFuelingRisk).not.toBeNull();
      expect(state.viewModels.train.progressionSummary.status).not.toBe("progress");
    }
  },
  {
    name: "Red readiness case",
    journey: redReadinessScenario(),
    assert: (state) => {
      expect(state.readiness.color).toBe("red");
      expect(state.viewModels.train.todaySummary).toMatch(/recovery/i);
    }
  },
  {
    name: "No-equipment boxer",
    journey: noEquipmentScenario(),
    assert: (state) => {
      expect(state.athlete.equipmentAccess).toHaveLength(0);
      const structuredExercises = state.training.generatedSessions.flatMap((session) => session.structuredPrescriptionV2?.compiledSession.blocks.flatMap((block) => block.exercises) ?? []);
      expect(state.training.generatedSessions.every((session) => (session.structuredPrescriptionV2?.sessionIntent.equipmentContext.length ?? 0) === 0)).toBe(true);
      expect(structuredExercises.some((exercise) => exercise.loadUnit === "bodyweight")).toBe(true);
    }
  }
];

describe("launch scenario QA flows", () => {
  it.each(scenarios)("$name resolves safe launch view models", ({ assert, journey }) => {
    const state = resolvePerformanceState({ journey, asOfDate: fixtureAsOfDate });

    assertSharedLaunchStructure(state);
    assert?.(state);
  });
});
