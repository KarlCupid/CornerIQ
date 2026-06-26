-- Outside-engine workout support runway for plan intent, canonical V2 sessions,
-- engine snapshots, and progression-ready exercise results.

create table if not exists public.training_plan_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_revision_id text not null,
  status text not null default 'active',
  action text not null,
  goal_mode text not null,
  primary_focus text not null,
  sub_focus text,
  training_dose text not null,
  selected_support_days jsonb not null default '[]'::jsonb,
  preferred_session_duration_minutes integer,
  max_session_duration_minutes integer,
  target_block_length_weeks integer,
  equipment jsonb not null default '[]'::jsonb,
  modality_preferences jsonb not null default '[]'::jsonb,
  modality_avoidances jsonb not null default '[]'::jsonb,
  current_limitations jsonb not null default '[]'::jsonb,
  user_preferences jsonb not null default '[]'::jsonb,
  plan_start_date date not null,
  requested_at timestamptz not null,
  source text not null default 'plan_wizard',
  intent_payload jsonb not null default '{}'::jsonb,
  superseded_at timestamptz,
  superseded_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_plan_intents_status_known check (status in ('active', 'superseded', 'completed', 'canceled')),
  constraint training_plan_intents_action_known check (action in ('start_new_plan', 'amend_current_plan')),
  constraint training_plan_intents_goal_mode_known check (goal_mode in ('build', 'fight', 'tournament', 'recovery')),
  constraint training_plan_intents_primary_focus_known check (primary_focus in ('balanced', 'power', 'conditioning', 'strength', 'mobility', 'boxing_skill')),
  constraint training_plan_intents_training_dose_known check (training_dose in ('minimal', 'standard', 'serious', 'high'))
);

comment on table public.training_plan_intents is
  'User-owned source facts for plan generation intent. Include in privacy export/delete; generated sessions and engine runs reference plan_revision_id rather than mutating this payload.';
comment on column public.training_plan_intents.plan_revision_id is
  'Stable plan revision identity used by training blocks, generated sessions, and engine run snapshots.';
comment on column public.training_plan_intents.intent_payload is
  'Full validated PlanGenerationIntent payload for reproducibility. Do not store secrets or service-role values.';
comment on column public.training_plan_intents.superseded_reason is
  'Audit note explaining why an active plan intent revision was superseded.';

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_training_plan_intents_updated_at'
      and tgrelid = 'public.training_plan_intents'::regclass
  ) then
    create trigger set_training_plan_intents_updated_at
    before update on public.training_plan_intents
    for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.training_plan_intents enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'training_plan_intents'
      and policyname = 'training_plan_intents owner access'
  ) then
    create policy "training_plan_intents owner access"
    on public.training_plan_intents
    for all
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
  end if;
end $$;

grant all on table public.training_plan_intents to authenticated;

create unique index if not exists training_plan_intents_user_revision_uidx
  on public.training_plan_intents(user_id, plan_revision_id);

create unique index if not exists training_plan_intents_user_active_uidx
  on public.training_plan_intents(user_id)
  where status = 'active';

create index if not exists training_plan_intents_user_status_start_idx
  on public.training_plan_intents(user_id, status, plan_start_date desc);

alter table public.engine_runs
  drop constraint if exists engine_runs_workout_snapshot_payload_object;

alter table public.engine_runs
  add constraint engine_runs_workout_snapshot_payload_object check (
    jsonb_typeof(run_payload) = 'object'
    and (
      run_payload ? 'workoutEngineInputSnapshot'
      or run_payload ? 'phase'
    )
  ) not valid;

comment on column public.engine_runs.run_payload is
  'Audit payload. Workout runs store normalized input/output snapshots with source ids plus input/output hashes for reproducibility.';

alter table public.generated_training_sessions
  drop constraint if exists generated_training_sessions_v2_canonical_content_required;

alter table public.generated_training_sessions
  add constraint generated_training_sessions_v2_canonical_content_required check (
    coalesce(session_payload->>'generatedSessionSchemaVersion', '') <> 'generated_training_session_v2'
    or generated_session_lifecycle not in ('active', 'moved', 'unresolved')
    or (
      nullif(session_payload->>'templateId', '') is not null
      and jsonb_typeof(session_payload->'structuredPrescriptionV2') = 'object'
      and session_payload #> '{structuredPrescriptionV2,sessionIntent}' is not null
      and session_payload #> '{structuredPrescriptionV2,compiledSession}' is not null
      and session_payload #> '{structuredPrescriptionV2,canonicalWorkoutSession}' is not null
      and session_payload #> '{structuredPrescriptionV2,adaptationBudget}' is not null
      and coalesce(session_payload #>> '{structuredPrescriptionV2,canonicalWorkoutSession,templateId}', session_payload->>'templateId') = session_payload->>'templateId'
      and nullif(coalesce(session_payload->>'prescriptionSlotId', prescription_slot_id), '') is not null
    )
  ) not valid;

comment on constraint generated_training_sessions_v2_canonical_content_required on public.generated_training_sessions is
  'New active V2 generated sessions must persist canonical workout content. Lifecycle/schedule updates may change metadata only.';

alter table public.exercise_results
  add column if not exists template_id text,
  add column if not exists template_block_id text,
  add column if not exists template_slot_id text,
  add column if not exists movement_pattern text,
  add column if not exists adaptation text;

comment on column public.exercise_results.template_id is
  'Workout template id copied from canonical generated workout content for progression analysis.';
comment on column public.exercise_results.template_block_id is
  'Workout template block id copied from canonical generated workout content when available.';
comment on column public.exercise_results.template_slot_id is
  'Template slot id copied from canonical generated workout content; lets progression reason by slot, not only exercise.';
comment on column public.exercise_results.movement_pattern is
  'Canonical movement pattern for generated-session exercise results.';
comment on column public.exercise_results.adaptation is
  'Canonical training adaptation for generated-session exercise results.';

create index if not exists exercise_results_user_template_slot_idx
  on public.exercise_results(user_id, template_id, template_slot_id)
  where template_slot_id is not null;

create index if not exists exercise_results_user_movement_adaptation_idx
  on public.exercise_results(user_id, movement_pattern, adaptation)
  where movement_pattern is not null
    and adaptation is not null;
