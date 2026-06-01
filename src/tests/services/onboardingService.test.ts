import { describe, expect, it, vi } from "vitest";
import type { AthleteProfile, FightOpportunity, GeneratedTrainingSession, ProtectedWorkout, TournamentDetails } from "../../engine/core/types";
import type { PersistedTrainingPlanAdjustment } from "../../engine/training/planAdjustmentTypes";
import { generatedSupportWeekdayForDate } from "../../engine/training/supportAvailability";
import { resolveAndPersistPerformanceState } from "../../services/engine/resolveAndPersistPerformanceState";
import { loadAthleteJourney, type AthleteJourneyRepositories } from "../../services/supabase/loadAthleteJourney";
import {
  completeOnboarding,
  createDefaultFightDraft,
  createDefaultOnboardingDraft,
  createDefaultTournamentDraft,
  deleteRecurringProtectedAnchor,
  deleteProtectedSession,
  saveRecurringProtectedAnchor,
  saveBuildGoal,
  saveFightSetup,
  saveProtectedSession,
  saveRecoveryGoal,
  saveTournamentSetup,
  updateProfileSettings,
  type OnboardingDraft
} from "../../services/supabase/onboardingService";
import { RepositoryError } from "../../services/supabase/repositoryTypes";
import { materializeProtectedWorkoutAnchors } from "../../engine/training/protectedAnchors";
import { fixtureAsOfDate } from "../fixtures/engineFixtures";

