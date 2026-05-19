import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { fixtureAsOfDate, no_wearable_manual_only } from "../fixtures/engineFixtures";
import { mapBodyMassLogRow } from "../../services/supabase/bodyMassRepository";
import { mapCycleLogRow } from "../../services/supabase/cycleRepository";
import { mapWearableSignalRow } from "../../services/supabase/wearableRepository";

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}

describe("kernel immutability, view models, and persistence schema", () => {
  it("does not mutate deep-frozen input and returns populated view models", () => {
    const input = deepFreeze(structuredClone(no_wearable_manual_only));
    const state = resolvePerformanceState({ journey: input, asOfDate: fixtureAsOfDate });

    expect(state.viewModels.today.title).not.toBe("");
    expect(state.viewModels.today.whatChanged).not.toBe("");
    expect(state.viewModels.fuel.hitTheseFirst.length).toBeGreaterThan(0);
    expect(state.viewModels.train.sessionCards[0]?.why).not.toBe("");
    expect(state.viewModels.plan.weeklySummary).not.toBe("");
    expect(state.outputHash).not.toBe("");
  });

  it("keeps no-wearable copy non-shaming and risk flags visible", () => {
    const state = resolvePerformanceState({
      journey: {
        ...no_wearable_manual_only,
        readinessHistory: [{ ...no_wearable_manual_only.readinessHistory[0]!, dizziness: true }]
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.wearable.explanation).toContain("No wearable needed");
    expect(state.viewModels.today.riskSummary.length).toBeGreaterThan(0);
    expect(state.viewModels.today.why).not.toBe("");
    expect(state.viewModels.fuel.why).not.toBe("");
  });

  it("cycle context appears only when enabled and relevant", () => {
    const disabled = resolvePerformanceState({ journey: { ...no_wearable_manual_only, athlete: { ...no_wearable_manual_only.athlete, cycleTrackingPreference: "disabled" } }, asOfDate: fixtureAsOfDate });
    const enabledRelevant = resolvePerformanceState({
      journey: {
        ...no_wearable_manual_only,
        athlete: { ...no_wearable_manual_only.athlete, cycleTrackingPreference: "enabled" },
        cycleHistory: [{ date: fixtureAsOfDate, flowLevel: "heavy", symptoms: ["cramps", "poor_sleep", "bloating"], hormonalContraception: "none" }]
      },
      asOfDate: fixtureAsOfDate
    });

    expect(disabled.viewModels.today.cycleContext).toBeNull();
    expect(enabledRelevant.viewModels.today.cycleContext).not.toBeNull();
  });

  it("migration contains RLS and user ownership for every user-owned table", () => {
    const sql = readFileSync("supabase/migrations/001_core_schema.sql", "utf8");
    const tables = [
      "users_public",
      "athlete_profiles",
      "athlete_journey_events",
      "fight_opportunities",
      "tournament_plans",
      "protected_workouts",
      "readiness_checkins",
      "body_mass_logs",
      "food_logs",
      "water_logs",
      "electrolyte_logs",
      "cycle_logs",
      "cycle_symptom_logs",
      "wearable_connections",
      "wearable_signal_logs",
      "generated_training_blocks",
      "generated_training_sessions",
      "completed_training_sessions",
      "nutrition_targets",
      "weight_class_plans",
      "fight_week_protocols",
      "weigh_in_logs",
      "rehydration_plans",
      "risk_flags",
      "decision_traces",
      "engine_runs"
    ];

    for (const table of tables) {
      expect(sql).toContain(`create table public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
      expect(sql).toContain(`create policy "${table} owner access"`);
    }
    expect((sql.match(/user_id uuid not null references auth\.users\(id\) on delete cascade/g) ?? []).length).toBeGreaterThanOrEqual(tables.length);
    expect(sql).toContain("cycle_logs, cycle_symptom_logs");
    expect(sql).toContain("export and delete workflows");
  });

  it("repository mappers convert DB rows to engine types", () => {
    expect(mapBodyMassLogRow({ log_date: "2026-05-19", body_mass_kg: "66.4", source: "manual", recorded_at: "2026-05-19T07:00:00.000Z" })).toEqual({
      date: "2026-05-19",
      bodyMassKg: 66.4,
      source: "manual",
      recordedAt: "2026-05-19T07:00:00.000Z"
    });
    expect(
      mapCycleLogRow({
        log_date: "2026-05-19",
        cycle_payload: { flowLevel: "moderate", symptoms: ["cramps"], hormonalContraception: "none" }
      }).symptoms
    ).toContain("cramps");
    expect(mapWearableSignalRow({ signal_type: "sleep_duration", signal_value: "7.5", signal_unit: "h", source_platform: "apple_health", recorded_at: "2026-05-19T07:00:00.000Z" }).value).toBe(7.5);
  });

  it("repository mapper files avoid explicit any", () => {
    const files = [
      "src/services/supabase/journeyRepository.ts",
      "src/services/supabase/bodyMassRepository.ts",
      "src/services/supabase/cycleRepository.ts",
      "src/services/supabase/wearableRepository.ts",
      "src/services/supabase/engineRunRepository.ts"
    ];

    for (const file of files) {
      expect(readFileSync(file, "utf8")).not.toMatch(/\bany\b/);
    }
  });
});
