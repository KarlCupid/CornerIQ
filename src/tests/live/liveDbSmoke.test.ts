import { describe, expect, it } from "vitest";
import { buildDemoAthleteProfile } from "../../services/supabase/demoDataService";
import { createAthleteJourneyRepositories, loadAthleteJourney } from "../../services/supabase/loadAthleteJourney";
import { createAuthService } from "../../services/supabase/authService";
import { createCornerSupabaseClient, getSupabaseConfigFromEnv } from "../../services/supabase/client";
import type { Json } from "../../services/supabase/database.types";
import type { TableRow } from "../../services/supabase/repositoryTypes";
import { resolveAndPersistPerformanceState } from "../../services/engine/resolveAndPersistPerformanceState";
import type { DetailedTrainingSession, ExerciseResultDraft, ISODateString, ProtectedWorkout } from "../../engine/core/types";
import { completeWorkoutService, completedSessionTypeForFamily } from "../../services/training/completeWorkoutService";
import { applyTrainingPlanAdjustmentService } from "../../services/training/applyTrainingPlanAdjustment";
import { autoRollForwardTrainingPlan } from "../../services/training/autoRollForwardTrainingPlan";
import { materializeNextWeekTrainingPlan } from "../../services/training/materializeNextWeekTrainingPlan";

const runLiveSmoke = process.env.CORNERIQ_LIVE_DB_SMOKE === "1";
const describeLive = runLiveSmoke ? describe : describe.skip;

