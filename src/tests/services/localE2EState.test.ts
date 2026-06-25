import { describe, expect, it } from "vitest";
import {
  buildLocalE2EPerformanceState,
  LOCAL_E2E_AS_OF_DATE,
  LOCAL_E2E_DUE_WORKOUT_AS_OF_DATE,
  LOCAL_E2E_DUE_WORKOUT_SCENARIO,
  localE2EDefaultAsOfDateForScenario,
  normalizeLocalE2EScenario
} from "../../services/e2e/localE2EState";

function generatedStimulusCounts(state: ReturnType<typeof buildLocalE2EPerformanceState>) {
  return state.training.generatedSessions.reduce<Record<string, number>>((counts, session) => {
    const key = session.trainingStimulus ?? "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

describe("local E2E state", () => {
  it("keeps the default local audit fixture on the no-due-workout day", () => {
    const state = buildLocalE2EPerformanceState();

    expect(state.asOfDate).toBe(LOCAL_E2E_AS_OF_DATE);
    expect(state.viewModels.train.detailedTodaySessions).toHaveLength(0);
    expect(state.viewModels.train.upcomingGeneratedSessions.length).toBeGreaterThan(0);
  });

  it("provides a local-only due-workout scenario for player browser QA", () => {
    expect(normalizeLocalE2EScenario(LOCAL_E2E_DUE_WORKOUT_SCENARIO)).toBe(LOCAL_E2E_DUE_WORKOUT_SCENARIO);
    expect(normalizeLocalE2EScenario("unknown")).toBe("default");
    expect(localE2EDefaultAsOfDateForScenario(LOCAL_E2E_DUE_WORKOUT_SCENARIO)).toBe(LOCAL_E2E_DUE_WORKOUT_AS_OF_DATE);

    const state = buildLocalE2EPerformanceState({ scenario: LOCAL_E2E_DUE_WORKOUT_SCENARIO });
    const detail = state.viewModels.train.detailedTodaySessions[0]?.detail;

    expect(state.asOfDate).toBe(LOCAL_E2E_DUE_WORKOUT_AS_OF_DATE);
    expect(detail?.sections.length).toBeGreaterThan(0);
    expect(detail?.noGeneratedSparring).toBe(true);
  });

  it("applies local build-goal drafts to regenerated support workouts without Supabase", () => {
    const selectedDays: ("tuesday" | "thursday" | "saturday")[] = ["tuesday", "thursday", "saturday"];
    const strength = buildLocalE2EPerformanceState({
      protectedWorkouts: [],
      buildGoalDraft: {
        primaryFocus: "strength",
        trainingDose: "standard",
        scheduleAvailability: selectedDays,
        planStartDate: LOCAL_E2E_AS_OF_DATE,
        planAction: "start_new_plan",
        protectedScheduleMode: "clear_for_plan"
      }
    });
    const conditioning = buildLocalE2EPerformanceState({
      protectedWorkouts: [],
      buildGoalDraft: {
        primaryFocus: "conditioning",
        trainingDose: "standard",
        scheduleAvailability: selectedDays,
        planStartDate: LOCAL_E2E_AS_OF_DATE,
        planAction: "start_new_plan",
        protectedScheduleMode: "clear_for_plan"
      }
    });

    expect(strength.training.planGenerationIntent).toEqual(
      expect.objectContaining({
        primaryFocus: "strength",
        selectedSupportDays: selectedDays
      })
    );
    expect(strength.training.generatedSessions.map((session) => session.date)).toEqual(["2026-05-19", "2026-05-21", "2026-05-23"]);
    expect(strength.training.generatedSessions.map((session) => session.family)).not.toEqual(conditioning.training.generatedSessions.map((session) => session.family));
    expect(generatedStimulusCounts(strength).strength).toBeGreaterThanOrEqual(2);
    expect(generatedStimulusCounts(conditioning).conditioning).toBeGreaterThanOrEqual(2);
  });
});
