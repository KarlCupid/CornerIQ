# Beta Release Operations

Date: 2026-05-21

This document is the operational checklist for structured CornerIQ beta releases. It covers local gates, remote Supabase verification, live smoke, issue reporting, feedback triage, privacy, and the next ChatGPT audit path.

## Beta Readiness Status

CornerIQ is beta-ready for structured boxer testing of Today, Fuel, Train, Plan, Profile, data controls, feedback, issue reporting, and automated beta scenario QA. Recent passes added app-level recovery, a privacy-safe issue report path, visible feedback history/status, a beta health preflight panel, a beta tester notice, runtime public-env validation, EAS build profiles, a beta preflight script, a GitHub Actions quality workflow, ten-persona scenario coverage, static safety scans, and focused quick-log/workout/plan-adjustment friction polish.

Local migration files now run through `010_generated_sessions_training_block_scope.sql`. The last remote verification recorded on 2026-05-21 showed migrations `001` through `009` applied and dry run up to date; rerun migration list and dry run before release handoff so `010` is either applied or explicitly documented as pending.

2026-05-21 release-candidate verification result: code gates, Supabase checks, live smoke, preflight, and latest public GitHub Actions `Quality` run passed. EAS Android preview build was attempted but did not produce an artifact because the EAS project was not configured. Current release wording is release-candidate prepared, build pending.

2026-06-03 EAS update: project `@karlcupid/corneriq` is now linked in `app.json` with project ID `906eba92-1dee-41d8-b27f-0c04f4fc6f1a`. Android preview build `d550e9bb-b705-41a3-bae7-76c2b6d38453` was submitted with profile `preview`; EAS currently reports `IN_QUEUE` and no artifact URL yet. Do not call this distributed until that build succeeds and exposes a downloadable artifact.

## Local Checks

Run these before handoff:

```bash
npm run typecheck
npm test
npm run quality
npm run lint
npm run smoke:fixtures
npm run test:coverage
npm run preflight:beta
```

On this Windows host, PowerShell blocks `npm.ps1`; use `cmd /c` for the same scripts when needed.

## Beta Preflight

Run:

```bash
npm run preflight:beta
```

The script checks package scripts, `app.json`, `eas.json`, `development`/`preview`/`production` EAS profiles, public Supabase env declarations, config markers that should not contain smoke credentials or server-only role keys, and docs `20`, `21`, `23`, and `24`.

It does not print env values, does not require smoke credentials, does not run Supabase CLI, does not run live smoke, and does not mutate files.

## Expo / EAS Distribution

`eas.json` now exists with:

- `development`: internal distribution, Android APK, iOS simulator.
- `preview`: internal distribution, Android APK.
- `production`: store-oriented profile with local app version source.

Distribution runbook: `docs/24_EXPO_EAS_BETA_DISTRIBUTION.md`.

Release-candidate checklist: `docs/23_BETA_RELEASE_CANDIDATE_CHECKLIST.md`.

No successful EAS preview or production build exists yet. App icon/splash polish and store metadata remain manual release-owner tasks before broader distribution.

2026-05-21 update:

- `npx eas-cli --version` returned `eas-cli/19.0.5`.
- EAS auth was available for the release owner account.
- Android `preview` build was attempted with `npx eas-cli build --profile preview --platform android --non-interactive`.
- First attempt failed with `Invalid UUID appId` from a pre-existing dirty `app.json` EAS project id.
- The invalid project id was removed, and `npm run preflight:beta` now rejects malformed future EAS project ids.
- Retry failed with `EAS project not configured`; run `npx eas-cli project:init` or `eas init` before the next non-interactive preview build.
- No EAS build URL or artifact exists yet.

2026-06-03 update:

- `npx eas-cli init --non-interactive --force` linked existing project `@karlcupid/corneriq`.
- Project ID: `906eba92-1dee-41d8-b27f-0c04f4fc6f1a`.
- `app.json` now includes `owner: "karlcupid"` and `extra.eas.projectId`.
- Android preview build submitted: `d550e9bb-b705-41a3-bae7-76c2b6d38453`.
- Build URL: https://expo.dev/accounts/karlcupid/projects/corneriq/builds/d550e9bb-b705-41a3-bae7-76c2b6d38453
- Latest queried status: `IN_QUEUE`.
- Artifact URL: pending.

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
- Local migration files include `001` through `010`.
- The last recorded remote verification aligned `001` through `009`.
- Dry run must be rerun before release handoff and must either report `Remote database is up to date.` or document the exact pending migration.

## Feedback Workflow

Testers submit feedback in Profile > Audit.

The panel supports:

- Screen.
- Category.
- Severity.
- Short message.
- Recent feedback history with read-only status chips.

Reports are user-owned rows in `beta_feedback_reports` under RLS. Client code can submit and list the signed-in user's own reports; it cannot mark reports reviewed, resolved, or dismissed.

