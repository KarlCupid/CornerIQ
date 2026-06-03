import { describe, expect, it } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import type { CycleState, PerformanceState, ProtectedWorkout, RiskFlag } from "../../engine/core/types";
import { materializeGeneratedSessionsFromPreview } from "../../engine/training/nextWeekGeneratedSessionEngine";
import type { NextWeekTrainingMaterialization } from "../../engine/training/nextWeekMaterializationEngine";
import { nextWeekPreviewToMicrocycle } from "../../engine/training/nextWeekPreviewToMicrocycle";
import { workoutTemplateCatalog } from "../../engine/training/workoutTemplateCatalog";
import { fixtureAsOfDate, pro_4_round_build_strength } from "../fixtures/engineFixtures";

function stateFixture(): PerformanceState {
  return resolvePerformanceState({ journey: pro_4_round_build_strength, asOfDate: fixtureAsOfDate });
}

function materializationFixture(state: PerformanceState, overrides: Partial<NextWeekTrainingMaterialization> = {}): NextWeekTrainingMaterialization {
  const base = state.training.nextWeekMaterialization;
  return {
    ...base,
    materializedVolumeStrategy: "progress_small",
    generatedSupportBias: "strength",
    sessionFamilyBiases: ["strength_full_body", "trunk_durability"],
    targetHardDayCap: 3,
    ...overrides,
    nextWeekDayPlanPreview:
      overrides.nextWeekDayPlanPreview ??
      base.nextWeekDayPlanPreview.map((day) => ({
        ...day,
        role: "support_day",
        hardDay: false,
        fuelDemand: "moderate"
      }))
  };
}

function inputFor(state: PerformanceState, materialization: NextWeekTrainingMaterialization, overrides: Partial<Parameters<typeof materializeGeneratedSessionsFromPreview>[0]> = {}) {
  const projection = nextWeekPreviewToMicrocycle({
    materialization,
    currentBlock: state.training.activeBlock,
    protectedWorkouts: overrides.protectedWorkouts ?? state.training.protectedAnchors,
    asOfDate: fixtureAsOfDate
  });
  return {
    materialization,
    microcycle: projection.microcycle,
    dayPlans: projection.dayPlans,
    athlete: state.athlete,
    protectedWorkouts: state.training.protectedAnchors,
    readiness: state.readiness,
    cycle: state.cycle,
    safetyFlags: state.safety.riskFlags,
    fight: state.fightContext,
    tournament: state.tournamentContext,
    engineVersion: state.engineVersion,
    previewId: "preview_1",
    ...overrides
  };
}

function underfuelingFlag(): RiskFlag {
  return {
    id: "risk_underfueling",
    domain: "nutrition",
    code: "repeated_low_intake",
    severity: "high",
    status: "active",
    message: "Under-fueling risk.",
    evidence: {},
    blocksPlan: true,
    hardStop: false,
    requiresProfessionalReview: false,
    confidence: { level: "medium", score: 0.7, reasons: ["test"], missingInputs: [] },
    explanation: "Under-fueling blocks progression."
  };
}

function highCycle(cycle: CycleState): CycleState {
  return {
    ...cycle,
    trackingEnabled: true,
    symptomBurden: "high",
    symptoms: ["cramps", "low_energy", "poor_sleep"]
  };
}

function lowConfidenceNutrition(state: PerformanceState): PerformanceState["nutrition"] {
  return {
    ...state.nutrition,
    actualIntakeSummary: {
      ...state.nutrition.actualIntakeSummary,
      status: "partial_day",
      logCount: 1,
      caloriesLogged: 900,
      targetComparisonAllowed: false,
      underFuelingEvidenceAllowed: false,
      summaryCopy: "Partial log so far. This is not under-fueling evidence unless you mark the day complete.",
      dailySummary: {
        ...state.nutrition.actualIntakeSummary.dailySummary,
        status: "partial_day",
        totalCaloriesLogged: 900,
        targetComparisonAllowed: false,
        underFuelingEvidenceAllowed: false,
        athleteFacingSummary: "Partial log so far. This is not under-fueling evidence unless you mark the day complete."
      },
      confidence: { level: "low", score: 0.4, reasons: ["low-confidence food log"], missingInputs: [] }
    },
    confidence: { level: "low", score: 0.45, reasons: ["low food-log confidence"], missingInputs: [] }
  };
}

