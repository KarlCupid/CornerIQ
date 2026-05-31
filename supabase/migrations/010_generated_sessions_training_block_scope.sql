-- Scope generated support sessions to the active training block/revision.
-- Existing historical rows keep their audit payloads; new engine projections use
-- generated_training_sessions.block_id to point at public.training_blocks.

alter table public.generated_training_sessions
  drop constraint if exists generated_training_sessions_block_id_fkey;

alter table public.generated_training_sessions
  add constraint generated_training_sessions_block_id_fkey
  foreign key (block_id) references public.training_blocks(id) on delete set null
  not valid;

comment on column public.generated_training_sessions.block_id is
  'Active training block id for generated support sessions. Historical legacy generated_training_blocks rows remain auditable through session_payload.';

create index if not exists generated_training_sessions_user_block_date_idx
  on public.generated_training_sessions(user_id, block_id, planned_date);
