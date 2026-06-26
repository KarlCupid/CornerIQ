# Launch Blocker Register

Audit date: 2026-06-19
Starting commit: `defc80b` (`main`, `origin/main`)
Scope: temporal workout-resolution integrity, previous-week finalization, future-session persistence hygiene, active-week exercise-result loading, manual-log replay cutoffs, active-context replay, accepted-preview replay, and production dependency audit triage.

Loop 1 update: 2026-06-20 from baseline `c1bc4e4d36e46d934e53dbae87dae199f7db524e`, scoped to transactional and resumable generated-workout completion persistence.

This register distinguishes confirmed code evidence from the initial pasted hypothesis list. Items marked `pending audit` are not launch-green.

## Current Register

| ID | Severity | Finding | Evidence | Status |
| --- | --- | --- | --- | --- |
| C-001 | Critical | Generated-workout corrections updated the canonical completion row in place, erasing the earlier status for replay. | Confirmed in `src/services/supabase/trainingRepository.ts`: existing generated-session completion with a different status used `.update(...)` on the same row. Failing test added before fix in `src/tests/services/supabaseRepositories.test.ts`. | Fixed in working tree; targeted tests pass. |
| C-002 | Critical | Normal generated-workout completion defaulted `recordedAt` to midnight from `asOfDate` instead of the real entry timestamp. | Confirmed in `src/services/training/completeWorkoutService.ts`: `defaultRecordedAt` returned `${asOfDate}T00:00:00.000Z`. Failing test added before fix in `src/tests/services/workoutCompletionService.test.ts`. | Fixed in working tree with service-boundary clock injection; targeted tests pass. |
| C-003 | Critical | Completed-to-skipped correction could leave exercise actuals visible in current snapshots. | Confirmed in `src/engine/core/temporalSelectors.ts`: exercise results were filtered by date/recorded cutoff and selected completion ID, but not by the selected parent completion status. Failing replay test added in `src/tests/engine/temporalSelectors.test.ts`. | Fixed in working tree; only exercise actuals linked to the selected `completed` resolution are visible in snapshots. |
| C-004 | Critical hypothesis | Previous-week finalization may be unreachable or unreliable through normal app refresh. | Current code calls `persistDueWeekFinalizations` from `persistTrainingBlockProjection` during `resolveAndPersistPerformanceState`; existing tests covered boundary finalization and partial retry. Added adversarial multi-week unopened refresh test in `src/tests/services/engineResolvePersistence.test.ts`. | Disproved for tested normal refresh paths; targeted tests pass. Concurrency/live DB evidence still pending. |
| C-005 | Critical | Current readiness/fuel/hydration execution overlays leaked into persisted future generated sessions. | Confirmed by failing `src/tests/services/engineResolvePersistence.test.ts`: future `generated_training_sessions.session_payload` contained `readinessGate` and other execution-only fields. | Fixed in working tree with generated-session persistence sanitization; targeted tests pass. |
| C-006 | Critical | A retry after the completion row was written could return `existing_completion` before repairing missing exercise-result rows or the journey event. | Confirmed in `src/services/training/completeWorkoutService.ts`: existing generated-session completions returned before downstream writes. Failing service, repository, and static migration tests were added before the retry ledger/idempotency fix. | Fixed in working tree; targeted tests pass. |
| H-001 | High hypothesis | Oldest same-week progression decision may win when ordering compares only `weekIndex`. | `src/engine/training/trainingHistoryAuthority.ts` ranks active plan revision, week index, lifecycle, generated timestamp, and stable id. Fresh adversarial test added in `src/tests/engine/trainingBlockProgression.test.ts` for same-week same-lifecycle ordering and stale plan revisions. | Disproved for current selector paths; targeted tests pass. |
| H-002 | High | Not all journey collections may pass through a complete as-of snapshot with correct replay semantics. | `buildAthleteJourneySnapshot` filters engine-run inputs. This pass fixed completion/exercise-result revision semantics, risk-flag replay before `resolvedAt`, generatedAt cutoffs for Supabase-loaded hydration/electrolyte/cycle logs, active protected anchors, active fight/tournament/block records, and accepted/materialized next-week preview actions. `PerformanceState.snapshotGeneratedAt` keeps historical cutoffs distinct from normal current-state timestamps. | Fixed for audited local engine/service paths; targeted and full tests pass. Release/staging evidence remains under H-004. |
| H-003 | High | Exercise-result loading was capped by a generic recent-row limit instead of required week/block range. | Confirmed by inspection and failing test: `loadAthleteJourney` called `listRecentExerciseResults(userId)` before active block scope was known. | Fixed in working tree; active-block loads now call `listExerciseResultsForDateRange` for the current week window. |
| H-004 | High | Release CI, live Supabase smoke, and full dependency remediation are not proven for exact candidate. | No remote CI validation has run for the exact launch-integrity candidate yet. Local clean-database evidence exists: Supabase local database start applied every local migration, `migration list --local` showed all local migrations, `db lint --local --level error --fail-on error` passed, generated database types were refreshed from the local schema, and `src/tests/static/supabaseMigrationStatic.test.ts` guards the migration/type contract. A guarded 2026-06-19 remote release pass applied pending migrations `014`, `20260619190201`, and `20260619194631`; follow-up `cmd /c npm exec supabase -- migration list` showed every local migration aligned remotely, `cmd /c npm exec supabase -- db push --dry-run` reported `Remote database is up to date.`, and `cmd /c npm exec supabase -- db lint --linked --level error --fail-on error` passed. `cmd /c npm run smoke:live-db` then failed at sign-in with Supabase `invalid_credentials`, so no live rows-created/cleaned proof exists. `cmd /c npm audit --audit-level=high --omit=dev` exits 0 after overriding `undici` to `6.27.0`, but 17 moderate advisories remain and their published fixes require breaking Expo/React Native upgrades. | Open external/release evidence blocker; remote migrations are aligned, but live smoke needs configured credentials that can sign in and CI/CodeQL must pass on the pushed commit. |
| H-005 | High hypothesis | Actual load may not drive prescription consistently and may contain inferred metrics not supported by actual logs. | `src/engine/training/loadLedger.ts` separates planned and actual ledgers; existing tests cover unresolved planned work, logged exercise sets only, correction lifecycle, and manual hard work reserving future hard-day capacity. Fresh adversarial high-RPE test added in `src/tests/engine/trainingBlockEngine.test.ts`. | Disproved for core local engine paths; live/concurrent release evidence remains under H-004. |
| H-006 | High hypothesis | Legacy plan revision identity may still depend on `asOfDate`. | `src/engine/training/compiledTrainingStateEngine.ts` derives fallback plan revision from the active plan intent or active block start. `src/tests/engine/trainingBlockEngine.test.ts` covers stable fallback revisions inside the same active block and across week boundaries. | Disproved for current engine paths; targeted tests pass. |
| H-007 | High hypothesis | Future generated-session dates may be renumbered after past dates are filtered. | `src/tests/engine/trainingBlockEngine.test.ts` covers future prescription-slot stability as `asOfDate` advances without persisted generated rows, plus explicit move identity through completion. | Disproved for current engine paths; targeted tests pass. |

