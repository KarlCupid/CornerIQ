-- Add deterministic authority keys for weekly summaries, progression decisions,
-- and block timeline events. The keys give app retries and concurrent refreshes
-- a database-backed idempotency target while preserving legacy audit rows.

alter table public.training_week_summaries
  add column if not exists summary_authority_key text;

alter table public.training_week_summaries
  drop constraint if exists training_week_summaries_lifecycle_known;

alter table public.training_week_summaries
  add constraint training_week_summaries_lifecycle_known
  check (summary_lifecycle in ('provisional', 'final', 'corrected_final', 'superseded'));

with ranked as (
  select
    id,
    row_number() over (
      partition by
        user_id,
        training_block_id,
        week_index,
        coalesce(summary_lifecycle, 'final'),
        coalesce(plan_revision_id, 'legacy:missing-plan-revision')
      order by summary_generated_at desc nulls last, updated_at desc, created_at desc, id desc
    ) as authority_rank
  from public.training_week_summaries
  where summary_lifecycle <> 'superseded'
)
update public.training_week_summaries target
set summary_lifecycle = 'superseded'
from ranked
where target.id = ranked.id
  and ranked.authority_rank > 1;

update public.training_week_summaries
set
  summary_authority_key = case
    when summary_lifecycle = 'superseded' then concat(
      'training_week_summary:',
      training_block_id,
      ':week:',
      week_index,
      ':lifecycle:superseded:revision:',
      coalesce(plan_revision_id, 'legacy:missing-plan-revision'),
      ':row:',
      id
    )
    else concat(
      'training_week_summary:',
      training_block_id,
      ':week:',
      week_index,
      ':lifecycle:',
      coalesce(summary_lifecycle, 'final'),
      ':revision:',
      coalesce(plan_revision_id, 'legacy:missing-plan-revision')
    )
  end,
  summary_payload = jsonb_set(
    summary_payload,
    '{authorityKey}',
    to_jsonb(
      case
        when summary_lifecycle = 'superseded' then concat(
          'training_week_summary:',
          training_block_id,
          ':week:',
          week_index,
          ':lifecycle:superseded:revision:',
          coalesce(plan_revision_id, 'legacy:missing-plan-revision'),
          ':row:',
          id
        )
        else concat(
          'training_week_summary:',
          training_block_id,
          ':week:',
          week_index,
          ':lifecycle:',
          coalesce(summary_lifecycle, 'final'),
          ':revision:',
          coalesce(plan_revision_id, 'legacy:missing-plan-revision')
        )
      end
    ),
    true
  )
where summary_authority_key is null;

alter table public.training_week_summaries
  alter column summary_authority_key set not null;

drop index if exists public.training_week_summaries_user_block_week_uidx;

create unique index if not exists training_week_summaries_user_authority_key_uidx
  on public.training_week_summaries(user_id, summary_authority_key);

create index if not exists training_week_summaries_user_block_week_authority_idx
  on public.training_week_summaries(user_id, training_block_id, week_index, summary_lifecycle, summary_generated_at);

comment on column public.training_week_summaries.summary_authority_key is
  'Deterministic key for the current authoritative weekly summary at a block, week, lifecycle, and plan revision. Superseded legacy rows include row id to preserve audit history.';

alter table public.training_progression_decisions
  add column if not exists decision_authority_key text;

alter table public.training_progression_decisions
  drop constraint if exists training_progression_decisions_lifecycle_known;

alter table public.training_progression_decisions
  add constraint training_progression_decisions_lifecycle_known
  check (decision_lifecycle in ('provisional', 'final', 'corrected_final', 'superseded'));

with ranked as (
  select
    id,
    row_number() over (
      partition by
        user_id,
        training_block_id,
        week_index,
        coalesce(decision_lifecycle, 'final'),
        coalesce(plan_revision_id, 'legacy:missing-plan-revision')
      order by generated_at desc nulls last, updated_at desc, created_at desc, id desc
    ) as authority_rank
  from public.training_progression_decisions
  where decision_lifecycle <> 'superseded'
)
update public.training_progression_decisions target
set decision_lifecycle = 'superseded'
from ranked
where target.id = ranked.id
  and ranked.authority_rank > 1;

