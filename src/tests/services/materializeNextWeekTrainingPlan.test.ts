import { describe, expect, it, vi } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import type { PerformanceState } from "../../engine/core/types";
import type { PersistedTrainingNextWeekPreview } from "../../services/supabase/trainingNextWeekPreviewRepository";
import { materializeNextWeekTrainingPlan } from "../../services/training/materializeNextWeekTrainingPlan";
import { fixtureAsOfDate, no_wearable_manual_only } from "../fixtures/engineFixtures";

function stateFixture(overrides: Partial<PerformanceState> = {}): PerformanceState {
  const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
  return {
    ...state,
    ...overrides,
    training: {
      ...state.training,
      ...(overrides.training ?? {}),
      blockPersistenceStatus: {
        trainingBlockId: "block_1",
        status: "active"
      }
    }
  };
}

function previewFixture(state: PerformanceState, overrides: Partial<PersistedTrainingNextWeekPreview> = {}): PersistedTrainingNextWeekPreview {
  const preview = state.training.nextWeekMaterialization;
  return {
    id: "preview_1",
    userId: "user_1",
    trainingBlockId: "block_1",
    weekIndex: preview.nextWeekIndex,
    weekStartDate: preview.nextWeekStartDate,
    weekEndDate: preview.nextWeekEndDate,
    materializedPhase: preview.materializedPhase,
    materializedDecision: preview.materializedDecision,
    volumeStrategy: preview.materializedVolumeStrategy,
    generatedSupportBias: preview.generatedSupportBias,
    targetHardDayCap: preview.targetHardDayCap,
    engineVersion: state.engineVersion,
    inputHash: "input_1",
    outputHash: "preview_output_1",
    status: "preview",
    acceptedAt: null,
    materializedAt: null,
    supersededAt: null,
    preview,
    createdAt: "2026-05-20T00:00:00.000Z",
    updatedAt: "2026-05-20T00:00:00.000Z",
    ...overrides
  };
}

function repositoriesFor(preview: PersistedTrainingNextWeekPreview) {
  const latest = vi.fn(async () => preview);
  const list = vi.fn(async () => [preview]);
  const acceptedPreview = { ...preview, status: "accepted" as const, acceptedAt: "2026-05-20T00:00:00.000Z" };
  const materializedPreview = { ...acceptedPreview, status: "materialized" as const, materializedAt: "2026-05-26T00:00:00.000Z" };
  return {
    journey: {
      appendEvent: vi.fn(async () => ({ id: "journey_event_1" }))
    },
    trainingBlock: {
      getActiveTrainingBlockForDate: vi.fn(async () => null),
      upsertTrainingMicrocycle: vi.fn(async () => ({ id: "microcycle_1" })),
      upsertTrainingDayPlans: vi.fn(async () => ({ ids: ["day_1", "day_2"] }))
    },
    trainingNextWeekPreview: {
      getLatestPreviewForBlock: latest,
      listPreviewsForBlock: list,
      markPreviewAccepted: vi.fn(async () => acceptedPreview),
      markPreviewMaterialized: vi.fn(async () => materializedPreview),
      supersedePreviewsForBlock: vi.fn(async () => ({ ids: [] })),
      upsertTrainingNextWeekPreview: vi.fn()
    },
    trainingProgression: {
      insertTrainingBlockTimelineEvent: vi.fn(async () => ({ id: "timeline_1" }))
    },
    calls: {
      latest,
      list
    }
  };
}

