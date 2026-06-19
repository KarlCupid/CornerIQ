-- Temporal integrity hardening for generated-session resolutions and readiness revisions.
-- This migration is additive: legacy rows are preserved, duplicate generated-session
-- resolutions are reconciled by lifecycle metadata, and the newest recorded
-- resolution remains current without deleting older audit history.

alter table public.readiness_checkins
  add column if not exists recorded_at timestamptz;

update public.readiness_checkins
set recorded_at = coalesce(
  nullif(checkin_payload->>'recordedAt', '')::timestamptz,
  created_at
)
where recorded_at is null;

comment on column public.readiness_checkins.recorded_at is
  'Timestamp when the athlete entered or corrected this readiness revision. Latest same-day recorded_at wins for current readiness resolution.';

create index if not exists readiness_checkins_user_date_recorded_idx
  on public.readiness_checkins(user_id, checkin_date, recorded_at);

alter table public.completed_training_sessions
  add column if not exists generated_session_id text,
  add column if not exists planned_date date,
  add column if not exists performed_date date,
  add column if not exists recorded_at timestamptz,
  add column if not exists resolution_lifecycle text not null default 'current',
  add column if not exists superseded_at timestamptz;

alter table public.completed_training_sessions
  drop constraint if exists completed_training_sessions_resolution_lifecycle_known;

alter table public.completed_training_sessions
  add constraint completed_training_sessions_resolution_lifecycle_known
  check (resolution_lifecycle in ('current', 'superseded'));

update public.completed_training_sessions
set
  generated_session_id = coalesce(generated_session_id, nullif(session_payload->>'generatedSessionId', '')),
  planned_date = coalesce(planned_date, nullif(session_payload->>'plannedDate', '')::date, completed_date),
  performed_date = coalesce(performed_date, nullif(session_payload->>'performedDate', '')::date, completed_date),
  recorded_at = coalesce(recorded_at, nullif(session_payload->>'recordedAt', '')::timestamptz, created_at),
  resolution_lifecycle = coalesce(nullif(resolution_lifecycle, ''), 'current');

with ranked as (
  select
    id,
    user_id,
    generated_session_id,
    row_number() over (
      partition by user_id, generated_session_id
      order by recorded_at desc nulls last, updated_at desc, created_at desc, id desc
    ) as resolution_rank
  from public.completed_training_sessions
  where generated_session_id is not null
)
update public.completed_training_sessions target
set
  resolution_lifecycle = case when ranked.resolution_rank = 1 then 'current' else 'superseded' end,
  superseded_at = case
    when ranked.resolution_rank = 1 then null
    else coalesce(target.superseded_at, now())
  end,
  completion_key = case
    when ranked.resolution_rank = 1 then concat('generated_session_completion:', ranked.generated_session_id)
    else target.completion_key
  end,
  session_payload = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(target.session_payload, '{generatedSessionId}', to_jsonb(ranked.generated_session_id), true),
          '{plannedDate}',
          to_jsonb(coalesce(target.planned_date, target.completed_date)::text),
          true
        ),
        '{performedDate}',
        to_jsonb(coalesce(target.performed_date, target.completed_date)::text),
        true
      ),
      '{recordedAt}',
      to_jsonb(coalesce(target.recorded_at, target.created_at)::text),
      true
    ),
    '{resolutionLifecycle}',
    to_jsonb(case when ranked.resolution_rank = 1 then 'current' else 'superseded' end),
    true
  )
from ranked
where target.id = ranked.id;

comment on column public.completed_training_sessions.generated_session_id is
  'Stable engine generatedSessionId when this row resolves a prescribed generated workout.';
comment on column public.completed_training_sessions.planned_date is
  'Date the generated session was originally prescribed.';
comment on column public.completed_training_sessions.performed_date is
  'Date the athlete actually performed the work. Actual load uses this date, not recorded_at.';
comment on column public.completed_training_sessions.recorded_at is
  'Timestamp when the athlete entered or corrected the resolution.';
comment on column public.completed_training_sessions.resolution_lifecycle is
  'Canonical lifecycle for generated-session resolutions. One current row is selected per user and generated_session_id; superseded rows preserve correction history.';
comment on column public.completed_training_sessions.superseded_at is
  'Timestamp when this legacy or corrected resolution stopped being canonical.';