update public.training_progression_decisions
set
  decision_authority_key = case
    when decision_lifecycle = 'superseded' then concat(
      'training_progression_decision:',
      training_block_id,
      ':week:',
      week_index,
      ':lifecycle:superseded:revision:',
      coalesce(plan_revision_id, 'legacy:missing-plan-revision'),
      ':row:',
      id
    )
    else concat(
      'training_progression_decision:',
      training_block_id,
      ':week:',
      week_index,
      ':lifecycle:',
      coalesce(decision_lifecycle, 'final'),
      ':revision:',
      coalesce(plan_revision_id, 'legacy:missing-plan-revision')
    )
  end,
  decision_payload = jsonb_set(
    decision_payload,
    '{authorityKey}',
    to_jsonb(
      case
        when decision_lifecycle = 'superseded' then concat(
          'training_progression_decision:',
          training_block_id,
          ':week:',
          week_index,
          ':lifecycle:superseded:revision:',
          coalesce(plan_revision_id, 'legacy:missing-plan-revision'),
          ':row:',
          id
        )
        else concat(
          'training_progression_decision:',
          training_block_id,
          ':week:',
          week_index,
          ':lifecycle:',
          coalesce(decision_lifecycle, 'final'),
          ':revision:',
          coalesce(plan_revision_id, 'legacy:missing-plan-revision')
        )
      end
    ),
    true
  )
where decision_authority_key is null;

alter table public.training_progression_decisions
  alter column decision_authority_key set not null;

create unique index if not exists training_progression_decisions_user_authority_key_uidx
  on public.training_progression_decisions(user_id, decision_authority_key);

create index if not exists training_progression_decisions_user_block_week_authority_idx
  on public.training_progression_decisions(user_id, training_block_id, week_index, decision_lifecycle, generated_at);

comment on column public.training_progression_decisions.decision_authority_key is
  'Deterministic key for the current authoritative progression decision at a block, week, lifecycle, and plan revision. Superseded legacy rows include row id to preserve audit history.';

alter table public.training_block_timeline_events
  add column if not exists event_key text;

with event_keys as (
  select
    id,
    user_id,
    concat(
      'training_block_timeline_event:',
      coalesce(training_block_id::text, 'no_block'),
      ':',
      event_type,
      ':',
      event_date,
      ':week:',
      coalesce(event_payload->>'weekIndex', 'none'),
      ':lifecycle:',
      coalesce(event_payload->>'summaryLifecycle', event_payload->>'decisionLifecycle', 'none'),
      ':revision:',
      coalesce(event_payload->>'planRevisionId', event_payload->>'blockId', 'legacy:missing-plan-revision'),
      ':input:',
      coalesce(event_payload->>'inputHash', 'none'),
      ':output:',
      coalesce(event_payload->>'outputHash', 'none')
    ) as base_event_key,
    row_number() over (
      partition by
        user_id,
        concat(
          'training_block_timeline_event:',
          coalesce(training_block_id::text, 'no_block'),
          ':',
          event_type,
          ':',
          event_date,
          ':week:',
          coalesce(event_payload->>'weekIndex', 'none'),
          ':lifecycle:',
          coalesce(event_payload->>'summaryLifecycle', event_payload->>'decisionLifecycle', 'none'),
          ':revision:',
          coalesce(event_payload->>'planRevisionId', event_payload->>'blockId', 'legacy:missing-plan-revision'),
          ':input:',
          coalesce(event_payload->>'inputHash', 'none'),
          ':output:',
          coalesce(event_payload->>'outputHash', 'none')
        )
      order by created_at asc, id asc
    ) as event_rank
  from public.training_block_timeline_events
)
update public.training_block_timeline_events target
set
  event_key = case
    when event_keys.event_rank = 1 then event_keys.base_event_key
    else concat(event_keys.base_event_key, ':legacy_duplicate:', target.id)
  end,
  event_payload = jsonb_set(
    event_payload,
    '{eventKey}',
    to_jsonb(
      case
        when event_keys.event_rank = 1 then event_keys.base_event_key
        else concat(event_keys.base_event_key, ':legacy_duplicate:', target.id)
      end
    ),
    true
  )
from event_keys
where target.id = event_keys.id
  and target.event_key is null;

alter table public.training_block_timeline_events
  alter column event_key set not null;

create unique index if not exists training_block_timeline_events_user_event_key_uidx
  on public.training_block_timeline_events(user_id, event_key);

create index if not exists training_block_timeline_events_user_block_event_key_idx
  on public.training_block_timeline_events(user_id, training_block_id, event_type, event_date, event_key);

comment on column public.training_block_timeline_events.event_key is
  'Deterministic idempotency key for engine-owned training timeline events. Legacy duplicate rows keep unique duplicate-suffixed keys instead of being deleted.';
