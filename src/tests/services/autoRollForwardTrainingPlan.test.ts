import { describe, expect, it, vi } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import type { PerformanceState } from "../../engine/core/types";
import type { PersistedTrainingNextWeekPreview } from "../../services/supabase/trainingNextWeekPreviewRepository";
import { autoRollForwardTrainingPlan } from "../../services/training/autoRollForwardTrainingPlan";
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

function repositoriesFor(initialPreview: PersistedTrainingNextWeekPreview) {
  let preview = initialPreview;
  const listPreviewsForBlock = vi.fn(async () => [preview]);
  const materializedPreview = () => ({
    ...preview,
    status: "materialized" as const,
    acceptedAt: preview.acceptedAt ?? "2026-05-20T00:00:00.000Z",
    materializedAt: "2026-05-26T00:00:00.000Z"
  });
  const markPreviewMaterialized = vi.fn(async () => {
    preview = materializedPreview();
    return preview;
  });
  return {
    journey: {
      appendEvent: vi.fn(async () => ({ id: "journey_event_1" }))
    },
    engineRun: {
      upsertGeneratedSessions: vi.fn(async () => undefined)
    },
    trainingBlock: {
      upsertTrainingMicrocycle: vi.fn(async () => ({ id: "microcycle_1" })),
      upsertTrainingDayPlans: vi.fn(async () => ({ ids: ["day_1", "day_2"] }))
    },
    trainingNextWeekPreview: {
      getLatestPreviewForBlock: vi.fn(async () => preview),
      listPreviewsForBlock,
      markPreviewAccepted: vi.fn(async () => ({ ...preview, status: "accepted" as const })),
      markPreviewMaterialized
    },
    trainingProgression: {
      insertTrainingBlockTimelineEvent: vi.fn(async () => ({ id: "timeline_1" }))
    },
    calls: {
      listPreviewsForBlock,
      markPreviewMaterialized
    }
  };
}

