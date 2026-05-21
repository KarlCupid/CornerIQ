# Codex Audit Log

## 2026-05-21 01:08 America/Vancouver

Goal summary:
- Run automated beta scenario QA across the existing beta personas.
- Create a clear scenario QA results document for ChatGPT auditors and human beta facilitators.
- Make small, safe friction-polish improvements to quick logs, workout completion, Plan adjustments, feedback/error reporting, beta health warnings, and generated support copy.
- Keep barcode scanning, full meal planning, detailed food database, coach UI, reviewer-clear UI, numeric load progression, drag/drop calendar, admin triage dashboard, external analytics, unsafe weight-cut copy, generated contact work, service-role client code, and hard-stop self-clear deferred.

Key changes:
- Added `src/tests/beta/betaScenarioFlows.test.ts` covering ten beta personas through `resolvePerformanceState`, Today/Fuel/Train/Plan/Profile/Beta Health view models, safety copy constraints, manual-only validity, red-readiness behavior, under-fueling, cycle symptoms, and no-equipment substitution.
- Added `src/tests/static/betaSafetyStatic.test.ts` for unsafe Fuel terms, generated contact-work phrasing, self-clear surfaces, coach controls, external analytics packages, service-role client surfaces, and feedback boundary copy.
- Added `docs/22_BETA_SCENARIO_QA_RESULTS.md` with scenarios, automated assertions, persona pass status, friction notes, human beta risks, intentionally untested features, and script adjustments.
- Improved quick log cards with "log enough for today" copy, optional-field framing, unknown missing-data copy, accessible main action labels, and busy/disabled button text.
- Improved `WorkoutDetailPanel` with "Complete without exercise details," session-RPE helper copy, pain-note progression caution, skip-reason copy, busy labels, and clearer `prescribed_only`/skipped behavior.
- Updated generated support copy around protected sparring anchors to "Protected boxing support microdose" so generated support does not read as generated sparring.
- Improved Plan adjustment controls with engine-request framing, renamed action copy, applied result explanation, and rejected/review-needed RiskBanner output.
- Improved feedback/error/beta-health copy for not-emergency support, signed-out report requirements, recent feedback empty state, and visible beta health next safe action.
- Updated beta testing, IA, release operations, feature status, known gaps, and handoff docs.

Command results:
- Baseline `git status`: clean on `main`, up to date with `origin/main`; Git warned it could not read `C:\Users\karll/.config/git/ignore`.
- Baseline `git log --oneline --decorate -8`: latest commit `13bcbb4 (HEAD -> main, origin/main) Harden beta release operations and issue reporting`.
- Direct `npm run typecheck`: blocked by PowerShell `npm.ps1`; `cmd /c npm run typecheck` passed.
- Sandboxed `cmd /c npm test`: failed from Vitest/esbuild config access denied; escalated rerun passed before edits with `337` tests passed and `1` skipped.
- Escalated `cmd /c npm run quality`: passed before edits with `337` tests passed and `1` skipped.
- `cmd /c npm run lint`: passed before edits.
- Supabase CLI sandboxed version failed writing telemetry under `C:\Users\karll\.supabase`; escalated version returned `2.100.1`.
- Migration list: local/remote `001` through `009` aligned.
- Dry run: `Remote database is up to date.`
- Initial live smoke without ignored `.env` loaded failed with missing non-secret variable names `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Ignored `.env` key-name check found required smoke keys without printing values.
- Baseline live smoke with ignored `.env` loaded: passed with `1` test, test body `13091ms`, duration `15.07s`.
- During implementation, typecheck first failed on an impossible generated-session intensity comparison; fixed.
- During implementation, tests first failed three copy/doc assertions; fixed.
- During implementation, lint first failed `prefer-const` in `appShell.test.ts`; fixed.
- Final `cmd /c npm run typecheck`: passed.
- Final `cmd /c npm test`: passed with `38` files passed and `1` skipped; `355` tests passed and `1` skipped.
- Final `cmd /c npm run quality`: passed with typecheck plus tests; `355` tests passed and `1` skipped.
- Final `cmd /c npm run lint`: passed.
- Final Supabase version/list/dry-run: CLI `2.100.1`; migrations `001` through `009` aligned; remote DB up to date.
- Final live smoke with ignored `.env` loaded and `CORNERIQ_LIVE_DB_SMOKE=1`: passed with `1` test, test body `12509ms`, duration `14.51s`.
- `git diff --check`: passed with Windows LF-to-CRLF warnings only.
- `git rev-parse HEAD`: `13bcbb4e1bd408f5102b7a4d6d154c704b419af5`.
- No commit was created in this pass.

Known gaps:
- Real boxer beta findings have not been captured yet.
- No admin triage dashboard or admin-reviewed in-app feedback queue.
- No external analytics.
- No production app distribution checklist beyond release operations docs.
- Routed drilldowns remain deferred.
- Barcode scanning, full meal planning, detailed food database, numeric load progression, drag/drop calendar, coach UI, and reviewer-clear UI remain deferred.
- Coach/team remains scaffolded and hidden.

Next recommendation:
- Run guided boxer beta sessions with the ten-persona scenario QA results doc open, capture real friction through observation and Profile > Audit feedback, then make one narrow polish pass from actual findings before adding heavier product surfaces.

## 2026-05-21 00:25 America/Vancouver

Goal summary:
- Harden CornerIQ for structured beta release operations without adding new domain features.
- Add app-level error recovery, privacy-safe report-this-issue flow through beta feedback, visible feedback history/status, beta health preflight, CI quality workflow, and release operations docs.
- Keep barcode scanning, full meal planning, detailed food database, coach UI, reviewer-clear UI, numeric load progression, drag/drop calendar, unsafe weight-cut copy, self-clear behavior, external analytics, and service-role client code deferred.

Key changes:
- Added `AppErrorBoundary` and wrapped the app shell, with signed-in bug reporting through `useBetaFeedback`.
- Extended `useBetaFeedback` to load recent reports and refresh after submit.
- Extended `BetaFeedbackPanel` with read-only recent feedback history and status chips.
- Added `betaHealthViewModel` and `BetaHealthPanel`, then wired Profile > Audit through `AppTabs`.
- Added `.github/workflows/quality.yml` for push/PR `npm ci`, typecheck, lint, and tests; CI does not run live smoke.
- Added `docs/21_BETA_RELEASE_OPERATIONS.md` and updated beta readiness, feedback plan, feature status, known gaps, Supabase status, and this handoff/audit log.

Command results:
- Baseline `git status`: clean on `main`, up to date with `origin/main`; Git warned it could not read `C:\Users\karll/.config/git/ignore`.
- Baseline `git log --oneline --decorate -8`: latest commit `433daaf (HEAD -> main, origin/main) Update agent instructions for CornerIQ`.
- Direct `npm run typecheck`: blocked by PowerShell `npm.ps1`; `cmd /c npm run typecheck` passed.
- Sandboxed `cmd /c npm test` and `cmd /c npm run quality`: failed from Vitest/esbuild config access denied; escalated reruns passed before edits with `329` tests passed and `1` skipped.
- `cmd /c npm run lint`: passed before edits.
- Supabase CLI sandboxed commands failed writing telemetry under `C:\Users\karll\.supabase`; escalated version returned `2.100.1`.
- Migration list: local/remote `001` through `009` aligned.
- Dry run: `Remote database is up to date.`
- Initial live smoke without ignored `.env` loaded failed with missing non-secret variable names `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Ignored `.env` key-name check found required smoke keys without printing values.
- Baseline live smoke with ignored `.env` loaded: passed with `1` test, test body `12605ms`, duration `14.53s`.
- Final `cmd /c npm run typecheck`: passed.
- Final `cmd /c npm test`: passed with `35` files passed and `1` skipped; `337` tests passed and `1` skipped.
- Final `cmd /c npm run quality`: passed with typecheck plus tests; `337` tests passed and `1` skipped.
- Final `cmd /c npm run lint`: passed.
- Final Supabase version/list/dry-run: CLI `2.100.1`; migrations `001` through `009` aligned; remote DB up to date.
- Final live smoke with ignored `.env` loaded and `CORNERIQ_LIVE_DB_SMOKE=1`: passed with `1` test, test body `12545ms`, duration `14.60s`.
- `git diff --check`: passed with Windows LF-to-CRLF warnings only.
- `git rev-parse HEAD`: `433daaf2930d44f2a01cf5a64f6a840fff05f957`.
- No commit was created in this pass.

