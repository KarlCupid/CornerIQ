import React, { useEffect } from "react";
import { act, create } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import type { DetailedTrainingSession, ISODateString } from "../../engine/core/types";
import type { PerformanceStateHook } from "../../hooks/usePerformanceState";
import { usePerformanceState } from "../../hooks/usePerformanceState";
import type { QuickLogsHook } from "../../hooks/useQuickLogs";
import { useQuickLogs } from "../../hooks/useQuickLogs";
import type { WorkoutCompletionHook } from "../../hooks/useWorkoutCompletion";
import { useWorkoutCompletion } from "../../hooks/useWorkoutCompletion";
import { useTodayLocalDate, type TodayLocalDateAppStateLike } from "../../hooks/useTodayLocalDate";
import type { CornerSupabaseClient } from "../../services/supabase/client";
import type { AthleteJourneyRepositories } from "../../services/supabase/loadAthleteJourney";
import { no_wearable_manual_only } from "../fixtures/engineFixtures";

vi.mock("react-native", () => ({
  AppState: {
    addEventListener: vi.fn(() => ({ remove: vi.fn() }))
  },
  Platform: {
    OS: "ios"
  }
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface AppStateHarness {
  appState: TodayLocalDateAppStateLike;
  emit: (state: string) => void;
}

interface RolloverHarness {
  performance: PerformanceStateHook;
  quickLogs: QuickLogsHook;
  workoutCompletion: WorkoutCompletionHook;
}

function localDate(year: number, monthIndex: number, day: number, hour: number, minute: number, second = 0, ms = 0): Date {
  return new Date(year, monthIndex, day, hour, minute, second, ms);
}

function createAppStateHarness(): AppStateHarness {
  const listeners = new Set<(state: string) => void>();
  return {
    appState: {
      addEventListener: vi.fn((_type: "change", listener: (state: string) => void) => {
        listeners.add(listener);
        return {
          remove: () => {
            listeners.delete(listener);
          }
        };
      })
    },
    emit: (state) => {
      for (const listener of listeners) {
        listener(state);
      }
    }
  };
}

function createRolloverRepositories(): AthleteJourneyRepositories {
  const journey = no_wearable_manual_only;
  return {
    athlete: {
      getProfile: vi.fn(async () => journey.athlete),
      upsertProfile: vi.fn()
    },
    bodyMass: {
      insertManualLog: vi.fn(),
      listLogs: vi.fn(async () => journey.bodyMassHistory)
    },
    cycle: {
      insertCycleLog: vi.fn(),
      listCycleLogs: vi.fn(async () => journey.cycleHistory),
      listSymptomLogs: vi.fn(async () => [])
    },
    engineRun: {
      listActiveRiskFlags: vi.fn(async () => journey.safetyFlags),
      saveDecisionTracesForRun: vi.fn(),
      upsertGeneratedSessions: vi.fn(),
      upsertNutritionTarget: vi.fn(),
      upsertRiskFlags: vi.fn(),
      upsertRun: vi.fn(async () => ({ id: "run_1" }))
    },
    exerciseResult: {
      insertExerciseResult: vi.fn(),
      insertExerciseResults: vi.fn(async () => ({ ids: [] })),
      listExerciseResultsForCompletedSession: vi.fn(async () => []),
      listRecentExerciseResults: vi.fn(async () => journey.exerciseResults)
    },
    fight: {
      listFightOpportunities: vi.fn(async () => [])
    },
    hydration: {
      insertElectrolyteLog: vi.fn(),
      insertWaterLog: vi.fn(),
      listElectrolyteLogs: vi.fn(async () => journey.electrolyteHistory),
      listWaterLogs: vi.fn(async () => journey.hydrationHistory)
    },
    journey: {
      appendEvent: vi.fn(async () => ({ id: "event_1" })),
      listEvents: vi.fn(async () => journey.journeyEvents)
    },
    nutrition: {
      insertFoodLog: vi.fn(),
      listFoodLogs: vi.fn(async () => journey.nutritionHistory)
    },
    nutritionSafetyReview: {
      acknowledgeNutritionSafetyReview: vi.fn(),
      appendNutritionSafetyReviewEvent: vi.fn(),
      getNutritionSafetyReviewById: vi.fn(),
      listActiveNutritionSafetyReviews: vi.fn(async () => journey.nutritionSafetyReviews),
      listNutritionSafetyReviewEvents: vi.fn(async () => []),
      listNutritionSafetyReviews: vi.fn(async () => journey.nutritionSafetyReviews),
      listRecentNutritionSafetyReviewEvents: vi.fn(async () => journey.nutritionSafetyReviewEvents),
      supersedeNutritionSafetyReviews: vi.fn(),
      upsertNutritionSafetyReview: vi.fn()
    },
    protectedWorkout: {
      insertProtectedWorkout: vi.fn(),
      listProtectedWorkouts: vi.fn(async () => journey.protectedWorkouts)
    },
    readiness: {
      insertCheckIn: vi.fn(),
      listCheckIns: vi.fn(async () => journey.readinessHistory)
    },
    tournament: {
      listTournamentPlans: vi.fn(async () => [])
    },
    training: {
      insertCompletedTrainingSession: vi.fn(async (_userId: string, session: { id: string }) => ({ ...session, id: session.id })),
      listCompletedTrainingSessions: vi.fn(async () => journey.completedTrainingSessions),
      listGeneratedSessions: vi.fn(async () => journey.trainingHistory)
    },
    trainingBlock: {
      getActiveTrainingBlockForDate: vi.fn(async () => null),
      insertTrainingPlanAdjustment: vi.fn(),
      listActiveTrainingBlocks: vi.fn(async () => []),
      listTrainingPlanAdjustments: vi.fn(async () => journey.trainingPlanAdjustments),
      supersedeActiveTrainingBlock: vi.fn(),
      supersedeActiveTrainingBlocks: vi.fn(),
      supersedeTrainingPlanAdjustments: vi.fn(),
      upsertActiveTrainingBlock: vi.fn(async () => ({ blockKey: "block:user_1", id: "training_block_1", lifecycle: "created" })),
      upsertTrainingDayPlans: vi.fn(async () => ({ ids: [] })),
      upsertTrainingMicrocycle: vi.fn(async () => ({ id: "training_microcycle_1" }))
    },
    trainingNextWeekPreview: {
      getLatestPreviewForBlock: vi.fn(async () => null),
      listPreviewsForBlock: vi.fn(async () => []),
      markPreviewAccepted: vi.fn(),
      markPreviewMaterialized: vi.fn(),
      supersedePreviewsForBlock: vi.fn(),
      upsertTrainingNextWeekPreview: vi.fn(async () => ({ id: "preview_1" }))
    },
    trainingProgression: {
      getLatestWeekIndex: vi.fn(async () => 0),
      insertTrainingBlockTimelineEvent: vi.fn(),
      insertTrainingProgressionDecision: vi.fn(),
      listTrainingBlockTimelineEvents: vi.fn(async () => []),
      listTrainingProgressionDecisions: vi.fn(async () => []),
      listTrainingWeekSummaries: vi.fn(async () => []),
      upsertTrainingWeekSummary: vi.fn(async () => ({ id: "week_summary_1" }))
    },
    wearable: {
      listSignals: vi.fn(async () => journey.wearableSignalHistory)
    }
  } as unknown as AthleteJourneyRepositories;
}

function detailedSession(): DetailedTrainingSession {
  return {
    generatedSessionId: "generated_rollover_1",
    date: "2026-05-19",
    durationMinutes: 30,
    family: "strength_full_body",
    fuelDemand: "moderate",
    intensity: "moderate",
    noGeneratedSparring: true,
    readinessModifications: [],
    cycleModifications: [],
    safetyNotes: [],
    sections: [],
    stopConditions: [],
    title: "Rollover strength",
    walkthrough: {
      steps: [],
      summary: "Test session"
    },
    whyThisMattersForBoxing: "Test session."
  } as unknown as DetailedTrainingSession;
}

async function flushEffects(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function renderLocalDateHook(input: { appState?: TodayLocalDateAppStateLike; enabled?: boolean } = {}): Promise<{ date: () => ISODateString }> {
  const snapshot: { current: ISODateString | null } = { current: null };
  function Probe() {
    snapshot.current = useTodayLocalDate(input);
    return React.createElement("Probe");
  }

  await act(async () => {
    create(React.createElement(Probe));
  });
  await flushEffects();

  return {
    date: () => {
      if (!snapshot.current) {
        throw new Error("Date hook did not render.");
      }
      return snapshot.current;
    }
  };
}

async function renderRolloverHarness(input: {
  appState: TodayLocalDateAppStateLike;
  asOfDate?: ISODateString | undefined;
  repositories: AthleteJourneyRepositories;
}): Promise<{ current: () => RolloverHarness }> {
  const session = { user: { id: "user_1" } } as unknown as Session;
  const snapshot: { current: RolloverHarness | null } = { current: null };
  function Probe() {
    const performance = usePerformanceState({
      ...(input.asOfDate === undefined ? {} : { asOfDate: input.asOfDate }),
      autoRollForwardEnabled: false,
      client: {} as unknown as CornerSupabaseClient,
      localDateAppState: input.appState,
      repositories: input.repositories,
      session
    });
    useEffect(() => {
      void performance.refresh();
    }, [performance.refresh]);
    const quickLogs = useQuickLogs({
      asOfDate: performance.asOfDate,
      onRefresh: performance.refresh,
      repositories: performance.repositories,
      userId: session.user.id
    });
    const workoutCompletion = useWorkoutCompletion({
      asOfDate: performance.asOfDate,
      onRefresh: performance.refresh,
      repositories: performance.repositories,
      userId: session.user.id
    });
    snapshot.current = {
      performance,
      quickLogs,
      workoutCompletion
    };
    return React.createElement("Probe");
  }

  await act(async () => {
    create(React.createElement(Probe));
  });
  await flushEffects();

  return {
    current: () => {
      if (!snapshot.current) {
        throw new Error("Rollover harness did not render.");
      }
      return snapshot.current;
    }
  };
}

describe("useTodayLocalDate", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rolls the local date forward when the midnight timer fires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(localDate(2026, 4, 19, 23, 59, 59, 900));
    const harness = await renderLocalDateHook();

    expect(harness.date()).toBe("2026-05-19");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    await flushEffects();

    expect(harness.date()).toBe("2026-05-20");
  });

  it("rolls the local date forward when the app resumes after midnight", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(localDate(2026, 4, 19, 20, 0, 0));
    const appState = createAppStateHarness();
    const harness = await renderLocalDateHook({ appState: appState.appState });

    expect(harness.date()).toBe("2026-05-19");

    vi.setSystemTime(localDate(2026, 4, 20, 8, 0, 0));
    await act(async () => {
      appState.emit("active");
    });
    await flushEffects();

    expect(harness.date()).toBe("2026-05-20");
  });
});

