# Beta Release Operations

Date: 2026-05-21

This document is the operational checklist for structured CornerIQ beta releases. It covers local gates, remote Supabase verification, live smoke, issue reporting, feedback triage, privacy, and the next ChatGPT audit path.

## Beta Readiness Status

CornerIQ is beta-ready for structured local/scripted boxer testing of Today, Fuel, Train, Plan, Profile, data controls, feedback, issue reporting, and automated beta scenario QA. Recent passes added app-level recovery, a privacy-safe issue report path, visible feedback history/status, a beta health preflight panel, a beta tester notice, runtime public-env validation, EAS build profiles, a beta preflight script, GitHub Actions quality workflows, CodeQL, ten-persona scenario coverage, static safety scans, and focused quick-log/workout/plan-adjustment friction polish.

Local migration files now run through `010_generated_sessions_training_block_scope.sql`. The last remote verification recorded on 2026-05-21 showed migrations `001` through `009` applied and dry run up to date; rerun migration list and dry run before release handoff so `010` is either applied or explicitly documented as pending.

2026-05-21 historical release-candidate verification result: code gates, Supabase checks, live smoke, preflight, and a public GitHub Actions `Quality` run passed for that older candidate. That historical result does not prove any later candidate.

2026-06-03 EAS update: project `@karlcupid/corneriq` is now linked in `app.json` with project ID `906eba92-1dee-41d8-b27f-0c04f4fc6f1a`. Android preview build `d550e9bb-b705-41a3-bae7-76c2b6d38453` failed in Gradle/Hermes because a floating Supabase dependency resolved to `@supabase/supabase-js@2.106.0`, whose CommonJS bundle contains a dynamic OpenTelemetry import Hermes rejected. Supabase is now pinned to `2.50.0`, Expo dependency drift and Metro config warnings are fixed, local gates pass, and fresh cache-cleared Android preview build `c21c5692-011e-4c85-949f-355d0e1f753f` finished with APK artifact `https://expo.dev/artifacts/eas/pYeMLGCyyhfB72dRYhG93K.apk`. Do not call this broadly distributed until a private tester channel, tester list, metadata acceptance, and physical-device checks are confirmed.

2026-06-03 release-evidence update: committed production docs are now templates and historical runbooks. Exact candidate proof belongs in the ignored generated artifact `qa-artifacts/release-evidence/current-release-evidence.md`, produced by `npm run release:evidence` and validated by `npm run release:quality`.

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

An Android EAS preview APK artifact exists in the separate mobile lane. App icon/splash polish, store metadata, private tester distribution, and physical-device acceptance remain manual release-owner tasks before broader distribution.

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
- Final status for that build: `ERRORED`, with `EAS_BUILD_UNKNOWN_GRADLE_ERROR` in `:app:createBundleReleaseJsAndAssets`.
- Failure cause: Hermes rejected the dynamic OpenTelemetry import emitted by `@supabase/supabase-js@2.106.0`.
- Remediation: pin `@supabase/supabase-js` exactly to `2.50.0`, add/fix Expo SDK-aligned dependencies, and add the Expo default `metro.config.js`.
- Final local gates after remediation: `npm install`, `npm run typecheck`, `npm run lint`, `npm run preflight:beta`, approved `npx expo-doctor` (`18/18`), approved `npm test`, approved `npm run quality`, approved `npm run smoke:fixtures`, approved `npm run test:coverage`, and approved `npm audit --audit-level=high --omit=dev`.
- Fresh Android preview build submitted with cache cleared: `c21c5692-011e-4c85-949f-355d0e1f753f`.
- Fresh build URL: https://expo.dev/accounts/karlcupid/projects/corneriq/builds/c21c5692-011e-4c85-949f-355d0e1f753f
- Final status: `FINISHED`.
- Artifact URL: https://expo.dev/artifacts/eas/pYeMLGCyyhfB72dRYhG93K.apk

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
- Amateur open with scheduled sparring.
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

`.github/workflows/release-quality.yml` is stricter and manual-only. It runs the local quality gates, agent QA evidence loop, production dependency audit, and a non-optional Supabase migration dry-run. It then runs `npm run release:quality`, which fails if release-critical evidence is missing. Missing Supabase migration credentials are therefore advisory in normal CI but release-blocking in Release Quality.

