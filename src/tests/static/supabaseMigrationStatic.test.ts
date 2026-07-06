import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationDir = "supabase/migrations";
const launchMigrationNames = [
  "014_temporal_integrity_session_resolution.sql",
  "20260619190201_training_week_finalization_authority.sql",
  "20260619194631_generated_session_identity_lifecycle.sql",
  "20260620000100_workout_completion_retry_integrity.sql",
  "20260626062900_revision_isolated_plan_lifecycle.sql",
  "20260626120000_outside_engine_workout_support.sql"
] as const;
const chunk09HardeningMigrationName = "20260628123000_chunk09_rls_grants_privacy_hardening.sql";

function readSource(path: string): string {
  return readFileSync(path, "utf8");
}

function readMigration(name: string): string {
  return readSource(join(migrationDir, name));
}

function readAllMigrationSource(): string {
  return readdirSync(migrationDir)
    .sort()
    .map((name) => readMigration(name))
    .join("\n");
}

function finalCreatedPublicTables(): readonly string[] {
  const source = readAllMigrationSource().toLowerCase();
  const created = new Set([...source.matchAll(/create\s+table(?:\s+if\s+not\s+exists)?\s+public\.([a-z0-9_]+)/g)].flatMap((match) => (match[1] ? [match[1]] : [])));
  const dropped = new Set([...source.matchAll(/drop\s+table(?:\s+if\s+exists)?\s+public\.([a-z0-9_]+)/g)].flatMap((match) => (match[1] ? [match[1]] : [])));

  return [...created].filter((table) => !dropped.has(table)).sort();
}

function tableNamesFromGrantTarget(target: string): readonly string[] {
  return target
    .split(",")
    .map((entry) => entry.trim().replace(/^public\./, ""))
    .filter(Boolean);
}

function grantsByRole(role: "anon" | "authenticated" | "service_role"): Map<string, string[]> {
  const output = new Map<string, string[]>();
  const source = readAllMigrationSource().toLowerCase();
  const grantPattern = /grant\s+([^;]+?)\s+on\s+table\s+([^;]+?)\s+to\s+(anon|authenticated|service_role)/gs;
  for (const match of source.matchAll(grantPattern)) {
    const privileges = match[1]?.trim() ?? "";
    const targetRole = match[3]?.trim();
    if (targetRole !== role) {
      continue;
    }
    for (const table of tableNamesFromGrantTarget(match[2] ?? "")) {
      output.set(table, [...(output.get(table) ?? []), privileges]);
    }
  }
  return output;
}

