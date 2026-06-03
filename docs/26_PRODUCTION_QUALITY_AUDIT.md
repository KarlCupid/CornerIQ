# Production Quality Audit

Date: 2026-06-03

Scope: in-scope production-quality readiness for CornerIQ code, tests, docs, local QA, safety posture, release gates, persistence, feedback, UX comprehension, observability, and liability boundaries. Mobile deliverability, EAS artifact completion, app icon, splash, store metadata, TestFlight, Play Console, and physical-device distribution ownership are explicitly excluded from this score run.

Current commit tested: `b718814d4ecd1e36adb740bb2cf7ef8c32f07475` (short `b718814`) on branch `main`. This audit also records the local working-tree changes from this pass; a release owner must record the final committed SHA before release handoff.

## Score Summary

| Category | Baseline | Final self-audit | Evidence |
| --- | ---: | ---: | --- |
| Scientific evidence posture | 7.6 | 8.6 | Evidence registry now includes files, functions, thresholds, rationale, source posture, owner, review cadence, limitations, and calibration plan across readiness, nutrition, hydration, cycle, body mass, weight class, training generation, rehydration, tournament, and generated-session scope. |
| Training science | 7.7 | 8.7 | Training generation invariants cover hard stops, severe fueling risk, protected anchors, fight-week/tournament conservatism, high cycle symptoms, missing data, prohibited language, and active-block persistence scope. |
| Nutrition science | 7.2 | 8.7 | Tests cover partial/not-tracking food logs, repeated low intake only from complete confident logs, deficit blockers, provisional targets, hydration caution, low-residue, and rehydration framing. |
| Testing depth | 7.6 | 8.6 | Coverage thresholds raised to statements 75, functions 75, lines 75, branches 65; final measured coverage was 88.81 statements, 87.77 functions, 88.81 lines, 87.05 branches. |
| CI/release gates | 7.1 | 8.5 | Normal CI remains usable; new manual Release Quality workflow and `npm run release:quality` make migration dry-run and release evidence release-blocking. |
| Security posture | 7.4 | 8.6 | Static scans and feedback redaction now cover role markers, smoke credentials, access/refresh tokens, JWT-like strings, bearer strings, API-key values, nested payload truncation, and client anon-key validation. |
| Supabase/persistence | 7.0 | 8.5 | Local migration 010 scope tests, stale generated-session filtering, export/delete table coverage, deletion ordering, grouped preview counts, and release-blocking remote verification docs are present. Remote dry-run is still release-owner evidence. |
| Feedback/incident reporting | 6.8 | 8.6 | Feedback remains signed-in, sanitized, read-only status for users; private incident triage runbook now covers severity, emergency redirects, privacy, private issues, and stop-beta criteria. |
| UX readiness | 6.7 | 8.5 | Approved agent browser CI passed 9 local flows; human beta scripts now define facilitator asks, expected comprehension, pass/fail, and private recording for onboarding, Today, Fuel, Train, Plan, Profile Data, and Profile Audit. |
| Production observability/ops | 5.5 | 8.5 | Release evidence ledger, migration verification ledger, live-smoke template, incident response, safety escalation, agent QA bundle, and known-risk register are documented and test-backed. |
| Regulatory/liability readiness | 6.2 | 8.6 | Beta notice and docs clarify not medical care, not dietetic care, not coaching replacement, no emergency support, no self-clear, cycle privacy, wearable optionality, minors/pregnancy/ED/urgent symptom qualified-support boundaries, and future reviewer-clear requirements. |

Overall in-scope readiness improved to 8.6 excluding mobile deliverability. This does not mean public production launch readiness because release-owner external evidence and mobile/EAS distribution remain outside this run.

## Commands Run

| Command | Result | Notes |
| --- | --- | --- |
| `cmd /c npm install` | Pass | Up to date in 2s. |
| `cmd /c npm run typecheck` | Pass | `tsc --noEmit`. |
| `cmd /c npm test` | Sandbox fail, approved rerun pass | Sandbox blocked Vitest config parent access; approved rerun passed 489 tests, 1 live DB test skipped. |
| `cmd /c npm run lint` | Pass | ESLint clean. |
| `cmd /c npm run preflight:beta` | Pass | Public env names, scripts, EAS profiles, config markers, beta docs checked without printing values. |
| `cmd /c npm run smoke:fixtures` | Sandbox fail, approved rerun pass | Sandbox blocked Vitest config parent access; approved rerun passed 20 tests. |
| `cmd /c npm run test:coverage` | Sandbox fail, approved rerun pass | Coverage measured at 88.73 statements, 86.89 branches, 87.77 functions, 88.73 lines before threshold raise. |
| `cmd /c npm run qa:agent:ci` | Sandbox fail, approved rerun pass | Sandbox run failed on Vitest config access and Expo startup fetch; approved rerun passed static, typecheck, unit, lint, preflight, 9 browser tests, engine review, contact sheet, and bundle. |
| `cmd /c npx vitest run ...focused changed tests...` | Sandbox fail, approved rerun pass | Final focused contract set passed 94 tests across evidence, security, persistence, training invariants, and release docs. |
| `cmd /c npm run typecheck` | Pass after changes | `tsc --noEmit`. |
| `cmd /c npm test` | Approved rerun pass after changes | 498 tests passed, 1 live DB test skipped. |
| `cmd /c npm run lint` | Pass after changes | ESLint clean. |
| `cmd /c npm run smoke:fixtures` | Approved rerun pass after changes | 20 tests passed. |
| `cmd /c npm run quality` | Approved rerun pass after changes | Typecheck plus 498 tests passed, 1 skipped. |
| `cmd /c npm run test:coverage` | Approved rerun pass after changes | 498 tests passed, 1 skipped; final coverage 88.81 statements, 87.05 branches, 87.77 functions, 88.81 lines. |
| `cmd /c npm run release:quality` | Expected fail | Failed only because release-owner evidence is absent: Supabase migration dry-run evidence and final candidate SHA recording. |
| `cmd /c npm run qa:agent:ci` | Approved rerun pass after final UI copy change | Passed static, typecheck, unit, lint, preflight, 9 browser tests, engine review, contact sheet, and bundle at 2026-06-03 12:51 -07:00. |
| `cmd /c npx vitest run ...docs/static tests...` | Approved rerun pass after final ledger update | Passed 15 tests across release docs and static safety checks at 2026-06-03 12:52 -07:00. |

