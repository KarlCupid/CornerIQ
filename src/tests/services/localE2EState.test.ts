import { describe, expect, it } from "vitest";
import {
  buildLocalE2EPerformanceState,
  LOCAL_E2E_AS_OF_DATE,
  LOCAL_E2E_DUE_WORKOUT_AS_OF_DATE,
  LOCAL_E2E_DUE_WORKOUT_SCENARIO,
  localE2EDefaultAsOfDateForScenario,
  normalizeLocalE2EScenario
} from "../../services/e2e/localE2EState";

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
});