Known gaps:
- No production issue triage dashboard or admin-reviewed in-app queue.
- No external analytics.
- No production app distribution checklist beyond release operations docs.
- Real boxer beta findings have not been captured yet.
- Routed drilldowns, barcode scanning, full meal planning, detailed food database, numeric load progression, drag/drop calendar, coach UI, and reviewer-clear UI remain deferred.

Next recommendation:
- Run structured boxer beta sessions, manually triage feedback in Supabase with privacy care, then make a focused polish pass on the highest-friction findings before adding production triage, analytics, distribution, or deferred product complexity.

## 2026-05-20 23:50 America/Vancouver

Goal summary:
- Prepare CornerIQ for real boxer beta testing without deep new product features.
- Add privacy-safe beta feedback persistence, repository/service/hook/UI, live-smoke coverage, and structured beta QA/user-testing documentation.
- Lightly harden accessibility labels and copy around reusable controls while keeping business logic out of screens.
- Keep barcode scanning, full meal planning, detailed food database, coach UI, clinician/reviewer-clear UI, numeric load progression, drag/drop calendar, unsafe weight-cut instructions, generated sparring/contact prescriptions, service-role client code, and hard-stop self-clear deferred.

Key changes:
- Added additive migration `009_beta_feedback_reports.sql` with owner RLS, constraints, comments, indexes, updated-at trigger, and privacy/safety semantics for beta feedback.
- Regenerated `src/services/supabase/database.types.ts` from linked remote types after applying 009.
- Added `betaFeedbackRepository`, `submitBetaFeedback`, `useBetaFeedback`, and `BetaFeedbackPanel`.
- Wired Profile > Audit to the feedback panel through `App.tsx` and `AppTabs`.
- Added validation for user ID, screen/category/severity, empty and overlong messages, and obvious password/token redaction before persistence.
- Added feedback reports to user-owned export/delete scope.
- Extended live smoke to submit, verify, and clean a beta feedback report by `smokeRunId`.
- Added `docs/20_BETA_TESTING_AND_FEEDBACK_PLAN.md` with personas, scripts, safety checks, prompts, privacy rules, exit criteria, and inspect-first guidance.
- Updated `docs/19_BETA_READINESS_AND_INFORMATION_ARCHITECTURE.md`, `FEATURE_STATUS.md`, `KNOWN_GAPS.md`, `11_SUPABASE_REMOTE_STATUS.md`, and this handoff/audit log.

