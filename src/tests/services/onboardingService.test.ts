import { describe, expect, it, vi } from "vitest";
import type { AthleteProfile, FightOpportunity, ProtectedWorkout, TournamentDetails } from "../../engine/core/types";
import { resolveAndPersistPerformanceState } from "../../services/engine/resolveAndPersistPerformanceState";
import { loadAthleteJourney, type AthleteJourneyRepositories } from "../../services/supabase/loadAthleteJourney";
import {
  completeOnboarding,
  createDefaultFightDraft,
  createDefaultOnboardingDraft,
  createDefaultTournamentDraft,
  saveFightSetup,
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
        store.fights.push(fight);
        return { id: "fight_1" };
      })
    },
    tournament: {
      listTournamentPlans: vi.fn(async () => store.tournaments),
      insertTournamentPlan: vi.fn(async (_userId: string, tournament: TournamentDetails) => {
        store.tournaments.push(tournament);
        return { id: "tournament_1" };
      })
    },
    protectedWorkout: {
      listProtectedWorkouts: vi.fn(async () => store.protectedWorkouts),
      insertProtectedWorkout: vi.fn(async (_userId: string, workout: ProtectedWorkout) => {
        store.protectedWorkouts.push(workout);
        return { id: `protected_${store.protectedWorkouts.length}` };
      }),
      insertProtectedWorkouts: vi.fn(async (_userId: string, workouts: readonly ProtectedWorkout[]) => {
        store.protectedWorkouts.push(...workouts);
        return { ids: workouts.map((_, index) => `protected_${index}`) };
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
    training: { listGeneratedSessions: vi.fn(async () => []) },
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
});