Testers should not include secrets, emergency details, medical records, full health histories, or screenshots with private content. In-app copy now states that feedback is not emergency support and is not medical review.

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

## Scenario QA

Before human beta sessions, run and inspect:

```bash
npm test
```

The scenario-specific coverage lives in `src/tests/beta/betaScenarioFlows.test.ts`. It exercises:

- Amateur novice build phase.
- Amateur open with sparring anchors.
- Amateur tournament daily weigh-ins.
- Pro camp day-before weigh-in.
- Same-day weigh-in amateur.
- Cycle-enabled athlete with high symptoms.
- Manual-only no wearable athlete.
- Under-fueling risk case.
- Red readiness case.
- No-equipment boxer.

The results and human testing adjustments are documented in `docs/22_BETA_SCENARIO_QA_RESULTS.md`.

## Data And Privacy

- Data export preview and DELETE-gated app-data deletion remain in Profile > Data.
- Feedback reports are included in user-owned export/delete scope.
- Cycle support remains optional, private, and symptom-aware.
- Wearables are optional; manual input is first-class.
- Client and smoke use public Supabase URL plus anon key only.
- No service role key belongs in Expo/client code.
- Runtime beta health and startup copy show missing public env variable names only, never values.

## CI Quality And Security Workflows

`.github/workflows/quality.yml` runs on push and pull request:

- checkout
- setup Node with npm cache
- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm run preflight:beta`
- production dependency audit
- deterministic fixture smoke
- `npm test`
- coverage with thresholds
- conditional Supabase migration dry-run when CI migration secrets/vars are configured

`.github/workflows/codeql.yml` runs CodeQL JavaScript/TypeScript analysis on push, pull request, and a weekly schedule. It does not run live smoke and does not require Supabase credentials.

CI does not run live smoke and does not require Supabase smoke credentials.

For each release-candidate commit, record the `Quality` and `CodeQL` run IDs, commit SHA, status, and conclusion before release handoff. If CodeQL has not run on the candidate commit yet, keep release status at build/security evidence pending.

Latest status check from the public GitHub Actions API:

- Workflow: `Quality`.
- Run: `26215681543`.
- Commit: `235b3f8508c1194d3a6f17354d6a26b2618524de`.
- Event: `push`.
- Status: completed.
- Conclusion: success.

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
- Successful EAS preview build artifact; the latest build is submitted and queued, with artifact pending.
- App store metadata, icon, and splash polish.

## Beta Release Checklist

- Typecheck passed.
- Tests passed.
- Quality passed.
- Lint passed.
- Beta preflight passed.
- Live smoke passed with ignored local env loaded, or exact missing variable names were documented.
- Supabase migration list aligned.
- Supabase dry run up to date.
- CI workflow passed for PR or branch.
- CodeQL workflow passed for PR or branch, or security evidence pending is explicitly documented.
- Docs updated.
- No unsafe weight-cut copy.
- No contact-work generation.
- No self-clear path.
- Feedback submit and history visible.
- Beta tester notice visible.
- Expo/EAS preview profile exists or setup deferral is documented.
- EAS preview build attempted and result documented.
- Scenario QA and static safety scans pass.
- Data deletion checked.
- Cycle privacy visible.
- No service role in client.

## How ChatGPT Should Audit Next Commit

Inspect first:

1. `src/app/components/AppErrorBoundary.tsx`
2. `src/app/components/BetaFeedbackPanel.tsx`
3. `src/app/components/BetaHealthPanel.tsx`
4. `src/app/components/BetaTesterNoticePanel.tsx`
5. `src/services/config/betaRuntimeConfig.ts`
6. `src/engine/presentation/betaHealthViewModel.ts`
7. `eas.json`
8. `scripts/beta-preflight.mjs`
9. `src/hooks/useBetaFeedback.ts`
10. `src/app/screens/ProfileScreen.tsx`
11. `.github/workflows/quality.yml`
12. `.github/workflows/codeql.yml`
13. `src/tests/app/appShell.test.ts`
14. `src/tests/engine/betaHealthViewModel.test.ts`
15. `src/tests/services/betaRuntimeConfig.test.ts`
16. `src/tests/beta/betaScenarioFlows.test.ts`
17. `src/tests/static/betaSafetyStatic.test.ts`
18. `src/tests/static/betaReleaseConfigStatic.test.ts`
19. `src/tests/docs/betaReleaseOperations.test.ts`
20. `src/tests/docs/betaScenarioQaResults.test.ts`
21. `src/tests/docs/betaReleaseCandidateChecklist.test.ts`
22. `docs/20_BETA_TESTING_AND_FEEDBACK_PLAN.md`
23. `docs/21_BETA_RELEASE_OPERATIONS.md`
24. `docs/22_BETA_SCENARIO_QA_RESULTS.md`
25. `docs/23_BETA_RELEASE_CANDIDATE_CHECKLIST.md`
26. `docs/24_EXPO_EAS_BETA_DISTRIBUTION.md`
