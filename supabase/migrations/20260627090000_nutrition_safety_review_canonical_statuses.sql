-- Canonical nutrition safety review statuses/events for Fuel overhaul.
-- Athlete acknowledgement is audit-only and never clears a hard stop. Reviewer
-- clear/not-clear transitions require a trusted server-side reviewer workflow.

update public.nutrition_safety_reviews
set status = case status
  when 'acknowledged' then 'acknowledged_by_athlete'
  when 'in_review' then 'reviewer_reviewing'
  when 'blocked' then 'not_cleared'
  else status
end
where status in ('acknowledged', 'in_review', 'blocked');

update public.nutrition_safety_review_events
set event_type = case event_type
  when 'acknowledged' then 'acknowledged_by_athlete'
  when 'blocked' then 'not_cleared'
  else event_type
end
where event_type in ('acknowledged', 'blocked');

alter table public.nutrition_safety_reviews
  drop constraint if exists nutrition_safety_reviews_status_known;

alter table public.nutrition_safety_reviews
  add constraint nutrition_safety_reviews_status_known check (
    status in (
      'requested',
      'acknowledged_by_athlete',
      'reviewer_reviewing',
      'cleared_by_reviewer',
      'not_cleared',
      'superseded'
    )
  );

alter table public.nutrition_safety_review_events
  drop constraint if exists nutrition_safety_review_events_type_known;

alter table public.nutrition_safety_review_events
  add constraint nutrition_safety_review_events_type_known check (
    event_type in (
      'requested',
      'acknowledged_by_athlete',
      'reviewer_reviewing',
      'reviewer_assigned',
      'reviewer_note',
      'cleared_by_reviewer',
      'not_cleared',
      'superseded'
    )
  );

drop policy if exists "nutrition_safety_reviews athlete acknowledge" on public.nutrition_safety_reviews;

create policy "nutrition_safety_reviews athlete acknowledge"
on public.nutrition_safety_reviews
for update
using (
  auth.uid() = user_id
  and status in ('requested', 'not_cleared')
)
with check (
  auth.uid() = user_id
  and status = 'acknowledged_by_athlete'
  and reviewer_user_id is null
  and reviewer_role is null
  and reviewed_at is null
);

drop policy if exists "nutrition_safety_review_events athlete audit append" on public.nutrition_safety_review_events;

create policy "nutrition_safety_review_events athlete audit append"
on public.nutrition_safety_review_events
for insert
with check (
  auth.uid() = user_id
  and event_type in ('requested', 'acknowledged_by_athlete')
  and (
    actor_type = 'athlete'
    or (actor_type = 'engine' and event_type = 'requested')
  )
  and (actor_user_id is null or actor_user_id = auth.uid())
);

comment on column public.nutrition_safety_reviews.status is
  'Canonical status: requested, acknowledged_by_athlete, reviewer_reviewing, cleared_by_reviewer, not_cleared, or superseded. Athlete acknowledgement is audit-only and never clears a hard stop.';
comment on column public.nutrition_safety_reviews.hard_stop is
  'When true, the hard stop remains active until trusted server-side reviewer clear/audit. Athlete acknowledgement must not clear it.';
comment on column public.nutrition_safety_review_events.event_type is
  'Canonical audit event. Athlete clients may append requested or acknowledged_by_athlete only; reviewer events require trusted server-side authority.';
comment on policy "nutrition_safety_reviews athlete acknowledge" on public.nutrition_safety_reviews is
  'Athlete clients may acknowledge active review requests only. Acknowledgement does not clear hard_stop or set reviewer fields.';
comment on policy "nutrition_safety_review_events athlete audit append" on public.nutrition_safety_review_events is
  'Athlete clients may append request/acknowledgement audit events only. reviewer_reviewing, cleared_by_reviewer, not_cleared, reviewer_assigned, and reviewer_note are not athlete-writable.';
