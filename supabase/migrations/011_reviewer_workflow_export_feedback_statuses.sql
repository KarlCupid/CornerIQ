-- Expand safe app-functionality status models without exposing athlete self-clear.

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
      'superseded',
      'acknowledged',
      'in_review',
      'blocked'
    )
  );

alter table public.nutrition_safety_review_events
  drop constraint if exists nutrition_safety_review_events_type_known;

alter table public.nutrition_safety_review_events
  add constraint nutrition_safety_review_events_type_known check (
    event_type in (
      'requested',
      'acknowledged',
      'acknowledged_by_athlete',
      'reviewer_reviewing',
      'reviewer_assigned',
      'reviewer_note',
      'cleared_by_reviewer',
      'not_cleared',
      'blocked',
      'superseded'
    )
  );

comment on column public.nutrition_safety_reviews.status is
  'requested, acknowledged_by_athlete, reviewer_reviewing, cleared_by_reviewer, not_cleared, or superseded. Legacy acknowledged/in_review/blocked values remain readable. cleared_by_reviewer is reserved for permissioned server-side reviewer workflow, never athlete self-clear.';

alter table public.beta_feedback_reports
  drop constraint if exists beta_feedback_reports_category_known;

alter table public.beta_feedback_reports
  add constraint beta_feedback_reports_category_known check (
    category in (
      'confusing',
      'confusing_flow',
      'bug',
      'safety_concern',
      'exposed_secret',
      'data_deletion_export_issue',
      'unsafe_generated_output',
      'app_crash',
      'copy_issue',
      'missing_feature',
      'workout_feedback',
      'fuel_feedback',
      'weight_class_feedback',
      'cycle_feedback',
      'other'
    )
  );

comment on column public.beta_feedback_reports.category is
  'Normalized incident/feedback category. Normal athlete app clients can submit and read status history, but cannot mark reports reviewed/resolved/dismissed.';
