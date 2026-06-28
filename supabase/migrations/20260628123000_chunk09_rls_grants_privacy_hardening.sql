-- Chunk 09 Supabase hardening.
-- Keep public app tables explicit for the Data API, preserve owner privacy
-- deletion, and limit athlete/participant updates to acknowledgement or
-- revocation state instead of mutable safety or relationship evidence.

revoke all on table
  public.users_public,
  public.athlete_profiles,
  public.athlete_journey_events,
  public.fight_opportunities,
  public.tournament_plans,
  public.protected_workouts,
  public.readiness_checkins,
  public.body_mass_logs,
  public.food_logs,
  public.water_logs,
  public.electrolyte_logs,
  public.cycle_logs,
  public.cycle_symptom_logs,
  public.wearable_connections,
  public.wearable_signal_logs,
  public.generated_training_blocks,
  public.generated_training_sessions,
  public.completed_training_sessions,
  public.nutrition_targets,
  public.weight_class_plans,
  public.fight_week_protocols,
  public.weigh_in_logs,
  public.rehydration_plans,
  public.risk_flags,
  public.decision_traces,
  public.engine_runs,
  public.exercise_results,
  public.training_blocks,
  public.training_microcycles,
  public.training_day_plans,
  public.training_plan_adjustments,
  public.training_week_summaries,
  public.training_progression_decisions,
  public.training_block_timeline_events,
  public.training_next_week_previews,
  public.workout_completion_operations,
  public.training_plan_intents,
  public.nutrition_safety_reviews,
  public.nutrition_safety_review_events,
  public.athlete_coach_relationships
from anon;

revoke all on table
  public.users_public,
  public.athlete_profiles,
  public.athlete_journey_events,
  public.fight_opportunities,
  public.tournament_plans,
  public.protected_workouts,
  public.readiness_checkins,
  public.body_mass_logs,
  public.food_logs,
  public.water_logs,
  public.electrolyte_logs,
  public.cycle_logs,
  public.cycle_symptom_logs,
  public.wearable_connections,
  public.wearable_signal_logs,
  public.generated_training_blocks,
  public.generated_training_sessions,
  public.completed_training_sessions,
  public.nutrition_targets,
  public.weight_class_plans,
  public.fight_week_protocols,
  public.weigh_in_logs,
  public.rehydration_plans,
  public.risk_flags,
  public.decision_traces,
  public.engine_runs,
  public.exercise_results,
  public.training_blocks,
  public.training_microcycles,
  public.training_day_plans,
  public.training_plan_adjustments,
  public.training_week_summaries,
  public.training_progression_decisions,
  public.training_block_timeline_events,
  public.training_next_week_previews,
  public.workout_completion_operations,
  public.training_plan_intents,
  public.nutrition_safety_reviews,
  public.nutrition_safety_review_events,
  public.athlete_coach_relationships
from authenticated;

grant select, insert, update, delete on table
  public.users_public,
  public.athlete_profiles,
  public.athlete_journey_events,
  public.fight_opportunities,
  public.tournament_plans,
  public.protected_workouts,
  public.readiness_checkins,
  public.body_mass_logs,
  public.food_logs,
  public.water_logs,
  public.electrolyte_logs,
  public.cycle_logs,
  public.cycle_symptom_logs,
  public.wearable_connections,
  public.wearable_signal_logs,
  public.generated_training_blocks,
  public.generated_training_sessions,
  public.completed_training_sessions,
  public.nutrition_targets,
  public.weight_class_plans,
  public.fight_week_protocols,
  public.weigh_in_logs,
  public.rehydration_plans,
  public.risk_flags,
  public.decision_traces,
  public.engine_runs,
  public.exercise_results,
  public.training_blocks,
  public.training_microcycles,
  public.training_day_plans,
  public.training_plan_adjustments,
  public.training_week_summaries,
  public.training_progression_decisions,
  public.training_block_timeline_events,
  public.training_next_week_previews,
  public.workout_completion_operations,
  public.training_plan_intents