function hasBareUpdatePrivilege(privileges: readonly string[]): boolean {
  return privileges.some((privilege) => privilege === "all" || /\bupdate\b(?!\s*\()/.test(privilege));
}

function hasPrivilege(privileges: readonly string[], privilegeName: "delete" | "insert" | "select"): boolean {
  return privileges.some((privilege) => privilege === "all" || new RegExp(`\\b${privilegeName}\\b`).test(privilege));
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

  it("preserves revision-isolated active plan lifecycle authority", () => {
    const source = readMigration("20260626062900_revision_isolated_plan_lifecycle.sql");

    for (const requiredFragment of [
      "training_blocks",
      "plan_revision_id",
      "generated_training_sessions",
      "week_id",
      "prescription_slot_id",
      "generated_training_sessions_user_active_revision_slot_uidx",
      "on public.generated_training_sessions(user_id, engine_version, plan_revision_id, block_id, week_id, prescription_slot_id)",
      "training_blocks_user_active_revision_uidx",
      "on public.training_blocks(user_id, plan_revision_id)"
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

  it("keeps workout-completion retry upsert keys backed by plain unique indexes", () => {
    const migration = readMigration("20260706185835_workout_completion_upsert_conflict_constraints.sql");
    const repositorySource = [
      readSource("src/services/supabase/exerciseResultRepository.ts"),
      readSource("src/services/supabase/journeyRepository.ts")
    ].join("\n");

    expect(repositorySource).toContain('onConflict: "user_id,result_key"');
    expect(repositorySource).toContain('onConflict: "user_id,event_key"');

    for (const requiredFragment of [
      "drop index if exists public.exercise_results_user_result_key_uidx",
      "on public.exercise_results(user_id, result_key);",
      "drop index if exists public.athlete_journey_events_user_event_key_uidx",
      "on public.athlete_journey_events(user_id, event_key);"
    ]) {
      expect(migration).toContain(requiredFragment);
    }

    expect(migration).not.toContain("where result_key is not null");
    expect(migration).not.toContain("where event_key is not null");
  });

  it("preserves outside-engine workout support persistence contracts", () => {
    const source = readMigration("20260626120000_outside_engine_workout_support.sql");

    for (const requiredFragment of [
      "create table if not exists public.training_plan_intents",
      "training_plan_intents_status_known",
      "training_plan_intents_user_active_uidx",
      "training_plan_intents_user_revision_uidx",
      "alter table public.training_plan_intents enable row level security",
      "grant all on table public.training_plan_intents to authenticated",
      "generated_training_sessions_v2_canonical_content_required",
      "structuredPrescriptionV2",
      "canonicalWorkoutSession",
      "template_id text",
      "template_block_id text",
      "template_slot_id text",
      "movement_pattern text",
      "adaptation text",
      "exercise_results_user_template_slot_idx",
      "exercise_results_user_movement_adaptation_idx",
      "engine_runs_workout_snapshot_payload_object"
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
      "training_plan_intents",
      "plan_revision_id: string",
      "intent_payload: Json",
      "template_slot_id: string | null",
      "movement_pattern: string | null",
      "adaptation: string | null",
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

  it("keeps final public app tables explicitly granted for authenticated and service-role Data API access", () => {
    const localMigrationNames = new Set(readdirSync(migrationDir));
    expect(localMigrationNames.has(chunk09HardeningMigrationName)).toBe(true);

    const finalTables = finalCreatedPublicTables();
    const authenticatedGrants = grantsByRole("authenticated");
    const serviceRoleGrants = grantsByRole("service_role");
    const anonGrants = grantsByRole("anon");

    expect(finalTables).toHaveLength(40);
    expect(finalTables).not.toContain("beta_feedback_reports");
    for (const table of finalTables) {
      expect(authenticatedGrants.has(table), `${table} authenticated grant`).toBe(true);
      expect(serviceRoleGrants.has(table), `${table} service_role grant`).toBe(true);
      expect(anonGrants.has(table), `${table} anon grant`).toBe(false);
    }

    expect(hasBareUpdatePrivilege(authenticatedGrants.get("nutrition_safety_reviews") ?? [])).toBe(false);
    expect(authenticatedGrants.get("nutrition_safety_reviews")?.some((privilege) => /update\s*\(\s*status\s*\)/.test(privilege))).toBe(true);
    expect(hasPrivilege(authenticatedGrants.get("nutrition_safety_reviews") ?? [], "delete")).toBe(true);
    expect(hasBareUpdatePrivilege(authenticatedGrants.get("nutrition_safety_review_events") ?? [])).toBe(false);
    expect(hasPrivilege(authenticatedGrants.get("nutrition_safety_review_events") ?? [], "delete")).toBe(true);
    expect(hasBareUpdatePrivilege(authenticatedGrants.get("athlete_coach_relationships") ?? [])).toBe(false);
    expect(authenticatedGrants.get("athlete_coach_relationships")?.some((privilege) => /update\s*\(\s*status\s*\)/.test(privilege))).toBe(true);

    const hardeningMigration = readMigration(chunk09HardeningMigrationName).toLowerCase();
    const acknowledgePolicy = hardeningMigration.match(
      /create policy "nutrition_safety_reviews athlete acknowledge"[\s\S]+?;\s*drop policy if exists "nutrition_safety_reviews owner delete"/
    )?.[0] ?? "";
    expect(acknowledgePolicy).toContain("status in ('requested', 'not_cleared')");
    expect(acknowledgePolicy).toContain("status = 'acknowledged_by_athlete'");
    expect(acknowledgePolicy).not.toContain("reviewer_user_id is null");
    expect(acknowledgePolicy).not.toContain("reviewer_role is null");
    expect(acknowledgePolicy).not.toContain("reviewed_at is null");
  });

  it("documents non-workout feature influence boundaries", () => {
    const source = readSource("docs/WORKOUT_ENGINE_FEATURE_INFLUENCE.md");

    for (const requiredFragment of [
      "Readiness | No, unless safety flag | Yes | Same-day execution overlay only",
      "Nutrition | No | Yes | Fueling gate and advisory only",
      "Cycle symptoms | Usually no | Yes | Same-day downshift overlay",
      "Wearables | Usually no | Yes | Readiness/confidence signal only when fresh and consistent",
      "Generated workout content is immutable after creation",
      "exercise_results"
    ]) {
      expect(source).toContain(requiredFragment);
    }
  });
});