function createOnboardingRepositories() {
  const store = {
    bodyMass: [] as { date: string; bodyMassKg: number; source: "manual" }[],
    events: [] as { type: string; payload: Record<string, unknown> }[],
    fights: [] as FightOpportunity[],
    profile: null as AthleteProfile | null,
    protectedWorkouts: [] as ProtectedWorkout[],
    supersededTournamentIds: new Set<string>(),
    timelineEvents: [] as unknown[],
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
      supersedeActiveTrainingBlock: vi.fn(async () => ({ ids: [] })),
      insertTrainingPlanAdjustment: vi.fn(async () => ({ id: "adjustment_1" })),
      supersedeTrainingPlanAdjustments: vi.fn(async () => ({ ids: [] }))
    },
    trainingNextWeekPreview: {
      upsertTrainingNextWeekPreview: vi.fn(),
      getLatestPreviewForBlock: vi.fn(async () => null),
      listPreviewsForBlock: vi.fn(async () => []),
      markPreviewAccepted: vi.fn(),
      markPreviewMaterialized: vi.fn(),
      supersedePreviewsForBlock: vi.fn(async () => ({ ids: [] }))
    },
    trainingProgression: {
      listTrainingWeekSummaries: vi.fn(async () => []),
      listTrainingProgressionDecisions: vi.fn(async () => []),
      listTrainingBlockTimelineEvents: vi.fn(async () => []),
      upsertTrainingWeekSummary: vi.fn(async () => ({ id: "week_summary_1" })),
      insertTrainingProgressionDecision: vi.fn(async () => ({ id: "progression_decision_1" })),
      insertTrainingBlockTimelineEvent: vi.fn(async (record: unknown) => {
        store.timelineEvents.push(record);
        return { id: `timeline_event_${store.timelineEvents.length}` };
      })
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
  it("default onboarding draft starts with no protected anchors", () => {
    const draft = createDefaultOnboardingDraft(fixtureAsOfDate);

    expect(draft.protectedSchedule).toEqual([]);
    expect(draft.recurringProtectedSchedule).toEqual([]);
    expect(draft.protectedScheduleChoice).toBe("no_anchors");
  });

  it("valid build-phase onboarding writes profile, body mass, no hidden anchors, and events", async () => {
    const { repositories, store } = createOnboardingRepositories();
    const draft = createDefaultOnboardingDraft(fixtureAsOfDate);

    await completeOnboarding({ userId: "user_1", asOfDate: fixtureAsOfDate, draft, repositories });

    expect(store.profile?.athleteId).toBe("user_1");
    expect(store.bodyMass).toHaveLength(1);
    expect(store.protectedWorkouts).toHaveLength(0);
    expect(store.profile?.protectedBoxingSchedule).toEqual([]);
    expect(store.profile?.recurringProtectedAnchors).toEqual([]);
    expect(store.events.map((event) => event.type)).toContain("OnboardingCompleted");
    expect(repositories.athlete.upsertProfile).toHaveBeenCalledWith("user_1", expect.objectContaining({ wearablePreference: "manual_only" }));
    const result = await resolveFromStore(repositories);
    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.state.training.currentMicrocycle.protectedAnchorCount).toBe(0);
      expect(result.state.training.protectedAnchors).toEqual([]);
    }
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

  it("plan weekly anchor save stores a recurring template without creating a dated protected workout", async () => {
    const { repositories, store } = createOnboardingRepositories();
    await completeOnboarding({ userId: "user_1", asOfDate: fixtureAsOfDate, draft: createDefaultOnboardingDraft(fixtureAsOfDate), repositories });
    if (!store.profile) {
      throw new Error("profile missing");
    }

    const saved = await saveRecurringProtectedAnchor({
      userId: "user_1",
      currentProfile: store.profile,
      anchor: {
        type: "boxing_class",
        weekday: "monday",
        localStartTime: "18:00",
        durationMinutes: 60,
        intensity: "moderate",
        note: "Class night"
      },
      repositories
    });

    expect(store.profile.recurringProtectedAnchors?.some((anchor) => anchor.id === saved.id && anchor.weekday === "monday" && anchor.localStartTime === "18:00")).toBe(true);
    expect(store.protectedWorkouts).toHaveLength(0);
    expect(store.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "ProtectedWorkoutPlanned", payload: expect.objectContaining({ recurring: true, weekday: "monday" }) })
      ])
    );

    await deleteRecurringProtectedAnchor({
      userId: "user_1",
      currentProfile: store.profile,
      anchorId: saved.id,
      repositories
    });

    expect(store.profile.recurringProtectedAnchors?.some((anchor) => anchor.id === saved.id)).toBe(false);
    const materialized = materializeProtectedWorkoutAnchors({
      concreteWorkouts: store.profile.protectedBoxingSchedule,
      recurringAnchors: store.profile.recurringProtectedAnchors ?? [],
      startDate: fixtureAsOfDate,
      endDate: "2026-05-26"
    });
    expect(materialized.some((anchor) => anchor.recurringAnchorId === saved.id)).toBe(false);
  });

  it("new plan clear and replace modes remove old recurring anchors and future protected workouts", async () => {
    const { repositories, store } = createOnboardingRepositories();
    await completeOnboarding({ userId: "user_1", asOfDate: fixtureAsOfDate, draft: createDefaultOnboardingDraft(fixtureAsOfDate), repositories });
    if (!store.profile) {
      throw new Error("profile missing");
    }

    const weekly = await saveRecurringProtectedAnchor({
      userId: "user_1",
      currentProfile: store.profile,
      anchor: {
        type: "boxing_class",
        weekday: "monday",
        durationMinutes: 60,
        intensity: "moderate",
        activeFrom: fixtureAsOfDate
      },
      repositories
    });
    const dated = await saveProtectedSession({
      userId: "user_1",
      currentProfile: weekly.profile,
      workout: {
        type: "technical_session",
        date: "2026-05-22",
        durationMinutes: 45,
        intensity: "moderate"
      },
      repositories
    });

    await saveBuildGoal({
      userId: "user_1",
      draft: {
        primaryFocus: "balanced",
        planAction: "start_new_plan",
        protectedScheduleMode: "clear_for_plan",
        planStartDate: fixtureAsOfDate,
        scheduleAvailability: ["tuesday", "thursday", "saturday"]
      },
      repositories
    });

    expect(store.profile?.recurringProtectedAnchors).toEqual([]);
    expect(store.profile?.protectedBoxingSchedule.some((workout) => workout.id === dated.id)).toBe(false);
    expect(store.protectedWorkouts.some((workout) => workout.id === dated.id)).toBe(false);
    expect(store.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "ProtectedWorkoutPlanned", payload: expect.objectContaining({ action: "cleared", protectedScheduleMode: "clear_for_plan" }) }),
        expect.objectContaining({ type: "BuildPhaseStarted", payload: expect.objectContaining({ protectedScheduleMode: "clear_for_plan" }) })
      ])
    );

    await saveBuildGoal({
      userId: "user_1",
      draft: {
        primaryFocus: "strength",
        planAction: "start_new_plan",
        protectedScheduleMode: "replace_for_plan",
        planStartDate: fixtureAsOfDate,
        scheduleAvailability: ["tuesday", "saturday"]
      },
      repositories
    });

    expect(store.profile?.recurringProtectedAnchors).toEqual([]);
    expect(store.profile?.protectedBoxingSchedule).toEqual([]);
  });

  it("wizard-style multiple weekly and dated anchors accumulate before saving a new plan", async () => {
    const { repositories, store } = createOnboardingRepositories();
    await completeOnboarding({ userId: "user_1", asOfDate: fixtureAsOfDate, draft: createDefaultOnboardingDraft(fixtureAsOfDate), repositories });
    if (!store.profile) {
      throw new Error("profile missing");
    }

    const firstWeekly = await saveRecurringProtectedAnchor({
      userId: "user_1",
      currentProfile: store.profile,
      anchor: {
        type: "boxing_class",
        weekday: "monday",
        localStartTime: "18:00",
        durationMinutes: 60,
        intensity: "moderate",
        activeFrom: fixtureAsOfDate
      },
      repositories,
      source: "plan"
    });
    const secondWeekly = await saveRecurringProtectedAnchor({
      userId: "user_1",
      currentProfile: firstWeekly.profile,
      anchor: {
        type: "pads_mitts",
        weekday: "thursday",
        localStartTime: "17:30",
        durationMinutes: 50,
        intensity: "hard",
        rounds: 6,
        activeFrom: fixtureAsOfDate
      },
      repositories,
      source: "plan"
    });
    const dated = await saveProtectedSession({
      userId: "user_1",
      currentProfile: secondWeekly.profile,
      workout: {
        type: "technical_session",
        date: "2026-05-23",
        startTime: "10:00",
        durationMinutes: 45,
        intensity: "moderate",
        note: "Coach technical tune-up"
      },
      repositories,
      source: "plan"
    });

    await saveBuildGoal({
      userId: "user_1",
      draft: {
        primaryFocus: "strength",
        planAction: "start_new_plan",
        protectedScheduleMode: "keep_existing",
        scheduleAvailability: ["tuesday", "saturday"],
        planStartDate: fixtureAsOfDate
      },
      repositories
    });

    expect(store.profile?.recurringProtectedAnchors?.map((anchor) => anchor.weekday)).toEqual(["monday", "thursday"]);
    expect(store.profile?.protectedBoxingSchedule.map((workout) => workout.id)).toContain(dated.id);
    const materialized = materializeProtectedWorkoutAnchors({
      concreteWorkouts: store.profile?.protectedBoxingSchedule ?? [],
      recurringAnchors: store.profile?.recurringProtectedAnchors ?? [],
      startDate: fixtureAsOfDate,
      endDate: "2026-05-26"
    });

    expect(materialized).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ date: "2026-05-21", recurringAnchorId: secondWeekly.id, type: "pads_mitts" }),
        expect.objectContaining({ date: "2026-05-23", id: dated.id, type: "technical_session" }),
        expect.objectContaining({ date: "2026-05-25", recurringAnchorId: firstWeekly.id, type: "boxing_class" })
      ])
    );
    expect(store.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "ProtectedWorkoutPlanned", payload: expect.objectContaining({ action: "kept", protectedScheduleMode: "keep_existing" }) }),
        expect.objectContaining({ type: "BuildPhaseStarted", payload: expect.objectContaining({ primaryFocus: "strength", source: "plan_wizard_new_plan", protectedScheduleMode: "keep_existing" }) })
      ])
    );
  });

  it("plan build and recovery goal saves use existing journey event paths", async () => {
    const { repositories, store } = createOnboardingRepositories();

    await saveBuildGoal({ userId: "user_1", draft: { primaryFocus: "power" }, repositories });
    await saveRecoveryGoal({ userId: "user_1", draft: { durationDays: 5, focus: "sleep" }, repositories });

    expect(store.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "BuildPhaseStarted", payload: expect.objectContaining({ primaryFocus: "power", supportPrescription: "engine_owned", source: "plan" }) }),
        expect.objectContaining({ type: "RecoveryStarted", payload: expect.objectContaining({ durationDays: 5, focus: "sleep", source: "plan" }) })
      ])
    );
  });

  it("plan goal saves can update generated support availability without changing callbacks", async () => {
    const { repositories, store } = createOnboardingRepositories();
    await completeOnboarding({ userId: "user_1", asOfDate: fixtureAsOfDate, draft: createDefaultOnboardingDraft(fixtureAsOfDate), repositories });

    await saveBuildGoal({
      userId: "user_1",
      draft: {
        primaryFocus: "conditioning",
        generatedSupportAvailableDays: ["tuesday", "thursday"]
      },
      repositories
    });

    expect(store.profile?.scheduleAvailability).toEqual(["tuesday", "thursday"]);
    expect(store.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "BuildPhaseStarted", payload: expect.objectContaining({ generatedSupportAvailableDays: ["tuesday", "thursday"] }) })
      ])
    );
  });

  it("plan goal saves normalize schedule availability and record amendment audit", async () => {
    const { repositories, store } = createOnboardingRepositories();
    await completeOnboarding({ userId: "user_1", asOfDate: fixtureAsOfDate, draft: createDefaultOnboardingDraft(fixtureAsOfDate), repositories });
    const activeBlock = { id: "training_block_active", blockKey: "block:user_1:2026-05-19:build_strength" };
    vi.mocked(repositories.trainingBlock.listActiveTrainingBlocks).mockResolvedValue([activeBlock] as never);

    await saveBuildGoal({
      userId: "user_1",
      draft: {
        primaryFocus: "conditioning",
        scheduleAvailability: ["tuesday", "tuesday", "thursday"] as never,
        supportDaysPerWeek: 4,
        planAction: "amend_current_plan"
      },
      repositories
    });

    expect(store.profile?.scheduleAvailability).toEqual(["tuesday", "thursday"]);
    expect(repositories.trainingProgression.insertTrainingBlockTimelineEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        trainingBlockId: "training_block_active",
        event: expect.objectContaining({
          eventType: "adjustment_applied",
          payload: expect.objectContaining({
            source: "plan_wizard_amendment",
            goalMode: "build",
            scheduleAvailability: ["tuesday", "thursday"]
          })
        })
      })
    );
    expect(store.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "TrainingPlanAdjusted", payload: expect.objectContaining({ source: "plan_wizard_amendment", scheduleAvailability: ["tuesday", "thursday"] }) }),
        expect.objectContaining({ type: "BuildPhaseStarted", payload: expect.objectContaining({ supportPrescription: "engine_owned", source: "plan_wizard_amendment" }) })
      ])
    );
    const buildEvent = store.events.find((event) => event.type === "BuildPhaseStarted");
    expect(buildEvent?.payload).not.toHaveProperty("supportDaysPerWeek");
  });

  it("plan goal saves reject an explicitly empty schedule availability", async () => {
    const { repositories } = createOnboardingRepositories();

    await expect(
      saveBuildGoal({
        userId: "user_1",
        draft: { primaryFocus: "power", scheduleAvailability: [] as never },
        repositories
      })
    ).rejects.toBeInstanceOf(RepositoryError);
    expect(repositories.athlete.upsertProfile).not.toHaveBeenCalled();
  });

  it("starting a new plan supersedes the prior active block without deleting history", async () => {
    const { repositories, store } = createOnboardingRepositories();
    await completeOnboarding({ userId: "user_1", asOfDate: fixtureAsOfDate, draft: createDefaultOnboardingDraft(fixtureAsOfDate), repositories });
    const activeBlock = { id: "training_block_old", blockKey: "block:user_1:2026-05-19:build_strength" };
    vi.mocked(repositories.trainingBlock.listActiveTrainingBlocks).mockResolvedValue([activeBlock] as never);

    await saveFightSetup({
      userId: "user_1",
      draft: {
        ...createDefaultFightDraft(fixtureAsOfDate),
        planAction: "start_new_plan",
        scheduleAvailability: ["monday", "friday"]
      },
      repositories
    });

    expect(repositories.trainingBlock.supersedeActiveTrainingBlock).toHaveBeenCalledWith("user_1", "training_block_old");
    expect(repositories.trainingNextWeekPreview.supersedePreviewsForBlock).toHaveBeenCalledWith("user_1", "training_block_old");
    expect(repositories.trainingProgression.insertTrainingBlockTimelineEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        trainingBlockId: "training_block_old",
        event: expect.objectContaining({
          eventType: "block_superseded",
          payload: expect.objectContaining({ source: "plan_wizard_new_plan", scheduleAvailability: ["monday", "friday"] })
        })
      })
    );
    expect(store.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "TrainingBlockSuperseded", payload: expect.objectContaining({ source: "plan_wizard_new_plan" }) }),
        expect.objectContaining({ type: "CampStarted", payload: expect.objectContaining({ source: "plan_wizard_new_plan", scheduleAvailability: ["monday", "friday"] }) })
      ])
    );
  });

  it("start_new_plan persists updated availability and does not apply stale superseded-block adjustments", async () => {
    const { repositories, store } = createOnboardingRepositories();
    await completeOnboarding({ userId: "user_1", asOfDate: fixtureAsOfDate, draft: createDefaultOnboardingDraft(fixtureAsOfDate), repositories });
    const activeBlock = { id: "training_block_old", blockKey: "block:user_1:2026-05-19:build_strength" };
    const staleAdjustment: PersistedTrainingPlanAdjustment = {
      id: "adjustment_old_remove_thursday",
      userId: "user_1",
      trainingBlockId: "training_block_old",
      planDate: "2026-05-21",
      adjustmentType: "mark_unavailable",
      command: {
        type: "mark_unavailable",
        date: "2026-05-21",
        reason: "Old block travel day",
        requestedBy: "user",
        actor: { actorType: "athlete", actorId: "user_1" }
      },
      status: "applied",
      engineResponse: {
        status: "applied",
        explanation: "Old block unavailable day removed support.",
        modifiedDayPlans: [],
        safetyFlags: [],
        persistedAdjustmentPayload: {}
      },
      createdAt: "2026-05-18T00:00:00.000Z"
    };
    const staleGeneratedSession: GeneratedTrainingSession = {
      id: "generated:old-block:only-support",
      date: fixtureAsOfDate,
      family: "recovery_reset",
      title: "Old block only support",
      durationMinutes: 20,
      intensity: "recovery",
      prescription: ["Old block recovery"],
      rationale: "Old generated session from a superseded block.",
      protects: ["audit history"],
      modifications: [],
      fuelDemand: "low"
    };
    vi.mocked(repositories.trainingBlock.listActiveTrainingBlocks).mockResolvedValue([activeBlock] as never);
    vi.mocked(repositories.trainingBlock.listTrainingPlanAdjustments).mockResolvedValue([staleAdjustment] as never);
    vi.mocked(repositories.training.listGeneratedSessions).mockResolvedValue([staleGeneratedSession] as never);
    vi.mocked(repositories.journey.listEvents).mockImplementation(
      async () =>
        store.events.map((event, index) => ({
          id: `event_${index + 1}`,
          type: event.type,
          occurredAt: `2026-05-19T00:00:${String(index).padStart(2, "0")}.000Z`,
          payload: event.payload
        })) as never
    );

    await saveBuildGoal({
      userId: "user_1",
      draft: {
        primaryFocus: "balanced",
        planAction: "start_new_plan",
        scheduleAvailability: ["tuesday", "thursday", "saturday"]
      },
      repositories
    });
    const result = await resolveFromStore(repositories);

    expect(repositories.trainingBlock.supersedeActiveTrainingBlock).toHaveBeenCalledWith("user_1", "training_block_old");
    expect(repositories.trainingNextWeekPreview.supersedePreviewsForBlock).toHaveBeenCalledWith("user_1", "training_block_old");
    expect(store.profile?.scheduleAvailability).toEqual(["tuesday", "thursday", "saturday"]);
    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.state.training.generatedSessions.length).toBeGreaterThan(1);
      expect(result.state.training.generatedSessions.map((session) => session.title)).not.toContain("Old block only support");
      expect(result.state.training.generatedSessions.every((session) => store.profile?.scheduleAvailability.includes(generatedSupportWeekdayForDate(session.date)))).toBe(true);
      expect(result.state.training.adjustmentHistory).toEqual([]);
      expect(result.state.viewModels.plan.planLifecycleLabel).toContain("Week 1");
      expect(result.state.viewModels.plan.planLifecycleLabel).toContain("New plan");
      expect(result.state.training.dayPlans.find((day) => day.date === "2026-05-21")?.generatedSessions.length).toBeGreaterThan(0);
    }
  });
});
