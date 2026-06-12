export const ACCOUNT_DELETION_CONFIRMATION = "DELETE ACCOUNT";

export const USER_OWNED_TABLES = [
  "exercise_results",
  "decision_traces",
  "risk_flags",
  "nutrition_safety_review_events",
  "nutrition_safety_reviews",
  "nutrition_targets",
  "weight_class_plans",
  "fight_week_protocols",
  "weigh_in_logs",
  "rehydration_plans",
  "completed_training_sessions",
  "training_block_timeline_events",
  "training_next_week_previews",
  "training_progression_decisions",
  "training_week_summaries",
  "training_plan_adjustments",
  "training_day_plans",
  "training_microcycles",
  "training_blocks",
  "generated_training_sessions",
  "generated_training_blocks",
  "wearable_signal_logs",
  "wearable_connections",
  "cycle_symptom_logs",
  "cycle_logs",
  "electrolyte_logs",
  "water_logs",
  "food_logs",
  "body_mass_logs",
  "readiness_checkins",
  "protected_workouts",
  "fight_opportunities",
  "tournament_plans",
  "athlete_journey_events",
  "engine_runs",
  "athlete_profiles",
  "users_public"
] as const;

export type UserOwnedTable = (typeof USER_OWNED_TABLES)[number];
export type AccountDeletionPayload = {
  confirmation?: unknown;
};

export function bearerToken(authorization: string | null): string | null {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export function validatePayload(payload: AccountDeletionPayload): { confirmation: typeof ACCOUNT_DELETION_CONFIRMATION } | { error: string } {
  return payload.confirmation === ACCOUNT_DELETION_CONFIRMATION
    ? { confirmation: ACCOUNT_DELETION_CONFIRMATION }
    : { error: `Type ${ACCOUNT_DELETION_CONFIRMATION} to confirm account deletion.` };
}