## Verification In This Pass

- `cmd /c npx vitest run src/tests/services/workoutCompletionService.test.ts src/tests/services/supabaseRepositories.test.ts src/tests/static/supabaseMigrationStatic.test.ts src/tests/services/accountDeletionPolicy.test.ts`: passed after Loop 1 retry ledger, idempotency keys, metadata-key hardening, and docs update, 84 tests.
- `cmd /c npm install`: passed; npm reports the existing audit state of 18 vulnerabilities, 1 low and 17 moderate.
- `cmd /c npm run typecheck`: passed after the final Loop 1 patch.
- `cmd /c npm test`: initially failed because `README.md` still named `20260619194631_generated_session_identity_lifecycle.sql` as the latest migration. README was updated to `20260620000100_workout_completion_retry_integrity.sql`, and the rerun passed, 65 test files and 671 tests, with 1 live smoke test skipped by default.
- `cmd /c npm run lint`: passed after the final Loop 1 patch.
- `cmd /c npm run quality`: passed, including typecheck and the full test suite; 65 test files and 671 tests passed, with 1 live smoke test skipped by default.
- `cmd /c npm run preflight:beta`: passed.
- `cmd /c npm run test:coverage`: passed; statements 90.32, branches 85.34, functions 90.56, lines 90.32.
- `cmd /c npm exec supabase -- migration list --local` and `cmd /c npm exec supabase -- db lint --local --level error --fail-on error`: initially could not connect because local Postgres was not running on `127.0.0.1:54322`. After `cmd /c npm exec supabase -- start --exclude edge-runtime,gotrue,imgproxy,kong,logflare,mailpit,postgres-meta,postgrest,realtime,storage-api,studio,supavisor,vector` and `cmd /c npm exec supabase -- db push --local`, the new migration was applied locally, `migration list --local` showed every local migration through `20260620000100` applied, and local schema lint passed with no errors.
- Failing targeted tests were run before implementation and failed for C-001, C-002, and C-003.
- `cmd /c npx vitest run src/tests/services/workoutCompletionService.test.ts src/tests/services/supabaseRepositories.test.ts src/tests/engine/temporalSelectors.test.ts`: passed after fix, 66 tests.
- `cmd /c npm run typecheck`: passed.
- `cmd /c npx vitest run src/tests/services/engineResolvePersistence.test.ts`: passed, 26 tests.
- `cmd /c npx vitest run src/tests/services/engineResolvePersistence.test.ts`: passed after overlay persistence fix, 27 tests.
- `cmd /c npx vitest run src/tests/services/supabaseRepositories.test.ts`: passed after scoped exercise-result loading fix, 57 tests.
- `cmd /c npm run typecheck`: passed after scoped loading and overlay persistence fixes.
- `cmd /c npm audit fix`: removed the high `undici` advisory but temporarily introduced an unacceptable nested `react-native@0.86.0` resolution; that lockfile shape was not kept.
- Added a narrow package override for `undici@6.27.0`; `cmd /c npm install` then removed the stray nested React Native packages.
- `cmd /c npm ls react-native --all`: passed, resolved React Native remains `0.81.5` throughout the app dependency tree.
- `cmd /c npm ls undici --omit=dev --all`: passed, Expo CLI resolves `undici@6.27.0 overridden`.
- `cmd /c npm audit --audit-level=high --omit=dev`: passed with no high-severity production findings; npm still reports 17 moderate advisories that require breaking `expo@56.0.12` or `react-native@0.86.0` upgrades.
- `cmd /c npm install`: passed after final dependency override; npm reports 18 advisories total, 1 low and 17 moderate.
- `cmd /c npm run typecheck`: passed.
- `cmd /c npm test`: passed, 64 test files passed, 1 skipped; 644 tests passed, 1 skipped.
- `cmd /c npm run lint`: passed.
- `cmd /c npm run quality`: passed, including typecheck and full test suite.
- `cmd /c npm run preflight:beta`: passed.
- `cmd /c npx vitest run src/tests/engine/temporalSelectors.test.ts`: failed before the second Loop 1 selector fix because a skipped current resolution could still expose linked exercise actuals.
- `cmd /c npx vitest run src/tests/services/supabaseRepositories.test.ts src/tests/engine/temporalSelectors.test.ts`: passed after the second Loop 1 fix, 63 tests. Added coverage for skipped-to-completed replay, same-status completed detail corrections, stale correction rejection, and duplicate-key retry after an insert race.
- `cmd /c npm run typecheck`: passed after the second Loop 1 fix.
- `cmd /c npx vitest run src/tests/engine/trainingBlockProgression.test.ts`: passed, 8 tests. Added same-week progression authority ordering coverage.
- `cmd /c npm run typecheck`: passed after the H-001 test addition.
- `cmd /c npx vitest run src/tests/engine/temporalSelectors.test.ts`: failed before the H-002 risk-flag fix because a resolved risk flag was present as `resolved` during a replay before its `resolvedAt` cutoff.
- `cmd /c npx vitest run src/tests/engine/temporalSelectors.test.ts src/tests/engine/performanceKernel.test.ts src/tests/engine/bodyMass.test.ts`: passed after the risk-flag replay fix, 26 tests.
- `cmd /c npm run typecheck`: passed after the H-002 risk-flag replay fix.
- `cmd /c npx vitest run src/tests/engine/temporalSelectors.test.ts src/tests/engine/kernelViewModelsPersistence.test.ts src/tests/services/supabaseRepositories.test.ts`: passed after hydration/electrolyte/cycle replay timestamp mapping, 72 tests.
- `cmd /c npm run typecheck`: passed after hydration/electrolyte/cycle replay timestamp mapping.
- `cmd /c npx vitest run src/tests/engine/temporalSelectors.test.ts src/tests/services/supabaseRepositories.test.ts src/tests/engine/performanceKernel.test.ts`: passed after active fight/tournament/block and protected-anchor replay filtering, 81 tests.
- `cmd /c npx vitest run src/tests/services/materializeNextWeekTrainingPlan.test.ts src/tests/services/autoRollForwardTrainingPlan.test.ts src/tests/engine/temporalSelectors.test.ts src/tests/services/supabaseRepositories.test.ts`: passed after accepted-preview lifecycle replay filtering, 87 tests.
- `cmd /c npm run typecheck`: passed after active-context and accepted-preview replay fixes.
- `cmd /c npx vitest run src/tests/engine/trainingBlockEngine.test.ts`: passed, 53 tests. Added high-RPE actual-load adaptation coverage without fabricated sets or intervals; same suite covers stable fallback plan revisions and future prescription-slot identity.
- `cmd /c npm run typecheck`: passed after the H-005 test addition.
- `cmd /c npm install`: passed in final full gate; npm reports 18 advisories total, 1 low and 17 moderate.
- `cmd /c npm run typecheck`: passed in final full gate.
- `cmd /c npm test`: passed in final full gate, 65 test files passed, 1 skipped; 664 tests passed, 1 skipped.
- `cmd /c npm run lint`: passed in final full gate.
- `cmd /c npm run quality`: passed in final full gate, including typecheck and full test suite; 664 tests passed, 1 skipped.
- `cmd /c npm run preflight:beta`: passed in final full gate.
- `cmd /c npm run test:coverage`: passed in final full gate; statements 90.22, functions 90.51, lines 90.22, branches 85.38.
- `cmd /c npm audit --audit-level=high --omit=dev`: passed in final full gate with no high-severity production findings; npm still reports 17 moderate advisories that require breaking Expo/React Native upgrades.
- `cmd /c npm ls react-native --all`: passed; React Native remains `0.81.5` throughout the app dependency tree.
- `cmd /c npm ls undici --omit=dev --all`: passed; Expo CLI resolves `undici@6.27.0 overridden`.
- `cmd /c npx vitest run src/tests/scripts/releaseQualityGate.test.ts src/tests/scripts/releaseEvidenceCollector.test.ts src/tests/static/supabaseMigrationStatic.test.ts src/tests/docs/productionQualityAudit.test.ts src/tests/docs/betaReleaseOperations.test.ts src/tests/docs/betaReleaseCandidateChecklist.test.ts src/tests/static/betaReleaseConfigStatic.test.ts`: passed, 7 files and 30 tests. Added release-quality coverage that fails if Supabase evidence omits any local migration file or clean local/staging schema validation.
- `cmd /c node scripts/collect-release-evidence-input.mjs` with `CORNERIQ_ALLOW_REMOTE_DB_PUSH=1`: applied pending remote migrations before final verification.
- `cmd /c npm exec supabase -- migration list`: passed after guarded remote push; every local migration through `20260619194631` is aligned remotely.
- `cmd /c npm exec supabase -- db push --dry-run`: passed after guarded remote push; reported `Remote database is up to date.`
- `cmd /c npm exec supabase -- start --exclude edge-runtime,gotrue,imgproxy,kong,logflare,mailpit,postgres-meta,postgrest,realtime,storage-api,studio,supavisor,vector`: passed; local database startup applied migrations `001` through `014`, `20260619190201`, and `20260619194631`.
- `cmd /c npm exec supabase -- migration list --local`: passed; local migration history showed every local migration through `20260619194631`.
- `cmd /c npm exec supabase -- db lint --local --level error --fail-on error`: passed with no schema errors after local database startup.
- `cmd /c npm exec supabase -- gen types typescript --local`: passed; regenerated `src/services/supabase/database.types.ts` from the clean local schema.
- `cmd /c npx vitest run src/tests/static/supabaseMigrationStatic.test.ts`: passed, 6 tests. Added static launch migration/type/RLS-Data-API guard coverage.
- `cmd /c npm exec supabase -- db lint --linked --level error --fail-on error`: passed after remote migration alignment.
- `cmd /c npm run smoke:live-db`: failed with Supabase `invalid_credentials`; live smoke remains blocked until the configured smoke email/password pair signs in successfully.
- `cmd /c npm run release:evidence`: passed and generated ignored artifact `qa-artifacts/release-evidence/current-release-evidence.md`.
- `cmd /c npm run release:evidence`: passed and generated ignored artifact `qa-artifacts/release-evidence/current-release-evidence.md` with local command, coverage, local schema validation, and external blocker rows.
- `cmd /c npm run release:quality`: failed as expected because exact Quality/CodeQL run evidence and live smoke are unresolved for this candidate.
- `git diff --check`: passed; output only line-ending warnings for modified files.

## Next Audit Targets

1. Push the branch, wait for remote CI/CodeQL evidence, and rerun explicit live Supabase smoke after supplying a valid confirmed smoke account.
2. Plan a framework upgrade path for the remaining moderate dependency advisories; do not force-upgrade Expo/React Native inside this launch-integrity fix pass.
3. Continue adversarial engine audits for input-order permutation and legacy timestamp fallbacks, but no open local high finding remains from the initial H-002 scope.
