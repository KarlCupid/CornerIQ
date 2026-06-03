# Production Quality Audit

Date: 2026-06-03

Scope: in-scope production-quality readiness for CornerIQ code, deterministic engine behavior, local QA, safety posture, release gates, persistence evidence, feedback/incident handling, UX evidence, observability runbooks, and liability boundaries. Mobile deliverability is explicitly excluded from this score run. An EAS Android preview APK now exists in the separate mobile lane; app icon, splash, store metadata, TestFlight, Play Console, private tester distribution, and physical-device distribution remain explicitly separate release-owner work.

Current commit tested: `7ff2d7f524c0c50075a429163e62dd8ce4b99419` (short `7ff2d7f`) on branch `main`.

This audit records the committed candidate SHA above. It does not treat working-tree edits, environment flags, previous CI runs, previous live smoke, or previous Supabase dry-runs as proof for a future commit. After any new commit, the release evidence ledger must be refreshed with that exact SHA before release handoff.

## Score Summary

| Category | Baseline | Current self-audit | Evidence |
| --- | ---: | ---: | --- |
| Scientific evidence posture | 7.6 | 8.6 | Evidence registry covers readiness, under-fueling, hydration, body mass, cycle, weight-class safety, training generation, macro targets, low-residue/rehydration/tournament guidance, and generated-session active-block scope. Registry `functions` entries now use exact code names and are statically verified against listed files. |
| Training science | 7.7 | 8.7 | Training generation invariants cover hard stops, severe fueling risk, protected boxing anchors, fight-week/tournament conservatism, high cycle symptoms, missing data, prohibited language, and active-block persistence scope. |
| Nutrition science | 7.2 | 8.7 | Tests cover partial/not-tracking food logs, repeated low intake only from complete confident logs, deficit blockers, provisional targets, hydration caution, low-residue, and rehydration framing. |
| Testing depth | 7.6 | 8.6 | Coverage thresholds remain statements 75, functions 75, lines 75, branches 65. `cmd /c npm run test:coverage` passed in this verification pass with statements 88.81, functions 87.77, lines 88.81, branches 87.05. |
| CI/release gates | 7.1 | 8.6 | `npm run release:quality` now computes the candidate SHA from `GITHUB_SHA` or `git rev-parse HEAD`, requires exact SHA evidence in docs, rejects ambiguous current-head wording, and fails on unresolved Supabase or live-smoke evidence. Current-SHA Quality and CodeQL runs are recorded. Release pass status remains blocked until Supabase/live evidence is resolved. |
| Security posture | 7.4 | 8.6 | Static scans cover role markers, smoke credentials, access/refresh tokens, JWT-like strings, bearer strings, API-key values, nested payload truncation, client anon-key validation, and personal email-like strings in public docs. |
| Supabase/persistence local readiness only | 7.0 | 8.5 | Local migration `010_generated_sessions_training_block_scope.sql` is present and test-covered for stale generated-session scope. Remote migration `010` is not verified for this SHA and remains release-blocking. |
| Feedback/incident reporting | 6.8 | 8.6 | Feedback remains signed-in, sanitized, user-owned, and read-only for status in the client. Private triage docs cover Critical/High owner actions, unsafe generated copy, hard-stop bypass, exposed secret, deletion failure, migration mismatch, and urgent health concern escalation. |
| UX readiness (scripted beta) | 6.7 | 8.5 | Agent/browser and scenario scripts support beta rehearsal, and a human beta findings template separates real findings from planned scripts. Production UX validation remains below this score until real boxer sessions are recorded. |
| Production observability/ops | 5.5 | 8.6 | New exact-SHA release evidence ledger is structured and test-backed for Quality, CodeQL, Release Quality, local commands, coverage, Supabase migration list/dry-run, live smoke, EAS/mobile, human findings, and known blockers. No external production monitoring is claimed. |
| Regulatory/liability readiness | 6.2 | 8.6 | Beta notice and docs clarify not medical care, not dietetic care, not coaching replacement, no emergency support, no self-clear, cycle privacy, wearable optionality, minors/pregnancy/ED/urgent symptom qualified-support boundaries, and future reviewer-clear requirements. |

