import { describe, expect, it, vi } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import type { PerformanceState } from "../../engine/core/types";
import { createHardStopFlag } from "../../engine/safety/riskSafetyEngine";
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
    engineRun: {
      upsertGeneratedSessions: vi.fn(async () => undefined)
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
    const preview = previewFixture(state, { status: "accepted", acceptedAt: "2026-05-20T00:00:00.000Z" });
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
    expect(repositories.engineRun.upsertGeneratedSessions).not.toHaveBeenCalled();
  });

  it("boundary materialization creates next-week day plans, persists generated sessions, and marks the preview materialized", async () => {
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
    expect(result.generatedSessionIds?.length).toBeGreaterThan(0);
    expect(repositories.trainingBlock.upsertTrainingDayPlans).toHaveBeenCalledWith(expect.objectContaining({ trainingMicrocycleId: "microcycle_1" }));
    expect(repositories.engineRun.upsertGeneratedSessions).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          user_id: "user_1",
          generated_session_key: expect.stringContaining("next-week:"),
          session_payload: expect.objectContaining({
            projectionSource: "next_week_preview_materialization",
            previewId: "preview_1",
            materializedFromPreview: true
          })
        })
      ])
    );
    expect(repositories.trainingNextWeekPreview.markPreviewMaterialized).toHaveBeenCalledWith("user_1", "preview_1");
    expect(repositories.trainingProgression.insertTrainingBlockTimelineEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          eventType: "next_week_materialized",
          payload: expect.objectContaining({ generatedSessionCount: expect.any(Number) })
        })
      })
    );
  });

  it("hold_for_review does not materialize without explicit review approval", async () => {
    const state = stateFixture();
    const base = previewFixture(state);
    const preview = previewFixture(state, {
      status: "accepted",
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
    expect(repositories.engineRun.upsertGeneratedSessions).not.toHaveBeenCalled();
  });

  it("hard-stop safety rejects materialization", async () => {
    const base = stateFixture();
    const hardStop = createHardStopFlag("medical", "acute_illness", "Illness symptoms were logged.", { source: "test" });
    const state = stateFixture({
      readiness: {
        ...base.readiness,
        color: "red"
      },
      safety: {
        ...base.safety,
        riskFlags: [...base.safety.riskFlags, hardStop],
        hardStops: [hardStop],
        blocksPlan: true
      }
    });
    const basePreview = previewFixture(state);
    const preview = previewFixture(state, {
      status: "accepted",
      volumeStrategy: "progress_small",
      preview: {
        ...basePreview.preview,
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
    expect(repositories.engineRun.upsertGeneratedSessions).not.toHaveBeenCalled();
  });

  it("red readiness without a medical hard stop materializes planned work with execution gates", async () => {
    const base = stateFixture();
    const state = stateFixture({
      readiness: {
        ...base.readiness,
        color: "red"
      },
      safety: {
        ...base.safety,
        hardStops: [],
        riskFlags: base.safety.riskFlags.filter((flag) => !flag.hardStop),
        blocksPlan: false
      }
    });
    const basePreview = previewFixture(state);
    const preview = previewFixture(state, {
      status: "accepted",
      volumeStrategy: "progress_small",
      preview: {
        ...basePreview.preview,
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
    const generatedRows = (repositories.engineRun.upsertGeneratedSessions as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] ?? [];
    const generatedText = JSON.stringify(generatedRows);
    expect(generatedText).toContain("Readiness is red without hard-stop symptoms");
    expect(generatedText).toContain("conservative execution gates");
    expect(generatedText).not.toContain("Safety hard stop active: recovery only");
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

  it("generated session materialization is idempotent through deterministic generated_session_key values", async () => {
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
    const firstRepositories = repositoriesFor(preview);
    const secondRepositories = repositoriesFor(preview);

    const first = await materializeNextWeekTrainingPlan({
      userId: "user_1",
      current: state,
      repositories: firstRepositories,
      asOfDate: preview.weekStartDate,
      mode: "materialize_if_week_boundary"
    });
    const second = await materializeNextWeekTrainingPlan({
      userId: "user_1",
      current: state,
      repositories: secondRepositories,
      asOfDate: preview.weekStartDate,
      mode: "materialize_if_week_boundary"
    });

    const firstKeys = (firstRepositories.engineRun.upsertGeneratedSessions as ReturnType<typeof vi.fn>).mock.calls[0]?.[0].map((row: { generated_session_key: string }) => row.generated_session_key);
    const secondKeys = (secondRepositories.engineRun.upsertGeneratedSessions as ReturnType<typeof vi.fn>).mock.calls[0]?.[0].map((row: { generated_session_key: string }) => row.generated_session_key);
    expect(first.generatedSessionIds).toEqual(second.generatedSessionIds);
    expect(firstKeys).toEqual(secondKeys);
  });

  it("hold_for_review with review approval materializes recovery only", async () => {
    const state = stateFixture();
    const base = previewFixture(state);
    const preview = previewFixture(state, {
      status: "accepted",
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
      mode: "materialize_if_week_boundary",
      reviewApproved: true
    });
    const rows = (repositories.engineRun.upsertGeneratedSessions as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as { session_payload: { intensity: string; fuelDemand: string } }[];

    expect(result.status).toBe("materialized");
    expect(rows.every((row) => row.session_payload.intensity !== "hard" && row.session_payload.fuelDemand === "low")).toBe(true);
  });

  it("tournament_conserve creates only conservative generated sessions", async () => {
    const state = stateFixture();
    const base = previewFixture(state);
    const preview = previewFixture(state, {
      status: "accepted",
      volumeStrategy: "tournament_conserve",
      preview: {
        ...base.preview,
        materializedVolumeStrategy: "tournament_conserve"
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
    const rows = (repositories.engineRun.upsertGeneratedSessions as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as { session_payload: { family: string; intensity: string } }[];

    expect(result.status).toBe("materialized");
    expect(rows.every((row) => row.session_payload.family === "recovery_reset" || row.session_payload.family === "taper_maintenance")).toBe(true);
    expect(rows.every((row) => row.session_payload.intensity !== "hard")).toBe(true);
  });

  it("does not mark preview materialized if generated session persistence fails", async () => {
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
    repositories.engineRun.upsertGeneratedSessions = vi.fn(async () => {
      throw new Error("generated session write failed");
    });

    const result = await materializeNextWeekTrainingPlan({
      userId: "user_1",
      current: state,
      repositories,
      asOfDate: preview.weekStartDate,
      mode: "materialize_if_week_boundary"
    });

    expect(result.status).toBe("error");
    expect(result.explanation).toContain("generated session write failed");
    expect(repositories.trainingNextWeekPreview.markPreviewMaterialized).not.toHaveBeenCalled();
  });
});
