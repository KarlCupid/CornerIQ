-- Privacy-safe beta feedback and reporting workflow.
-- Feedback is user-entered text and may contain sensitive context. The app
-- reminds beta users not to include emergency details, secrets, or medical
-- review requests; this table is for product feedback only.

create table if not exists public.beta_feedback_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  screen text not null,
  category text not null,
  severity text not null default 'medium',
  message text not null,
  status text not null default 'received',
  feedback_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beta_feedback_reports_screen_known check (
    screen in (
      'today',
      'fuel',
      'train',
      'plan',
      'profile',
      'onboarding',
      'auth',
      'unknown'
    )
  ),
  constraint beta_feedback_reports_category_known check (
    category in (
      'confusing',
      'bug',
      'safety_concern',
      'copy_issue',
      'missing_feature',
      'workout_feedback',
      'fuel_feedback',
      'weight_class_feedback',
      'cycle_feedback',
      'other'
    )
  ),
  constraint beta_feedback_reports_severity_known check (severity in ('low', 'medium', 'high', 'critical')),
  constraint beta_feedback_reports_status_known check (status in ('received', 'reviewed', 'resolved', 'dismissed')),
  constraint beta_feedback_reports_message_present check (length(btrim(message)) > 0),
  constraint beta_feedback_reports_message_length check (char_length(message) <= 2000)
);

comment on table public.beta_feedback_reports is
  'Owner-scoped beta feedback reports. Feedback may contain user-entered sensitive text; avoid collecting health details by default.';
comment on column public.beta_feedback_reports.message is
  'Beta tester product feedback. Users should not include emergency details, secrets, or full health history.';
comment on column public.beta_feedback_reports.feedback_payload is
  'Sanitized product context only. This feedback is not medical review, not coaching review, not emergency support, and not a hard-stop clearing workflow.';
comment on column public.beta_feedback_reports.status is
  'received, reviewed, resolved, or dismissed. No admin/reviewer UI is exposed in the Expo client yet.';

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_beta_feedback_reports_updated_at'
      and tgrelid = 'public.beta_feedback_reports'::regclass
  ) then
    create trigger set_beta_feedback_reports_updated_at
    before update on public.beta_feedback_reports
    for each row execute function public.set_updated_at();
  end if;
end;
$$;

alter table public.beta_feedback_reports enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'beta_feedback_reports'
      and policyname = 'beta_feedback_reports owner access'
  ) then
    create policy "beta_feedback_reports owner access"
    on public.beta_feedback_reports
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end;
$$;

create index if not exists beta_feedback_reports_user_created_idx
  on public.beta_feedback_reports(user_id, created_at);
create index if not exists beta_feedback_reports_user_screen_category_idx
  on public.beta_feedback_reports(user_id, screen, category);
create index if not exists beta_feedback_reports_user_status_idx
  on public.beta_feedback_reports(user_id, status);
