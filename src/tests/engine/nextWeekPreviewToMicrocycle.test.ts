import { describe, expect, it } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { nextWeekPreviewToMicrocycle } from "../../engine/training/nextWeekPreviewToMicrocycle";
import type { NextWeekTrainingMaterialization } from "../../engine/training/nextWeekMaterializationContract";
import { fixtureAsOfDate, no_wearable_manual_only } from "../fixtures/engineFixtures";

function stateFixture() {
  return resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
}

function materializationFixture(overrides: Partial<NextWeekTrainingMaterialization> = {}): NextWeekTrainingMaterialization {
  const base = stateFixture().training.nextWeekMaterialization;
  return {
    ...base,
    ...overrides,
    nextWeekDayPlanPreview: overrides.nextWeekDayPlanPreview ?? base.nextWeekDayPlanPreview
  };
}

describe("nextWeekPreviewToMicrocycle", () => {
  it("turns a preview into a microcycle and seven day-plan projections", () => {
    const state = stateFixture();
    const result = nextWeekPreviewToMicrocycle({
      materialization: state.training.nextWeekMaterialization,
      currentBlock: state.training.activeBlock,
      protectedWorkouts: state.training.protectedAnchors,
      asOfDate: fixtureAsOfDate
    });

    expect(result.microcycle.weekStartDate).toBe(state.training.nextWeekMaterialization.nextWeekStartDate);
    expect(result.dayPlans).toHaveLength(7);
    expect(result.dayPlans.every((day) => day.generatedSessions.length === 0)).toBe(true);
    expect(result.microcycle.notes.join(" ")).toContain("no future generated session objects");
  });

  it("respects the preview hard-day cap", () => {
    const state = stateFixture();
    const materialization = materializationFixture({
      materializedVolumeStrategy: "progress_small",
      targetHardDayCap: 1,
      nextWeekDayPlanPreview: state.training.nextWeekMaterialization.nextWeekDayPlanPreview.map((day) => ({ ...day, hardDay: true, role: "hard_day" }))
    });
    const result = nextWeekPreviewToMicrocycle({
      materialization,
      currentBlock: state.training.activeBlock,
      protectedWorkouts: [],
      asOfDate: fixtureAsOfDate
    });

    expect(result.dayPlans.filter((day) => day.hardDay)).toHaveLength(1);
  });

  it("preserves protected anchors without generating contact sessions", () => {
    const state = stateFixture();
    const protectedDate = state.training.protectedAnchors[0]?.date;
    if (!protectedDate) {
      throw new Error("fixture missing protected anchor");
    }
    const materialization = materializationFixture({
      nextWeekDayPlanPreview: state.training.nextWeekMaterialization.nextWeekDayPlanPreview.map((day, index) => (index === 0 ? { ...day, date: protectedDate } : day))
    });
    const result = nextWeekPreviewToMicrocycle({
      materialization,
      currentBlock: state.training.activeBlock,
      protectedWorkouts: state.training.protectedAnchors,
      asOfDate: fixtureAsOfDate
    });

    expect(result.dayPlans[0]?.protectedAnchors.length).toBeGreaterThan(0);
    expect(result.dayPlans.flatMap((day) => day.generatedSessions)).toEqual([]);
  });

  it("hold_for_review creates recovery/support day plans only", () => {
    const state = stateFixture();
    const materialization = materializationFixture({
      materializedVolumeStrategy: "hold_for_review",
      nextWeekDayPlanPreview: state.training.nextWeekMaterialization.nextWeekDayPlanPreview.map((day) => ({ ...day, hardDay: true, role: "hard_day" }))
    });
    const result = nextWeekPreviewToMicrocycle({
      materialization,
      currentBlock: state.training.activeBlock,
      protectedWorkouts: [],
      asOfDate: fixtureAsOfDate
    });

    expect(result.dayPlans.every((day) => !day.hardDay)).toBe(true);
    expect(result.dayPlans.every((day) => day.role === "recovery_day" || day.role === "support_day")).toBe(true);
  });

  it("tournament_conserve creates conservative roles", () => {
    const state = stateFixture();
    const materialization = materializationFixture({
      materializedVolumeStrategy: "tournament_conserve",
      nextWeekDayPlanPreview: state.training.nextWeekMaterialization.nextWeekDayPlanPreview.map((day) => ({ ...day, role: "tournament_conservation_day", hardDay: false }))
    });
    const result = nextWeekPreviewToMicrocycle({
      materialization,
      currentBlock: state.training.activeBlock,
      protectedWorkouts: [],
      asOfDate: fixtureAsOfDate
    });

    expect(result.dayPlans.every((day) => day.role === "tournament_conservation_day")).toBe(true);
    expect(result.dayPlans.every((day) => day.fuelDemand === "low")).toBe(true);
  });
});
