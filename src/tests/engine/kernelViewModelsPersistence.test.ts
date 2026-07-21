import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { buildPlanViewModel } from "../../engine/presentation/planViewModel";
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

  it("prepares the plan wizard from the same onboarding profile used by the engine", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });

    expect(state.viewModels.plan.planWizardSetup).toEqual(
      expect.objectContaining({
        equipmentLabel: "Dumbbells · Bands +1",
        experienceLabel: "Open amateur",
        goalMode: "build",
        fight: null,
        tournament: null
      })
    );
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

  it("PlanViewModel derives roll-forward status from preview lifecycle and safety state", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const preview = state.training.nextWeekMaterialization;
    const safePreview = {
      ...preview,
      materializedVolumeStrategy: "progress_small" as const
    };
    const persistence = {
      previewId: "preview_1",
      status: "accepted" as const,
      weekStartDate: preview.nextWeekStartDate,
      weekEndDate: preview.nextWeekEndDate,
      acceptedAt: "2026-05-20T00:00:00.000Z",
      materializedAt: null
    };
    const acceptedWaiting = buildPlanViewModel({
      ...state,
      training: {
        ...state.training,
        nextWeekPreviewPersistenceStatus: persistence
      }
    });
    const eligible = buildPlanViewModel({
      ...state,
      asOfDate: preview.nextWeekStartDate,
      training: {
        ...state.training,
        nextWeekMaterialization: safePreview,
        nextWeekPreviewPersistenceStatus: persistence
      }
    });
    const holdForReview = buildPlanViewModel({
      ...state,
      asOfDate: preview.nextWeekStartDate,
      training: {
        ...state.training,
        nextWeekMaterialization: {
          ...preview,
          materializedVolumeStrategy: "hold_for_review"
        },
        nextWeekPreviewPersistenceStatus: persistence
      }
    });
    const unaccepted = buildPlanViewModel({
      ...state,
      asOfDate: preview.nextWeekStartDate,
      training: {
        ...state.training,
        nextWeekMaterialization: safePreview,
        nextWeekPreviewPersistenceStatus: { ...persistence, status: "preview", acceptedAt: null }
      }
    });
    const materialized = buildPlanViewModel({
      ...state,
      training: {
        ...state.training,
        nextWeekMaterialization: safePreview,
        nextWeekPreviewPersistenceStatus: { ...persistence, status: "materialized", materializedAt: "2026-05-26T00:00:00.000Z" },
        timelineEvents: [
          ...state.training.timelineEvents,
          {
            eventType: "next_week_materialized",
            eventDate: preview.nextWeekStartDate,
            title: "Next week materialized",
            summary: "Accepted preview was materialized.",
            payload: { autoRollForward: true, generatedSessionCount: 2 }
          }
        ]
      }
    });

    expect(acceptedWaiting.rollForwardStatus).toBe("accepted_waiting");
    expect(acceptedWaiting.rollForwardMessage).toContain(preview.nextWeekStartDate);
    expect(eligible.rollForwardStatus).toBe("eligible");
    expect(holdForReview.rollForwardStatus).toBe("blocked");
    expect(holdForReview.rollForwardMessage).toContain("safety stop");
    expect(holdForReview.rollForwardRiskLabel).toBe("Safety hold");
    expect(holdForReview.rollForwardRiskTone).toBe("caution");
    expect(unaccepted.rollForwardMessage).toContain("not accepted");
    expect(materialized.rollForwardStatus).toBe("materialized");
    expect(materialized.lastAutoRollForwardMessage).toContain("Support workouts: 2");
  });

  it("PlanViewModel summarizes boxing and app work on the same day as one upcoming work item", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const anchorDay = state.training.dayPlans.find((day) => day.protectedAnchors.length > 0);
    const supportDay = state.training.dayPlans.find((day) => day.generatedSessions.length > 0);
    const generatedSession = supportDay?.generatedSessions[0];
    if (!anchorDay || !generatedSession) {
      throw new Error("fixture must include a protected boxing day and generated support work");
    }

    const plan = buildPlanViewModel({
      ...state,
      training: {
        ...state.training,
        dayPlans: state.training.dayPlans.map((day) =>
          day.date === anchorDay.date
            ? {
                ...day,
                generatedSessions: [generatedSession],
                hardDay: true,
                fuelDemand: "high"
              }
            : day
        )
      }
    });
    const mergedDay = plan.dayPlans.find((day) => day.date === anchorDay.date);

    expect(mergedDay?.workSummary).toEqual(
      expect.objectContaining({
        hasAppWork: true,
        hasBoxing: true,
        title: "Coach/team sparring + 1 app session",
        workCount: 2
      })
    );
    expect(mergedDay?.workSummary?.detail).toContain("Coach/team sparring 75 min");
    expect(mergedDay?.workSummary?.detail).toContain(`${generatedSession.durationMinutes} min`);
  });

  it("migrations contain RLS, owner policies, indexes, comments, and exercise results", () => {
    const sql = [
      readFileSync("supabase/migrations/001_core_schema.sql", "utf8"),
      readFileSync("supabase/migrations/002_schema_hardening.sql", "utf8"),
      readFileSync("supabase/migrations/003_projection_and_exercise_result_hardening.sql", "utf8")
    ].join("\n");
    const migration003 = readFileSync("supabase/migrations/003_projection_and_exercise_result_hardening.sql", "utf8");
    const phaseOneMigration = readFileSync("supabase/migrations/20260718092403_remove_obsolete_medical_profile_data.sql", "utf8");
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
      "exercise_results",
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
      expect(sql).toMatch(new RegExp(`create table( if not exists)? public\\.${table}`));
      expect(sql).toContain(`alter table public.${table} enable row level security`);
      expect(sql).toContain(`create policy "${table} owner access"`);
    }
    expect((sql.match(/user_id uuid not null references auth\.users\(id\) on delete cascade/g) ?? []).length).toBeGreaterThanOrEqual(tables.length);
    expect(sql).toContain("body_mass_logs_user_id_log_date_recorded_at_idx");
    expect(sql).toContain("readiness_checkins_user_id_checkin_date_idx");
    expect(sql).toContain("cycle_logs_user_id_log_date_idx");
    expect(sql).toContain("wearable_signal_logs_user_id_recorded_at_signal_type_idx");
    expect(sql).toContain("engine_runs_user_id_as_of_date_engine_version_idx");
    expect(sql).toContain("comment on table public.cycle_logs");
    expect(sql).toContain("comment on table public.cycle_symptom_logs");
    expect(sql).toContain("comment on column public.athlete_profiles.sensitive_cycle");
    expect(sql).toContain("comment on table public.readiness_checkins");
    expect(sql).toContain("comment on table public.wearable_signal_logs");
    expect(sql).toContain("comment on table public.risk_flags");
    expect(migration003).toContain("generated_training_session_id uuid references public.generated_training_sessions");
    expect(migration003).toContain("exercise_id text");
    expect(migration003).toContain("exercise_results_exercise_id_present");
    expect(migration003).toContain("exercise_results_user_completed_session_idx");
    expect(migration003).toContain("exercise_results_user_generated_session_idx");
    expect(migration003).toContain("exercise_results_user_exercise_id_idx");
    expect(migration003).toContain("engine_runs_user_date_version_input_hash_uidx");
    expect(migration003).toContain("nutrition_targets_user_date_version_uidx");
    expect(migration003).toContain("generated_sessions_user_date_version_key_uidx");
    expect(migration003).toContain("risk_flags_active_user_domain_code_status_uidx");
    expect(migration003).toContain("decision_traces_user_engine_run_idx");
    expect(phaseOneMigration).toContain("drop column if exists sensitive_medical");
    expect(phaseOneMigration).toContain("'medicalFlags'");
    expect(readFileSync("supabase/migrations/002_schema_hardening.sql", "utf8")).not.toMatch(/\bdrop\s+(table|column|constraint)\b/i);
    expect(migration003).not.toMatch(/\bdrop\s+(table|column|constraint)\b/i);
  });

  it("repository mappers convert DB rows to engine types", () => {
    expect(mapBodyMassLogRow({ log_date: "2026-05-19", body_mass_kg: 66.4, source: "manual", recorded_at: "2026-05-19T07:00:00.000Z" })).toEqual({
      date: "2026-05-19",
      bodyMassKg: 66.4,
      source: "manual",
      recordedAt: "2026-05-19T07:00:00.000Z"
    });
    expect(
      mapCycleLogRow({
        created_at: "2026-05-19T07:30:00.000Z",
        log_date: "2026-05-19",
        cycle_payload: { flowLevel: "moderate", symptoms: ["cramps"], hormonalContraception: "none" }
      }).symptoms
    ).toContain("cramps");
    expect(mapWearableSignalRow({ signal_type: "sleep_duration", signal_value: 7.5, signal_unit: "h", source_platform: "apple_health", recorded_at: "2026-05-19T07:00:00.000Z" }).value).toBe(7.5);
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