function todayLocalISODate(): ISODateString {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for CORNERIQ_LIVE_DB_SMOKE=1`);
  }
  return value;
}

function smokePayload(value: Json, smokeRunId: string): Json {
  const base = value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return { ...base, smokeRunId } as Json;
}

function smokeExerciseResult(session: DetailedTrainingSession): ExerciseResultDraft {
  const section = session.sections[0];
  const exercise = section?.exercises[0];
  if (!section || !exercise) {
    throw new Error("Detailed smoke session did not include an exercise.");
  }
  return {
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.name,
    section: section.name,
    prescribed: exercise,
    resultStatus: "completed",
    completedSets: Math.max(1, exercise.sets.length),
    loadText: "smoke controlled load",
    rpe: 6,
    notes: "Live smoke actual result"
  };
}

describeLive("live Supabase CRUD smoke", () => {
  it("signs in, writes manual logs, resolves projections, and cleans up created rows", async () => {
    const config = getSupabaseConfigFromEnv(process.env);
    if (!config) {
      throw new Error("EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are required for live smoke.");
    }

    const client = createCornerSupabaseClient(config);
    const auth = createAuthService(client);
    const email = requiredEnv("CORNERIQ_SMOKE_EMAIL");
    const password = requiredEnv("CORNERIQ_SMOKE_PASSWORD");
    const asOfDate = todayLocalISODate();
    const smokeRunId = `corneriq_live_smoke_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const insertedIds: { bodyMass?: string; electrolyte?: string; protectedWorkout?: string; readiness?: string; water?: string } = {};
    let existingProfile: Pick<TableRow<"athlete_profiles">, "id" | "profile" | "sensitive_medical" | "sensitive_cycle"> | null = null;
    let existingGeneratedSessions: Pick<TableRow<"generated_training_sessions">, "id" | "session_payload">[] = [];
    let existingNutritionTargets: Pick<TableRow<"nutrition_targets">, "id" | "target_payload">[] = [];
    let existingRiskFlags: Pick<TableRow<"risk_flags">, "id" | "severity" | "flag_payload">[] = [];
    let existingTrainingBlockIds = new Set<string>();
    let existingTrainingWeekSummaryIds = new Set<string>();
    let existingTrainingProgressionDecisionIds = new Set<string>();
    let existingTrainingBlockTimelineEventIds = new Set<string>();
    let existingTrainingNextWeekPreviewIds = new Set<string>();
    let existingPreviewWeekMicrocycles: Pick<TableRow<"training_microcycles">, "id" | "hard_day_cap" | "planned_hard_days" | "microcycle_payload">[] = [];
    let existingPreviewWeekDayPlans: Pick<TableRow<"training_day_plans">, "id" | "role" | "hard_day" | "recovery_priority" | "fuel_demand" | "day_payload">[] = [];
    let inputHash: string | null = null;
    let engineRunIds: string[] = [];
    let completedTrainingSessionId: string | null = null;
    let trainingAdjustmentId: string | null = null;
    let trainingBlockId: string | null = null;
    const smokeTrainingWeekSummaryIds: string[] = [];
    const smokeTrainingProgressionDecisionIds: string[] = [];
    const smokeTrainingBlockTimelineEventIds: string[] = [];
    const smokeTrainingNextWeekPreviewIds: string[] = [];
    const smokeTrainingMicrocycleIds: string[] = [];
    const smokeTrainingDayPlanIds: string[] = [];

    const signedIn = await auth.signInWithPassword(email, password);
    expect(signedIn.error).toBeNull();
    const userId = signedIn.data.user?.id;
    if (!userId) {
      throw new Error("Smoke sign-in succeeded without a user id.");
    }

    try {
      const repositories = createAthleteJourneyRepositories(client);
      const coachRelationships = await repositories.coachRelationship?.listCoachRelationshipsForAthlete(userId);
      expect(Array.isArray(coachRelationships)).toBe(true);
      const existingProfileResponse = await client
        .from("athlete_profiles")
        .select("id, profile, sensitive_medical, sensitive_cycle")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      expect(existingProfileResponse.error).toBeNull();
      existingProfile = existingProfileResponse.data;
      const existingGeneratedResponse = await client.from("generated_training_sessions").select("id, session_payload").eq("user_id", userId);
      expect(existingGeneratedResponse.error).toBeNull();
      existingGeneratedSessions = existingGeneratedResponse.data ?? [];
      const existingNutritionResponse = await client.from("nutrition_targets").select("id, target_payload").eq("user_id", userId);
      expect(existingNutritionResponse.error).toBeNull();
      existingNutritionTargets = existingNutritionResponse.data ?? [];
      const existingRiskResponse = await client.from("risk_flags").select("id, severity, flag_payload").eq("user_id", userId);
      expect(existingRiskResponse.error).toBeNull();
      existingRiskFlags = existingRiskResponse.data ?? [];
      const existingTrainingBlocksResponse = await client.from("training_blocks").select("id").eq("user_id", userId);
      expect(existingTrainingBlocksResponse.error).toBeNull();
      existingTrainingBlockIds = new Set((existingTrainingBlocksResponse.data ?? []).map((row) => row.id));
      const existingWeekSummaryResponse = await client.from("training_week_summaries").select("id").eq("user_id", userId);
      expect(existingWeekSummaryResponse.error).toBeNull();
      existingTrainingWeekSummaryIds = new Set((existingWeekSummaryResponse.data ?? []).map((row) => row.id));
      const existingProgressionDecisionResponse = await client.from("training_progression_decisions").select("id").eq("user_id", userId);
      expect(existingProgressionDecisionResponse.error).toBeNull();
      existingTrainingProgressionDecisionIds = new Set((existingProgressionDecisionResponse.data ?? []).map((row) => row.id));
      const existingTimelineResponse = await client.from("training_block_timeline_events").select("id").eq("user_id", userId);
      expect(existingTimelineResponse.error).toBeNull();
      existingTrainingBlockTimelineEventIds = new Set((existingTimelineResponse.data ?? []).map((row) => row.id));
      const existingPreviewResponse = await client.from("training_next_week_previews").select("id").eq("user_id", userId);
      expect(existingPreviewResponse.error).toBeNull();
      existingTrainingNextWeekPreviewIds = new Set((existingPreviewResponse.data ?? []).map((row) => row.id));

      await repositories.athlete.upsertProfile(userId, buildDemoAthleteProfile(userId));
      await client.from("athlete_profiles").update({ sensitive_medical: { smokeRunId } }).eq("user_id", userId);
      insertedIds.bodyMass = (await repositories.bodyMass.insertManualLog({ userId, date: asOfDate, bodyMassKg: 68 })).id;
      insertedIds.readiness = (await repositories.readiness.insertCheckIn({ userId, date: asOfDate, energy1To5: 3, painNotes: [], illnessSymptoms: [], metadata: { smokeRunId } })).id;
      insertedIds.water = (await repositories.hydration.insertWaterLog({ userId, date: asOfDate, liters: 2 })).id;
      insertedIds.electrolyte = (await repositories.hydration.insertElectrolyteLog({ userId, date: asOfDate, sodiumMg: 500, metadata: { smokeRunId } })).id;
      const protectedWorkout: ProtectedWorkout = {
        id: `smoke_protected_${asOfDate}`,
        type: "technical_session",
        date: asOfDate,
        durationMinutes: 30,
        intensity: "moderate",
        protected: true,
        note: "Live smoke protected anchor"
      };
      insertedIds.protectedWorkout = (await repositories.protectedWorkout.insertProtectedWorkout(userId, protectedWorkout, { metadata: { smokeRunId } })).id;

      const journey = await loadAthleteJourney({ userId, asOfDate, repositories });
      if (journey.status !== "ready") {
        const detail = journey.status === "error" ? journey.cause : journey.reason;
        throw new Error(`AthleteJourney did not load during live smoke: ${journey.status}; ${detail}`);
      }
      expect(journey.status).toBe("ready");

      const resolved = await resolveAndPersistPerformanceState({ userId, asOfDate, repositories, journeyResult: journey });
      if (resolved.status !== "ready") {
        throw new Error(`PerformanceState did not resolve during live smoke: ${resolved.status}`);
      }
      expect(resolved.status).toBe("ready");
      expect(resolved.persistenceWarning).toBeUndefined();
      inputHash = resolved.inputHash;
      trainingBlockId = resolved.state.training.blockPersistenceStatus?.trainingBlockId ?? null;
      expect(trainingBlockId).toBeTruthy();
      const blockResponse = await client.from("training_blocks").select("id, block_payload").eq("user_id", userId).eq("id", trainingBlockId!).maybeSingle();
      expect(blockResponse.error).toBeNull();
      expect(blockResponse.data?.id).toBe(trainingBlockId);
      const microcycleResponse = await client.from("training_microcycles").select("id, microcycle_payload").eq("user_id", userId).eq("training_block_id", trainingBlockId!);
      expect(microcycleResponse.error).toBeNull();
      expect(microcycleResponse.data?.length ?? 0).toBeGreaterThan(0);
      const dayPlanResponse = await client.from("training_day_plans").select("id, day_payload").eq("user_id", userId).eq("training_block_id", trainingBlockId!);
      expect(dayPlanResponse.error).toBeNull();
      expect(dayPlanResponse.data?.length ?? 0).toBeGreaterThan(0);
      const weekSummaryResponse = await client
        .from("training_week_summaries")
        .select("id, summary_payload")
        .eq("user_id", userId)
        .eq("training_block_id", trainingBlockId!);
      expect(weekSummaryResponse.error).toBeNull();
      expect(weekSummaryResponse.data?.length ?? 0).toBeGreaterThan(0);
      for (const row of weekSummaryResponse.data ?? []) {
        if (!existingTrainingWeekSummaryIds.has(row.id)) {
          smokeTrainingWeekSummaryIds.push(row.id);
          await client.from("training_week_summaries").update({ summary_payload: smokePayload(row.summary_payload, smokeRunId) }).eq("id", row.id).eq("user_id", userId);
        }
      }
      const progressionDecisionResponse = await client
        .from("training_progression_decisions")
        .select("id, decision_payload")
        .eq("user_id", userId)
        .eq("training_block_id", trainingBlockId!);
      expect(progressionDecisionResponse.error).toBeNull();
      expect(progressionDecisionResponse.data?.length ?? 0).toBeGreaterThan(0);
      for (const row of progressionDecisionResponse.data ?? []) {
        if (!existingTrainingProgressionDecisionIds.has(row.id)) {
          smokeTrainingProgressionDecisionIds.push(row.id);
          await client.from("training_progression_decisions").update({ decision_payload: smokePayload(row.decision_payload, smokeRunId) }).eq("id", row.id).eq("user_id", userId);
        }
      }
      const timelineResponse = await client
        .from("training_block_timeline_events")
        .select("id, event_payload")
        .eq("user_id", userId)
        .eq("training_block_id", trainingBlockId!);
      expect(timelineResponse.error).toBeNull();
      expect(timelineResponse.data?.length ?? 0).toBeGreaterThan(0);
      for (const row of timelineResponse.data ?? []) {
        if (!existingTrainingBlockTimelineEventIds.has(row.id)) {
          smokeTrainingBlockTimelineEventIds.push(row.id);
          await client.from("training_block_timeline_events").update({ event_payload: smokePayload(row.event_payload, smokeRunId) }).eq("id", row.id).eq("user_id", userId);
        }
      }
      const nextWeekPreviewResponse = await client
        .from("training_next_week_previews")
        .select("id, preview_payload, status, week_start_date")
        .eq("user_id", userId)
        .eq("training_block_id", trainingBlockId!);
      expect(nextWeekPreviewResponse.error).toBeNull();
      expect(nextWeekPreviewResponse.data?.length ?? 0).toBeGreaterThan(0);
      const smokePreview = (nextWeekPreviewResponse.data ?? []).find((row) => !existingTrainingNextWeekPreviewIds.has(row.id));
      if (!smokePreview) {
        throw new Error("Live smoke did not create a new next-week preview row to accept safely.");
      }
      smokeTrainingNextWeekPreviewIds.push(smokePreview.id);
      await client.from("training_next_week_previews").update({ preview_payload: smokePayload(smokePreview.preview_payload, smokeRunId) }).eq("id", smokePreview.id).eq("user_id", userId);
      const acceptedPreview = await materializeNextWeekTrainingPlan({
        userId,
        current: resolved.state,
        previewId: smokePreview.id,
        repositories,
        asOfDate,
        mode: "accept_preview",
        auditMetadata: { smokeRunId }
      });
      expect(acceptedPreview.status).toBe("accepted");
      expect(asOfDate < smokePreview.week_start_date).toBe(true);
      const previewTimelineResponse = await client
        .from("training_block_timeline_events")
        .select("id, event_payload")
        .eq("user_id", userId)
        .eq("training_block_id", trainingBlockId!)
        .eq("event_type", "next_week_preview_accepted");
      expect(previewTimelineResponse.error).toBeNull();
      let taggedPreviewTimelineCount = 0;
      for (const row of previewTimelineResponse.data ?? []) {
        if (!existingTrainingBlockTimelineEventIds.has(row.id) && JSON.stringify(row.event_payload).includes(smokePreview.id)) {
          taggedPreviewTimelineCount += 1;
          await client.from("training_block_timeline_events").update({ event_payload: smokePayload(row.event_payload, smokeRunId) }).eq("id", row.id).eq("user_id", userId);
        }
        if (!existingTrainingBlockTimelineEventIds.has(row.id) && !smokeTrainingBlockTimelineEventIds.includes(row.id) && JSON.stringify(row.event_payload).includes(smokePreview.id)) {
          smokeTrainingBlockTimelineEventIds.push(row.id);
        }
      }
      expect(taggedPreviewTimelineCount).toBeGreaterThan(0);

      const existingPreviewWeekMicrocycleResponse = await client
        .from("training_microcycles")
        .select("id, hard_day_cap, planned_hard_days, microcycle_payload")
        .eq("user_id", userId)
        .eq("training_block_id", trainingBlockId!)
        .eq("week_start_date", smokePreview.week_start_date);
      expect(existingPreviewWeekMicrocycleResponse.error).toBeNull();
      existingPreviewWeekMicrocycles = existingPreviewWeekMicrocycleResponse.data ?? [];
      const previewWeekEndDate = (acceptedPreview.status === "accepted" ? resolved.state.training.nextWeekMaterialization.nextWeekEndDate : smokePreview.week_start_date) as ISODateString;
      const existingPreviewWeekDayPlanResponse = await client
        .from("training_day_plans")
        .select("id, role, hard_day, recovery_priority, fuel_demand, day_payload")
        .eq("user_id", userId)
        .eq("training_block_id", trainingBlockId!)
        .gte("plan_date", smokePreview.week_start_date)
        .lte("plan_date", previewWeekEndDate);
      expect(existingPreviewWeekDayPlanResponse.error).toBeNull();
      existingPreviewWeekDayPlans = existingPreviewWeekDayPlanResponse.data ?? [];

      const preBoundaryAuto = await autoRollForwardTrainingPlan({
        userId,
        current: resolved.state,
        repositories,
        asOfDate,
        options: {
          enabled: true,
          auditMetadata: { smokeRunId }
        }
      });
      expect(preBoundaryAuto.status).toBe("not_needed");
      expect(preBoundaryAuto.shouldRefreshState).toBe(false);

      const materializedPreview = await autoRollForwardTrainingPlan({
        userId,
        current: resolved.state,
        repositories,
        asOfDate: smokePreview.week_start_date as ISODateString,
        options: {
          enabled: true,
          allowBoundaryOverrideForTests: true,
          reviewApprovedPreviewIds: [smokePreview.id],
          auditMetadata: { smokeRunId }
        }
      });
      expect(materializedPreview.status).toBe("materialized");
      expect(materializedPreview.shouldRefreshState).toBe(true);
      expect(materializedPreview.generatedSessionIds?.length ?? 0).toBeGreaterThan(0);
      const repeatedAuto = await autoRollForwardTrainingPlan({
        userId,
        current: resolved.state,
        repositories,
        asOfDate: smokePreview.week_start_date as ISODateString,
        options: {
          enabled: true,
          allowBoundaryOverrideForTests: true,
          reviewApprovedPreviewIds: [smokePreview.id],
          auditMetadata: { smokeRunId }
        }
      });
      expect(repeatedAuto.status).toBe("not_needed");
      expect(repeatedAuto.shouldRefreshState).toBe(false);
      const materializedPreviewRow = await client
        .from("training_next_week_previews")
        .select("id, status")
        .eq("user_id", userId)
        .eq("id", smokePreview.id)
        .maybeSingle();
      expect(materializedPreviewRow.error).toBeNull();
      expect(materializedPreviewRow.data?.status).toBe("materialized");
      const materializedMicrocycleResponse = await client
        .from("training_microcycles")
        .select("id, microcycle_payload")
        .eq("user_id", userId)
        .eq("training_block_id", trainingBlockId!)
        .eq("week_start_date", smokePreview.week_start_date);
      expect(materializedMicrocycleResponse.error).toBeNull();
      expect(materializedMicrocycleResponse.data?.length ?? 0).toBeGreaterThan(0);
      const existingPreviewWeekMicrocycleIds = new Set(existingPreviewWeekMicrocycles.map((row) => row.id));
      for (const row of materializedMicrocycleResponse.data ?? []) {
        if (!existingPreviewWeekMicrocycleIds.has(row.id)) {
          smokeTrainingMicrocycleIds.push(row.id);
          await client.from("training_microcycles").update({ microcycle_payload: smokePayload(row.microcycle_payload, smokeRunId) }).eq("id", row.id).eq("user_id", userId);
        }
      }
      const materializedDayPlanResponse = await client
        .from("training_day_plans")
        .select("id, day_payload")
        .eq("user_id", userId)
        .eq("training_block_id", trainingBlockId!)
        .gte("plan_date", smokePreview.week_start_date)
        .lte("plan_date", previewWeekEndDate);
      expect(materializedDayPlanResponse.error).toBeNull();
      expect(materializedDayPlanResponse.data?.length ?? 0).toBeGreaterThan(0);
      const existingPreviewWeekDayPlanIds = new Set(existingPreviewWeekDayPlans.map((row) => row.id));
      for (const row of materializedDayPlanResponse.data ?? []) {
        if (!existingPreviewWeekDayPlanIds.has(row.id)) {
          smokeTrainingDayPlanIds.push(row.id);
          await client.from("training_day_plans").update({ day_payload: smokePayload(row.day_payload, smokeRunId) }).eq("id", row.id).eq("user_id", userId);
        }
      }
      const materializedGeneratedResponse = await client
        .from("generated_training_sessions")
        .select("id, session_payload")
        .eq("user_id", userId)
        .gte("planned_date", smokePreview.week_start_date)
        .lte("planned_date", previewWeekEndDate)
        .filter("session_payload->>previewId", "eq", smokePreview.id);
      expect(materializedGeneratedResponse.error).toBeNull();
      expect(materializedGeneratedResponse.data?.length ?? 0).toBeGreaterThan(0);
      for (const row of materializedGeneratedResponse.data ?? []) {
        await client.from("generated_training_sessions").update({ session_payload: smokePayload(row.session_payload, smokeRunId) }).eq("id", row.id).eq("user_id", userId);
      }
      const materializedTimelineResponse = await client
        .from("training_block_timeline_events")
        .select("id, event_payload")
        .eq("user_id", userId)
        .eq("training_block_id", trainingBlockId!)
        .eq("event_type", "next_week_materialized");
      expect(materializedTimelineResponse.error).toBeNull();
      const materializedTimeline = (materializedTimelineResponse.data ?? []).find((row) => JSON.stringify(row.event_payload).includes(smokePreview.id));
      expect(materializedTimeline).toBeTruthy();
      expect(JSON.stringify(materializedTimeline?.event_payload ?? {})).toContain("generatedSessionCount");
      expect(JSON.stringify(materializedTimeline?.event_payload ?? {})).toContain("autoRollForward");
      for (const row of materializedTimelineResponse.data ?? []) {
        if (!existingTrainingBlockTimelineEventIds.has(row.id) && JSON.stringify(row.event_payload).includes(smokePreview.id)) {
          if (!smokeTrainingBlockTimelineEventIds.includes(row.id)) {
            smokeTrainingBlockTimelineEventIds.push(row.id);
          }
          await client.from("training_block_timeline_events").update({ event_payload: smokePayload(row.event_payload, smokeRunId) }).eq("id", row.id).eq("user_id", userId);
        }
      }

      if (!existingTrainingBlockIds.has(trainingBlockId!)) {
        await client.from("training_blocks").update({ block_payload: smokePayload(blockResponse.data?.block_payload ?? {}, smokeRunId) }).eq("id", trainingBlockId!).eq("user_id", userId);
        for (const row of microcycleResponse.data ?? []) {
          await client.from("training_microcycles").update({ microcycle_payload: smokePayload(row.microcycle_payload, smokeRunId) }).eq("id", row.id).eq("user_id", userId);
        }
        for (const row of dayPlanResponse.data ?? []) {
          await client.from("training_day_plans").update({ day_payload: smokePayload(row.day_payload, smokeRunId) }).eq("id", row.id).eq("user_id", userId);
        }
        const blockEventResponse = await client
          .from("athlete_journey_events")
          .select("id, event_payload")
          .eq("user_id", userId)
          .eq("event_type", "TrainingBlockStarted")
          .filter("event_payload->>blockId", "eq", trainingBlockId!);
        expect(blockEventResponse.error).toBeNull();
        for (const row of blockEventResponse.data ?? []) {
          await client.from("athlete_journey_events").update({ event_payload: smokePayload(row.event_payload, smokeRunId) }).eq("id", row.id).eq("user_id", userId);
        }
      }

      const adjustment = await applyTrainingPlanAdjustmentService({
        userId,
        state: resolved.state,
        repositories,
        actor: {
          actorType: "coach",
          actorId: userId,
          actorLabel: "Live smoke trusted coach"
        },
        trustedActor: true,
        command: {
          type: "coach_note",
          date: asOfDate,
          note: `Live smoke plan audit ${smokeRunId}`,
          requestedBy: "coach",
          createdAt: new Date().toISOString()
        }
      });
      trainingAdjustmentId = adjustment.adjustmentId;
      const adjustmentResponse = await client
        .from("training_plan_adjustments")
        .select("id, adjustment_payload, engine_response_payload")
        .eq("user_id", userId)
        .eq("id", trainingAdjustmentId)
        .maybeSingle();
      expect(adjustmentResponse.error).toBeNull();
      expect(adjustmentResponse.data?.id).toBe(trainingAdjustmentId);
      expect((adjustmentResponse.data?.adjustment_payload as Record<string, unknown> | null)?.actor).toMatchObject({ actorType: "coach" });
      await client
        .from("training_plan_adjustments")
        .update({ engine_response_payload: smokePayload(adjustmentResponse.data?.engine_response_payload ?? {}, smokeRunId) })
        .eq("id", trainingAdjustmentId)
        .eq("user_id", userId);
      const adjustmentTimelineResponse = await client
        .from("training_block_timeline_events")
        .select("id, event_payload")
        .eq("user_id", userId)
        .eq("training_block_id", trainingBlockId!)
        .eq("event_type", "adjustment_applied");
      expect(adjustmentTimelineResponse.error).toBeNull();
      for (const row of adjustmentTimelineResponse.data ?? []) {
        if (!existingTrainingBlockTimelineEventIds.has(row.id) && !smokeTrainingBlockTimelineEventIds.includes(row.id)) {
          smokeTrainingBlockTimelineEventIds.push(row.id);
          await client.from("training_block_timeline_events").update({ event_payload: smokePayload(row.event_payload, smokeRunId) }).eq("id", row.id).eq("user_id", userId);
        }
      }
      const adjustmentEventResponse = await client
        .from("athlete_journey_events")
        .select("id, event_payload")
        .eq("user_id", userId)
        .eq("event_type", "TrainingPlanAdjusted")
        .filter("event_payload->>adjustmentId", "eq", trainingAdjustmentId);
      expect(adjustmentEventResponse.error).toBeNull();
      for (const row of adjustmentEventResponse.data ?? []) {
        await client.from("athlete_journey_events").update({ event_payload: smokePayload(row.event_payload, smokeRunId) }).eq("id", row.id).eq("user_id", userId);
      }

      const detailedSession = resolved.state.viewModels.train.detailedTodaySessions.find((session) => session.detail)?.detail;
      if (!detailedSession) {
        throw new Error("Live smoke did not generate a detailed session to complete.");
      }
      const workoutCompletion = await completeWorkoutService({
        userId,
        asOfDate,
        detailedSession,
        completion: {
          generatedSessionId: detailedSession.generatedSessionId,
          completedSessionType: completedSessionTypeForFamily(detailedSession.family),
          status: "completed",
          sessionRpe: 6,
          painNotes: [],
          athleteNotes: "Live smoke workout completion",
          exerciseResults: [smokeExerciseResult(detailedSession)],
          smokeRunId
        },
        repositories,
        engineVersion: resolved.state.engineVersion
      });
      completedTrainingSessionId = workoutCompletion.completedTrainingSessionId ?? null;
      expect(completedTrainingSessionId).toBeTruthy();

      const completedSessionResponse = await client
        .from("completed_training_sessions")
        .select("id, session_payload")
        .eq("user_id", userId)
        .eq("id", completedTrainingSessionId!)
        .filter("session_payload->>smokeRunId", "eq", smokeRunId)
        .maybeSingle();
      expect(completedSessionResponse.error).toBeNull();
      expect(completedSessionResponse.data?.id).toBe(completedTrainingSessionId);
      const exerciseResultResponse = await client
        .from("exercise_results")
        .select("id, result_payload")
        .eq("user_id", userId)
        .eq("completed_training_session_id", completedTrainingSessionId!)
        .filter("result_payload->>smokeRunId", "eq", smokeRunId);
      expect(exerciseResultResponse.error).toBeNull();
      expect(exerciseResultResponse.data?.length ?? 0).toBeGreaterThan(0);
      const completionEventResponse = await client
        .from("athlete_journey_events")
        .select("id, event_payload")
        .eq("user_id", userId)
        .eq("event_type", "TrainingSessionCompleted")
        .filter("event_payload->>smokeRunId", "eq", smokeRunId);
      expect(completionEventResponse.error).toBeNull();
      expect(completionEventResponse.data?.length ?? 0).toBeGreaterThan(0);

      const runResponse = await client.from("engine_runs").select("id").eq("user_id", userId).eq("input_hash", inputHash);
      expect(runResponse.error).toBeNull();
      engineRunIds = (runResponse.data ?? []).map((row) => row.id);
      expect(engineRunIds.length).toBeGreaterThan(0);

      for (const row of runResponse.data ?? []) {
        const current = await client.from("engine_runs").select("run_payload").eq("id", row.id).single();
        expect(current.error).toBeNull();
        await client.from("engine_runs").update({ run_payload: smokePayload(current.data?.run_payload ?? {}, smokeRunId) }).eq("id", row.id).eq("user_id", userId);
      }
      for (const engineRunId of engineRunIds) {
        const traceResponse = await client.from("decision_traces").select("id, trace_payload").eq("user_id", userId).eq("engine_run_id", engineRunId);
        expect(traceResponse.error).toBeNull();
        for (const row of traceResponse.data ?? []) {
          await client.from("decision_traces").update({ trace_payload: smokePayload(row.trace_payload, smokeRunId) }).eq("id", row.id).eq("user_id", userId);
        }
      }
      const generatedResponse = await client.from("generated_training_sessions").select("id, session_payload").eq("user_id", userId).filter("session_payload->>inputHash", "eq", inputHash);
      expect(generatedResponse.error).toBeNull();
      const existingGeneratedIds = new Set(existingGeneratedSessions.map((row) => row.id));
      for (const row of generatedResponse.data ?? []) {
        if (!existingGeneratedIds.has(row.id)) {
          await client.from("generated_training_sessions").update({ session_payload: smokePayload(row.session_payload, smokeRunId) }).eq("id", row.id).eq("user_id", userId);
        }
      }
      const targetResponse = await client.from("nutrition_targets").select("id, target_payload").eq("user_id", userId).filter("target_payload->>inputHash", "eq", inputHash);
      expect(targetResponse.error).toBeNull();
      expect(targetResponse.data?.length ?? 0).toBeGreaterThan(0);
      const existingTargetIds = new Set(existingNutritionTargets.map((row) => row.id));
      for (const row of targetResponse.data ?? []) {
        const serializedTarget = JSON.stringify(row.target_payload).toLowerCase();
        expect(serializedTarget).toContain("commandcenter");
        expect(serializedTarget).toContain("weightclassstatus");
        expect(serializedTarget).not.toMatch(/sauna|sweat suit|laxative|diuretic|extreme dehydration/);
        if (!existingTargetIds.has(row.id)) {
          await client.from("nutrition_targets").update({ target_payload: smokePayload(row.target_payload, smokeRunId) }).eq("id", row.id).eq("user_id", userId);
        }
      }
      const riskResponse = await client.from("risk_flags").select("id, flag_payload").eq("user_id", userId).filter("flag_payload->>inputHash", "eq", inputHash);
      expect(riskResponse.error).toBeNull();
      const existingRiskIds = new Set(existingRiskFlags.map((row) => row.id));
      for (const row of riskResponse.data ?? []) {
        if (!existingRiskIds.has(row.id)) {
          await client.from("risk_flags").update({ flag_payload: smokePayload(row.flag_payload, smokeRunId) }).eq("id", row.id).eq("user_id", userId);
        }
      }
    } finally {
      for (const id of smokeTrainingBlockTimelineEventIds) {
        await client.from("training_block_timeline_events").delete().eq("user_id", userId).eq("id", id).filter("event_payload->>smokeRunId", "eq", smokeRunId);
      }
      for (const row of existingPreviewWeekDayPlans) {
        await client
          .from("training_day_plans")
          .update({
            role: row.role,
            hard_day: row.hard_day,
            recovery_priority: row.recovery_priority,
            fuel_demand: row.fuel_demand,
            day_payload: row.day_payload
          })
          .eq("user_id", userId)
          .eq("id", row.id);
      }
      for (const row of existingPreviewWeekMicrocycles) {
        await client
          .from("training_microcycles")
          .update({
            hard_day_cap: row.hard_day_cap,
            planned_hard_days: row.planned_hard_days,
            microcycle_payload: row.microcycle_payload
          })
          .eq("user_id", userId)
          .eq("id", row.id);
      }
      for (const id of smokeTrainingDayPlanIds) {
        await client.from("training_day_plans").delete().eq("user_id", userId).eq("id", id).filter("day_payload->>smokeRunId", "eq", smokeRunId);
      }
      for (const id of smokeTrainingMicrocycleIds) {
        await client.from("training_microcycles").delete().eq("user_id", userId).eq("id", id).filter("microcycle_payload->>smokeRunId", "eq", smokeRunId);
      }
      for (const id of smokeTrainingNextWeekPreviewIds) {
        await client.from("training_next_week_previews").delete().eq("user_id", userId).eq("id", id).filter("preview_payload->>smokeRunId", "eq", smokeRunId);
      }
      await client.from("training_next_week_previews").delete().eq("user_id", userId).filter("preview_payload->>smokeRunId", "eq", smokeRunId);
      for (const id of smokeTrainingProgressionDecisionIds) {
        await client.from("training_progression_decisions").delete().eq("user_id", userId).eq("id", id).filter("decision_payload->>smokeRunId", "eq", smokeRunId);
      }
      for (const id of smokeTrainingWeekSummaryIds) {
        await client.from("training_week_summaries").delete().eq("user_id", userId).eq("id", id).filter("summary_payload->>smokeRunId", "eq", smokeRunId);
      }
      if (trainingAdjustmentId) {
        await client.from("training_plan_adjustments").delete().eq("user_id", userId).eq("id", trainingAdjustmentId);
      }
      await client.from("training_plan_adjustments").delete().eq("user_id", userId).filter("engine_response_payload->>smokeRunId", "eq", smokeRunId);
      if (completedTrainingSessionId) {
        await client.from("exercise_results").delete().eq("user_id", userId).eq("completed_training_session_id", completedTrainingSessionId).filter("result_payload->>smokeRunId", "eq", smokeRunId);
        await client.from("completed_training_sessions").delete().eq("user_id", userId).eq("id", completedTrainingSessionId).filter("session_payload->>smokeRunId", "eq", smokeRunId);
      }
      await client.from("exercise_results").delete().eq("user_id", userId).filter("result_payload->>smokeRunId", "eq", smokeRunId);
      await client.from("completed_training_sessions").delete().eq("user_id", userId).filter("session_payload->>smokeRunId", "eq", smokeRunId);
      await client.from("athlete_journey_events").delete().eq("user_id", userId).filter("event_payload->>smokeRunId", "eq", smokeRunId);
      if (engineRunIds.length > 0) {
        await client.from("decision_traces").delete().eq("user_id", userId).in("engine_run_id", engineRunIds).filter("trace_payload->>smokeRunId", "eq", smokeRunId);
      }
      await client.from("generated_training_sessions").delete().eq("user_id", userId).filter("session_payload->>smokeRunId", "eq", smokeRunId);
      await client.from("nutrition_targets").delete().eq("user_id", userId).filter("target_payload->>smokeRunId", "eq", smokeRunId);
      await client.from("risk_flags").delete().eq("user_id", userId).filter("flag_payload->>smokeRunId", "eq", smokeRunId);
      for (const row of existingGeneratedSessions) {
        await client.from("generated_training_sessions").update({ session_payload: row.session_payload }).eq("id", row.id).eq("user_id", userId);
      }
      for (const row of existingNutritionTargets) {
        await client.from("nutrition_targets").update({ target_payload: row.target_payload }).eq("id", row.id).eq("user_id", userId);
      }
      for (const row of existingRiskFlags) {
        await client.from("risk_flags").update({ severity: row.severity, flag_payload: row.flag_payload }).eq("id", row.id).eq("user_id", userId);
      }
      if (inputHash) {
        await client.from("engine_runs").delete().eq("user_id", userId).eq("input_hash", inputHash).filter("run_payload->>smokeRunId", "eq", smokeRunId);
      }
      if (trainingBlockId && !existingTrainingBlockIds.has(trainingBlockId)) {
        await client.from("training_blocks").delete().eq("user_id", userId).eq("id", trainingBlockId).filter("block_payload->>smokeRunId", "eq", smokeRunId);
      }
      if (insertedIds.bodyMass) {
        await client.from("body_mass_logs").delete().eq("user_id", userId).eq("id", insertedIds.bodyMass);
      }
      if (insertedIds.readiness) {
        await client.from("readiness_checkins").delete().eq("user_id", userId).eq("id", insertedIds.readiness).filter("checkin_payload->metadata->>smokeRunId", "eq", smokeRunId);
      }
      if (insertedIds.water) {
        await client.from("water_logs").delete().eq("user_id", userId).eq("id", insertedIds.water);
      }
      if (insertedIds.electrolyte) {
        await client.from("electrolyte_logs").delete().eq("user_id", userId).eq("id", insertedIds.electrolyte).filter("electrolyte_payload->metadata->>smokeRunId", "eq", smokeRunId);
      }
      if (insertedIds.protectedWorkout) {
        await client.from("protected_workouts").delete().eq("user_id", userId).eq("id", insertedIds.protectedWorkout).filter("workout_payload->metadata->>smokeRunId", "eq", smokeRunId);
      }
      if (existingProfile) {
        await client
          .from("athlete_profiles")
          .update({
            profile: existingProfile.profile as Json,
            sensitive_cycle: existingProfile.sensitive_cycle as Json,
            sensitive_medical: existingProfile.sensitive_medical as Json
          })
          .eq("id", existingProfile.id)
          .eq("user_id", userId);
      } else {
        await client.from("athlete_profiles").delete().eq("user_id", userId);
      }
      await auth.signOut();
    }
  }, 60000);
});
