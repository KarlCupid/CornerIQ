-- Keep the persisted preview contract aligned with the deterministic engine's
-- explicit no-plan placeholder. The value is conservative and generates no
-- future sessions; it does not weaken any safety or ownership policy.

alter table public.training_next_week_previews
  drop constraint if exists training_next_week_previews_volume_strategy_known;

alter table public.training_next_week_previews
  add constraint training_next_week_previews_volume_strategy_known check (
    volume_strategy in (
      'conservative_start',
      'progress_small',
      'repeat_same',
      'reduce_volume',
      'deload',
      'taper',
      'tournament_conserve',
      'hold_for_review'
    )
  );

comment on constraint training_next_week_previews_volume_strategy_known on public.training_next_week_previews is
  'Allows only deterministic engine-owned next-week volume strategies, including the no-plan conservative placeholder.';
