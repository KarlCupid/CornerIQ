import { describe, expect, it, vi } from "vitest";
import type { AthleteProfile, FightOpportunity, ProtectedWorkout, TournamentDetails } from "../../engine/core/types";
import { resolveAndPersistPerformanceState } from "../../services/engine/resolveAndPersistPerformanceState";
import { loadAthleteJourney, type AthleteJourneyRepositories } from "../../services/supabase/loadAthleteJourney";
import {
  completeOnboarding,
  createDefaultFightDraft,
  createDefaultOnboardingDraft,
  createDefaultTournamentDraft,
  deleteProtectedSession,
  saveBuildGoal,
  saveFightSetup,
  saveProtectedSession,
  saveRecoveryGoal,
  saveTournamentSetup,
  updateProfileSettings,
  type OnboardingDraft
} from "../../services/supabase/onboardingService";
import { RepositoryError } from "../../services/supabase/repositoryTypes";
import { fixtureAsOfDate } from "../fixtures/engineFixtures";

function createOnboardingRepositories() {
  const store = {
    bodyMass: [] as { date: string; bodyMassKg: number; source: "manual" }[],
    events: [] as { type: string; payload: Record<string, unknown> }[],
    fights: [] as FightOpportunity[],
    profile: null as AthleteProfile | null,
    protectedWorkouts: [] as ProtectedWorkout[],
    supersededTournamentIds: new Set<string>(),
    tournaments: [] as TournamentDetails[]
  };
  const repositories = {
    athlete: {
      getProfile: vi.fn(async () => store.profile),
      upsertProfile: vi.fn(async (_userId: string, profile: AthleteProfile) => {
        store.profile = profile;
        return { id: "profile_1" };
      })
    },
    fight: {
      listFightOpportunities: vi.fn(async () => store.fights),
      insertFightOpportunity: vi.fn(async (_userId: string, fight: FightOpportunity) => {
        const stored = { ...fight, id: fight.id.startsWith("fight_") ? `fight_${store.fights.length + 1}` : fight.id };
        store.fights.push(stored);
        return { id: stored.id };
      }),
      updateFightOpportunity: vi.fn(async (_userId: string, fight: FightOpportunity) => {
        const index = store.fights.findIndex((item) => item.id === fight.id);
        if (index >= 0) {
          store.fights[index] = fight;
        }
        return { id: fight.id };
      })
    },
    tournament: {
      listTournamentPlans: vi.fn(async (_userId: string, options?: { includeSuperseded?: boolean }) => (options?.includeSuperseded ? store.tournaments : store.tournaments.filter((tournament) => !tournament.id || !store.supersededTournamentIds.has(tournament.id)))),
      insertTournamentPlan: vi.fn(async (_userId: string, tournament: TournamentDetails) => {
        const stored = { ...tournament, id: tournament.id ?? `tournament_${store.tournaments.length + 1}` };
        store.tournaments.push(stored);
        return { id: stored.id };
      }),
      updateTournamentPlan: vi.fn(async (_userId: string, tournamentId: string, tournament: TournamentDetails, metadata?: Record<string, unknown>) => {
        const index = store.tournaments.findIndex((item) => item.id === tournamentId);
        if (index >= 0) {
          store.tournaments[index] = { ...tournament, id: tournamentId };
        }
        if (typeof metadata?.supersededAt === "string") {
          store.supersededTournamentIds.add(tournamentId);
        }
        return { id: tournamentId };
      })
    },
    protectedWorkout: {
      listProtectedWorkouts: vi.fn(async () => store.protectedWorkouts),
      insertProtectedWorkout: vi.fn(async (_userId: string, workout: ProtectedWorkout) => {
        const stored = { ...workout, id: `protected_${store.protectedWorkouts.length + 1}` };
        store.protectedWorkouts.push(stored);
        return { id: stored.id };
      }),
      insertProtectedWorkouts: vi.fn(async (_userId: string, workouts: readonly ProtectedWorkout[]) => {
        const ids: string[] = [];
        for (const workout of workouts) {
          const stored = { ...workout, id: `protected_${store.protectedWorkouts.length + 1}` };
          store.protectedWorkouts.push(stored);
          ids.push(stored.id);
        }
        return { ids };
      }),
      updateProtectedWorkout: vi.fn(async (_userId: string, workoutId: string, workout: ProtectedWorkout) => {
        const index = store.protectedWorkouts.findIndex((item) => item.id === workoutId);
        if (index >= 0) {
          store.protectedWorkouts[index] = { ...workout, id: workoutId };
        }
        return { id: workoutId };
      }),
      deleteProtectedWorkout: vi.fn(async (_userId: string, workoutId: string) => {
        store.protectedWorkouts = store.protectedWorkouts.filter((workout) => workout.id !== workoutId);
        return { id: workoutId };
      })
    },
    bodyMass: {
      listLogs: vi.fn(async () => store.bodyMass),
      insertManualLog: vi.fn(async (input: { bodyMassKg: number; date: string }) => {
        store.bodyMass.push({ date: input.date, bodyMassKg: input.bodyMassKg, source: "manual" });
        return { id: "body_mass_1" };
      })
    },
    nutrition: { listFoodLogs: vi.fn(async () => []), insertFoodLog: vi.fn() },
    hydration: { listWaterLogs: vi.fn(async () => []), listElectrolyteLogs: vi.fn(async () => []), insertWaterLog: vi.fn(), insertElectrolyteLog: vi.fn() },
    cycle: { listCycleLogs: vi.fn(async () => []), listSymptomLogs: vi.fn(async () => []), insertSymptomLog: vi.fn(), insertCycleLog: vi.fn() },
    readiness: { listCheckIns: vi.fn(async () => []), insertCheckIn: vi.fn() },
    wearable: { listSignals: vi.fn(async () => []) },
    training: { listCompletedTrainingSessions: vi.fn(async () => []), listGeneratedSessions: vi.fn(async () => []), insertCompletedTrainingSession: vi.fn() },
    trainingBlock: {
      listTrainingPlanAdjustments: vi.fn(async () => []),
      upsertActiveTrainingBlock: vi.fn(async () => ({ id: "training_block_1", blockKey: "block:user_1", lifecycle: "created" })),
      upsertTrainingMicrocycle: vi.fn(async () => ({ id: "training_microcycle_1" })),
      upsertTrainingDayPlans: vi.fn(async () => ({ ids: [] })),
      listActiveTrainingBlocks: vi.fn(async () => []),
      getActiveTrainingBlockForDate: vi.fn(async () => null),
      supersedeActiveTrainingBlocks: vi.fn(async () => ({ ids: [] })),
      insertTrainingPlanAdjustment: vi.fn(async () => ({ id: "adjustment_1" })),
      supersedeTrainingPlanAdjustments: vi.fn(async () => ({ ids: [] }))
    },
    exerciseResult: { listRecentExerciseResults: vi.fn(async () => []), insertExerciseResult: vi.fn(), insertExerciseResults: vi.fn(), listExerciseResultsForCompletedSession: vi.fn() },
    engineRun: {
      listActiveRiskFlags: vi.fn(async () => []),
      saveDecisionTracesForRun: vi.fn(),
      upsertGeneratedSessions: vi.fn(),
      upsertNutritionTarget: vi.fn(),
      upsertRiskFlags: vi.fn(),
      upsertRun: vi.fn(async () => ({ id: "run_1" }))
    },
    journey: {
      listEvents: vi.fn(async () => []),
      appendEvent: vi.fn(async (_userId: string, type: string, payload: Record<string, unknown>) => {
        store.events.push({ type, payload });
        return { id: `event_${store.events.length}` };
      })
    }
  } as unknown as AthleteJourneyRepositories;

  return { repositories, store };
}