describe("autoRollForwardTrainingPlan", () => {
  it("returns not_needed when there is no accepted preview", async () => {
    const state = stateFixture();
    const preview = previewFixture(state);
    const repositories = repositoriesFor(preview);

    const result = await autoRollForwardTrainingPlan({
      userId: "user_1",
      current: state,
      repositories,
      asOfDate: preview.weekStartDate,
      options: { enabled: true }
    });

    expect(result.status).toBe("not_needed");
    expect(result.explanation).toContain("not accepted");
    expect(result.shouldRefreshState).toBe(false);
    expect(repositories.trainingBlock.upsertTrainingMicrocycle).not.toHaveBeenCalled();
  });

  it("returns not_needed before the accepted preview boundary", async () => {
    const state = stateFixture();
    const preview = previewFixture(state, { status: "accepted", acceptedAt: "2026-05-20T00:00:00.000Z" });
    const repositories = repositoriesFor(preview);

    const result = await autoRollForwardTrainingPlan({
      userId: "user_1",
      current: state,
      repositories,
      asOfDate: fixtureAsOfDate,
      options: { enabled: true }
    });

    expect(result.status).toBe("not_needed");
    expect(result.explanation).toContain(preview.weekStartDate);
    expect(result.shouldRefreshState).toBe(false);
    expect(repositories.engineRun.upsertGeneratedSessions).not.toHaveBeenCalled();
  });

  it("materializes at the boundary and emits auto-roll-forward audit payloads", async () => {
    const state = stateFixture();
    const base = previewFixture(state);
    const preview = previewFixture(state, {
      status: "accepted",
      volumeStrategy: "progress_small",
      acceptedAt: "2026-05-20T00:00:00.000Z",
      preview: {
        ...base.preview,
        materializedVolumeStrategy: "progress_small"
      }
    });
    const repositories = repositoriesFor(preview);

    const result = await autoRollForwardTrainingPlan({
      userId: "user_1",
      current: state,
      repositories,
      asOfDate: preview.weekStartDate,
      options: { enabled: true, auditMetadata: { smokeRunId: "test_smoke" } }
    });

    expect(result.status).toBe("materialized");
    expect(result.shouldRefreshState).toBe(true);
    expect(result.materializedDayPlanIds).toEqual(["day_1", "day_2"]);
    expect(result.generatedSessionIds?.length).toBeGreaterThan(0);
    expect(repositories.trainingProgression.insertTrainingBlockTimelineEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          eventType: "next_week_materialized",
          payload: expect.objectContaining({
            autoRollForward: true,
            previewId: "preview_1",
            weekIndex: preview.weekIndex,
            reason: "accepted_preview_reached_week_boundary",
            generatedSessionCount: expect.any(Number)
          })
        })
      })
    );
    expect(repositories.journey.appendEvent).toHaveBeenCalledWith(
      "user_1",
      "TrainingPlanAdjusted",
      expect.objectContaining({
        source: "auto_roll_forward",
        previewId: "preview_1",
        generatedSessionCount: expect.any(Number)
      })
    );
  });

  it("is idempotent on repeated calls once the preview is materialized", async () => {
    const state = stateFixture();
    const base = previewFixture(state);
    const preview = previewFixture(state, {
      status: "accepted",
      volumeStrategy: "progress_small",
      acceptedAt: "2026-05-20T00:00:00.000Z",
      preview: {
        ...base.preview,
        materializedVolumeStrategy: "progress_small"
      }
    });
    const repositories = repositoriesFor(preview);

    const first = await autoRollForwardTrainingPlan({
      userId: "user_1",
      current: state,
      repositories,
      asOfDate: preview.weekStartDate,
      options: { enabled: true }
    });
    const second = await autoRollForwardTrainingPlan({
      userId: "user_1",
      current: state,
      repositories,
      asOfDate: preview.weekStartDate,
      options: { enabled: true }
    });

    expect(first.status).toBe("materialized");
    expect(second.status).toBe("not_needed");
    expect(second.shouldRefreshState).toBe(false);
    expect(repositories.trainingNextWeekPreview.markPreviewMaterialized).toHaveBeenCalledTimes(1);
    expect(repositories.engineRun.upsertGeneratedSessions).toHaveBeenCalledTimes(1);
  });

  it("blocks hard-stop safety without materializing", async () => {
    const baseState = stateFixture();
    const state = stateFixture({ readiness: { ...baseState.readiness, color: "red" } });
    const preview = previewFixture(state, { status: "accepted", acceptedAt: "2026-05-20T00:00:00.000Z" });
    const repositories = repositoriesFor(preview);

    const result = await autoRollForwardTrainingPlan({
      userId: "user_1",
      current: state,
      repositories,
      asOfDate: preview.weekStartDate,
      options: { enabled: true }
    });

    expect(result.status).toBe("blocked");
    expect(result.explanation).toContain("Hard-stop safety");
    expect(result.shouldRefreshState).toBe(false);
    expect(repositories.trainingBlock.upsertTrainingMicrocycle).not.toHaveBeenCalled();
  });

  it("blocks hold_for_review without explicit approval", async () => {
    const state = stateFixture();
    const base = previewFixture(state);
    const preview = previewFixture(state, {
      status: "accepted",
      volumeStrategy: "hold_for_review",
      acceptedAt: "2026-05-20T00:00:00.000Z",
      preview: {
        ...base.preview,
        materializedVolumeStrategy: "hold_for_review"
      }
    });
    const repositories = repositoriesFor(preview);

    const result = await autoRollForwardTrainingPlan({
      userId: "user_1",
      current: state,
      repositories,
      asOfDate: preview.weekStartDate,
      options: { enabled: true }
    });

    expect(result.status).toBe("blocked");
    expect(result.explanation).toContain("Review required");
    expect(result.shouldRefreshState).toBe(false);
    expect(repositories.engineRun.upsertGeneratedSessions).not.toHaveBeenCalled();
  });

  it("blocks previews from the wrong athlete or active block", async () => {
    const state = stateFixture();
    const preview = previewFixture(state, {
      status: "accepted",
      userId: "user_2",
      acceptedAt: "2026-05-20T00:00:00.000Z"
    });
    const repositories = repositoriesFor(preview);

    const result = await autoRollForwardTrainingPlan({
      userId: "user_1",
      current: state,
      repositories,
      asOfDate: preview.weekStartDate,
      options: { enabled: true }
    });

    expect(result.status).toBe("blocked");
    expect(result.explanation).toContain("does not belong");
    expect(result.shouldRefreshState).toBe(false);
    expect(repositories.trainingBlock.upsertTrainingDayPlans).not.toHaveBeenCalled();
  });

  it("does not create generated sparring or contact prescriptions", async () => {
    const state = stateFixture();
    const base = previewFixture(state);
    const preview = previewFixture(state, {
      status: "accepted",
      volumeStrategy: "progress_small",
      acceptedAt: "2026-05-20T00:00:00.000Z",
      preview: {
        ...base.preview,
        materializedVolumeStrategy: "progress_small"
      }
    });
    const repositories = repositoriesFor(preview);

    const result = await autoRollForwardTrainingPlan({
      userId: "user_1",
      current: state,
      repositories,
      asOfDate: preview.weekStartDate,
      options: { enabled: true }
    });
    const rows = (repositories.engineRun.upsertGeneratedSessions as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as {
      session_payload: { family: string; prescription: readonly string[] };
    }[];
    const generatedText = rows.flatMap((row) => [row.session_payload.family, ...row.session_payload.prescription]).join(" ").toLowerCase();

    expect(result.status).toBe("materialized");
    expect(generatedText).not.toContain("sparring");
    expect(generatedText).not.toContain("contact");
  });
});
