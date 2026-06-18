-- Security and durability hardening from the P0/P1 sweep.
-- Keep athlete clients owner-scoped, but do not let owner RLS double as
-- reviewer authority or generated-session idempotency.

alter table public.nutrition_safety_reviews enable row level security;
alter table public.nutrition_safety_review_events enable row level security;

drop policy if exists "nutrition_safety_reviews owner access" on public.nutrition_safety_reviews;
drop policy if exists "nutrition_safety_review_events owner access" on public.nutrition_safety_review_events;
drop policy if exists "nutrition_safety_reviews owner read" on public.nutrition_safety_reviews;
drop policy if exists "nutrition_safety_reviews athlete request" on public.nutrition_safety_reviews;
drop policy if exists "nutrition_safety_reviews athlete acknowledge" on public.nutrition_safety_reviews;
drop policy if exists "nutrition_safety_review_events owner read" on public.nutrition_safety_review_events;
drop policy if exists "nutrition_safety_review_events athlete audit append" on public.nutrition_safety_review_events;

create policy "nutrition_safety_reviews owner read"
on public.nutrition_safety_reviews
for select
using (auth.uid() = user_id);

create policy "nutrition_safety_reviews athlete request"
on public.nutrition_safety_reviews
for insert
with check (
  auth.uid() = user_id
  and status = 'requested'
  and reviewer_user_id is null
  and reviewer_role is null
  and reviewed_at is null
);

create policy "nutrition_safety_reviews athlete acknowledge"
on public.nutrition_safety_reviews
for update
using (
  auth.uid() = user_id
  and status in ('requested', 'acknowledged', 'in_review', 'blocked')
)
with check (
  auth.uid() = user_id
  and status in ('acknowledged_by_athlete', 'acknowledged')
  and reviewer_user_id is null
  and reviewer_role is null
  and reviewed_at is null
);

create policy "nutrition_safety_review_events owner read"
on public.nutrition_safety_review_events
for select
using (auth.uid() = user_id);

create policy "nutrition_safety_review_events athlete audit append"
on public.nutrition_safety_review_events
for insert
with check (
  auth.uid() = user_id
  and event_type in ('requested', 'acknowledged', 'acknowledged_by_athlete')
  and (
    actor_type = 'athlete'
    or (actor_type = 'engine' and event_type = 'requested')
  )
  and (actor_user_id is null or actor_user_id = auth.uid())
);

comment on policy "nutrition_safety_reviews athlete acknowledge" on public.nutrition_safety_reviews is
  'Athlete clients may acknowledge active review requests only. Reviewer statuses and reviewer identity fields require a trusted server-side workflow.';
comment on policy "nutrition_safety_review_events athlete audit append" on public.nutrition_safety_review_events is
  'Athlete clients may append request/acknowledgement audit events only. reviewer_reviewing, cleared_by_reviewer, not_cleared, reviewer_assigned, and reviewer_note are not athlete-writable.';

alter table public.completed_training_sessions
  add column if not exists completion_key text;

update public.completed_training_sessions
set completion_key = concat(
  'generated_session_completion:',
  session_payload->>'generatedSessionId',
  ':',
  coalesce(session_payload->>'completionStatus', 'completed')
)
where completion_key is null
  and session_payload->>'completionSource' = 'generated_session'
  and session_payload->>'generatedSessionId' is not null;

create unique index if not exists completed_training_sessions_user_completion_key_uidx
  on public.completed_training_sessions(user_id, completion_key);

comment on column public.completed_training_sessions.completion_key is
  'Deterministic idempotency key for generated workout completions. Null is allowed for legacy/manual rows; non-null keys are unique per user.';