comment on column public.completed_training_sessions.completion_key is
  'Canonical idempotency key for generated workout resolution writes. Current generated-session rows use generated_session_completion:{generatedSessionId}; legacy superseded rows may keep older status-specific keys.';

create index if not exists completed_training_sessions_user_generated_resolution_idx
  on public.completed_training_sessions(user_id, generated_session_id, resolution_lifecycle, recorded_at)
  where generated_session_id is not null;

create index if not exists completed_training_sessions_user_performed_date_idx
  on public.completed_training_sessions(user_id, performed_date, recorded_at);

create unique index if not exists completed_training_sessions_user_generated_current_uidx
  on public.completed_training_sessions(user_id, generated_session_id)
  where generated_session_id is not null
    and resolution_lifecycle = 'current';

create index if not exists training_next_week_previews_user_block_status_created_idx
  on public.training_next_week_previews(user_id, training_block_id, status, created_at);

comment on table public.training_next_week_previews is
  'Preview-only deterministic engine projections. Draft previews may be superseded automatically; accepted previews are frozen plan direction until explicit user action, accepted amendment, materialization, rejection, or safety block workflow changes them.';

alter table public.training_week_summaries
  add column if not exists summary_lifecycle text not null default 'final',
  add column if not exists summary_generated_at timestamptz,
  add column if not exists finalized_at timestamptz,
  add column if not exists plan_revision_id text;

alter table public.training_week_summaries
  drop constraint if exists training_week_summaries_lifecycle_known;

alter table public.training_week_summaries
  add constraint training_week_summaries_lifecycle_known
  check (summary_lifecycle in ('provisional', 'final'));

update public.training_week_summaries
set
  summary_lifecycle = coalesce(nullif(summary_payload->>'lifecycle', ''), summary_lifecycle, 'final'),
  summary_generated_at = coalesce(summary_generated_at, nullif(summary_payload->>'generatedAt', '')::timestamptz, created_at),
  finalized_at = case
    when coalesce(nullif(summary_payload->>'lifecycle', ''), summary_lifecycle, 'final') = 'final'
      then coalesce(finalized_at, nullif(summary_payload->>'finalizedAt', '')::timestamptz, created_at)
    else null
  end,
  plan_revision_id = coalesce(plan_revision_id, nullif(summary_payload->>'planRevisionId', ''));

comment on column public.training_week_summaries.summary_lifecycle is
  'provisional while the week is still active; final only after week end or an explicit finalization action.';
comment on column public.training_week_summaries.summary_generated_at is
  'Engine timestamp for this summary revision.';
comment on column public.training_week_summaries.finalized_at is
  'Timestamp when the week summary became final. Null for provisional summaries.';
comment on column public.training_week_summaries.plan_revision_id is
  'Stable plan revision identity that produced this week summary when available.';

create index if not exists training_week_summaries_user_block_lifecycle_idx
  on public.training_week_summaries(user_id, training_block_id, week_index, summary_lifecycle, summary_generated_at);

alter table public.training_progression_decisions
  add column if not exists decision_lifecycle text not null default 'final',
  add column if not exists plan_revision_id text,
  add column if not exists generated_at timestamptz;

alter table public.training_progression_decisions
  drop constraint if exists training_progression_decisions_lifecycle_known;

alter table public.training_progression_decisions
  add constraint training_progression_decisions_lifecycle_known
  check (decision_lifecycle in ('provisional', 'final'));

update public.training_progression_decisions
set
  decision_lifecycle = coalesce(nullif(decision_payload->>'decisionLifecycle', ''), decision_lifecycle, 'final'),
  plan_revision_id = coalesce(plan_revision_id, nullif(decision_payload->>'planRevisionId', '')),
  generated_at = coalesce(generated_at, nullif(decision_payload->>'generatedAt', '')::timestamptz, created_at);

comment on column public.training_progression_decisions.decision_lifecycle is
  'Whether this progression decision was derived from provisional active-week evidence or final week evidence.';
comment on column public.training_progression_decisions.plan_revision_id is
  'Stable plan revision identity that produced this decision when available.';
comment on column public.training_progression_decisions.generated_at is
  'Engine timestamp used to order same-week decision revisions deterministically.';

create index if not exists training_progression_decisions_user_block_week_lifecycle_idx
  on public.training_progression_decisions(user_id, training_block_id, week_index, decision_lifecycle, generated_at);
