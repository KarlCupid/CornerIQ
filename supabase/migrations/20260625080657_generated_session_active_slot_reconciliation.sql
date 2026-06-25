create index if not exists generated_training_sessions_user_engine_slot_lifecycle_idx
  on public.generated_training_sessions(user_id, engine_version, prescription_slot_id, generated_session_lifecycle)
  where prescription_slot_id is not null
    and generated_session_lifecycle in ('active', 'moved', 'completed', 'skipped', 'unresolved');

create index if not exists generated_training_sessions_user_block_current_original_idx
  on public.generated_training_sessions(user_id, block_id, current_scheduled_date, original_planned_date)
  where generated_session_lifecycle in ('active', 'moved', 'completed', 'skipped', 'unresolved');

comment on index public.generated_training_sessions_user_engine_slot_lifecycle_idx is
  'Supports repository reconciliation by stable prescription slot while preserving completed/skipped history.';

comment on index public.generated_training_sessions_user_block_current_original_idx is
  'Supports active-block generated-session loading by current scheduled date while retaining original planned date for moved-slot accounting.';