function healthyNutrition(state: PerformanceState): PerformanceState["nutrition"] {
  return {
    ...state.nutrition,
    actualIntakeSummary: {
      ...state.nutrition.actualIntakeSummary,
      logCount: 1,
      caloriesLogged: state.nutrition.dailyCaloriesTarget,
      calorieTargetPercent: 100,
      confidence: { level: "medium", score: 0.76, reasons: ["one healthy food log"], missingInputs: [] }
    },
    confidence: { level: "medium", score: 0.76, reasons: ["one healthy food log"], missingInputs: [] }
  };
}

function severeFuelingFlag(): RiskFlag {
  return {
    ...underfuelingFlag(),
    id: "risk_rapid_weight_loss",
    code: "rapid_weight_loss",
    message: "Rapid body-mass loss raises under-fueling risk.",
    explanation: "Rapid body-mass loss blocks aggressive progression."
  };
}

function outputText(sessions: readonly ReturnType<typeof materializeGeneratedSessionsFromPreview>[number][]): string {
  return sessions.map((session) => [session.title, session.rationale, ...session.prescription, ...session.modifications, ...session.protects].join(" ")).join(" ");
}

describe("nextWeekGeneratedSessionEngine", () => {
  it("progress_small creates safe generated support sessions with stable ids", () => {
    const state = stateFixture();
    const materialization = materializationFixture(state, { materializedVolumeStrategy: "progress_small" });
    const input = inputFor(state, materialization);
    const first = materializeGeneratedSessionsFromPreview(input);
    const second = materializeGeneratedSessionsFromPreview(input);

    expect(first.length).toBeGreaterThan(0);
    expect(first.every((session) => session.intensity !== "hard")).toBe(true);
    expect(first.every((session) => workoutTemplateCatalog.some((template) => template.family === session.family && template.title === session.title))).toBe(true);
    expect(first.some((session) => session.family === "strength_full_body" && session.durationMinutes >= 40)).toBe(true);
    expect(first.every((session) => session.durationPolicyCategory && session.selectedTemplateId && session.finalDurationMinutes === session.durationMinutes)).toBe(true);
    expect(first.map((session) => session.id)).toEqual(second.map((session) => session.id));
    expect(first[0]?.id).toContain("next-week:");
  });

  it("repeat_same avoids novelty by staying inside the preview family biases", () => {
    const state = stateFixture();
    const materialization = materializationFixture(state, {
      materializedVolumeStrategy: "repeat_same",
      sessionFamilyBiases: ["roadwork_zone2"]
    });
    const sessions = materializeGeneratedSessionsFromPreview(inputFor(state, materialization));

    expect(sessions.length).toBeGreaterThan(0);
    expect(new Set(sessions.map((session) => session.family))).toEqual(new Set(["roadwork_zone2"]));
  });

  it("conservative_start keeps useful strength training when safety allows", () => {
    const state = stateFixture();
    const sessions = materializeGeneratedSessionsFromPreview(
      inputFor(state, materializationFixture(state, { materializedVolumeStrategy: "conservative_start" }), {
        safetyFlags: []
      })
    );

    expect(sessions.length).toBeGreaterThan(1);
    expect(sessions.some((session) => ["strength_lower", "strength_upper", "strength_full_body"].includes(session.family))).toBe(true);
    expect(sessions.every((session) => ["trunk_durability", "shoulder_scap_durability", "hip_ankle_mobility", "recovery_reset"].includes(session.family))).toBe(false);
  });

  it("reduce_volume trims volume below progress_small", () => {
    const state = stateFixture();
    const progress = materializeGeneratedSessionsFromPreview(inputFor(state, materializationFixture(state, { materializedVolumeStrategy: "progress_small" })));
    const reduced = materializeGeneratedSessionsFromPreview(inputFor(state, materializationFixture(state, { materializedVolumeStrategy: "reduce_volume" })));

    expect(reduced.length).toBeLessThan(progress.length);
    expect(reduced.every((session) => session.intensity === "easy" || session.intensity === "recovery")).toBe(true);
  });

  it("deload creates only recovery, mobility, or durability sessions", () => {
    const state = stateFixture();
    const sessions = materializeGeneratedSessionsFromPreview(inputFor(state, materializationFixture(state, { materializedVolumeStrategy: "deload" })));

    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions.every((session) => ["recovery_reset", "hip_ankle_mobility", "trunk_durability", "shoulder_scap_durability"].includes(session.family))).toBe(true);
    expect(sessions.every((session) => session.fuelDemand === "low")).toBe(true);
  });

  it("taper creates taper-safe low volume sessions", () => {
    const state = stateFixture();
    const sessions = materializeGeneratedSessionsFromPreview(inputFor(state, materializationFixture(state, { materializedVolumeStrategy: "taper" })));

    expect(sessions.map((session) => session.family).every((family) => family === "taper_maintenance" || family === "reaction_rhythm")).toBe(true);
    expect(sessions.every((session) => session.durationMinutes >= 15 && session.durationMinutes <= 30 && session.fuelDemand === "low")).toBe(true);
    expect(sessions.every((session) => session.durationPolicyCategory === "taper")).toBe(true);
  });

  it("tournament_conserve avoids hard conditioning", () => {
    const state = stateFixture();
    const sessions = materializeGeneratedSessionsFromPreview(inputFor(state, materializationFixture(state, { materializedVolumeStrategy: "tournament_conserve" })));

    expect(sessions.every((session) => session.family === "recovery_reset" || session.family === "taper_maintenance")).toBe(true);
    expect(sessions.every((session) => session.intensity === "easy" || session.intensity === "recovery")).toBe(true);
    expect(sessions.some((session) => ["alactic_sprints", "roadwork_intervals", "roadwork_tempo", "round_based_conditioning"].includes(session.family))).toBe(false);
  });

  it("hold_for_review creates no hard work", () => {
    const state = stateFixture();
    const sessions = materializeGeneratedSessionsFromPreview(inputFor(state, materializationFixture(state, { materializedVolumeStrategy: "hold_for_review" })));

    expect(sessions.length).toBeGreaterThan(1);
    expect(sessions.every((session) => session.intensity !== "hard" && session.fuelDemand === "low")).toBe(true);
  });

  it("protected hard boxing days do not receive hard generated sessions", () => {
    const state = stateFixture();
    const protectedDate = state.training.nextWeekMaterialization.nextWeekStartDate;
    const protectedWorkout: ProtectedWorkout = {
      id: "protected_next_week",
      type: "sparring",
      date: protectedDate,
      durationMinutes: 60,
      intensity: "hard",
      protected: true
    };
    const materialization = materializationFixture(state, {
      nextWeekDayPlanPreview: state.training.nextWeekMaterialization.nextWeekDayPlanPreview.map((day, index) => ({
        ...day,
        role: index === 0 ? "hard_day" : "support_day",
        hardDay: index === 0,
        date: index === 0 ? protectedDate : day.date
      }))
    });
    const projection = nextWeekPreviewToMicrocycle({
      materialization,
      currentBlock: state.training.activeBlock,
      protectedWorkouts: [protectedWorkout],
      asOfDate: fixtureAsOfDate
    });
    const sessions = materializeGeneratedSessionsFromPreview(
      inputFor(state, materialization, {
        protectedWorkouts: [protectedWorkout],
        dayPlans: projection.dayPlans
      })
    );

    expect(sessions.filter((session) => session.date === protectedDate).every((session) => session.intensity !== "hard")).toBe(true);
    expect(sessions.filter((session) => session.date === protectedDate).every((session) => session.durationMinutes >= 25)).toBe(true);
  });

  it("amber readiness without a hard stop keeps generated support out of the 22-minute cap", () => {
    const state = stateFixture();
    const materialization = materializationFixture(state, {
      materializedVolumeStrategy: "progress_small",
      sessionFamilyBiases: ["roadwork_zone2", "strength_full_body"]
    });
    const sessions = materializeGeneratedSessionsFromPreview(
      inputFor(state, materialization, {
        readiness: { ...state.readiness, color: "amber" },
        nutrition: healthyNutrition(state),
        safetyFlags: []
      })
    );

    expect(sessions.length).toBeGreaterThan(1);
    expect(Math.max(...sessions.map((session) => session.durationMinutes))).toBeGreaterThan(35);
    expect(sessions.some((session) => session.durationMinutes === 22)).toBe(false);
  });

  it("under-fueling blocks progression and high fuel-demand sessions", () => {
    const state = stateFixture();
    const sessions = materializeGeneratedSessionsFromPreview(
      inputFor(state, materializationFixture(state, { materializedVolumeStrategy: "progress_small" }), {
        safetyFlags: [underfuelingFlag()]
      })
    );

    expect(sessions.length).toBeGreaterThan(1);
    expect(sessions.every((session) => session.fuelDemand === "low" && !["strength_full_body", "power_rotational", "roadwork_intervals"].includes(session.family))).toBe(true);
    expect(sessions.every((session) => session.modifications.some((modification) => modification.includes("Under-fueling risk")))).toBe(true);
  });

  it("missing food logs do not remap strength or conditioning into trunk-only work", () => {
    const state = stateFixture();
    const materialization = materializationFixture(state, {
      materializedVolumeStrategy: "progress_small",
      sessionFamilyBiases: ["strength_full_body", "roadwork_zone2", "round_based_conditioning"]
    });
    const sessions = materializeGeneratedSessionsFromPreview(
      inputFor(state, materialization, {
        nutrition: state.nutrition,
        safetyFlags: []
      })
    );

    expect(state.nutrition.actualIntakeSummary.logCount).toBe(0);
    expect(sessions.length).toBeGreaterThan(1);
    expect(sessions.some((session) => ["strength_lower", "strength_upper", "strength_full_body"].includes(session.family))).toBe(true);
    expect(sessions.some((session) => ["roadwork_zone2", "roadwork_tempo", "roadwork_intervals", "round_based_conditioning", "alactic_sprints"].includes(session.family))).toBe(true);
    expect(sessions.every((session) => ["trunk_durability", "shoulder_scap_durability", "hip_ankle_mobility", "recovery_reset"].includes(session.family))).toBe(false);
    expect(sessions.some((session) => session.modifications.some((modification) => modification.includes("No food log today")))).toBe(true);
    expect(sessions.some((session) => session.modifications.some((modification) => modification.includes("removed hard work")))).toBe(false);
  });

  it("unknown readiness adds a warm-up gate without blocking strength or conditioning", () => {
    const state = stateFixture();
    const materialization = materializationFixture(state, {
      materializedVolumeStrategy: "progress_small",
      sessionFamilyBiases: ["strength_full_body", "roadwork_zone2"]
    });
    const sessions = materializeGeneratedSessionsFromPreview(
      inputFor(state, materialization, {
        readiness: {
          ...state.readiness,
          score: null,
          color: "unknown",
          drivers: ["No readiness check-in logged today."],
          hardStops: [],
          confidence: { level: "low", score: 0.28, reasons: ["manual readiness can still be logged"], missingInputs: ["today readiness check-in"] }
        },
        nutrition: healthyNutrition(state),
        safetyFlags: []
      })
    );

    expect(sessions.length).toBeGreaterThan(1);
    expect(sessions.some((session) => ["strength_lower", "strength_upper", "strength_full_body", "roadwork_zone2"].includes(session.family))).toBe(true);
    expect(sessions.every((session) => session.durationPolicyCategory !== "safety_capped")).toBe(true);
    expect(sessions.some((session) => session.modifications.some((modification) => modification.includes("No readiness check-in today")))).toBe(true);
  });

  it("low nutrition confidence does not cap support count without true risk evidence", () => {
    const state = stateFixture();
    const sessions = materializeGeneratedSessionsFromPreview(
      inputFor(state, materializationFixture(state, { materializedVolumeStrategy: "progress_small" }), {
        nutrition: lowConfidenceNutrition(state),
        safetyFlags: []
      })
    );

    expect(sessions.length).toBeGreaterThan(1);
    expect(sessions.every((session) => session.fuelDemand === "low" || session.fuelDemand === "moderate")).toBe(true);
    expect(sessions.some((session) => session.modifications.some((modification) => modification.includes("Food log is incomplete")))).toBe(true);
    expect(sessions.some((session) => session.modifications.some((modification) => modification.includes("Fueling data is low-confidence")))).toBe(true);
  });

  it("one healthy fuel log does not cap support count", () => {
    const state = stateFixture();
    const sessions = materializeGeneratedSessionsFromPreview(
      inputFor(state, materializationFixture(state, { materializedVolumeStrategy: "progress_small" }), {
        nutrition: healthyNutrition(state),
        safetyFlags: []
      })
    );

    expect(sessions.length).toBeGreaterThan(1);
    expect(sessions.some((session) => session.modifications.some((modification) => modification.includes("Fuel data is low-confidence")))).toBe(false);
  });

  it("severe fueling risk still caps generated support volume", () => {
    const state = stateFixture();
    const sessions = materializeGeneratedSessionsFromPreview(
      inputFor(state, materializationFixture(state, { materializedVolumeStrategy: "progress_small" }), {
        safetyFlags: [severeFuelingFlag()]
      })
    );

    expect(sessions).toHaveLength(1);
    expect(sessions.every((session) => session.fuelDemand === "low" && session.intensity !== "hard")).toBe(true);
    expect(sessions.every((session) => session.durationPolicyCategory === "safety_capped")).toBe(true);
  });

  it("high cycle symptoms trim optional volume", () => {
    const state = stateFixture();
    const materialization = materializationFixture(state, { materializedVolumeStrategy: "progress_small" });
    const normal = materializeGeneratedSessionsFromPreview(inputFor(state, materialization));
    const trimmed = materializeGeneratedSessionsFromPreview(inputFor(state, materialization, { cycle: highCycle(state.cycle) }));

    expect(trimmed.length).toBeLessThan(normal.length);
    expect(trimmed.every((session) => session.modifications.some((modification) => modification.includes("High cycle symptoms")))).toBe(true);
    expect(trimmed.every((session) => session.durationMinutes >= 25 || session.durationPolicyCategory === "recovery")).toBe(true);
  });

  it("selected availability constrains generated session placement", () => {
    const state = stateFixture();
    const sessions = materializeGeneratedSessionsFromPreview(
      inputFor(state, materializationFixture(state, { materializedVolumeStrategy: "progress_small" }), {
        athlete: { ...state.athlete, scheduleAvailability: ["tuesday", "thursday", "saturday"] }
      })
    );

    expect(sessions.length).toBeGreaterThan(1);
    expect(sessions.map((session) => session.date)).toEqual(expect.arrayContaining(["2026-05-26", "2026-05-28"]));
    expect(sessions.every((session) => ["2026-05-26", "2026-05-28", "2026-05-30"].includes(session.date))).toBe(true);
  });

  it("generated sessions do not land on competition-anchor days", () => {
    const state = stateFixture();
    const competitionDate = state.training.nextWeekMaterialization.nextWeekStartDate;
    const competition: ProtectedWorkout = {
      id: "competition_next_week",
      type: "competition",
      date: competitionDate,
      durationMinutes: 120,
      intensity: "max",
      protected: true
    };
    const materialization = materializationFixture(state, { materializedVolumeStrategy: "progress_small" });
    const projection = nextWeekPreviewToMicrocycle({
      materialization,
      currentBlock: state.training.activeBlock,
      protectedWorkouts: [competition],
      asOfDate: fixtureAsOfDate
    });
    const sessions = materializeGeneratedSessionsFromPreview(
      inputFor(state, materialization, {
        protectedWorkouts: [competition],
        dayPlans: projection.dayPlans
      })
    );

    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions.some((session) => session.date === competitionDate)).toBe(false);
  });

  it("does not emit prohibited generated-session terms", () => {
    const state = stateFixture();
    const strategies: NextWeekTrainingMaterialization["materializedVolumeStrategy"][] = [
      "conservative_start",
      "progress_small",
      "repeat_same",
      "reduce_volume",
      "deload",
      "taper",
      "tournament_conserve",
      "hold_for_review"
    ];
    const text = strategies
      .flatMap((strategy) => materializeGeneratedSessionsFromPreview(inputFor(state, materializationFixture(state, { materializedVolumeStrategy: strategy }))))
      .map((session) => outputText([session]))
      .join(" ")
      .toLowerCase();

    expect(text).not.toMatch(/\b(sparring|contact|sauna|sweat\s*suit|sweatsuit|weight\s*cut|cut\s*weight)\b/);
  });
});