to authenticated;

grant select, insert, delete on table public.nutrition_safety_reviews to authenticated;
grant update (status) on table public.nutrition_safety_reviews to authenticated;
grant select, insert, delete on table public.nutrition_safety_review_events to authenticated;

grant select, insert on table public.athlete_coach_relationships to authenticated;
grant update (status) on table public.athlete_coach_relationships to authenticated;

grant select, insert, update, delete on table
  public.users_public,
  public.athlete_profiles,
  public.athlete_journey_events,
  public.fight_opportunities,
  public.tournament_plans,
  public.protected_workouts,
  public.readiness_checkins,
  public.body_mass_logs,
  public.food_logs,
  public.water_logs,
  public.electrolyte_logs,
  public.cycle_logs,
  public.cycle_symptom_logs,
  public.wearable_connections,
  public.wearable_signal_logs,
  public.generated_training_blocks,
  public.generated_training_sessions,
  public.completed_training_sessions,
  public.nutrition_targets,
  public.weight_class_plans,
  public.fight_week_protocols,
  public.weigh_in_logs,
  public.rehydration_plans,
  public.risk_flags,
  public.decision_traces,
  public.engine_runs,
  public.exercise_results,
  public.training_blocks,
  public.training_microcycles,
  public.training_day_plans,
  public.training_plan_adjustments,
  public.training_week_summaries,
  public.training_progression_decisions,
  public.training_block_timeline_events,
  public.training_next_week_previews,
  public.workout_completion_operations,
  public.training_plan_intents,
  public.nutrition_safety_reviews,
  public.nutrition_safety_review_events,
  public.athlete_coach_relationships
to service_role;

drop policy if exists "nutrition_safety_reviews athlete acknowledge" on public.nutrition_safety_reviews;

create policy "nutrition_safety_reviews athlete acknowledge"
on public.nutrition_safety_reviews
for update
to authenticated
using (
  (select auth.uid()) = user_id
  and status in ('requested', 'not_cleared')
)
with check (
  (select auth.uid()) = user_id
  and status = 'acknowledged_by_athlete'
);

drop policy if exists "nutrition_safety_reviews owner delete" on public.nutrition_safety_reviews;

create policy "nutrition_safety_reviews owner delete"
on public.nutrition_safety_reviews
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "nutrition_safety_review_events owner delete" on public.nutrition_safety_review_events;

create policy "nutrition_safety_review_events owner delete"
on public.nutrition_safety_review_events
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "athlete_coach_relationships participant revoke only" on public.athlete_coach_relationships;

create policy "athlete_coach_relationships participant revoke only"
on public.athlete_coach_relationships
for update
to authenticated
using (
  (select auth.uid()) = athlete_user_id
  or (select auth.uid()) = coach_user_id
)
with check (
  (
    (select auth.uid()) = athlete_user_id
    or (select auth.uid()) = coach_user_id
  )
  and status = 'revoked'
);

comment on policy "nutrition_safety_reviews athlete acknowledge" on public.nutrition_safety_reviews is
  'Athlete clients may update only the status column to acknowledged_by_athlete. Table grants prevent acknowledgement from mutating hard_stop, safety evidence, source payload, or reviewer fields, including reviewer metadata already present on not_cleared rows.';
comment on policy "nutrition_safety_reviews owner delete" on public.nutrition_safety_reviews is
  'Owner app-data deletion may remove nutrition safety review rows; full account deletion still uses the trusted delete-account function.';
comment on policy "nutrition_safety_review_events owner delete" on public.nutrition_safety_review_events is
  'Owner app-data deletion may remove nutrition safety review audit events before deleting their parent review rows.';
comment on policy "athlete_coach_relationships participant revoke only" on public.athlete_coach_relationships is
  'Participant clients may update only status to revoked. Table grants prevent revocation from mutating relationship participants or permissions.';