Overall in-scope local production-readiness evidence is stricter than the previous audit, but this is not public production launch readiness. Release-owner external evidence and mobile/EAS distribution remain blockers.

## Commands Run

| Command | Result | Notes |
| --- | --- | --- |
| `cmd /c npm install` | Passed | Up to date in 2s; no package changes. |
| `cmd /c npm run typecheck` | Passed | `tsc --noEmit`. |
| `cmd /c npm test` | Passed after approved rerun | Sandboxed Vitest failed with an esbuild `Cannot read directory "../.."` access-denied error; approved rerun passed with 505 tests and 1 live-smoke test skipped. |
| `cmd /c npm run lint` | Passed | ESLint completed with no reported findings. |
| `cmd /c npm run quality` | Passed after approved rerun | Sandboxed Vitest failed with the same esbuild access-denied error; approved rerun passed typecheck plus 505 tests and 1 live-smoke test skipped. |
| `cmd /c npm run preflight:beta` | Passed | Checked public env declarations, package scripts, EAS profiles, app config, client config markers, and beta release docs. |
| `cmd /c npm run smoke:fixtures` | Passed after approved rerun | Sandboxed Vitest failed with the same esbuild access-denied error; approved rerun passed 20 fixture smoke tests. |
| `cmd /c npm run test:coverage` | Passed after approved rerun | Sandboxed Vitest failed with the same esbuild access-denied error; approved rerun passed with statements 88.81, functions 87.77, lines 88.81, branches 87.05. |
| `cmd /c npm audit --audit-level=high --omit=dev` | Passed after approved rerun | Sandboxed npm audit could not complete the registry/cache path; approved rerun exited 0. It reported only moderate Expo-chain advisories with a breaking Expo 56 force-fix path. |
| `cmd /c npm run qa:agent:ci` | Passed after approved rerun | Sandboxed run failed from Vitest/esbuild access denial and local Expo/Playwright reset; approved rerun passed static checks, typecheck, unit tests, lint, preflight, 9 browser tests, engine-output analysis, and bundle generation. |
| `cmd /c npm run release:quality` | Expected fail until external evidence is recorded | Failed on unresolved Supabase migration `010` remote dry-run/list evidence, unresolved live-smoke evidence, and missing release-owner env acknowledgements. |
| `cmd /c npm exec supabase -- --version` | Sandbox fail, approved rerun pass | Sandbox blocked CLI telemetry write; approved rerun reported `2.100.1`. |
| `cmd /c npm exec supabase -- migration list` | Approved rerun partial external evidence | Connected to remote; local `010` had blank remote status, so migration `010` is pending remotely. |
| `cmd /c npm exec supabase -- db push --dry-run` | Approved rerun partial external evidence | Dry-run reported it would push `010_generated_sessions_training_block_scope.sql`; no migration was applied. |
| GitHub API current-SHA workflow query | Sandbox network fail, approved rerun pass | Found Quality run `26909536964` success, CodeQL run `26909536499` success, and Agent QA Loop run `26909536551` success for `7ff2d7f524c0c50075a429163e62dd8ce4b99419`. |

## Release Evidence Ledger

Authoritative current ledger: `docs/27_RELEASE_EVIDENCE_LEDGER.md`.

