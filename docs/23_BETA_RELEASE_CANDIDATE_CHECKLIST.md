# Beta Release Candidate Checklist

Date: 2026-05-21

Use this checklist before handing CornerIQ to real boxer beta testers. It is a release-candidate gate, not a product roadmap. Do not use it to add new features during the release check.

## Code Gates

- `npm run typecheck` passes.
- `npm test` passes.
- `npm run quality` passes.
- `npm run lint` passes.
- `npm run smoke:fixtures` passes.
- `npm run test:coverage` passes threshold gates.
- `npm run preflight:beta` passes.
- `npm run qa:agent:ci` passes and writes `qa-artifacts/corneriq-agent-qa-bundle.zip`.
- `npm run release:quality` passes in a release-owner context after migration dry-run evidence is recorded.
- `docs/qa/QA_LOOP_STATE.md` is updated with the current beta-readiness decision.
- `.github/workflows/quality.yml` runs typecheck, lint, and tests on push or pull request.
- `.github/workflows/codeql.yml` runs JavaScript/TypeScript CodeQL analysis on push, pull request, and weekly schedule.
- `.github/workflows/agent-qa-loop.yml` can upload the `corneriq-agent-qa-bundle` artifact without Supabase secrets.
- CI does not run live smoke and does not reference smoke credentials.

## Release-Blocking Evidence

- Normal push CI can skip Supabase migration dry-run when credentials are absent; Release Quality cannot.
- `npx supabase db push --dry-run` must be verified for the candidate SHA before release handoff.
- Migration `010_generated_sessions_training_block_scope.sql` must be applied or explicitly marked release-blocking.
- CodeQL must be configured and the candidate run result must be recorded before security evidence is considered complete.
- Coverage thresholds must remain at least statements 75, functions 75, lines 75, and branches 65.
- Release docs must record exact full and short SHA evidence, not vague current-head pass language.
- Live smoke remains opt-in, but missing live-smoke credentials must be documented as an external blocker rather than treated as a pass.

## Supabase Gates

- `npm exec supabase -- --version` reports the expected CLI.
- `npm exec supabase -- migration list` shows local and remote migrations aligned.
- `npm exec supabase -- db push --dry-run` reports the remote database is up to date.
- If a local migration file exists beyond the last recorded remote verification, that migration is either applied by dry run/push workflow or documented as a release blocker.
- Live smoke passes with ignored local env values loaded into the process, or the exact missing variable names are documented.
- Live smoke uses public Supabase URL and anon key only.
- No new migration is added for this release-candidate pass.

## Safety Gates

- No unsafe weight-cut copy appears in app outputs.
- No generated sparring, generated contact drills, or unsupervised fight simulation appears in generated support.
- No athlete self-clear path exists for hard stops.
- Nutrition acknowledgement remains acknowledgement only.
- Coach UI hidden; coach UI hidden remains an explicit release gate.
- Reviewer-clear UI hidden.
- No service role key in Expo/client code.
- Manual input works without a wearable.
- Missing data remains unknown, not safe.
- Cycle support remains optional, private, and symptom-aware.

## App Gates

- Auth: sign-in and sign-up copy render; email confirmation limitations are known.
- Onboarding: boxer setup can complete and demo profile path remains secondary.
- Today: primary action, safety copy, quick logs, and why disclosure render.
- Fuel: Command, History, Reviews, and Body Mass sections render with safety review visibility.
- Train: Today, Workout, Exercise History, and Progression sections render.
- Plan: Week, Next Week, Block History, and Adjustments sections render without screen-owned programming logic.
- Profile: Athlete, Settings, Data, and Audit sections render.
- Agent QA output includes screenshots and page-text snapshots for onboarding, Today, Fuel, Train, Plan, Profile Audit, and Profile Data.
- Engine-output review exists at `qa-artifacts/reports/engine-output-review.md`.
- Feedback: Profile > Audit can submit user-owned beta feedback and show recent read-only status.
- Error boundary: signed-in issue reporting is sanitized; signed-out users cannot submit reports.
- Data export/delete: preview works and deletion remains DELETE-gated.
- Beta tester notice: Profile > Audit shows beta, no-emergency-support, manual-input, wearable-optional, and no-self-clear copy.
- Beta health: Profile > Audit shows public env readiness, auth, engine, feedback, data, cycle privacy, and wearable checks without env values.

## Beta Tester Gates

- Test accounts exist and are not shared in docs, source, tests, or issue trackers.
- Test script is ready from `docs/20_BETA_TESTING_AND_FEEDBACK_PLAN.md`.
- Facilitator notes are kept outside public docs when they contain private tester text.
- Feedback collection uses Profile > Audit or private facilitator notes.
- Privacy reminders are read before testing: no secrets, no emergency details, no medical records, no full health histories.
- Testers are told this is a beta, not medical advice, not a replacement for qualified human judgment, and not emergency support.
- If a tester reports urgent health or weight-class concern, stop the session and seek qualified support outside the app.

## Release Decision

- Ready: all code, Supabase, safety, app, tester, docs, preflight, and smoke gates pass.
- Hold: non-blocking gaps remain, but tester safety and data/privacy gates pass.
- Blocker: any safety gate, env gate, migration mismatch, live smoke failure with available env, or credential exposure is unresolved.
- Do not claim physical iPhone, live Supabase/email confirmation, distribution, or human boxer comprehension complete from local E2E automation alone.