For each release-candidate commit, record the `Quality` and `CodeQL` run IDs, commit SHA, status, and conclusion in generated release evidence before release handoff. If CodeQL has not run on the candidate commit yet, keep release status at build/security evidence pending.

Do not use latest-run wording as proof. Run IDs and URLs must be tied to the exact candidate SHA.

## Advisory Vs Release-Blocking Gates

Advisory in normal development:

- Local browser agent QA can pass without live Supabase credentials because it runs with `EXPO_PUBLIC_CORNERIQ_E2E_LOCAL=1`.
- Normal `Quality` CI may skip Supabase dry-run when migration secrets or project vars are absent.
- Live smoke is opt-in and must not run in default CI.
- EAS preview artifact, app icon, splash, store metadata, and physical-device distribution are outside this run.

Release-blocking for a beta handoff:

- `npm run release:quality` must pass in a release-owner context.
- Supabase migration dry-run must be verified for the candidate SHA, including migration `010`.
- CodeQL must be configured and a candidate run result must be recorded.
- Coverage thresholds must remain at least statements 75, functions 75, lines 75, and branches 65.
- Beta preflight, static safety scans, smoke fixtures, typecheck, lint, tests, coverage, and agent QA evidence loop must pass.
- Docs must not claim current-head pass without exact SHA evidence.
- Committed docs must not be required to contain their own final commit SHA.

## Release Evidence Ledger

The committed ledger at `docs/27_RELEASE_EVIDENCE_LEDGER.md` is a template and historical context file. The exact-SHA ledger for a release candidate lives in `qa-artifacts/release-evidence/current-release-evidence.md` or an equivalent CI artifact.

Generate and validate it with:

```bash
npm run release:evidence
npm run release:quality
```

Use this ledger shape for each release-candidate commit:

| Evidence | Required status | Owner | Record |
| --- | --- | --- | --- |
| Candidate SHA | exact full SHA and short SHA recorded | Release owner | generated release evidence artifact |
| Typecheck/lint/test/coverage/smoke/preflight | pass | Agent or CI | command output or CI run URL |
| Agent QA evidence loop | pass | Agent or CI | `qa-artifacts/corneriq-agent-qa-bundle.zip` |
| Static safety scans | pass | Agent or CI | `src/tests/static` |
| Supabase migration dry-run | verified or release-blocking | Release owner | migration list and dry-run result |
| CodeQL | configured and candidate result recorded | Release owner | CodeQL run URL/result |
| Live smoke | verified or exact credential blocker documented | Release owner | private notes, no values |
| EAS/mobile deliverability | excluded in this run | Release owner | separate distribution ledger |

## Private Incident Triage Runbook

The private triage runbook lives at `docs/qa/INCIDENT_TRIAGE_RUNBOOK.md`. It defines Critical/High/Medium/Low severity, emergency redirect language, privacy handling for tester text, private issue criteria, stop-beta criteria, and the rule that normal users cannot mark reports reviewed, resolved, dismissed, or cleared.

Short form:

- Critical reports include urgent health concern, unsafe weight-class pressure, exposed secret, hard-stop bypass, generated contact-work language, data deletion failure, or migration mismatch that affects user-owned data.
- For urgent symptoms, pregnancy-related concern, eating-disorder risk, fainting, severe dizziness, or unsafe pressure, stop the beta session and seek qualified support outside the app.
- Feedback is product feedback, not emergency support, medical care, dietetic care, or boxing coaching replacement.
- Tester text is sensitive by default and should not be copied into public issues.
- Private issue creation is appropriate for Critical/High safety, privacy, persistence, or comprehension failures.

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
- EAS preview build artifact exists; release-owner private distribution and physical-device checks remain.
- App store metadata, icon, and splash polish.

## Beta Release Checklist

- Typecheck passed.
- Tests passed.
- Quality passed.
- Lint passed.
- Beta preflight passed.
- Live smoke passed with ignored local env loaded and exact-SHA generated evidence, or exact blocker was documented.
- Supabase migration list aligned in exact-SHA generated evidence.
- Supabase dry run up to date in exact-SHA generated evidence.
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