async function resolveFromStore(repositories: AthleteJourneyRepositories) {
  const journey = await loadAthleteJourney({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });
  expect(journey.status).toBe("ready");
  return resolveAndPersistPerformanceState({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories, journeyResult: journey });
}

describe("onboardingService", () => {
  it("valid build-phase onboarding writes profile, body mass, anchors, and events", async () => {
    const { repositories, store } = createOnboardingRepositories();
    const draft = createDefaultOnboardingDraft(fixtureAsOfDate);

    await completeOnboarding({ userId: "user_1", asOfDate: fixtureAsOfDate, draft, repositories });

    expect(store.profile?.athleteId).toBe("user_1");
    expect(store.bodyMass).toHaveLength(1);
    expect(store.protectedWorkouts).toHaveLength(1);
    expect(store.events.map((event) => event.type)).toContain("OnboardingCompleted");
    expect(repositories.athlete.upsertProfile).toHaveBeenCalledWith("user_1", expect.objectContaining({ wearablePreference: "manual_only" }));
  });

  it("cycle enabled and manual-only wearable preferences write to athlete profile", async () => {
    const { repositories, store } = createOnboardingRepositories();
    const draft = createDefaultOnboardingDraft(fixtureAsOfDate);
    draft.cycleSupport.preference = "enabled";
    draft.wearablePreference.preference = "manual_only";

    await completeOnboarding({ userId: "user_1", asOfDate: fixtureAsOfDate, draft, repositories });

    expect(store.profile?.cycleTrackingPreference).toBe("enabled");
    expect(store.profile?.wearablePreference).toBe("manual_only");
  });

  it("fight setup onboarding writes a fight opportunity and resolves camp objective", async () => {
    const { repositories, store } = createOnboardingRepositories();
    const draft = createDefaultOnboardingDraft(fixtureAsOfDate);
    draft.goal = { phase: "fight_known", fight: { ...createDefaultFightDraft(fixtureAsOfDate), status: "confirmed", boutDate: "2026-06-20", weighInType: "unknown" } };

    await completeOnboarding({ userId: "user_1", asOfDate: fixtureAsOfDate, draft, repositories });
    const result = await resolveFromStore(repositories);

    expect(store.fights).toHaveLength(1);
    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.state.objective).toBe("camp");
      expect(result.state.safety.riskFlags.some((flag) => flag.code === "unknown_weigh_in_timing")).toBe(true);
    }
  });

  it("tournament setup onboarding writes a stay-near-weight tournament plan", async () => {
    const { repositories, store } = createOnboardingRepositories();
    const draft = createDefaultOnboardingDraft(fixtureAsOfDate);
    draft.goal = { phase: "tournament_known", tournament: createDefaultTournamentDraft(fixtureAsOfDate) };

    await completeOnboarding({ userId: "user_1", asOfDate: fixtureAsOfDate, draft, repositories });
    const result = await resolveFromStore(repositories);

    expect(store.tournaments[0]?.strategyMode).toBe("stay_near_weight");
    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.state.tournamentStrategy.strategyMode).toBe("stay_near_weight");
    }
  });

  it("malformed onboarding draft fails before writes", async () => {
    const { repositories } = createOnboardingRepositories();

    await expect(completeOnboarding({ userId: "user_1", asOfDate: fixtureAsOfDate, draft: {} as OnboardingDraft, repositories })).rejects.toBeInstanceOf(RepositoryError);
    expect(repositories.athlete.upsertProfile).not.toHaveBeenCalled();
  });

  it("rejects undefined userId before repository writes", async () => {
    const { repositories } = createOnboardingRepositories();
    const draft = createDefaultOnboardingDraft(fixtureAsOfDate);

    await expect(completeOnboarding({ userId: undefined as unknown as string, asOfDate: fixtureAsOfDate, draft, repositories })).rejects.toBeInstanceOf(RepositoryError);
    expect(repositories.athlete.upsertProfile).not.toHaveBeenCalled();
  });

  it("minor athlete fight setup blocks acute weight manipulation through engine safety", async () => {
    const { repositories } = createOnboardingRepositories();
    const draft = createDefaultOnboardingDraft(fixtureAsOfDate);
    draft.safety.ageYears = 16;
    draft.bodyMass.currentBodyMassKg = 61;
    draft.bodyMass.typicalWalkAroundWeightKg = 61;
    draft.goal = {
      phase: "fight_known",
      fight: {
        ...createDefaultFightDraft(fixtureAsOfDate),
        status: "confirmed",
        boutDate: "2026-06-01",
        weighInType: "same_day",
        weighInDateTime: "2026-06-01T08:00:00.000Z",
        targetClassLabel: "57 kg",
        targetLimitKg: 57,
        contractedWeightKg: 57
      }
    };

    await completeOnboarding({ userId: "user_1", asOfDate: fixtureAsOfDate, draft, repositories });
    const result = await resolveFromStore(repositories);

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.state.safety.riskFlags.some((flag) => flag.code === "minor_acute_cut_blocked")).toBe(true);
    }
  });

  it("standalone fight and tournament setup services write rows and events", async () => {
    const { repositories, store } = createOnboardingRepositories();

    await saveFightSetup({ userId: "user_1", draft: createDefaultFightDraft(fixtureAsOfDate), repositories });
    await saveTournamentSetup({ userId: "user_1", draft: createDefaultTournamentDraft(fixtureAsOfDate), repositories });

    expect(store.fights).toHaveLength(1);
    expect(store.tournaments).toHaveLength(1);
    expect(store.events.map((event) => event.type)).toEqual(expect.arrayContaining(["FightOpportunityCreated", "CampStarted", "TournamentStarted"]));
  });

  it("saving a second active fight cancels the older active setup without deleting it", async () => {
    const { repositories, store } = createOnboardingRepositories();

    await saveFightSetup({ userId: "user_1", draft: { ...createDefaultFightDraft(fixtureAsOfDate), boutDate: "2026-06-01" }, repositories });
    await saveFightSetup({ userId: "user_1", draft: { ...createDefaultFightDraft(fixtureAsOfDate), boutDate: "2026-06-20", status: "confirmed" }, repositories });

    expect(store.fights).toHaveLength(2);
    expect(store.fights.filter((fight) => ["tentative", "confirmed", "short_notice"].includes(fight.status))).toHaveLength(1);
    expect(store.fights.some((fight) => fight.status === "canceled")).toBe(true);
    expect(store.events.map((event) => event.type)).toContain("FightOpportunityCreated");
  });

  it("editing a fight draft with an id updates the existing record", async () => {
    const { repositories, store } = createOnboardingRepositories();

    await saveFightSetup({ userId: "user_1", draft: { ...createDefaultFightDraft(fixtureAsOfDate), boutDate: "2026-06-01" }, repositories });
    const existingId = store.fights[0]?.id;
    if (!existingId) {
      throw new Error("fight missing");
    }
    await saveFightSetup({ userId: "user_1", draft: { ...createDefaultFightDraft(fixtureAsOfDate), id: existingId, boutDate: "2026-06-22" }, repositories });

    expect(store.fights).toHaveLength(1);
    expect(store.fights[0]?.boutDate).toBe("2026-06-22");
    expect(repositories.fight.updateFightOpportunity).toHaveBeenCalled();
  });

  it("saving a tournament supersedes the upcoming tournament while keeping history readable", async () => {
    const { repositories, store } = createOnboardingRepositories();
    await completeOnboarding({ userId: "user_1", asOfDate: fixtureAsOfDate, draft: createDefaultOnboardingDraft(fixtureAsOfDate), repositories });

    await saveTournamentSetup({ userId: "user_1", draft: { ...createDefaultTournamentDraft(fixtureAsOfDate), tournamentStartDate: "2026-06-01", tournamentEndDate: "2026-06-02", possibleBoutDates: ["2026-06-01"] }, repositories });
    await saveTournamentSetup({ userId: "user_1", draft: { ...createDefaultTournamentDraft(fixtureAsOfDate), tournamentStartDate: "2026-07-01", tournamentEndDate: "2026-07-02", possibleBoutDates: ["2026-07-01"] }, repositories });

    expect(store.tournaments).toHaveLength(2);
    expect(await repositories.tournament.listTournamentPlans("user_1")).toHaveLength(1);
    expect(await repositories.tournament.listTournamentPlans("user_1", { includeSuperseded: true })).toHaveLength(2);
    const journey = await loadAthleteJourney({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });
    expect(journey.status).toBe("ready");
    if (journey.status === "ready") {
      expect(journey.journey.activeTournament?.tournamentStartDate).toBe("2026-07-01");
    }
  });

  it("profile settings update writes profile, protected workout, and preference event", async () => {
    const { repositories, store } = createOnboardingRepositories();
    const draft = createDefaultOnboardingDraft(fixtureAsOfDate);
    await completeOnboarding({ userId: "user_1", asOfDate: fixtureAsOfDate, draft, repositories });
    if (!store.profile) {
      throw new Error("profile missing");
    }

    await updateProfileSettings({
      userId: "user_1",
      currentProfile: store.profile,
      draft: {
        cycleTrackingPreference: "disabled",
        wearablePreference: "undecided",
        equipmentAccess: ["jump_rope", "bag"],
        protectedWorkout: { type: "bag_work", date: fixtureAsOfDate, durationMinutes: 30, intensity: "moderate" }
      },
      repositories
    });

    expect(store.profile?.cycleTrackingPreference).toBe("disabled");
    expect(store.profile?.equipmentAccess).toContain("bag");
    expect(store.protectedWorkouts.some((workout) => workout.type === "bag_work")).toBe(true);
    expect(store.events.map((event) => event.type)).toContain("CyclePatternUpdated");
  });

  it("plan protected session save, update, and delete keep profile and table schedules synced", async () => {
    const { repositories, store } = createOnboardingRepositories();
    await completeOnboarding({ userId: "user_1", asOfDate: fixtureAsOfDate, draft: createDefaultOnboardingDraft(fixtureAsOfDate), repositories });
    if (!store.profile) {
      throw new Error("profile missing");
    }

    const saved = await saveProtectedSession({
      userId: "user_1",
      currentProfile: store.profile,
      workout: {
        type: "pads_mitts",
        date: "2026-05-21",
        startTime: "18:30",
        durationMinutes: 60,
        intensity: "hard",
        rounds: 8,
        note: "Coach pads"
      },
      repositories
    });

    expect(store.profile.protectedBoxingSchedule.some((workout) => workout.id === saved.id && workout.startTime === "18:30")).toBe(true);
    expect(store.protectedWorkouts.some((workout) => workout.id === saved.id && workout.type === "pads_mitts")).toBe(true);

    await saveProtectedSession({
      userId: "user_1",
      currentProfile: store.profile,
      workoutId: saved.id,
      workout: {
        type: "pads_mitts",
        date: "2026-05-22",
        startTime: "19:00",
        durationMinutes: 75,
        intensity: "moderate",
        note: "Moved pads"
      },
      repositories
    });

    expect(store.profile.protectedBoxingSchedule.some((workout) => workout.id === saved.id && workout.date === "2026-05-22" && workout.durationMinutes === 75)).toBe(true);
    expect(store.profile.protectedBoxingSchedule.some((workout) => workout.id === saved.id && workout.date === "2026-05-21")).toBe(false);
    expect(store.protectedWorkouts.some((workout) => workout.id === saved.id && workout.date === "2026-05-22" && workout.durationMinutes === 75)).toBe(true);

    await deleteProtectedSession({
      userId: "user_1",
      currentProfile: store.profile,
      workoutId: saved.id,
      repositories
    });

    expect(store.profile.protectedBoxingSchedule.some((workout) => workout.id === saved.id)).toBe(false);
    expect(store.protectedWorkouts.some((workout) => workout.id === saved.id)).toBe(false);
  });

  it("plan build and recovery goal saves use existing journey event paths", async () => {
    const { repositories, store } = createOnboardingRepositories();

    await saveBuildGoal({ userId: "user_1", draft: { primaryFocus: "power", supportDaysPerWeek: 2 }, repositories });
    await saveRecoveryGoal({ userId: "user_1", draft: { durationDays: 5, focus: "sleep" }, repositories });

    expect(store.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "BuildPhaseStarted", payload: expect.objectContaining({ primaryFocus: "power", source: "plan" }) }),
        expect.objectContaining({ type: "RecoveryStarted", payload: expect.objectContaining({ durationDays: 5, focus: "sleep", source: "plan" }) })
      ])
    );
  });
});
