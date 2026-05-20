import { describe, expect, it } from "vitest";
import { buildDemoAthleteProfile } from "../../services/supabase/demoDataService";
import { createAthleteJourneyRepositories, loadAthleteJourney } from "../../services/supabase/loadAthleteJourney";
import { createAuthService } from "../../services/supabase/authService";
import { createCornerSupabaseClient, getSupabaseConfigFromEnv } from "../../services/supabase/client";
import type { Json } from "../../services/supabase/database.types";
import type { TableRow } from "../../services/supabase/repositoryTypes";
import { resolveAndPersistPerformanceState } from "../../services/engine/resolveAndPersistPerformanceState";
import type { ISODateString, ProtectedWorkout } from "../../engine/core/types";

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
    let inputHash: string | null = null;
    let engineRunIds: string[] = [];

    const signedIn = await auth.signInWithPassword(email, password);
    expect(signedIn.error).toBeNull();
    const userId = signedIn.data.user?.id;
    if (!userId) {
      throw new Error("Smoke sign-in succeeded without a user id.");
    }

    try {
      const repositories = createAthleteJourneyRepositories(client);
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
      expect(journey.status).toBe("ready");

      const resolved = await resolveAndPersistPerformanceState({ userId, asOfDate, repositories, journeyResult: journey });
      expect(resolved.status).toBe("ready");
      if (resolved.status !== "ready") {
        throw new Error("Engine did not resolve during live smoke.");
      }
      expect(resolved.persistenceWarning).toBeUndefined();
      inputHash = resolved.inputHash;

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
      const existingTargetIds = new Set(existingNutritionTargets.map((row) => row.id));
      for (const row of targetResponse.data ?? []) {
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