Live Supabase smoke, Supabase remote migration dry-run, CodeQL candidate run, EAS artifact, and physical-device testing require release-owner credentials or external systems.

## Release Evidence Ledger

| Evidence | Current status | Release rule |
| --- | --- | --- |
| Candidate SHA | `b718814d4ecd1e36adb740bb2cf7ef8c32f07475` recorded for this audit; final commit SHA still needs release-owner recording after changes are committed. | Release-blocking until final committed SHA is recorded. |
| Local deterministic gates | Baseline and post-change gates passed as listed above. | Release-blocking. |
| Agent QA evidence loop | Approved rerun passed after the final UI copy change and wrote `qa-artifacts/corneriq-agent-qa-bundle.zip`. | Release-blocking for local evidence; artifact is not committed. |
| Supabase migration dry-run | Not verified in this run. Migration `010` is local and test-covered. | Release-blocking until release owner verifies remote dry-run. |
| CodeQL | Workflow is configured; candidate run not checked in this run. | Release-blocking until candidate run result is recorded. |
| Live Supabase smoke | Not run in this pass. | External blocker unless release owner opts in with public URL/anon key and smoke credentials. |
| Mobile/EAS deliverability | Excluded. Fresh EAS artifact remains separate owner task. | Outside this score run; still blocks distributed beta. |

## Migration Verification Ledger

| Migration | Local status | Remote status |
| --- | --- | --- |
| `001` through `009` | Present and previously documented as applied. | Last recorded remote verification predates this run. |
| `010_generated_sessions_training_block_scope.sql` | Present; static test confirms FK and user/block/date index. | Not remotely verified in this run; release-blocking until dry-run or push evidence exists. |

## Live Smoke Evidence Template

Record privately, without values:

- Date/time:
- Candidate SHA:
- Supabase project ref:
- Public URL env present: yes/no
- Public anon key env present: yes/no
- Smoke email/password loaded from ignored local env: yes/no
- Command: `cmd /c npm run smoke:live-db`
- Result:
- Rows created and cleaned:
- Exact blocker if not run:

## Known Risk Register

| Risk | Current handling |
| --- | --- |
| Mobile/EAS deliverability | Excluded from this run; tracked separately in known gaps and distribution docs. |
| Remote Supabase migration 010 | Local tests and docs present; remote dry-run is release-blocking. |
| CodeQL candidate evidence | Workflow configured; candidate run result must be recorded before release. |
| Live auth/email confirmation | Human/live check required. |
| Physical iPhone behavior | Human review required; local web QA is not proof of device readiness. |
| Human boxer comprehension | Guided scripts exist; real findings remain human review required. |
| Admin/reviewer-clear workflow | Not exposed; future path requires identity, permission, audit, and server-side trust. |
| External analytics | Not added; first-party feedback/audit path preferred for beta. |

## Remaining Non-Goals

- EAS preview artifact completion, mobile install distribution, TestFlight, Play Console, app icon, splash, and store metadata.
- Generated sparring, generated contact drills, fight simulation, unsafe weight-cut instructions, sauna/sweatsuit/laxative/diuretic guidance.
- Coach UI, reviewer-clear UI, or hard-stop self-clear without server-side identity, permission, and audit.
- External analytics packages by default.
- Barcode scanning, full meal planning, detailed food database, drag/drop calendar, numeric load progression, and broad routed drilldowns.

## Blockers

- Release-owner Supabase credentials or CI secrets are required to verify remote migration dry-run and migration `010`.
- Release-owner live smoke credentials are required for live Supabase/email confirmation evidence.
- CodeQL candidate run URL/result must be recorded after the final commit.
- Mobile/EAS deliverability remains outside this run and must not be counted as complete here.