describe("materializeNextWeekTrainingPlan service", () => {
  it("accept_preview marks the preview accepted and appends a timeline event", async () => {
    const state = stateFixture();
    const preview = previewFixture(state);
    const repositories = repositoriesFor(preview);

    const result = await materializeNextWeekTrainingPlan({
      userId: "user_1",
      current: state,
      repositories,
      asOfDate: fixtureAsOfDate,
      mode: "accept_preview"
    });

    expect(result.status).toBe("accepted");
    expect(repositories.trainingNextWeekPreview.markPreviewAccepted).toHaveBeenCalledWith("user_1", "preview_1");
    expect(repositories.trainingProgression.insertTrainingBlockTimelineEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ eventType: "next_week_preview_accepted" })
      })
    );
  });

  it("materialize_if_week_boundary before boundary defers without writing next-week plans", async () => {
    const state = stateFixture();
    const preview = previewFixture(state);
    const repositories = repositoriesFor(preview);

    const result = await materializeNextWeekTrainingPlan({
      userId: "user_1",
      current: state,
      repositories,
      asOfDate: fixtureAsOfDate,
      mode: "materialize_if_week_boundary"
    });

    expect(result.status).toBe("rejected");
    expect(result.explanation).toContain("not at the week boundary");
    expect(repositories.trainingBlock.upsertTrainingMicrocycle).not.toHaveBeenCalled();
  });

  it("boundary materialization creates next-week day plans and marks the preview materialized", async () => {
    const state = stateFixture();
    const base = previewFixture(state);
    const preview = previewFixture(state, {
      status: "accepted",
      volumeStrategy: "progress_small",
      preview: {
        ...base.preview,
        materializedVolumeStrategy: "progress_small"
      }
    });
    const repositories = repositoriesFor(preview);

    const result = await materializeNextWeekTrainingPlan({
      userId: "user_1",
      current: state,
      repositories,
      asOfDate: preview.weekStartDate,
      mode: "materialize_if_week_boundary"
    });

    expect(result.status).toBe("materialized");
    expect(result.materializedMicrocycleId).toBe("microcycle_1");
    expect(result.materializedDayPlanIds).toEqual(["day_1", "day_2"]);
    expect(repositories.trainingBlock.upsertTrainingDayPlans).toHaveBeenCalledWith(expect.objectContaining({ trainingMicrocycleId: "microcycle_1" }));
    expect(repositories.trainingNextWeekPreview.markPreviewMaterialized).toHaveBeenCalledWith("user_1", "preview_1");
  });

  it("hold_for_review does not materialize without explicit review approval", async () => {
    const state = stateFixture();
    const base = previewFixture(state);
    const preview = previewFixture(state, {
      volumeStrategy: "hold_for_review",
      preview: {
        ...base.preview,
        materializedVolumeStrategy: "hold_for_review"
      }
    });
    const repositories = repositoriesFor(preview);

    const result = await materializeNextWeekTrainingPlan({
      userId: "user_1",
      current: state,
      repositories,
      asOfDate: preview.weekStartDate,
      mode: "materialize_if_week_boundary"
    });

    expect(result.status).toBe("rejected");
    expect(result.explanation).toContain("Review is required");
    expect(repositories.trainingBlock.upsertTrainingMicrocycle).not.toHaveBeenCalled();
  });

  it("hard-stop safety rejects materialization", async () => {
    const state = stateFixture({
      readiness: {
        ...stateFixture().readiness,
        color: "red"
      }
    });
    const base = previewFixture(state);
    const preview = previewFixture(state, {
      status: "accepted",
      volumeStrategy: "progress_small",
      preview: {
        ...base.preview,
        materializedVolumeStrategy: "progress_small"
      }
    });
    const repositories = repositoriesFor(preview);

    const result = await materializeNextWeekTrainingPlan({
      userId: "user_1",
      current: state,
      repositories,
      asOfDate: preview.weekStartDate,
      mode: "materialize_if_week_boundary"
    });

    expect(result.status).toBe("rejected");
    expect(result.explanation).toContain("Hard-stop safety");
    expect(repositories.trainingBlock.upsertTrainingMicrocycle).not.toHaveBeenCalled();
  });

  it("rejects a preview that belongs to a different user", async () => {
    const state = stateFixture();
    const preview = previewFixture(state, { userId: "user_2" });
    const repositories = repositoriesFor(preview);

    const result = await materializeNextWeekTrainingPlan({
      userId: "user_1",
      current: state,
      previewId: "preview_1",
      repositories,
      asOfDate: preview.weekStartDate,
      mode: "materialize_if_week_boundary",
      allowBoundaryOverride: true
    });

    expect(result.status).toBe("rejected");
    expect(result.explanation).toContain("does not belong");
    expect(repositories.trainingBlock.upsertTrainingDayPlans).not.toHaveBeenCalled();
  });
});