| Evidence | Current status | Release rule |
| --- | --- | --- |
| Candidate SHA | `7ff2d7f524c0c50075a429163e62dd8ce4b99419` (short `7ff2d7f`) recorded in this audit, the release ledger, and QA loop state. | Release-blocking if a future commit is not recorded exactly. |
| Local deterministic gates | Passed locally for this worktree: install, typecheck, lint, test, quality, preflight, fixture smoke, coverage, and high-severity dependency audit. | Release-blocking for a committed release candidate if these are stale. |
| Agent QA evidence loop | Passed locally after approved rerun; artifacts regenerated under `qa-artifacts/` and are not committed. | Release-blocking for local evidence when feasible; artifacts are not committed. |
| Supabase migration dry-run | CLI `2.100.1`; migration list and dry-run connected. Remote `010` is pending; dry-run would push `010_generated_sessions_training_block_scope.sql`. | Release-blocking until migration `010` is applied/verified, not merely pending. |
| CodeQL | Current-candidate CodeQL run `26909536499` completed with success. URL: https://github.com/KarlCupid/CornerIQ/actions/runs/26909536499. | Resolved for this candidate; future commits need fresh exact-SHA evidence. |
| Live Supabase smoke | Not run for this SHA because remote migration `010` is pending. | Release-blocking until migration evidence is resolved and live smoke is verified with non-secret evidence. |
| Mobile/EAS deliverability | Separate lane. Fresh Android preview artifact exists: `https://expo.dev/artifacts/eas/pYeMLGCyyhfB72dRYhG93K.apk`. TestFlight/Play Console, app icon/splash, metadata, private tester distribution, and physical-device checks are not counted here. | Outside this score run; still blocks broad distributed beta until release-owner checks pass. |

## Migration Verification Ledger

| Migration | Local status | Remote status |
| --- | --- | --- |
| `001` through `009` | Present. | Last recorded remote verification predates this commit and does not prove current release readiness. |
| `010_generated_sessions_training_block_scope.sql` | Present; static and service tests cover active-block generated-session scope. | not remotely verified/applied for `7ff2d7f524c0c50075a429163e62dd8ce4b99419`; migration list shows blank remote for `010`, and dry-run would push `010_generated_sessions_training_block_scope.sql`. Release-blocking until applied/verified. |

Docs must not say migration `010` is remotely verified, remote-applied, or up to date unless the ledger records command, date/time, SHA, and non-secret result.

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
| Current-SHA evidence drift | `release:quality` now fails if docs do not contain the actual candidate SHA from Git/GitHub. |
| Mobile/EAS deliverability | Android preview artifact exists; private distribution and physical-device checks are tracked separately in distribution docs and the release ledger. |
| Remote Supabase migration `010` | Local tests and docs present; remote dry-run/list evidence is release-blocking. |
| CodeQL candidate evidence | Current-candidate run recorded as success; rerun required for future SHAs. |
| Live auth/email confirmation | Human/live check required; routine local QA cannot prove it. |
| Live smoke | Credential-gated and not run for this SHA; release-blocking. |
| Physical iPhone behavior | Human review required; local web QA is not proof of device readiness. |
| Human boxer comprehension | Guided scripts and findings template exist; real findings remain human review required. |
| Admin/reviewer-clear workflow | Not exposed; future path requires identity, permission, audit, and server-side trust. |
| External analytics | Not added; first-party feedback/audit path remains preferred for beta. |

## Remaining Non-Goals

- Mobile install distribution, TestFlight, Play Console, app icon, splash, and store metadata.
- Generated sparring, generated contact drills, fight simulation, unsafe weight-cut instructions, sauna/sweatsuit/laxative/diuretic guidance.
- Coach UI, reviewer-clear UI, or hard-stop self-clear without server-side identity, permission, and audit.
- External analytics packages by default.
- Barcode scanning, full meal planning, detailed food database, drag/drop calendar, numeric load progression, and broad routed drilldowns.

## Blockers

- Release-owner Supabase credentials or CI secrets are required to verify remote migration dry-run and migration `010`.
- Release-owner live smoke credentials are required for live Supabase/email confirmation evidence.
- CodeQL candidate run is recorded for `7ff2d7f524c0c50075a429163e62dd8ce4b99419`; future commits need fresh run evidence.
- Mobile private distribution and physical-device deliverability remain outside this run and must not be counted as complete here.
- Real boxer comprehension findings have not been recorded; UX production validation remains human-review-required.
