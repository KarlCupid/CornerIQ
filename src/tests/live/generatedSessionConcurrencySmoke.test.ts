import { describe, expect, it } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { createAuthService } from "../../services/supabase/authService";
import { createCornerSupabaseClient, getSupabaseConfigFromEnv } from "../../services/supabase/client";
import type { Json } from "../../services/supabase/database.types";
import { createEngineRunRepository, mapGeneratedSessionToRow } from "../../services/supabase/engineRunRepository";
import type { TableInsert } from "../../services/supabase/repositoryTypes";
import { fixtureAsOfDate, no_wearable_manual_only } from "../fixtures/engineFixtures";

const runConcurrencySmoke = process.env.CORNERIQ_GENERATED_SESSION_CONCURRENCY_SMOKE === "1";
const describeLive = runConcurrencySmoke ? describe : describe.skip;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for the generated-session concurrency smoke.`);
  }
  return value;
}

describeLive("hosted generated-session concurrency smoke", () => {
  it("keeps one canonical row across concurrent saves and a fresh sign-in", async () => {
    const config = getSupabaseConfigFromEnv(process.env);
    if (!config) {
      throw new Error("Public Supabase URL and anon key are required for the concurrency smoke.");
    }

    const client = createCornerSupabaseClient(config);
    const auth = createAuthService(client);
    const email = requiredEnv("CORNERIQ_SMOKE_EMAIL");
    const password = requiredEnv("CORNERIQ_SMOKE_PASSWORD");
    const firstSignIn = await auth.signInWithPassword(email, password);
    let userId = firstSignIn.data.user?.id;
    if (firstSignIn.error?.code === "invalid_credentials" && process.env.CORNERIQ_SMOKE_CREATE_ACCOUNT === "1") {
      const signUp = await auth.signUpWithPassword(email, password);
      expect(signUp.error).toBeNull();
      if (!signUp.data.session) {
        throw new Error("Development smoke account was created but requires email confirmation before the hosted smoke can run.");
      }
      userId = signUp.data.user?.id;
    } else {
      expect(firstSignIn.error).toBeNull();
    }
    if (!userId) {
      throw new Error("Concurrency smoke sign-in returned no user id.");
    }

    let generatedSessionKey: string | null = null;
    let trainingBlockId: string | null = null;
    try {
      const runId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
      const sourceSession = state.training.generatedSessions[0];
      if (!sourceSession) {
        throw new Error("Concurrency smoke fixture did not generate a workout.");
      }
      const planRevisionId = `concurrency-smoke-plan:${runId}`;
      const weekId = `concurrency-smoke-week:${runId}`;
      const prescriptionSlotId = `concurrency-smoke:${runId}`;
      const block = {
        ...state.training.activeBlock,
        id: `concurrency-smoke-block:${runId}`,
        athleteId: userId,
        planRevisionId
      };
      const blockResponse = await client
        .from("training_blocks")
        .insert({
          user_id: userId,
          athlete_id: userId,
          block_key: block.id,
          block_phase: block.phase,
          primary_goal: block.primaryGoal,
          plan_revision_id: planRevisionId,
          start_date: block.startDate,
          end_date: block.endDate,
          linked_fight_id: null,
          linked_tournament_id: null,
          engine_version: block.engineVersion,
          input_hash: `concurrency-smoke-input:${runId}`,
          output_hash: `concurrency-smoke-output:${runId}`,
          status: "canceled",
          block_payload: JSON.parse(JSON.stringify(block)) as Json,
          created_by: "engine"
        })
        .select("id")
        .single();
      expect(blockResponse.error).toBeNull();
      trainingBlockId = blockResponse.data?.id ?? null;
      if (!trainingBlockId) {
        throw new Error("Concurrency smoke could not create its isolated training block.");
      }
      const generatedSession = {
        ...sourceSession,
        id: prescriptionSlotId,
        planRevisionId,
        weekId,
        prescriptionSlotId,
        weekIndex: 1,
        generatedSessionLifecycle: "active" as const
      };
      const record: TableInsert<"generated_training_sessions"> = mapGeneratedSessionToRow(
        userId,
        state.engineVersion,
        generatedSession,
        `concurrency-smoke-input:${runId}`,
        `concurrency-smoke-output:${runId}`,
        { trainingBlockId, concurrencySmokeRunId: runId }
      );
      generatedSessionKey = record.generated_session_key ?? null;
      if (!generatedSessionKey) {
        throw new Error("Concurrency smoke generated no canonical workout key.");
      }

      const firstRepository = createEngineRunRepository(client);
      const secondRepository = createEngineRunRepository(client);
      await Promise.all([firstRepository.upsertGeneratedSessions([record]), secondRepository.upsertGeneratedSessions([record])]);

      const firstRead = await client
        .from("generated_training_sessions")
        .select("id")
        .eq("user_id", userId)
        .eq("generated_session_key", generatedSessionKey);
      expect(firstRead.error).toBeNull();
      expect(firstRead.data).toHaveLength(1);

      const firstSignOut = await auth.signOut();
      expect(firstSignOut.error).toBeNull();
      const secondSignIn = await auth.signInWithPassword(email, password);
      expect(secondSignIn.error).toBeNull();
      expect(secondSignIn.data.user?.id).toBe(userId);

      const secondRead = await client
        .from("generated_training_sessions")
        .select("id")
        .eq("user_id", userId)
        .eq("generated_session_key", generatedSessionKey);
      expect(secondRead.error).toBeNull();
      expect(secondRead.data).toHaveLength(1);
    } finally {
      if (generatedSessionKey) {
        const cleanup = await client
          .from("generated_training_sessions")
          .delete()
          .eq("user_id", userId)
          .eq("generated_session_key", generatedSessionKey);
        expect(cleanup.error).toBeNull();
      }
      if (trainingBlockId) {
        const blockCleanup = await client.from("training_blocks").delete().eq("user_id", userId).eq("id", trainingBlockId);
        expect(blockCleanup.error).toBeNull();
      }
      await auth.signOut();
    }
  });
});
