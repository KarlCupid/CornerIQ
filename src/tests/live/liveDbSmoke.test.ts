import { describe, expect, it } from "vitest";
import { buildDemoAthleteProfile } from "../../services/supabase/demoDataService";
import { createAthleteJourneyRepositories, loadAthleteJourney } from "../../services/supabase/loadAthleteJourney";
import { createAuthService } from "../../services/supabase/authService";
import { createCornerSupabaseClient, getSupabaseConfigFromEnv } from "../../services/supabase/client";
import type { Json } from "../../services/supabase/database.types";
import type { TableRow } from "../../services/supabase/repositoryTypes";
import { resolveAndPersistPerformanceState } from "../../services/engine/resolveAndPersistPerformanceState";
import type { ISODateString } from "../../engine/core/types";

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
    const insertedIds: { bodyMass?: string; readiness?: string; water?: string } = {};
    let existingProfile: Pick<TableRow<"athlete_profiles">, "id" | "profile" | "sensitive_medical" | "sensitive_cycle"> | null = null;
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

      await repositories.athlete.upsertProfile(userId, buildDemoAthleteProfile(userId));
      insertedIds.bodyMass = (await repositories.bodyMass.insertManualLog({ userId, date: asOfDate, bodyMassKg: 68 })).id;
      insertedIds.readiness = (await repositories.readiness.insertCheckIn({ userId, date: asOfDate, energy1To5: 3, painNotes: [], illnessSymptoms: [] })).id;
      insertedIds.water = (await repositories.hydration.insertWaterLog({ userId, date: asOfDate, liters: 2 })).id;

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
    } finally {
      if (engineRunIds.length > 0) {
        await client.from("decision_traces").delete().eq("user_id", userId).in("engine_run_id", engineRunIds);
      }
      if (inputHash) {
        await client.from("generated_training_sessions").delete().eq("user_id", userId).filter("session_payload->>inputHash", "eq", inputHash);
        await client.from("nutrition_targets").delete().eq("user_id", userId).filter("target_payload->>inputHash", "eq", inputHash);
        await client.from("risk_flags").delete().eq("user_id", userId).filter("flag_payload->>inputHash", "eq", inputHash);
        await client.from("engine_runs").delete().eq("user_id", userId).eq("input_hash", inputHash);
      }
      if (insertedIds.bodyMass) {
        await client.from("body_mass_logs").delete().eq("user_id", userId).eq("id", insertedIds.bodyMass);
      }
      if (insertedIds.readiness) {
        await client.from("readiness_checkins").delete().eq("user_id", userId).eq("id", insertedIds.readiness);
      }
      if (insertedIds.water) {
        await client.from("water_logs").delete().eq("user_id", userId).eq("id", insertedIds.water);
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
