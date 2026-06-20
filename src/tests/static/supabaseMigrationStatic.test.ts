import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationDir = "supabase/migrations";
const launchMigrationNames = [
  "014_temporal_integrity_session_resolution.sql",
  "20260619190201_training_week_finalization_authority.sql",
  "20260619194631_generated_session_identity_lifecycle.sql",
  "20260620000100_workout_completion_retry_integrity.sql"
] as const;

function readSource(path: string): string {
  return readFileSync(path, "utf8");
}

function readMigration(name: string): string {
  return readSource(join(migrationDir, name));
}

describe("Supabase migration static checks", () => {
  it("keeps launch hardening migrations present in the local migration set", () => {
    const localMigrationNames = new Set(readdirSync(migrationDir));

    for (const migrationName of launchMigrationNames) {
      expect(localMigrationNames.has(migrationName)).toBe(true);
    }
  });

  it("preserves temporal replay constraints for generated-session resolution revisions", () => {
    const source = readMigration("014_temporal_integrity_session_resolution.sql");

    for (const requiredFragment of [
      "readiness_checkins_user_date_recorded_idx",
      "completed_training_sessions_resolution_lifecycle_known",
      "completed_training_sessions_user_generated_resolution_idx",
      "completed_training_sessions_user_performed_date_idx",
      "completed_training_sessions_user_generated_current_uidx",
      "training_next_week_previews_user_block_status_created_idx",
      "training_week_summaries_user_block_lifecycle_idx",
      "training_progression_decisions_user_block_week_lifecycle_idx",
      "summary_lifecycle in ('provisional', 'final')",
      "decision_lifecycle in ('provisional', 'final')"
    ]) {
      expect(source).toContain(requiredFragment);
    }
  });

  it("preserves finalization authority keys and superseded lifecycle support", () => {
    const source = readMigration("20260619190201_training_week_finalization_authority.sql");

    for (const requiredFragment of [
      "summary_authority_key",
      "training_week_summaries_user_authority_key_uidx",
      "decision_authority_key",
      "training_progression_decisions_user_authority_key_uidx",
      "event_key",
      "training_block_timeline_events_user_event_key_uidx",
      "corrected_final",
      "superseded",
      "legacy:missing-plan-revision"
    ]) {
      expect(source).toContain(requiredFragment);
    }
  });

  it("preserves immutable generated-session identity and lifecycle constraints", () => {
    const source = readMigration("20260619194631_generated_session_identity_lifecycle.sql");

    for (const requiredFragment of [
      "plan_revision_id",
      "week_id",
      "prescription_slot_id",
      "original_planned_date",
      "current_scheduled_date",
      "generated_session_lifecycle",
      "generated_training_sessions_lifecycle_known",
      "generated_training_sessions_user_current_date_idx",
      "generated_training_sessions_user_revision_week_slot_idx",
      "generated_training_sessions_user_active_slot_uidx",
      "'active', 'completed', 'skipped', 'unresolved', 'moved', 'superseded', 'canceled'"
    ]) {
      expect(source).toContain(requiredFragment);
    }
  });

  it("preserves workout-completion retry authority and idempotency keys", () => {
    const source = readMigration("20260620000100_workout_completion_retry_integrity.sql");

    for (const requiredFragment of [
      "workout_completion_operations",
      "operation_status in ('pending', 'completion_written', 'results_written', 'event_written', 'completed', 'failed_retryable')",
      "workout_completion_operations_user_operation_uidx",
      "result_key",
      "exercise_results_user_result_key_uidx",
      "event_key",
      "athlete_journey_events_user_event_key_uidx"
    ]) {
      expect(source).toContain(requiredFragment);
    }
  });

  it("requires RLS and Data API grant review for new public tables in launch migrations", () => {
    for (const migrationName of launchMigrationNames) {
      const source = readMigration(migrationName);
      const normalized = source.toLowerCase();
      const createdPublicTables = [...normalized.matchAll(/create\s+table(?:\s+if\s+not\s+exists)?\s+public\.([a-z0-9_]+)/g)];

      for (const match of createdPublicTables) {
        const tableName = match[1];
        expect(normalized).toContain(`alter table public.${tableName} enable row level security`);
        expect(normalized).toMatch(new RegExp(`grant\\s+(select|insert|update|delete|all)\\s+on\\s+(table\\s+)?public\\.${tableName}\\s+to\\s+(anon|authenticated)`, "i"));
      }
    }
  });

  it("keeps generated database types aligned with launch persistence columns", () => {
    const source = readSource("src/services/supabase/database.types.ts");

    for (const requiredFragment of [
      "recorded_at: string | null",
      "event_key: string | null",
      "resolution_lifecycle: string",
      "superseded_at: string | null",
      "result_key: string | null",
      "workout_completion_operations",
      "operation_status: string",
      "summary_authority_key: string",
      "summary_lifecycle: string",
      "summary_generated_at: string | null",
      "finalized_at: string | null",
      "decision_authority_key: string",
      "decision_lifecycle: string",
      "generated_at: string | null",
      "event_key: string",
      "plan_revision_id: string | null",
      "week_id: string | null",
      "prescription_slot_id: string | null",
      "original_planned_date: string | null",
      "current_scheduled_date: string | null",
      "generated_session_lifecycle: string"
    ]) {
      expect(source).toContain(requiredFragment);
    }
  });
});