Command results:
- Baseline `git status`: clean working tree; Git warned it could not read `C:\Users\karll/.config/git/ignore`.
- Baseline `git log --oneline --decorate -8`: latest commit was `39e5b19 (HEAD -> main, origin/main) Update agent rules for CornerIQ`.
- Direct `npm run typecheck` and `npm test`: blocked by PowerShell `npm.ps1` execution policy; `cmd /c npm run typecheck` passed.
- Sandboxed `cmd /c npm test` and `cmd /c npm run quality`: failed because Vitest/esbuild could not read `../..` while loading config; escalated reruns passed before edits.
- `cmd /c npm run lint`: passed.
- Sandboxed Supabase CLI failed writing telemetry under `C:\Users\karll\.supabase`; escalated CLI version returned `2.100.1`.
- Baseline migration list: local/remote `001` through `008` aligned.
- Baseline dry run: `Remote database is up to date.`
- Initial live smoke without ignored `.env` loaded failed with missing non-secret variable names `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Ignored `.env` key-name check found all required smoke keys without printing values.
- Baseline live smoke with ignored `.env` loaded: passed with `1` test, test body `12294ms`, duration `14.05s`.
- Pre-push dry run after adding 009: succeeded and reported `009_beta_feedback_reports.sql` would be pushed.
- `cmd /c npm exec supabase -- db push`: applied `009_beta_feedback_reports.sql`.
- Final migration list: local/remote `001` through `009` aligned.
- Final dry run: `Remote database is up to date.`
- Linked type generation command completed and `database.types.ts` includes `beta_feedback_reports`.
- Final `cmd /c npm run typecheck`: passed.
- Final `cmd /c npm test`: passed with `33` files passed, `1` skipped; `329` tests passed, `1` skipped.
- Final `cmd /c npm run quality`: passed with typecheck plus tests; `329` tests passed, `1` skipped.
- Final `cmd /c npm run lint`: passed.
- Final live smoke with ignored `.env` loaded and `CORNERIQ_LIVE_DB_SMOKE=1`: passed with `1` test, test body `12320ms`, duration `14.15s`.
- `git diff --check`: passed with Windows LF-to-CRLF warnings only.
- `git rev-parse HEAD`: `39e5b1960ac743d40ea4b4e0cff45496ea158380`.
- No commit was created in this pass.

Known gaps:
- No production issue triage dashboard yet.
- Feedback reports are user-owned and not admin-reviewed in app.
- No external analytics yet.
- Real boxer beta findings have not been captured yet.
- Routed drilldowns, barcode scanning, full meal planning, detailed food database, numeric load progression, drag/drop calendar, coach UI, and reviewer-clear UI remain deferred.

Next recommendation:
- Run guided boxer beta sessions using `docs/20_BETA_TESTING_AND_FEEDBACK_PLAN.md`, then make a focused polish pass on the highest-friction flows before adding routed drilldowns or heavier features.

## 2026-05-20 23:11 America/Vancouver

Goal summary:
- Harden beta UX / information architecture across Today, Fuel, Train, Plan, and Profile for real boxer beta users.
- Add reusable React Native UI primitives and local screen sections without adding routed drilldowns or domain complexity.
- Improve risk, empty, loading, error, persistence-warning, auto-roll-forward, and review-required copy.
- Keep barcode scanning, full meal planning, detailed food database, coach UI, clinician/reviewer-clear UI, numeric load progression, drag/drop calendar, unsafe weight-cut instructions, and generated sparring/contact prescriptions deferred.

Key changes:
- Added `SectionTabs`, `StatusBadge`, `ActionCard`, `EmptyState`, `RiskBanner`, `TimelineList`, `MetricRow`, and `DisclosureCard` under `src/design/components`.
- Reworked `TodayScreen` so primary action comes first, risk appears before logs, no-shame missing-log copy is visible, persistence warnings are non-fatal, and why copy is behind `DisclosureCard`.
- Reworked `FuelScreen` into Command / History / Reviews / Body Mass sections. Active nutrition reviews remain visible through a top RiskBanner when the athlete leaves Command/Reviews.
- Reworked `TrainScreen` into Today / Workout / Exercise History / Progression sections. Workout detail remains expandable, future generated sessions remain date-scoped, and protected workout logging stays manual.
- Reworked `PlanScreen` into Week / Next Week / Block History / Adjustments sections. Next-week preview actions remain service-owned, blocked/review-required states stay visible, and adjustment controls moved out of the week cards.
- Reworked `ProfileScreen` into Athlete / Settings / Data / Audit sections. DELETE-gated data controls remain hard to trigger; cycle privacy and Fuel review audit copy are visible.
- Improved startup/error copy in `App.tsx`, `AppErrorState`, and `NeedsProfileState`, including missing-env and stack-sanitized retry copy.
- Added `docs/19_BETA_READINESS_AND_INFORMATION_ARCHITECTURE.md`.

Command results:
- Baseline `git status`: clean working tree; Git warned it could not read `C:\Users\karll/.config/git/ignore`.
- Baseline `git log --oneline --decorate -8`: latest commit was `a71a07c (HEAD -> main, origin/main) Add history panels for Fuel, reviews, body mass, and training`.
- Baseline `cmd /c npm run typecheck`: passed.
- Baseline `cmd /c npm test`: sandboxed Vitest failed with config access denied; outside sandbox passed with `31` files passed, `1` skipped, `315` tests passed, `1` skipped.
- Baseline `cmd /c npm run quality`: sandboxed quality failed for the same Vitest access issue; outside sandbox passed with `315` tests passed, `1` skipped.
- Baseline `cmd /c npm run lint`: passed.
- Supabase CLI version: sandboxed run failed writing telemetry under `C:\Users\karll\.supabase`; outside sandbox returned `2.100.1`.
- Migration list: local/remote `001` through `008` aligned.
- Dry run: `Remote database is up to date.`
- Initial smoke without loaded `.env`: failed with missing non-secret variable names `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Ignored `.env` variable-name check found all required smoke variable names without printing values.
- Baseline live smoke with ignored `.env` loaded and `CORNERIQ_LIVE_DB_SMOKE=1`: passed with `1` test, test body `13807ms`, duration `15.34s`.
- Post-edit typecheck first failed with JSX `>` escaping issue in `ProfileScreen`; fixed and reran successfully.
- Post-edit tests first failed two section-related assertions in `appShell.test.ts`; fixed assertions to press section tabs.
- Final `cmd /c npm run typecheck`: passed.
- Final `cmd /c npm test`: passed with `31` files passed and `1` skipped; `318` tests passed and `1` skipped.
- Final `cmd /c npm run quality`: passed with typecheck plus tests; `318` tests passed and `1` skipped.
- Final `cmd /c npm run lint`: passed.
- Final migration list: local/remote `001` through `008` aligned.
- Final dry run: `Remote database is up to date.`
- Final live smoke with ignored `.env` loaded and `CORNERIQ_LIVE_DB_SMOKE=1`: passed with `1` test, test body `13208ms`, duration `15.15s`.
- `git diff --check`: passed with Windows LF-to-CRLF warnings only.
- `git rev-parse HEAD`: `a71a07cbc516e3474d853130696c7a007fb03de8`.
- No commit was created in this pass.

Known gaps:
- Real boxer beta user testing is still needed for Today/Fuel/Train/Plan/Profile IA.
- Mobile UX polish remains needed for quick logs, workout completion, and plan adjustments.
- Routed drilldowns are still deferred for histories/audits.
- Barcode scanning, full meal planning, detailed food database, numeric load progression, drag/drop calendar, coach UI, and clinician/reviewer workflows remain deferred.

Next recommendation:
- Run guided boxer beta tests against the sectioned flows before adding routed drilldowns. Keep the deferred product complexity out until the beta IA proves what needs more space.

## 2026-05-20 12:36 America/Vancouver

Goal summary:
- Create dedicated view-model-driven history/detail surfaces for nutrition safety reviews, manual Fuel history, body-mass trajectory, exercise history, and training block history.
- Load bounded nutrition safety review event history without adding reviewer-clear behavior.
- Improve Fuel, body-mass, exercise, and block explainability while keeping business logic in engine/view-model modules.
- Keep barcode scanning, full meal planning, detailed food database, coach UI, clinician UI, unsafe review clearing, and new migrations deferred.

Key changes:
- Added `nutritionReviewHistoryViewModel` and `NutritionReviewHistoryPanel` with active review cards, hard-stop counts, review event timeline, future-only reviewer-clear copy, and `canSelfClear: false`.
- Added `listNutritionSafetyReviewEvents` and `listRecentNutritionSafetyReviewEvents` to the Supabase repository, plus `loadNutritionSafetyReviewHistory` as a lightweight service.
- Loaded recent review events through `loadAthleteJourney` and carried them through `NutritionState`, `AthleteJourney`, schemas, and `FuelViewModel`.
- Enhanced `fuelHistoryViewModel` with last-7-day grouped manual food/hydration history, high fuel-demand session links, fight-week markers, hydration consistency, and non-shaming missing-data copy.
- Added `FuelHistoryPanel` and `BodyMassTrajectoryPanel` to Fuel, plus deeper `bodyMassTrajectoryViewModel` fields for 14-day history, trend confidence, weigh-in countdown, target gap, cycle scale-noise window, risk explanation, next safe actions, and review action visibility.
- Enhanced `exerciseHistoryViewModel` and `ExerciseHistoryPanel` with grouped exercise names, completed/partial/prescribed-only counts, pain flags, recent RPE, top pain-flagged/repeated exercises, and no numeric progression inference from free-text load notes.
- Enhanced `TrainingBlockHistoryPanel` through `planViewModel` grouped weeks, preview/materialization status, materialized generated-session counts, adjustments, timeline event groups, and engine-owned/screen-nonmutation copy.

