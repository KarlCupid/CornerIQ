# Beta Release Operations

Date: 2026-05-21

This document is the operational checklist for structured CornerIQ beta releases. It covers local gates, remote Supabase verification, live smoke, issue reporting, feedback triage, privacy, and the next ChatGPT audit path.

## Beta Readiness Status

CornerIQ is beta-ready for structured boxer testing of Today, Fuel, Train, Plan, Profile, data controls, feedback, and issue reporting. This pass added app-level recovery, a privacy-safe issue report path, visible feedback history/status, a beta health preflight panel, and a GitHub Actions quality workflow.

No new migration was added in this pass. Remote migrations `001` through `009` remain applied and dry run reports the database is up to date.

## Local Checks

Run these before handoff:

```bash
npm run typecheck
npm test
npm run quality
npm run lint
```

On this Windows host, PowerShell blocks `npm.ps1`; use `cmd /c` for the same scripts when needed.

## Live Smoke

Live smoke is gated and must not run in CI by default.

Required variable names only:

- `CORNERIQ_LIVE_DB_SMOKE`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `CORNERIQ_SMOKE_EMAIL`
- `CORNERIQ_SMOKE_PASSWORD`

Use only the public Supabase URL and anon key for client/smoke behavior. Do not print values. Do not commit `.env`.

Safe local command pattern:

```bash
CORNERIQ_LIVE_DB_SMOKE=1 npm run smoke:live-db
```

In Windows PowerShell, load ignored `.env` values into the process without printing them, then run `cmd /c npm run smoke:live-db`.

## Supabase Verification

Verify the linked remote project before release:

```bash
npm exec supabase -- --version
npm exec supabase -- migration list
npm exec supabase -- db push --dry-run
```

Expected current state:

- CLI version verified as `2.100.1`.
- Local and remote migrations `001` through `009` align.
- Dry run reports `Remote database is up to date.`

## Feedback Workflow

Testers submit feedback in Profile > Audit.

The panel supports:

- Screen.
- Category.
- Severity.
- Short message.
- Recent feedback history with read-only status chips.

Reports are user-owned rows in `beta_feedback_reports` under RLS. Client code can submit and list the signed-in user's own reports; it cannot mark reports reviewed, resolved, or dismissed.

Testers should not include secrets, emergency details, medical records, full health histories, or screenshots with private content.

## Feedback Triage

There is no admin-review UI yet.

Manual triage path for now:

1. Open the Supabase dashboard for the linked project.
2. Inspect `beta_feedback_reports`.
3. Filter by `user_id`, `created_at`, `screen`, `category`, `severity`, or `status`.
4. Treat message text as potentially sensitive.
5. Do not copy medical details or private tester text into public issues.

Future options:

- Admin Edge Function for status changes.
- Private dashboard with permissioned reviewers.
- Private export for beta research synthesis.

## Error Reporting

`AppErrorBoundary` catches render/runtime errors in the React tree and shows:

- "Something went wrong."
- "Your data is still protected."
- Retry.
- "Report this issue" when a signed-in user has feedback available.

Issue reports reuse beta feedback with category `bug`. The payload includes a sanitized error summary and bounded component-stack summary. The UI does not show raw stack traces, and there is no automatic third-party reporting.

Signed-out users see recovery copy, but no issue report is submitted.

## Data And Privacy

- Data export preview and DELETE-gated app-data deletion remain in Profile > Data.
- Feedback reports are included in user-owned export/delete scope.
- Cycle support remains optional, private, and symptom-aware.
- Wearables are optional; manual input is first-class.
- Client and smoke use public Supabase URL plus anon key only.
- No service role key belongs in Expo/client code.

## CI Quality Workflow

`.github/workflows/quality.yml` runs on push and pull request:

- checkout
- setup Node with npm cache
- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm test`

CI does not run live smoke and does not require Supabase smoke credentials.

## Deferred Features

Still deferred:

- Barcode scanning.
- Full meal planning.
- Detailed food database.
- Coach UI.
- Reviewer-clear UI.
- Numeric load progression.
- Drag/drop calendar.
- External analytics.
- Production issue triage dashboard.

## Beta Release Checklist

- Typecheck passed.
- Tests passed.
- Quality passed.
- Lint passed.
- Live smoke passed with ignored local env loaded, or exact missing variable names were documented.
- Supabase migration list aligned.
- Supabase dry run up to date.
- CI workflow passed for PR or branch.
- Docs updated.
- No unsafe weight-cut copy.
- No contact-work generation.
- No self-clear path.
- Feedback submit and history visible.
- Data deletion checked.
- Cycle privacy visible.
- No service role in client.

## How ChatGPT Should Audit Next Commit

Inspect first:

1. `src/app/components/AppErrorBoundary.tsx`
2. `src/app/components/BetaFeedbackPanel.tsx`
3. `src/app/components/BetaHealthPanel.tsx`
4. `src/engine/presentation/betaHealthViewModel.ts`
5. `src/hooks/useBetaFeedback.ts`
6. `src/app/screens/ProfileScreen.tsx`
7. `.github/workflows/quality.yml`
8. `src/tests/app/appShell.test.ts`
9. `src/tests/engine/betaHealthViewModel.test.ts`
10. `src/tests/docs/betaReleaseOperations.test.ts`
11. `docs/20_BETA_TESTING_AND_FEEDBACK_PLAN.md`
12. `docs/21_BETA_RELEASE_OPERATIONS.md`
