# Release Evidence Ledger Template

Date: 2026-06-03

Purpose: committed template, release-owner checklist, and historical context for CornerIQ release evidence. This file is not authoritative exact-SHA proof for a future release commit.

Authoritative exact-SHA evidence is generated at release time under `qa-artifacts/release-evidence/current-release-evidence.md` by `npm run release:evidence`. `npm run release:quality` validates that generated artifact against `GITHUB_SHA` or `git rev-parse HEAD`.

Do not paste credentials, personal emails, smoke passwords, service-role values, tokens, or screenshots with private data into committed docs or generated evidence.

## Historical Context

The audit that prompted this template observed latest `main` at `224132c08ee0181210967de82880c3a5707de728`, while previously committed release docs still described candidate `7ff2d7f524c0c50075a429163e62dd8ce4b99419`. That proved committed exact-SHA docs become stale when the docs are changed.

Historical remote evidence also showed local migration `010_generated_sessions_training_block_scope.sql` present and pending remotely: migration list had no remote `010`, and dry-run would push `010`. Treat that as a historical blocker until generated evidence for the exact candidate proves otherwise.

An Android preview APK artifact was historically produced in the mobile lane. That artifact does not count toward local production-readiness scoring and does not prove private distribution, physical-device behavior, app metadata, or real boxer comprehension.

## Evidence Table Template

Use this exact field set in the generated release evidence artifact for each candidate:

| Field | Required record |
| --- | --- |
| Candidate SHA | Full SHA and short SHA from `GITHUB_SHA` or `git rev-parse HEAD`. |
| Quality run | Exact SHA, run ID or URL, status, conclusion, created/updated time if available. |
| CodeQL run | Exact SHA, run ID or URL, status, conclusion, created/updated time if available. |
| Release Quality run | Exact SHA plus local command result or workflow run ID/URL/status/conclusion. |
| Local command results | Command list, pass/fail status, and non-secret notes for required local gates. |
| Coverage result | Command, statements, functions, lines, branches, thresholds, and pass/fail status. |
| Supabase migration list/dry-run | Supabase CLI version, migration list status, `010_generated_sessions_training_block_scope.sql` status, dry-run result, and exact SHA. |
| Live smoke | Date/time, command, env names present yes/no, pass/fail, rows created/cleaned summary, and exact SHA. |
| EAS/mobile artifact status | Separate mobile-lane status; artifact URL only if private-sharing rules allow recording it. |
| Human boxer validation | Scripted automation versus real boxer validation status. |
| Known blockers | Unresolved credential, remote, workflow, mobile, physical-device, or human-review blockers. |

## Generated Artifact Rules

- The generated artifact must include the exact candidate SHA and short SHA.
- Missing generated evidence fails release quality.
- Stale generated evidence fails release quality.
- Ambiguous wording such as current-head pass, latest run passed, or current candidate passed fails unless replaced by exact-SHA evidence.
- Env flags alone do not satisfy migration, live-smoke, workflow, or human evidence.
- Generated evidence under `qa-artifacts/` is ignored by git and should not be committed unless a human explicitly requests a specific sanitized artifact.

## Release-Blocking Rules

- Do not mark release-ready if the generated artifact lacks the current candidate SHA.
- Do not mark Quality or CodeQL passed from latest-run language; record a run ID or URL tied to the exact SHA.
- Do not mark Supabase migration `010` remotely verified unless migration list and dry-run evidence are recorded for the exact SHA.
- Do not mark live smoke passed unless the command result and rows-created/rows-cleaned summary are recorded without secret values.
- Do not count EAS/mobile deliverability inside local production-readiness scores.
- Do not convert scripted automation into real boxer validation.
- Do not claim production launch readiness while Supabase migration `010`, live smoke, physical-device checks, private distribution, or real boxer findings remain unresolved.

## Human Boxer Validation Template

Committed docs may include only this structure. Real findings belong in a private or ignored artifact.

| Field | Notes |
| --- | --- |
| Session alias | Use an alias, not a personal email or full name. |
| Flow tested | Today, Fuel, Train, Plan, Profile, auth, data controls, or another explicit flow. |
| First-action comprehension | What the boxer thought they should do first. |
| Confusion severity | None, low, medium, high, or critical. |
| Safety interpretation | Whether the boxer understood hard stops, under-fueling, weight-class pressure, and qualified-support boundaries. |
| Privacy interpretation | Whether the boxer understood cycle, wearable, support, and data-control boundaries. |
| Action taken | Product change, documentation update, accepted launch limitation, or no action. |
| Private health details | Must not be recorded in committed docs. |

## Example Generated Evidence Commands

```bash
cmd /c npm run release:evidence
cmd /c npm run release:quality
```

Optional ignored input for the generator:

```text
qa-artifacts/release-evidence/release-evidence-input.json
```

The input file may contain sanitized strings for `qualityRun`, `codeqlRun`, `releaseQualityRun`, `localCommandResults`, `coverageResult`, `supabaseMigration`, `liveSmoke`, `easMobile`, `humanBoxerValidation`, and `knownBlockers`. The generator rejects obvious secret-shaped values.