Command results:
- Baseline `git status`: clean working tree before implementation; Git warned it could not read `C:\Users\karll/.config/git/ignore`.
- Baseline `git log --oneline --decorate -8`: latest commit was `70eaf5a (HEAD -> main, origin/main) Add nutrition safety review lifecycle and fuel history`; prompt latest known commit was `ad3357b`.
- Direct `npm run typecheck`: blocked by PowerShell `npm.ps1` execution policy; `cmd /c npm run typecheck` passed.
- Baseline `cmd /c npm test`: sandboxed Vitest failed with config access denied; outside sandbox passed with `29` files passed, `1` skipped, `304` tests passed, `1` skipped.
- Baseline `cmd /c npm run quality`: sandboxed quality failed for the same Vitest access issue; outside sandbox passed with `304` tests passed, `1` skipped.
- Baseline `cmd /c npm run lint`: passed.
- Supabase CLI version: `2.100.1`.
- Migration list: local/remote `001` through `008` aligned.
- Dry run: `Remote database is up to date.`
- Initial live smoke without loading `.env`: failed before live assertions with missing non-secret variable names `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Ignored `.env` contained required smoke variable names when checked by name only, without printing values.
- Baseline live smoke with ignored `.env` loaded and `CORNERIQ_LIVE_DB_SMOKE=1`: passed with `1` test, test body `12314ms`, duration `13.83s`.
- Targeted `src/tests/app/appShell.test.ts`: passed with `61` tests after assertion fixes.
- Final `cmd /c npm run typecheck`: passed.
- Final `cmd /c npm test`: passed with `31` files passed and `1` skipped; `315` tests passed and `1` skipped.
- Final `cmd /c npm run quality`: passed with typecheck plus tests; `315` tests passed and `1` skipped.
- Final `cmd /c npm run lint`: passed.
- Final migration list: local/remote `001` through `008` aligned.
- Final dry run: `Remote database is up to date.`
- Final live smoke with ignored `.env` loaded and `CORNERIQ_LIVE_DB_SMOKE=1`: passed with `1` test, test body `12772ms`, duration `15.10s`.
- `git diff --check`: passed with Windows LF-to-CRLF warnings only.
- `git rev-parse HEAD`: `70eaf5ad4e27521be5bdb44ff24dd643ccd13542`.
- No commit was created in this pass.

Known gaps:
- No permissioned clinician, dietitian, admin, or coach reviewer UI yet.
- No reviewer assignment, reviewer-note, clinician/coach messaging, or exposed reviewer-clear workflow yet.
- History/detail surfaces are panels inside Fuel/Train/Plan, not routed screens.
- Manual food logging is more explainable but still basic; no barcode scanner, full meal-planning system, or detailed food database.
- Nutrition command snapshots still persist through `nutrition_targets.target_payload`; no dedicated command snapshot table exists.
- Numeric load progression, coach UI, production coach audit policy, team memberships, scheduled/background roll-forward, and calendar drag/drop remain deferred.

Next recommendation:
- Add routed history drill-downs only if navigation/IA is ready, or start the permissioned reviewer workflow after coach/clinician relationship policy is safe. Keep barcode scanning, full meal planning, detailed food database, and reviewer-clear UI deferred until those boundaries are explicit.

## 2026-05-20 11:51 America/Vancouver

Goal summary:
- Add additive migration 008 for persisted nutrition safety reviews and review events.
- Persist review-required Fuel states from service requests and engine resolution.
- Let athletes request or acknowledge reviews while keeping all hard stops active.
- Load active reviews into AthleteJourney and Fuel view models.
- Add manual Fuel History and Body Mass Trajectory panels without barcode scanning, meal planning, or unsafe cut language.
- Extend live smoke to verify the new review tables and manual history projections.

Key changes:
- Added `008_nutrition_safety_reviews.sql` with `nutrition_safety_reviews`, `nutrition_safety_review_events`, owner RLS, constraints, indexes, updated-at trigger, comments, and no reviewer write policy.
- Added `nutritionSafetyReviewTypes` and `nutritionSafetyReviewRepository` with Zod validation, idempotent upsert, active/history listing, acknowledgement, event append, and non-hard-stop supersession.
- Updated `requestNutritionSafetyReview` to persist review row, review event, and `NutritionSafetyReviewRequested` journey event; acknowledgement appends an event but cannot clear a review.
- Updated `resolveAndPersistPerformanceState` to persist required review states and return ready state with a persistence warning if review persistence fails after engine resolution.
- Loaded active reviews through `loadAthleteJourney`; Fuel command logic keeps active hard stops alive and shows active persisted review status.
- Added Fuel UI request/acknowledge actions, review history/status copy, hard-stop-remains copy, and no-clear copy.
- Added `fuelHistoryViewModel` and `bodyMassTrajectoryViewModel` plus Fuel cards.
- Extended live smoke with manual food history, body-mass trajectory, benign persisted review request, review event, journey event, acknowledgement, unsafe-term scan, and cleanup.

Command results:
- Baseline `git status --short`: clean before implementation; Git warned it could not read `C:\Users\karll/.config/git/ignore`.
- Baseline `git log --oneline --decorate -8`: latest commit `ad3357b (HEAD -> main, origin/main) Update CornerIQ agent guidance and workflow rules`.
- Direct `npm run typecheck`: blocked by PowerShell `npm.ps1` execution policy; `cmd /c npm run typecheck` passed.
- Baseline `cmd /c npm test`: sandboxed Vitest failed with config access denied; outside sandbox passed with `27` files passed, `1` skipped, `280` tests passed, `1` skipped.
- Baseline `cmd /c npm run quality`: sandboxed quality failed for the same Vitest access issue; outside sandbox passed.
- Baseline `cmd /c npm run lint`: passed.
- Supabase CLI version: `2.100.1`.
- Baseline migration list/dry-run: `001` through `007` aligned and remote DB up to date.
- `cmd /c npm exec supabase -- db push --dry-run`: after adding 008, passed and reported 008 would be pushed.
- `cmd /c npm exec supabase -- db push`: applied `008_nutrition_safety_reviews.sql`.
- `cmd /c npm exec supabase -- gen types typescript --linked > src\services\supabase\database.types.ts`: completed; generated file was normalized back to UTF-8.
- Targeted review/repository/persistence/view-model tests: `70` tests passed across `5` files.
- Targeted `src/tests/app/appShell.test.ts`: `57` tests passed.
- Targeted smoke/repository gating tests: `35` tests passed and live smoke skipped without env.
- Final `cmd /c npm run typecheck`: passed.
- Final `cmd /c npm test`: passed with `29` files passed and `1` skipped; `304` tests passed and `1` skipped.
- Final `cmd /c npm run quality`: passed with `304` tests passed and `1` skipped.
- Final `cmd /c npm run lint`: passed.
- Final migration list: local/remote `001` through `008` aligned.
- Final dry run: `Remote database is up to date.`
- Final live smoke with ignored `.env` and `CORNERIQ_LIVE_DB_SMOKE=1`: passed with `1` test, test body `12366ms`.
- `git diff --check`: passed with Windows LF-to-CRLF warnings only after trimming the generated types EOF.
- `git rev-parse HEAD`: `ad3357bc67e28c2a043800aac8be52213834ad57`.
- No commit was created in this pass.

Known gaps:
- No permissioned reviewer UI, reviewer assignment flow, clinician/dietitian messaging, or exposed reviewer-clear workflow yet.
- Hard stops remain active after request and acknowledgement.
- Food history remains manual/basic; no barcode scanner, full meal planning, or detailed food database.
- Nutrition command snapshots still persist through `nutrition_targets.target_payload`; no dedicated command snapshot table exists.
- Coach UI, production coach audit policy, team memberships, background roll-forward, numeric load progression, and routed drill-downs remain deferred.

Next recommendation:
- Build the future permissioned reviewer workflow only after coach/clinician relationship policy is safe, or deepen manual food history while keeping barcode scanning and meal planning deferred.

## 2026-05-20 11:08 America/Vancouver

Goal summary:
- Build a boxing-specific Fuel / Weight-Class Command Center.
- Keep nutrition, body-mass, fight-week, tournament, cycle, readiness, and safety logic in deterministic engine modules.
- Surface athlete-readable fuel actions before raw data.
- Persist the fuel command audit through existing tables without adding unsafe weight-cut guidance.
- Add a safety-review request skeleton without allowing self-clear.

Key changes:
- Added `fuelCommandTypes` and `fuelCommandEngine` with command center, weight-class status, fight-week plan, rehydration checklist, tournament plan, nutrition safety review, and decision stack.
- Integrated Fuel command outputs into `NutritionState` and `FuelViewModel`.
- Updated Fuel screen and added `FuelCommandCards` so primary action, safety review, weight-class status, session fuel, actual intake, hydration, fight-week/tournament/rehydration, quick logs, and recent logs render in that order.
- Added `requestNutritionSafetyReview` service plus `NutritionSafetyReviewRequested` journey event type/schema. The service records review need but does not clear hard stops.
- Reused existing `nutrition_targets.target_payload` for command snapshot persistence; no `008` migration was added.
- Extended live smoke to verify persisted nutrition target payload includes command center/weight-class status and excludes tested unsafe terms.
- Added `docs/18_NUTRITION_WEIGHT_CLASS_LIFECYCLE.md`.

Command results:
- Baseline direct `npm run typecheck`: blocked by PowerShell `npm.ps1` execution policy; `cmd /c npm run typecheck` passed.
- Baseline `cmd /c npm test`: sandboxed Vitest failed with config access denied; outside sandbox passed with `258` tests passed and `1` skipped.
- Baseline `cmd /c npm run quality`: sandboxed quality failed for the same Vitest access issue; outside sandbox passed.
- Baseline `cmd /c npm run lint`: passed.
- Supabase CLI version: `2.100.1`.
- Supabase migration list: local/remote `001` through `007` aligned.
- Supabase dry run: `Remote database is up to date.`
- Initial live smoke without loading `.env`: failed before assertions with missing non-secret variable names `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`; ignored `.env` contained required smoke variable names without printing values.
- Baseline live smoke with ignored `.env` loaded: passed, `1` test, test body `10882ms`.
- Targeted `fuelCommandEngine` test: after two assertion/priority fixes, passed with `15` tests.
- Targeted Fuel UI, review service, and persistence tests: passed with `73` tests.
- Final `cmd /c npm test`: passed with `27` files passed and `1` skipped; `280` tests passed and `1` skipped.
- Final `cmd /c npm run quality`: passed with `27` files passed and `1` skipped; `280` tests passed and `1` skipped.
- Final `cmd /c npm run lint`: passed.
- Final `cmd /c npm run smoke:live-db` with ignored `.env` and `CORNERIQ_LIVE_DB_SMOKE=1`: passed with `1` test, test body `11139ms`.
- Final Supabase migration list/dry-run: `001` through `007` aligned and remote DB up to date.
- `git diff --check`: passed with Windows LF-to-CRLF warnings only.
- Secret/service-role scan across app/hooks/engine/services/docs excluding tests: no secret values; matches were documented variable names and Edge Function boundary docs only.
- `git rev-parse HEAD`: `8aed0880cf14cdd9ea279ce35d68c194f4c9a36a`.
- No commit was created in this pass.

Known gaps:
- Dedicated nutrition-command audit tables were deferred; command snapshots use `nutrition_targets`.
- Safety review is a request skeleton only; no clinician/coach messaging or cleared-status workflow.
- Food logging remains manual/basic; no barcode scanning, full meal planning, detailed food database, or nutrition drill-down.
- Coach UI, production coach audit logging/admin/team policy, numeric load progression, and scheduled/background roll-forward remain deferred.

Next recommendation:
- Build a permissioned nutrition safety-review lifecycle after coach/clinician permissions are ready, or deepen manual food logging history while keeping barcode scanning and meal planning deferred.

## 2026-05-20 10:31 America/Vancouver

Goal summary:
- Implement safe automatic week-boundary roll-forward for accepted next-week previews.
- Keep roll-forward service-owned, idempotent, safety-gated, and refresh-loop protected.
- Surface roll-forward status in Plan without moving programming logic into screens.
- Verify future materialized sessions stay date-scoped for Train/Plan.
- Harden coach approval deployment/audit documentation and testable policy helpers while keeping coach UI hidden.

Key changes:
- Added `src/services/training/autoRollForwardTrainingPlan.ts` with statuses `not_needed`, `materialized`, `blocked`, and `error`, plus `shouldRefreshState`, generated session ids, day-plan ids, timeline id, warnings, review approvals, test boundary override, and handled-preview loop protection.
- Added `src/hooks/useAutoRollForward.ts` and integrated it into `usePerformanceState`; materialized auto roll-forward refreshes once, repeated stale-preview attempts are guarded, blocked/error states are non-fatal messages, and existing engine state remains visible.
- Updated `resolveAndPersistPerformanceState` so due accepted previews are not superseded before the auto policy can materialize them during the boundary refresh.
- Updated `materializeNextWeekTrainingPlan` timeline payload ordering and journey audit append so auto materialization writes `autoRollForward: true`, `source: auto_roll_forward`, `reason`, `previewId`, `weekIndex`, and `generatedSessionCount`.
- Added Plan roll-forward fields/copy: accepted waiting, eligible, materialized, blocked, not available, boundary date, accepted preview status, and last auto-roll-forward message.
- Extended Train/Plan tests for future materialized sessions, same-date detail building, Plan future support display, and duplicate generated-session merge behavior.
- Extracted `approve-coach-relationship/policy.ts`, kept `index.ts` as a thin Deno wrapper, and added `README.md` with deploy/local/env/security/revocation/limitations docs.
- Extended live smoke to use `autoRollForwardTrainingPlan`, prove pre-boundary non-materialization, smoke-only boundary materialization, `autoRollForward` timeline payload, and no duplicate materialization on a second call.

Command results:
- Baseline direct `npm run typecheck`: blocked by PowerShell `npm.ps1` execution policy; `cmd /c npm run typecheck` passed.
- Baseline `cmd /c npm test`: sandboxed Vitest failed with config access denied; outside sandbox passed with `240` tests passed and `1` skipped.
- Baseline `cmd /c npm run quality`: sandboxed quality failed for the same Vitest access issue; outside sandbox passed.
- Baseline `cmd /c npm run lint`: passed.
- Supabase CLI version: `2.100.1`.
- Supabase migration list: local/remote `001` through `007` aligned.
- Supabase dry run: `Remote database is up to date.`
- Initial live smoke without loading `.env`: failed before assertions with missing non-secret variable names `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`; ignored `.env` contained required smoke variable names without printing values.
- Baseline live smoke with ignored `.env` loaded: passed, `1` test.
- Targeted auto/hook/UI/coach/materialization tests: after fixture/static-test fixes, passed with `103` tests.
- Targeted Plan view-model test: passed with `7` tests after fixture strategy correction.
- Final `cmd /c npm run typecheck`: passed.
- Final `cmd /c npm run lint`: passed.
- Final `cmd /c npm test`: passed with `25` files passed and `1` skipped; `258` tests passed and `1` skipped.
- Final `cmd /c npm run quality`: passed with `25` files passed and `1` skipped; `258` tests passed and `1` skipped.
- Final `cmd /c npm run smoke:live-db` with ignored `.env` and `CORNERIQ_LIVE_DB_SMOKE=1`: passed with `1` test, test body `12284ms`.
- `git diff --check`: passed with Windows LF-to-CRLF warnings only.
- Service-role scan in app/hooks/engine/services excluding tests: no matches.
- Smoke credential scan: no credential values; matches were ordinary auth password references plus docs saying smoke secrets were not printed.
- `git rev-parse HEAD`: `21aeeb3d2b3b0f830347856d1263ffc68a9ea8ee`.
- No commit was created in this pass.

Known gaps:
- Numeric load progression remains deferred until structured load fields exist.
- Coach UI remains hidden.
- Coach approval still needs production audit logging, deployed function tests, admin/team policy, and athlete-facing consent copy.
- Team memberships, calendar drag/drop polish, scheduled/background roll-forward, and routed history drill-downs remain deferred.
- Generated-session template depth is intentionally conservative.

Next recommendation:
- Add production audit/deployment coverage for coach approval and decide whether app-refresh auto roll-forward should later be supplemented by a scheduled server job.

## 2026-05-20 09:37 America/Vancouver

Goal summary:
- Materialize accepted next-week previews into future generated support sessions safely.
- Keep generated support boxing-specific, non-contact, deterministic, and conservative under safety pressure.
- Surface materialization status and generated-session counts in Plan/Train without showing future work early.
- Harden the coach approval Edge Function boundary while keeping coach UI hidden.
- Extend live smoke and update auditor docs for ChatGPT.

Key changes:
- Added `nextWeekGeneratedSessionEngine` with strategy-aware support mappings for progress, repeat, reduce, deload, taper, tournament conserve, and hold-for-review.
- Updated `materializeNextWeekTrainingPlan` to persist generated sessions at the week boundary, return `generatedSessionIds`, include `generatedSessionCount` in timeline events, and avoid marking previews materialized if generated-session persistence fails.
- Updated generated-session repository mapping so materialization can attach preview/smoke metadata while preserving deterministic upsert keys.
- Merged persisted generated sessions into the training plan by planned date so future sessions do not appear as today's work until their date.
- Updated Plan and Train view models/screens to show materialization status, generated-session counts, materialized summaries, and clearer block/exercise history groupings.
- Hardened `approve-coach-relationship` with method checks, payload validation, Bearer JWT requirement, Supabase Auth caller verification, athlete-only pending approval, sanitized permissions, and safe JSON responses.
- Added `docs/17_COACH_TEAM_PERMISSIONS.md`.
- Extended live smoke to accept a preview, materialize at a smoke-only boundary override, verify future generated sessions and `generatedSessionCount`, and clean up only smoke-created or smoke-touched rows.

Command results:
- Baseline `git log --oneline --decorate -8`: latest commit was `1689c57` (`Persist next-week previews and add materialization flow`), while the prompt's latest known commit was `ccba81c`.
- Baseline `cmd /c npm run typecheck`: passed.
- Baseline `cmd /c npm test`: passed outside sandbox with `222` tests passed and `1` skipped.
- Baseline `cmd /c npm run quality`: passed outside sandbox.
- Baseline `cmd /c npm run lint`: passed.
- `cmd /c npm exec supabase -- --version`: passed with CLI `2.100.1`.
- `cmd /c npm exec supabase -- migration list`: passed; local/remote `001` through `007` aligned.
- `cmd /c npm exec supabase -- db push --dry-run`: passed and reported `Remote database is up to date.`
- Targeted test command for new engine/service/UI/static checks: passed with `97` tests.
- Final `cmd /c npm run typecheck`: passed.
- Final `cmd /c npm test`: passed with `23` files passed and `1` skipped; `240` tests passed and `1` skipped.
- Final `cmd /c npm run quality`: passed with `23` files passed and `1` skipped; `240` tests passed and `1` skipped.
- Final `cmd /c npm run lint`: passed after removing one unused type import.
- Ignored `.env` loaded into process with `CORNERIQ_LIVE_DB_SMOKE=1`; extended `cmd /c npm run smoke:live-db`: passed with `1` test passed, test body `11380ms`.
- `git diff --check`: passed with Windows LF-to-CRLF warnings only.
- `git rev-parse HEAD`: `1689c5752a4e4a95128db0647a38937ac01089bd`.
- No commit was created in this pass.

Known gaps:
- Numeric load progression remains deferred until structured load fields exist.
- Coach UI remains hidden.
- Coach approval needs production audit logging, deployed function tests, admin/team policy, and athlete-facing consent copy.
- Team memberships, calendar drag/drop polish, automatic background roll-forward, and routed history drill-downs remain deferred.
- Generated-session template depth is intentionally conservative.

Next recommendation:
- Add production audit/deployment coverage for coach approval, choose the automatic week-boundary roll-forward trigger, and deepen block/exercise history routes without moving programming logic into screens.

## 2026-05-20 01:09 America/Vancouver

Goal summary:
- Persist next-week training previews in Supabase.
- Add accept/materialize service boundaries without mutating current week early.
- Add Plan accept-preview UI skeleton through service/hook.
- Add trusted server-side coach approval skeleton while keeping coach UI hidden.
- Improve block history and exercise history grouping.
- Apply and verify additive Supabase migration 007 remotely.

Key changes:
- Added `007_training_next_week_previews.sql` with owner RLS, lifecycle status, preview payload, hashes, constraints, indexes, and timeline event type extension.
- Regenerated `src/services/supabase/database.types.ts` after applying 007.
- Added `trainingNextWeekPreviewRepository` with Zod payload validation and explicit preview/accepted/materialized/superseded lifecycle methods.
- Updated `resolveAndPersistPerformanceState` to persist next-week previews idempotently after weekly summary/progression persistence and return ready state with a warning if only preview persistence fails.
- Added `nextWeekPreviewToMicrocycle` and `materializeNextWeekTrainingPlan` service for safe accept/materialize behavior.
- Added `useNextWeekPreviewActions` and Plan buttons/copy for accepting previews and boundary materialization.
- Added `approve-coach-relationship` Edge Function skeleton that reads service role from function env only and rejects activation until production authorization is implemented.
- Improved block-history and exercise-history panels with grouped headings and empty-state/no-fake-progression copy.
- Extended live smoke to verify preview row persistence, accept-preview action, pre-boundary non-materialization, and tagged cleanup.

Command results:
- `cmd /c npm run typecheck`: passed during implementation.
- `cmd /c npm test`: after fixing new test failures, passed with `22` files passed and `1` skipped; `222` tests passed and `1` skipped.
- `cmd /c npm exec supabase -- db push --dry-run`: before push, passed and reported only `007_training_next_week_previews.sql`; after push, passed and reported `Remote database is up to date.`
- `cmd /c npm exec supabase -- db push`: applied `007_training_next_week_previews.sql`.
- `cmd /c npm exec supabase -- migration list`: passed after push; `001` through `007` aligned local/remote.
- `cmd /c npm exec supabase -- gen types typescript --linked > src\services\supabase\database.types.ts`: passed; generated file was normalized from UTF-16 to UTF-8.
- Ignored `.env` loaded into process with `CORNERIQ_LIVE_DB_SMOKE=1`; extended `cmd /c npm run smoke:live-db`: first failed due a test JSON-level assertion, rerun passed with `1` test passed.
- No commit was created in this pass; current `git rev-parse HEAD` remained `ccba81c712b1d982a8bffac45d29e4a680c7d925`.

Known gaps:
- Future generated session materialization from preview summaries is deferred.
- Coach approval function is a skeleton and not production-authorized.
- Coach UI remains hidden.
- Numeric load progression, team memberships, routed history drill-downs, and calendar polish remain deferred.

Next recommendation:
- Add real server-side authorization/consent checks to coach approval, then decide how accepted previews roll forward at week boundary and whether safe generated support summaries should become generated session objects.

## 2026-05-20 00:20 America/Vancouver

Goal summary:
- Materialize persisted progression decisions into read-only next-week programming shape.
- Add block history detail and exercise history panels without putting business logic in screens.
- Begin Supabase coach/team relationship modeling safely, with no exposed coach UI.
- Harden plan adjustment permissions around active coach relationships or trusted test flags.
- Apply and verify additive Supabase migration 006 remotely.

Key changes:
- Added `nextWeekMaterializationEngine` and `NextWeekTrainingMaterialization` types.
- Wired `TrainingState.nextWeekMaterialization` and `PlanViewModel.nextWeekPreview`.
- Recomputed next-week materialization after week-summary/progression persistence so the preview uses the latest persisted decision.
- Added `TrainingBlockHistoryPanel` on Plan with active block summary, week summaries, progression decisions, timeline events, adjustment events, safety flags, and latest preview context.
- Added `exerciseHistoryViewModel` and `ExerciseHistoryPanel` on Train with recent exercise results, status counts, pain flags, RPE values, strength summary, repeated exercise, and free-text load caution.
- Added `006_coach_team_relationships.sql` with `athlete_coach_relationships`, participant read RLS, athlete pending requests, participant revoke-only updates, indexes, and comments requiring trusted server-side activation for active coach status.
- Added `coachRelationshipRepository` and optional repository wiring.
- Hardened `applyTrainingPlanAdjustmentService` so coach actors require an active relationship lookup or `trustedActor`; athlete/default actors still cannot perform coach-only commands.
- Extended live smoke with a safe RLS read of coach relationships for the signed-in athlete.

Command results:
- `cmd /c npm run typecheck`: passed.
- `cmd /c npm test`: passed, `19` files passed and `1` skipped; `198` tests passed and `1` skipped.
- `cmd /c npm run quality`: passed, including typecheck plus Vitest; `19` files passed and `1` skipped; `198` tests passed and `1` skipped.
- `cmd /c npm run lint`: passed.
- `cmd /c npm exec supabase -- --version`: passed with CLI `2.100.1`.
- `cmd /c npm exec supabase -- db push --dry-run`: before push, passed and reported only `006_coach_team_relationships.sql` would be pushed; after push, passed and reported `Remote database is up to date.`
- `cmd /c npm exec supabase -- db push`: applied `006_coach_team_relationships.sql`.
- `cmd /c npm exec supabase -- migration list`: passed after push; `001` through `006` aligned local/remote.
- Ignored `.env` loaded into process with `CORNERIQ_LIVE_DB_SMOKE=1`; `cmd /c npm run smoke:live-db`: passed, `1` test passed.
- `git rev-parse HEAD`: `4196ab41c6256d8874e8d55d6586452811d01f5e`; no commit was created in this pass.
- `git status --short`: listed the modified/new files captured in `docs/CODEX_LAST_HANDOFF.md`.
- `git diff --check`: passed with Windows LF-to-CRLF warnings only.
- `rg -n "service_role|SERVICE_ROLE|smoke password|password" docs src supabase`: no service-role key or smoke-password value found; matches were ordinary password UI/test variable references plus tests/docs asserting no service role.

Known gaps:
- Next-week materialization is preview-only; persistence to a `training_next_week_previews` table is deferred.
- Numeric load progression remains intentionally deferred; free-text `loadText` remains notes only.
- Active coach relationship approval requires a future trusted server-side function; coach UI remains hidden.
- `coach_team_memberships` is deferred.
- Block history and exercise history are lightweight panels, not full drill-down navigation.
- Drag/drop calendar polish remains intentionally deferred.

Next recommendation:
- Add optional persisted next-week preview projections with input/output hashes, create a trusted active-coach approval path, and deepen history drilldowns without moving logic into screens.

## 2026-05-19 23:42 America/Vancouver

Goal summary:
- Add persisted multi-week training block progression records.
- Summarize completed training weeks and decide next-week roll-forward conservatively.
- Show an audit-friendly block history on Plan/Profile.
- Add simple athlete/coach/engine actor boundaries for plan adjustments.
- Apply and verify additive Supabase migration 005 remotely.

Key changes:
- Added `005_training_block_weekly_progression.sql` with `training_week_summaries`, `training_progression_decisions`, and `training_block_timeline_events`.
- Regenerated `src/services/supabase/database.types.ts` from the linked remote schema after applying 005.
- Added `trainingBlockHistoryTypes`, `trainingWeekSummaryEngine`, and `trainingRollForwardEngine`.
- Added `trainingProgressionRepository` with Zod validation, idempotent week-summary upsert, idempotent decision insert, append-only timeline events, and latest-week lookup.
- Updated `resolveAndPersistPerformanceState` to persist week summaries, progression decisions, and timeline events after block/microcycle/day-plan persistence.
- Updated block resolution to preserve active block identity and advance `weekIndex` from persisted summaries/decisions instead of always scaffolding `1`.
- Loaded active block history into `AthleteJourney` and projected it into `TrainingState`, Plan view models, and Profile audit summary.
- Added athlete/coach/engine adjustment actors, blocked coach-only commands for athlete/default UI actors, accepted coach actors only through trusted service/test calls, and persisted rejected permission explanations.
- Extended live smoke to verify the new progression tables, actor-scoped adjustment payloads, and scoped cleanup.
- Added `docs/16_TRAINING_BLOCK_LIFECYCLE.md`.

Command results:
- `cmd /c npm run typecheck`: passed.
- `cmd /c npm test`: passed, `17` files passed and `1` skipped; `185` tests passed and `1` skipped.
- `cmd /c npm run quality`: passed, including typecheck plus Vitest; `17` files passed and `1` skipped; `185` tests passed and `1` skipped.
- `cmd /c npm run lint`: passed.
- `cmd /c npm exec supabase -- --version`: passed with CLI `2.100.1`.
- `cmd /c npm exec supabase -- migration list`: passed; `001`, `002`, `003`, `004`, and `005` aligned local/remote after push.
- `cmd /c npm exec supabase -- db push --dry-run`: passed before push and reported 005 would be pushed; passed after push and reported `Remote database is up to date.`
- `cmd /c npm exec supabase -- db push`: applied `005_training_block_weekly_progression.sql`.
- `cmd /c npm exec supabase -- gen types typescript --linked > src\services\supabase\database.types.ts`: passed; generated file was converted to UTF-8 after Windows redirection wrote UTF-16.
- Ignored `.env` loaded into process with `CORNERIQ_LIVE_DB_SMOKE=1`; `cmd /c npm run smoke:live-db`: passed, `1 passed`.
- `git diff --check`: passed; Git printed Windows LF-to-CRLF working-copy warnings only.

Known gaps:
- Progression decisions are persisted and surfaced, but future-week dose/materialization remains conservative and does not infer numeric load changes.
- Block history UI is a simple Plan/Profile audit surface, not a polished timeline detail screen.
- Coach accounts and Supabase coach/team relationships are not implemented; trusted coach actors are service/test only.
- Exercise-history detail screen remains missing.
- Drag/drop calendar polish remains intentionally deferred.

Next recommendation:
- Materialize next-week programming shape from persisted progression decisions, add a block history detail screen, and design the coach/team authorization schema before exposing coach actions in app UI.

## 2026-05-19 22:49 America/Vancouver

Goal summary:
- Persist engine-resolved training blocks, microcycles, and day plans.
- Add safe engine-owned plan adjustment commands.
- Keep screens out of programming logic while exposing a Plan UI command skeleton.
- Apply and verify additive Supabase migration 004 remotely.

Key changes:
- Added `004_training_block_persistence.sql` with `training_blocks`, `training_microcycles`, `training_day_plans`, and `training_plan_adjustments`.
- Regenerated `src/services/supabase/database.types.ts` from linked Supabase after applying 004.
- Added `trainingBlockRepository` with Zod validation, active block lifecycle, idempotent microcycle/day-plan upserts, adjustment insertion, and adjustment supersede support.
- Updated `resolveAndPersistPerformanceState` to persist block/microcycle/day plans after engine resolution and return ready state with warning if persistence fails.
- Added `TrainingBlockStarted`, `TrainingBlockSuperseded`, `TrainingPlanAdjusted`, and `TrainingDeloadRequested` journey event types.
- Added `planAdjustmentTypes`, `planAdjustmentEngine`, and `applyTrainingPlanAdjustmentService`.
- Loaded persisted training plan adjustments into `AthleteJourney` and applied active/requested adjustments during `resolveWeeklyTrainingPlan`.
- Added Plan adjustment audit view-model fields and a simple `PlanAdjustmentControls` UI for protect day, mark unavailable, request deload, restore engine plan, and basic generated-session moves.
- Extended live smoke to verify remote block/microcycle/day-plan persistence and one persisted coach-note adjustment.

Command results:
- `cmd /c npm run typecheck`: passed.
- `cmd /c npm test`: passed, `173 passed | 1 skipped`.
- `cmd /c npm run quality`: passed, `173 passed | 1 skipped`.
- `cmd /c npm run lint`: passed.
- `npm exec supabase -- --version`: passed with CLI `2.100.1`.
- `npm exec supabase -- migration list`: passed; `001`, `002`, `003`, `004` aligned local/remote after push.
- `npm exec supabase -- db push --dry-run`: passed before push and reported 004 would be pushed; passed after push and reported remote DB up to date.
- `npm exec supabase -- db push`: applied `004_training_block_persistence.sql`.
- `npm exec supabase -- gen types typescript --linked > src\services\supabase\database.types.ts`: passed; generated file was converted to UTF-8 after Windows redirection wrote UTF-16.
- `.env` loaded into process with `CORNERIQ_LIVE_DB_SMOKE=1`; `cmd /c npm run smoke:live-db`: passed, `1 passed`.
- `git diff --check`: passed; Git printed Windows LF-to-CRLF working-copy warnings only.

Known gaps:
- `weekIndex` remains scaffolded as `1`; multi-week roll-forward is not implemented.
- Plan adjustment UI is functional but intentionally unpolished; no drag/drop calendar.
- Coach role/permissions are not implemented beyond command actor typing.
- Numeric load progression from free-text loads remains intentionally deferred.

Next recommendation:
- Add persisted multi-week progression roll-forward and block history views, then harden coach/user permissions around adjustment commands before calendar polish.

## 2026-05-19 22:11 America/Vancouver

Goal summary:
- Build the first boxing-specific training block and weekly microcycle engine.
- Use completed sessions and exercise results to influence progression.
- Improve Plan and Train around weekly structure, block context, nutrition handoff, and cycle-aware training decisions.
- Refresh audit documentation for fast ChatGPT review.

Key changes:
- Added `TrainingBlock`, `TrainingMicrocycle`, `WeeklyTrainingStructure`, `TrainingDayPlan`, and block recommendation/progression types.
- Added `trainingBlockEngine` and `microcycleEngine`.
- Integrated block/microcycle/day-plan context into `TrainingState` through `resolveWeeklyTrainingPlan` and `performanceKernel`.
- Added Plan weekly command-center cards and Train block context, day role, fuel handoff, cycle decision, and richer analytics.
- Deepened training analytics from exercise results without inventing numeric load progression from free-text loads.
- Added exercise catalog validation for uniqueness, safety, transfer, substitutions, power quality stops, prohibited terms, and novice Olympic derivative avoidance.
- Clarified workout completion UX: completion controls stay behind detail disclosure, blank rows save as `prescribed_only`, statuses are explained, skip reason uses session notes.

Command results:
- `cmd /c npm run typecheck`: passed.
- `cmd /c npm test`: passed, `155 passed | 1 skipped`.
- `cmd /c npm run quality`: passed.
- `cmd /c npm run lint`: passed.
- `npm exec supabase -- --version`: passed with CLI `2.100.1`.
- `npm exec supabase -- migration list`: passed; `001`, `002`, `003` aligned local/remote.
- `npm exec supabase -- db push --dry-run`: passed; remote DB up to date.
- `.env` loaded into process with `CORNERIQ_LIVE_DB_SMOKE=1`; `cmd /c npm run smoke:live-db`: passed, `1 passed`.

Known gaps:
- Training blocks are not persisted yet.
- `weekIndex` is a first-slice scaffold.
- No block editing, drag/drop, or calendar package.
- Numeric load progression is intentionally not inferred from nonnumeric `loadText`.

Next recommendation:
- Add persistence and lifecycle for engine-resolved training blocks/microcycles, with safe user/coach adjustments and audit history before calendar polish.