describe("usePerformanceState date rollover", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("refreshes once for the new local date at midnight without looping", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(localDate(2026, 4, 19, 23, 59, 59, 900));
    const appState = createAppStateHarness();
    const repositories = createRolloverRepositories();
    const harness = await renderRolloverHarness({
      appState: appState.appState,
      repositories
    });

    expect(harness.current().performance.asOfDate).toBe("2026-05-19");
    expect(repositories.athlete.getProfile).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    await flushEffects();

    expect(harness.current().performance.asOfDate).toBe("2026-05-20");
    expect(repositories.athlete.getProfile).toHaveBeenCalledTimes(2);
    await flushEffects();
    expect(repositories.athlete.getProfile).toHaveBeenCalledTimes(2);
  });

  it("refreshes for the new local date when foregrounded after midnight", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(localDate(2026, 4, 19, 20, 0, 0));
    const appState = createAppStateHarness();
    const repositories = createRolloverRepositories();
    const harness = await renderRolloverHarness({
      appState: appState.appState,
      repositories
    });

    expect(harness.current().performance.asOfDate).toBe("2026-05-19");
    expect(repositories.athlete.getProfile).toHaveBeenCalledTimes(1);

    vi.setSystemTime(localDate(2026, 4, 20, 8, 0, 0));
    await act(async () => {
      appState.emit("active");
    });
    await flushEffects();

    expect(harness.current().performance.asOfDate).toBe("2026-05-20");
    expect(repositories.athlete.getProfile).toHaveBeenCalledTimes(2);
  });

  it("keeps an explicit asOfDate override deterministic", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(localDate(2026, 4, 19, 23, 59, 59, 900));
    const appState = createAppStateHarness();
    const repositories = createRolloverRepositories();
    const harness = await renderRolloverHarness({
      appState: appState.appState,
      asOfDate: "2026-05-19",
      repositories
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
      appState.emit("active");
    });
    await flushEffects();

    expect(harness.current().performance.asOfDate).toBe("2026-05-19");
    expect(repositories.athlete.getProfile).toHaveBeenCalledTimes(1);
  });

  it("passes the rolled date to quick logs and workout completion", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(localDate(2026, 4, 19, 23, 59, 59, 900));
    const appState = createAppStateHarness();
    const repositories = createRolloverRepositories();
    const harness = await renderRolloverHarness({
      appState: appState.appState,
      repositories
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    await flushEffects();
    expect(harness.current().performance.asOfDate).toBe("2026-05-20");

    await act(async () => {
      await harness.current().quickLogs.actions.logBodyMass({ bodyMassKg: 70 });
    });
    expect(repositories.bodyMass.insertManualLog).toHaveBeenCalledWith({
      bodyMassKg: 70,
      date: "2026-05-20",
      userId: "user_1"
    });

    await act(async () => {
      await harness.current().workoutCompletion.actions.skip(detailedSession(), "rolled date skip");
    });
    expect(repositories.journey.appendEvent).toHaveBeenCalledWith(
      "user_1",
      "TrainingSessionCompleted",
      expect.objectContaining({
        date: "2026-05-20",
        status: "skipped"
      }),
      expect.any(String),
      expect.any(String)
    );
  });
});
