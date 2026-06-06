-- Remove the beta feedback table from the final launch schema.
-- Launch support is intentionally non-persistent unless a production support
-- workflow is implemented with trusted server-side ownership and privacy rules.

drop table if exists public.beta_feedback_reports;
