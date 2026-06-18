# Production Quality Audit

Date: 2026-06-18

Purpose: stable production-readiness audit, release-evidence runbook, and historical evidence summary for CornerIQ. This committed document is not authoritative proof for the final SHA of a future release commit.

Mobile deliverability is explicitly excluded from local production-readiness scores. EAS/APK status is tracked only as a separate mobile lane until private distribution, physical-device checks, app metadata, and user instructions are release-owner verified.

## Evidence Model

- Committed docs define the audit template, release rules, latest known historical evidence, and non-overclaim boundaries.
- Exact candidate proof is generated at release time under `qa-artifacts/release-evidence/current-release-evidence.md` by `npm run release:evidence`.
- `npm run release:quality` validates the generated release evidence artifact against `GITHUB_SHA` or `git rev-parse HEAD`.
- A committed doc must not be required to contain the final commit SHA of the commit that changes that doc. That creates a self-invalidating SHA loop.
- Env flags alone do not satisfy release evidence. Non-secret command results, run IDs, migration status, live-smoke status, and blockers must be recorded in the generated artifact or a CI artifact for the exact SHA.
- Historical SHA examples in committed docs are informational only. They do not prove the current candidate.

Latest historical context: the follow-up audit observed `224132c08ee0181210967de82880c3a5707de728` on `main`, while previously committed audit docs still described older candidate `7ff2d7f524c0c50075a429163e62dd8ce4b99419`. That mismatch is the reason exact-SHA evidence moved to ignored generated artifacts.

## Score Summary

These scores describe local code posture and evidence-system maturity, not public production launch readiness.

| Category | Baseline | Current self-audit | Evidence rule |
| --- | ---: | ---: | --- |
| Scientific evidence posture | 7.6 | 8.6 | Evidence registry and deterministic tests remain the source for engine heuristics. |
| Training science | 7.7 | 8.7 | Training generation remains boxing-only and blocks unsafe generated contact-work language. |
| Nutrition science | 7.2 | 8.7 | Nutrition and weight-class guidance remain conservative, symptom-aware, and no-unsafe-cut. |
| Testing depth | 7.6 | 8.6 | Coverage floors remain statements 75, functions 75, lines 75, branches 65; exact run output belongs in generated evidence. |
| CI/release gates | 7.1 | 8.7 | Release quality now checks generated exact-SHA evidence instead of committed self-SHA docs. |
| Security posture | 7.4 | 8.6 | Static scans reject personal emails in public docs and secret-shaped values in client/config/docs. |
| Supabase/persistence readiness | 7.0 | 8.6 | Migrations `001` through `013` were historically aligned in production on 2026-06-18 with a clean dry-run; final candidates still need generated exact-SHA evidence. |
| Support/incident boundary | 6.8 | 8.6 | In-app feedback/reporting is removed from launch runtime; support intake remains outside the app until a privacy-reviewed path exists. |
| UX readiness (automated local) | 6.7 | 8.5 | Automated local evidence is separate from real boxer validation. |
| Production observability/ops | 5.5 | 8.6 | Release evidence fields are now generated per SHA and validated by the release gate. |
| Regulatory/liability readiness | 6.2 | 8.6 | Docs and app copy keep medical, dietetic, coaching, hard-stop, cycle, and wearable boundaries explicit. |

Overall local code readiness is stronger than the previous audit, but production launch readiness remains blocked by external and human evidence lanes.

## Commands Run

For each release candidate, run and record non-secret results in `qa-artifacts/release-evidence/current-release-evidence.md`:

| Command | Release evidence rule | Notes |
| --- | --- | --- |
| `cmd /c npm install` | Record pass/fail and package-lock changes, if any. | Required before handoff when dependencies may drift. |
| `cmd /c npm run typecheck` | Record exact-SHA pass/fail. | Required local gate. |
| `cmd /c npm test` | Record exact-SHA pass/fail. | Historical Windows runs needed an approved rerun when sandboxed Vitest failed with esbuild access denial. |
| `cmd /c npm run lint` | Record exact-SHA pass/fail. | Required local gate. |
| `cmd /c npm run quality` | Record exact-SHA pass/fail. | Historical Windows runs needed an approved rerun for the same Vitest/esbuild sandbox issue. |
| `cmd /c npm run preflight:production` | Record exact-SHA pass/fail. | Required production launch-code gate. |
| `cmd /c npm run smoke:fixtures` | Record exact-SHA pass/fail. | Historical Windows runs needed an approved rerun for Vitest/esbuild sandbox access. |
| `cmd /c npm run test:coverage` | Record pass/fail plus statements, functions, lines, and branches. | Coverage numbers belong in generated evidence, not as self-SHA committed proof. |
| `cmd /c npm audit --audit-level=high --omit=dev` | Record exact-SHA pass/fail and high/critical result. | Registry/cache sandbox failures must be documented if rerun with approval. |
| `cmd /c npm run qa:agent:ci` | Record exact-SHA pass/fail and artifact paths. | Writes ignored QA artifacts under `qa-artifacts/`. |
| `cmd /c npm run release:evidence` | Generate exact-SHA evidence artifact. | Defaults unresolved external lanes to blocking. |
| `cmd /c npm run release:quality` | Validate exact-SHA generated evidence. | Must fail if generated evidence is absent, stale, or unresolved. |

## Release Evidence Ledger

Authoritative current-candidate artifact: `qa-artifacts/release-evidence/current-release-evidence.md`.