## Release-Candidate Decision - 2026-05-21

- Decision: Hold.
- Reason: Code gates, preflight, dependency/Expo Doctor checks, focused smoke, coverage, and the production high/critical audit pass locally, and EAS project setup is now linked, but no EAS preview artifact exists yet. Android EAS preview build `d550e9bb-b705-41a3-bae7-76c2b6d38453` failed in Gradle/Hermes, the Supabase/Metro/Expo dependency fix is applied, and fresh cache-cleared build `c21c5692-011e-4c85-949f-355d0e1f753f` is submitted and currently queued.
- Checks completed: `npm install`, `npm run typecheck`, `npm test`, `npm run quality`, `npm run lint`, `npm run smoke:fixtures`, `npm run test:coverage`, `npm run preflight:beta`, `npx expo-doctor`, `npm audit --audit-level=high --omit=dev`, CI workflow inspection, EAS CLI/auth check, failed Android preview build inspection, and fresh Android preview build attempt.
- Live smoke: passed after ignored local `.env` values were loaded into the process without printing values; the first bare shell attempt documented missing `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Preflight: passed after adding validation for malformed EAS project ids.
- GitHub Actions status checked: yes. Latest public `Quality` run `26215681543` for commit `235b3f8508c1194d3a6f17354d6a26b2618524de` completed with `success`.
- EAS build attempted: yes.
- EAS build profile: `preview`.
- EAS platform: Android.
- EAS result: first submitted build `d550e9bb-b705-41a3-bae7-76c2b6d38453` failed with `EAS_BUILD_UNKNOWN_GRADLE_ERROR`; fresh build `c21c5692-011e-4c85-949f-355d0e1f753f` is submitted and latest queried status is `IN_QUEUE`.
- Failed EAS build URL: https://expo.dev/accounts/karlcupid/projects/corneriq/builds/d550e9bb-b705-41a3-bae7-76c2b6d38453
- Fresh EAS build URL: https://expo.dev/accounts/karlcupid/projects/corneriq/builds/c21c5692-011e-4c85-949f-355d0e1f753f
- EAS build artifact: pending; `artifacts` is empty while the fresh build remains queued.
- EAS setup notes: first 2026-05-21 attempt failed with `Invalid UUID appId` from a pre-existing dirty `app.json` project id; that invalid id was removed. A 2026-06-03 retry initially failed with `EAS project not configured`, then `npx eas-cli init --non-interactive --force` linked existing project `@karlcupid/corneriq` with ID `906eba92-1dee-41d8-b27f-0c04f4fc6f1a`.
- EAS failure notes: build `d550e9bb-b705-41a3-bae7-76c2b6d38453` failed during Gradle `:app:createBundleReleaseJsAndAssets` because Hermes rejected a dynamic OpenTelemetry import from `@supabase/supabase-js@2.106.0`; the manifest now pins `@supabase/supabase-js` exactly to `2.50.0`, adds/fixes Expo SDK-aligned dependencies, and includes an Expo default `metro.config.js`.
- If not attempted: not applicable.
- Release wording: release-candidate prepared, fresh build submitted, artifact pending. Do not call this distributed until an EAS preview build succeeds and a private tester distribution path is confirmed.
- Remaining manual tasks: monitor fresh queued EAS build to completion, app icon/splash, store metadata, tester list, internal build distribution, and human beta scheduling.
- Secrets: no smoke credentials, EAS tokens, Supabase tokens, or service-role keys were committed or documented as values.

## Known Deferred Features

- Barcode scanning; barcode remains deferred.
- Full meal planning.
- Detailed food database.
- Numeric load progression.
- Coach UI.
- Reviewer-clear UI.
- Drag/drop calendar.
- Admin feedback triage dashboard.
- External analytics.
- Routed drilldowns.

## Manual Sign-Off Checklist

- [ ] Code gates passed.
- [ ] Supabase gates passed.
- [ ] Safety gates passed.
- [ ] App gates passed.
- [ ] Beta tester gates passed.
- [ ] `docs/24_EXPO_EAS_BETA_DISTRIBUTION.md` reviewed.
- [ ] App icon, splash, store metadata, and EAS project ownership are either ready or explicitly accepted as beta limitations.
- [ ] Test accounts and tester list are controlled outside git.
- [ ] Live smoke result or exact non-secret missing-variable reason is recorded in `docs/CODEX_LAST_HANDOFF.md`.
- [ ] Known gaps are copied into `docs/KNOWN_GAPS.md`.

## Auditor Inspect First

1. `eas.json`
2. `scripts/beta-preflight.mjs`
3. `src/services/config/betaRuntimeConfig.ts`
4. `src/engine/presentation/betaHealthViewModel.ts`
5. `src/app/components/BetaTesterNoticePanel.tsx`
6. `src/app/components/BetaHealthPanel.tsx`
7. `src/app/screens/ProfileScreen.tsx`
8. `src/tests/static/betaReleaseConfigStatic.test.ts`
9. `src/tests/docs/betaReleaseCandidateChecklist.test.ts`
10. `.github/workflows/quality.yml`
11. `.github/workflows/codeql.yml`
12. `docs/24_EXPO_EAS_BETA_DISTRIBUTION.md`
