import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const CLEANUP_SCRIPT_PATH = resolve(process.cwd(), "scripts/cleanup-regeneration-derived-state.mjs");
const PREFLIGHT_SCRIPT_PATH = "scripts/production-preflight.mjs";
const SCHEMA_ERROR = "Workout regeneration cannot be trusted because revision-isolated lifecycle migration is missing.";
const TEST_USER_ID = "00000000-0000-4000-8000-000000000001";
const PRESERVED_ENV_NAMES = ["ComSpec", "HOME", "PATHEXT", "PATH", "Path", "SystemRoot", "TEMP", "TMP", "USERPROFILE"];

function cleanEnv(extra: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { NODE_ENV: process.env.NODE_ENV ?? "test" };
  for (const name of PRESERVED_ENV_NAMES) {
    const value = process.env[name];
    if (value) {
      env[name] = value;
    }
  }
  for (const [name, value] of Object.entries(extra)) {
    if (value !== undefined) {
      env[name] = value;
    }
  }
  return env;
}

function runCleanup(args: readonly string[], env: Record<string, string | undefined> = {}) {
  return spawnSync(process.execPath, [CLEANUP_SCRIPT_PATH, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: cleanEnv(env)
  });
}

describe("cleanup regeneration derived state script", () => {
  it("prints dry-run SQL by default and preserves completed sessions and exercise results", () => {
    const result = runCleanup(["--user-id", TEST_USER_ID]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("revision_isolated_lifecycle_schema");
    expect(result.stdout).toContain("generated_training_sessions_user_active_revision_slot_uidx");
    expect(result.stdout).toContain("training_blocks_user_active_revision_uidx");
    expect(result.stdout).toContain("completed_sessions_preserved");
    expect(result.stdout).toContain("exercise_results_preserved");
    expect(result.stdout).not.toContain("update public.completed_training_sessions");
    expect(result.stdout).not.toContain("update public.exercise_results");
    expect(result.stdout).not.toContain("delete from public.completed_training_sessions");
    expect(result.stdout).not.toContain("delete from public.exercise_results");
  });

  it("requires exactly one target and rejects mutually exclusive apply and dry-run modes", () => {
    const noTarget = runCleanup([]);
    const twoTargets = runCleanup(["--user-id", TEST_USER_ID, "--handle", "boxer"]);
    const bothModes = runCleanup(["--user-id", TEST_USER_ID, "--apply", "--dry-run"]);

    expect(noTarget.status).not.toBe(0);
    expect(noTarget.stderr).toContain("Choose exactly one target");
    expect(twoTargets.status).not.toBe(0);
    expect(twoTargets.stderr).toContain("Choose exactly one target");
    expect(bothModes.status).not.toBe(0);
    expect(bothModes.stderr).toContain("Choose either --apply or --dry-run, not both");
  });

  it("requires confirmation before applying cleanup to all dev users", () => {
    const result = runCleanup(["--all-dev-users", "--apply"]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Apply mode for --all-dev-users requires --confirm-all-dev-users");
  });

  it("blocks apply mode before cleanup when the revision-isolated lifecycle schema check fails", () => {
    const source = readFileSync(CLEANUP_SCRIPT_PATH, "utf8");
    const readinessIndex = source.indexOf("const readiness = runPsql(schemaReadinessSql());");
    const errorCheckIndex = source.indexOf("readiness.includes(PLAN_INTEGRITY_SCHEMA_ERROR)");
    const applyIndex = source.indexOf("runPsql(applySql(targets));");

    expect(readinessIndex).toBeGreaterThan(-1);
    expect(errorCheckIndex).toBeGreaterThan(readinessIndex);
    expect(applyIndex).toBeGreaterThan(errorCheckIndex);
    expect(source).toContain(SCHEMA_ERROR);
  });

  it("production preflight checks revision-isolated lifecycle schema fragments", () => {
    const source = readFileSync(PREFLIGHT_SCRIPT_PATH, "utf8");

    for (const requiredFragment of [
      "checkRevisionIsolatedLifecycleSchema",
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
});
