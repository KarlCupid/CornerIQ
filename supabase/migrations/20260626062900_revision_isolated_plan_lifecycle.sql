-- Revision-isolated lifecycle authority for new training plans.
-- CornerIQ is pre-production, so ambiguous derived active state is superseded
-- instead of being carried forward as compatibility behavior.

alter table public.training_blocks
  add column if not exists plan_revision_id text;

update public.training_blocks
set plan_revision_id = coalesce(
  plan_revision_id,
  nullif(block_payload->>'planRevisionId', ''),
  case
    when block_payload->>'id' like 'block:%:plan:%'
      then regexp_replace(block_payload->>'id', '^block:[^:]+:(plan:.+)$', '\1')
    else null
  end
)
where plan_revision_id is null;

update public.training_blocks
set block_payload = block_payload || jsonb_build_object('planRevisionId', plan_revision_id)
where plan_revision_id is not null
  and nullif(block_payload->>'planRevisionId', '') is distinct from plan_revision_id;

comment on column public.training_blocks.plan_revision_id is
  'Active plan revision that owns this training block. New plans allocate a new revision and block boundary.';

with ranked_active_blocks as (
  select
    id,
    row_number() over (
      partition by user_id, plan_revision_id
      order by updated_at desc, created_at desc, id desc
    ) as authority_rank
  from public.training_blocks
  where status = 'active'
    and plan_revision_id is not null
)
update public.training_blocks target
set
  status = 'superseded',
  superseded_at = coalesce(target.superseded_at, now()),
  block_payload = target.block_payload || jsonb_build_object(
    'lifecycleStatus', 'superseded',
    'supersededReason', 'duplicate_active_block_for_plan_revision'
  )
from ranked_active_blocks
where target.id = ranked_active_blocks.id
  and ranked_active_blocks.authority_rank > 1;

with ranked_user_blocks as (
  select
    id,
    row_number() over (
      partition by user_id
      order by updated_at desc, created_at desc, id desc
    ) as authority_rank
  from public.training_blocks
  where status = 'active'
)
update public.training_blocks target
set
  status = 'superseded',
  superseded_at = coalesce(target.superseded_at, now()),
  block_payload = target.block_payload || jsonb_build_object(
    'lifecycleStatus', 'superseded',
    'supersededReason', 'preproduction_multiple_active_blocks_cleaned'
  )
from ranked_user_blocks
where target.id = ranked_user_blocks.id
  and ranked_user_blocks.authority_rank > 1;

update public.generated_training_sessions session
set
  generated_session_lifecycle = 'superseded',
  session_payload = session.session_payload || jsonb_build_object(
    'generatedSessionLifecycle', 'superseded',
    'supersededReason', 'owning_training_block_not_active'
  )
from public.training_blocks block
where session.block_id = block.id
  and block.status <> 'active'
  and session.generated_session_lifecycle in ('active', 'moved', 'unresolved');

update public.generated_training_sessions session
set
  generated_session_lifecycle = 'superseded',
  session_payload = session.session_payload || jsonb_build_object(
    'generatedSessionLifecycle', 'superseded',
    'supersededReason', 'generated_session_plan_revision_mismatch'
  )
from public.training_blocks block
where session.block_id = block.id
  and block.plan_revision_id is not null
  and session.plan_revision_id is distinct from block.plan_revision_id
  and session.generated_session_lifecycle in ('active', 'moved', 'unresolved');

update public.training_next_week_previews preview
set
  status = 'superseded',
  superseded_at = coalesce(preview.superseded_at, now())
from public.training_blocks block
where preview.training_block_id = block.id
  and block.status <> 'active'
  and preview.status in ('preview', 'accepted');

update public.training_plan_adjustments adjustment
set status = 'superseded'
from public.training_blocks block
where adjustment.training_block_id = block.id
  and block.status <> 'active'
  and adjustment.status in ('requested', 'applied');

create index if not exists training_blocks_user_revision_status_idx
  on public.training_blocks(user_id, plan_revision_id, status)
  where plan_revision_id is not null;

create unique index if not exists training_blocks_user_active_revision_uidx
  on public.training_blocks(user_id, plan_revision_id)
  where status = 'active'
    and plan_revision_id is not null;

drop index if exists public.generated_training_sessions_user_active_slot_uidx;

create unique index if not exists generated_training_sessions_user_active_revision_slot_uidx
  on public.generated_training_sessions(user_id, engine_version, plan_revision_id, block_id, week_id, prescription_slot_id)
  where prescription_slot_id is not null
    and plan_revision_id is not null
    and block_id is not null
    and week_id is not null
    and generated_session_lifecycle in ('active', 'moved');
