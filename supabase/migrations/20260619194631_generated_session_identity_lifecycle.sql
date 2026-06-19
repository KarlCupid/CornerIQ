alter table public.generated_training_sessions
  add column if not exists plan_revision_id text,
  add column if not exists week_id text,
  add column if not exists week_index integer,
  add column if not exists prescription_slot_id text,
  add column if not exists original_planned_date date,
  add column if not exists current_scheduled_date date,
  add column if not exists generated_session_lifecycle text not null default 'active';

alter table public.generated_training_sessions
  drop constraint if exists generated_training_sessions_lifecycle_known;

alter table public.generated_training_sessions
  add constraint generated_training_sessions_lifecycle_known check (
    generated_session_lifecycle in ('active', 'completed', 'skipped', 'unresolved', 'moved', 'superseded', 'canceled')
  );

with normalized as (
  select
    id,
    coalesce(plan_revision_id, nullif(session_payload->>'planRevisionId', '')) as next_plan_revision_id,
    coalesce(
      week_index,
      case
        when session_payload->>'weekIndex' ~ '^[1-9][0-9]*$'
          then (session_payload->>'weekIndex')::integer
        else null
      end
    ) as next_week_index,
    coalesce(
      original_planned_date,
      case
        when session_payload->>'originalPlannedDate' ~ '^\d{4}-\d{2}-\d{2}$'
          then (session_payload->>'originalPlannedDate')::date
        else null
      end,
      planned_date
    ) as next_original_planned_date,
    coalesce(
      current_scheduled_date,
      case
        when session_payload->>'currentScheduledDate' ~ '^\d{4}-\d{2}-\d{2}$'
          then (session_payload->>'currentScheduledDate')::date
        else null
      end,
      case
        when session_payload->>'date' ~ '^\d{4}-\d{2}-\d{2}$'
          then (session_payload->>'date')::date
        else null
      end,
      planned_date
    ) as next_current_scheduled_date,
    coalesce(
      nullif(session_payload->>'generatedSessionLifecycle', ''),
      generated_session_lifecycle,
      'active'
    ) as raw_lifecycle,
    coalesce(
      prescription_slot_id,
      nullif(session_payload->>'prescriptionSlotId', ''),
      concat('legacy:', coalesce(generated_session_key, session_payload->>'id', id::text))
    ) as next_prescription_slot_id,
    coalesce(
      week_id,
      nullif(session_payload->>'weekId', '')
    ) as payload_week_id
  from public.generated_training_sessions
)
update public.generated_training_sessions target
set
  plan_revision_id = normalized.next_plan_revision_id,
  week_index = normalized.next_week_index,
  original_planned_date = normalized.next_original_planned_date,
  current_scheduled_date = normalized.next_current_scheduled_date,
  prescription_slot_id = normalized.next_prescription_slot_id,
  week_id = coalesce(
    normalized.payload_week_id,
    case
      when normalized.next_plan_revision_id is not null and normalized.next_week_index is not null
        then concat('week:', normalized.next_plan_revision_id, ':', normalized.next_week_index)
      else null
    end
  ),
  generated_session_lifecycle = case
    when normalized.raw_lifecycle in ('active', 'completed', 'skipped', 'unresolved', 'moved', 'superseded', 'canceled')
      then normalized.raw_lifecycle
    else 'active'
  end,
  generated_session_key = coalesce(nullif(target.session_payload->>'prescriptionSlotId', ''), generated_session_key, normalized.next_prescription_slot_id),
  session_payload = target.session_payload || jsonb_build_object(
    'originalPlannedDate', normalized.next_original_planned_date::text,
    'currentScheduledDate', normalized.next_current_scheduled_date::text,
    'prescriptionSlotId', normalized.next_prescription_slot_id,
    'generatedSessionLifecycle',
      case
        when normalized.raw_lifecycle in ('active', 'completed', 'skipped', 'unresolved', 'moved', 'superseded', 'canceled')
          then normalized.raw_lifecycle
        else 'active'
      end
  )
from normalized
where target.id = normalized.id;

with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, engine_version, prescription_slot_id
      order by updated_at desc, created_at desc, id desc
    ) as authority_rank
  from public.generated_training_sessions
  where prescription_slot_id is not null
    and generated_session_lifecycle in ('active', 'moved')
)
update public.generated_training_sessions target
set
  generated_session_lifecycle = 'superseded',
  session_payload = target.session_payload || jsonb_build_object(
    'generatedSessionLifecycle', 'superseded',
    'supersededReason', 'duplicate_generated_session_identity_reconciled'
  )
from ranked
where target.id = ranked.id
  and ranked.authority_rank > 1;

comment on column public.generated_training_sessions.plan_revision_id is
  'Stable plan revision that produced this generated prescription slot.';
comment on column public.generated_training_sessions.week_id is
  'Stable plan week identity for generated prescription slots.';
comment on column public.generated_training_sessions.prescription_slot_id is
  'Stable slot identity independent of transient family/readiness overlays.';
comment on column public.generated_training_sessions.original_planned_date is
  'Original prescribed date for the generated slot. Explicit moves do not rewrite it.';
comment on column public.generated_training_sessions.current_scheduled_date is
  'Current scheduled date after an explicit audited move; defaults to original planned date.';
comment on column public.generated_training_sessions.generated_session_lifecycle is
  'Generated-session lifecycle for active, moved, completed/skipped overlay, superseded, or canceled rows.';

create index if not exists generated_training_sessions_user_current_date_idx
  on public.generated_training_sessions(user_id, current_scheduled_date, generated_session_lifecycle);

create index if not exists generated_training_sessions_user_revision_week_slot_idx
  on public.generated_training_sessions(user_id, plan_revision_id, week_id, prescription_slot_id);

create unique index if not exists generated_training_sessions_user_active_slot_uidx
  on public.generated_training_sessions(user_id, engine_version, prescription_slot_id)
  where prescription_slot_id is not null
    and generated_session_lifecycle in ('active', 'moved');