Committed template and historical ledger: `docs/27_RELEASE_EVIDENCE_LEDGER.md`.

Required generated evidence fields:

| Field | Required content |
| --- | --- |
| Candidate SHA | Full SHA from `GITHUB_SHA` or `git rev-parse HEAD`, plus short SHA. |
| Quality run | Run ID or URL, status, conclusion, and exact SHA. |
| CodeQL run | Run ID or URL, status, conclusion, and exact SHA. |
| Release Quality run | Current local command evidence or workflow run ID/URL for exact SHA. |
| Local command results | Commands, pass/fail, and non-secret notes. |
| Coverage result | Statements, functions, lines, branches, command, and pass/fail. |
| Supabase migration list/dry-run | CLI version, migrations `010` through `013` status, dry-run result, and exact SHA. |
| Live smoke | Command, env names present yes/no, pass/fail, rows created/cleaned summary, and exact SHA. |
| EAS/mobile artifact status | Separate mobile-lane status only; not counted as local production readiness. |
| Human boxer validation | Scripted automation versus real boxer findings, with no private health detail. |
| Known blockers | External, credential, remote, mobile, and human-review blockers. |

## Migration Verification Ledger

| Migration | Local status | Release rule |
| --- | --- | --- |
| `001` through `009` | Present; historically recorded as applied remotely. | Historical evidence is not current-candidate proof. |
| `010_generated_sessions_training_block_scope.sql` | Present; service/static tests cover active-block generated-session scope; historically applied remotely by 2026-06-18. | Generated release evidence must record migration list and dry-run alignment for the exact SHA. |
| `011_reviewer_workflow_export_feedback_statuses.sql` | Present; historically applied remotely by 2026-06-18. | Generated release evidence must record migration list and dry-run alignment for the exact SHA. |
| `012_remove_beta_feedback_launch.sql` | Present; historically applied remotely by 2026-06-18. | Generated release evidence must record migration list and dry-run alignment for the exact SHA. |
| `013_security_bug_sweep_hardening.sql` | Present; historically applied remotely by 2026-06-18. | Generated release evidence must record migration list and dry-run alignment for the exact SHA. |

Do not treat historical migration alignment as proof for a future release candidate after migrations, function code, or config changes. Generated evidence must record command, date/time, exact SHA, and non-secret result proving alignment.

## Live Smoke Evidence Template

Record only non-secret status in generated release evidence:

- Date/time.
- Candidate SHA.
- Supabase project ref, if safe to identify.
- Public URL env present: yes/no.
- Public anon key env present: yes/no.
- Smoke email/password env names present: yes/no.
- Command: `cmd /c npm run smoke:live-db` with `CORNERIQ_LIVE_DB_SMOKE=1`.
- Result: pass/fail.
- Rows created and cleaned summary.
- Exact blocker if not run.

Live smoke should run only after migration alignment is verified for the target candidate. The 2026-06-18 account-deletion smoke passed after migrations `001` through `013` were aligned and `delete-account` v2 was deployed, but future release candidates still need exact-SHA live-smoke evidence.

## Human Boxer Validation Template

Committed docs may define fields only. Real findings belong in a private or ignored artifact.

Required private fields:

- Session alias.
- Flow tested.
- First-action comprehension.
- Confusion severity.
- Safety interpretation.
- Privacy interpretation.
- Action taken.
- No private health details.

Scripted automation is not real boxer validation.

## Known Risk Register

| Risk | Current handling |
| --- | --- |
| Self-referential SHA loop | Removed from committed docs; exact SHA is generated under `qa-artifacts/`. |
| Missing generated release evidence | `npm run release:quality` fails if the artifact is absent or stale. |
| Ambiguous pass wording | Release gate rejects ambiguous current-head/latest-run pass wording in committed docs and generated evidence. |
| Remote Supabase migrations | Historically aligned through `013` on 2026-06-18; release-blocking if generated evidence for the exact candidate is absent or stale. |
| Live smoke | Account-deletion smoke historically passed on 2026-06-18; release-blocking if generated evidence for the exact candidate is absent or stale. |
| CodeQL and Quality evidence | Must be tied to exact SHA with run ID or URL. |
| Mobile/EAS deliverability | Android APK artifact can be recorded separately; distribution remains human/release-owner work. |
| Human boxer comprehension | No production UX validation claim until real findings are recorded privately. |
| Coach/reviewer clear workflows | Not exposed until identity, permission, audit, and server-side trust are implemented and tested. |

## Remaining Non-Goals

- Generated sparring, generated contact drills, fight simulation, partner drills, or broad combat-sports defaults.
- Unsafe weight-cut instructions, sauna, sweatsuit, laxative, diuretic, or make-weight-at-all-costs language.
- Coach UI, reviewer-clear UI, or hard-stop self-clear.
- External analytics packages.
- Barcode scanning, full meal planning, detailed food database, drag/drop calendar, numeric load progression, and routed drilldowns.
- Counting EAS/mobile artifact status inside local production-readiness scores.

## Blockers

- Supabase migration alignment must be generated or verified remotely for the exact candidate SHA.
- Live Supabase smoke must pass for the exact candidate SHA after migration alignment, or remain release-blocking for that candidate.
- Quality, CodeQL, and Release Quality evidence must be exact-SHA, with run IDs/URLs where applicable.
- Private distribution, physical-device checks, app metadata, icon/splash acceptance, and user instructions remain release-owner lanes.
- Real boxer comprehension and safety/privacy interpretation findings remain human_review_required.
