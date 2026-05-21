# Beta Release Candidate Checklist

Date: 2026-05-21

Use this checklist before handing CornerIQ to real boxer beta testers. It is a release-candidate gate, not a product roadmap. Do not use it to add new features during the release check.

## Code Gates

- `npm run typecheck` passes.
- `npm test` passes.
- `npm run quality` passes.
- `npm run lint` passes.
- `npm run preflight:beta` passes.
- `.github/workflows/quality.yml` runs typecheck, lint, and tests on push or pull request.
- CI does not run live smoke and does not reference smoke credentials.

## Supabase Gates

- `npm exec supabase -- --version` reports the expected CLI.
- `npm exec supabase -- migration list` shows local and remote migrations aligned.
- `npm exec supabase -- db push --dry-run` reports the remote database is up to date.
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
- Testers are told this is a beta, not medical advice, not a coach replacement, and not emergency support.
- If a tester reports urgent health or weight-class concern, stop the session and seek qualified support outside the app.

## Release Decision

- Ready: all code, Supabase, safety, app, tester, docs, preflight, and smoke gates pass.
- Hold: non-blocking gaps remain, but tester safety and data/privacy gates pass.
- Blocker: any safety gate, env gate, migration mismatch, live smoke failure with available env, or credential exposure is unresolved.

## Release-Candidate Decision - 2026-05-21

- Decision: Hold.
- Reason: Code gates, Supabase migration checks, GitHub Actions, preflight, and live smoke passed, but no EAS preview build artifact exists yet. Android EAS preview was attempted and is held on EAS project setup.
- Checks completed: `npm run typecheck`, `npm test`, `npm run quality`, `npm run lint`, `npm run preflight:beta`, Supabase CLI version, migration list, dry run, live smoke, CI workflow inspection, latest GitHub Actions run check, EAS CLI/auth check, and Android preview build attempt.
- Live smoke: passed after ignored local `.env` values were loaded into the process without printing values; the first bare shell attempt documented missing `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Preflight: passed after adding validation for malformed EAS project ids.
- GitHub Actions status checked: yes. Latest public `Quality` run `26215681543` for commit `235b3f8508c1194d3a6f17354d6a26b2618524de` completed with `success`.
- EAS build attempted: yes.
- EAS build profile: `preview`.
- EAS platform: Android.
- EAS result: failed.
- EAS build URL/artifact: none produced.
- EAS failure reason: first attempt failed with `Invalid UUID appId` from a pre-existing dirty `app.json` project id; that invalid id was removed. Retry failed with `EAS project not configured`; non-interactive build requires `eas init`.
- If not attempted: not applicable.
- Release wording: release-candidate prepared, build pending. Do not call this distributed until an EAS preview build succeeds and a private tester distribution path is confirmed.
- Remaining manual tasks: app icon/splash, store metadata, tester list, EAS account/project setup, internal build distribution, and human beta scheduling.
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
10. `docs/24_EXPO_EAS_BETA_DISTRIBUTION.md`
