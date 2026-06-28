# Full-Codebase Technical and Scientific Audit Loop

This loop is separate from launch QA. Launch QA asks whether a release candidate has enough local, human, live, and distribution evidence to ship. The full-codebase audit asks whether the entire repository has been technically and scientifically reviewed chunk by chunk with no unresolved `P0-P4` findings.

`launch_code_ready`, `external_launch_ready`, and any launch QA status do not mean the full-codebase audit is complete. A full-codebase clean result does not replace physical device checks, live Supabase checks, release-owner distribution checks, or human boxer comprehension review.

## Exit Contract

The full-codebase audit is complete only when all in-scope chunks have been reviewed and there are no unresolved `P0-P4` findings.

Findings may only be closed as:

- `fixed`: code, docs, tests, or process changed and verification passed.
- `rejected_with_evidence`: the finding is a false positive or out of scope, with concrete evidence recorded.
- `duplicate`: the finding is already tracked by another finding ID, with the canonical ID named.
- `explicitly_accepted`: a human owner accepted the residual risk, with scope, date, and reason recorded.
- `human_live_device_limited`: the finding is transformed into a named external evidence gate that cannot be resolved by local code review alone.

Do not close a finding because it is lower than `P0` or `P1`. The user standard is no unresolved `P0-P4` findings.

## Roles

- Main agent: scopes the chunk, audits or fixes it, records evidence, and runs the required verification gates.
- Reviewer agent: acts as a third-party reviewer for every audit pass and fix pass, rescoring unresolved findings and checking that closure evidence is real.
- Planner agent: reads the scored audit or fix pass and creates the next main-agent goal by highest unresolved severity, audit dependencies, and the no-P-any exit contract.

The reviewer must assess each pass before the planner selects the next goal.

## Chunk Map

Use this map unless a reviewer or human owner changes scope with evidence:

1. Audit contract baseline.
2. Engine core and temporal model.
3. Safety, readiness, wearables, cycle, and body mass.
4. Fight, weight, hydration, and nutrition.
5. Training engine and compiler.
6. Presentation view models.
7. Services, hooks, and persistence.
8. App UI and navigation.
9. Supabase, schema, migrations, RLS, and live-data boundaries.
10. QA harness, scripts, static checks, and release gates.
11. Unit, beta, engine, and integration tests.
12. Docs, release claims, scientific evidence, and liability posture.
13. Promo, assets, and peripheral surfaces.

## Audit Packet Requirements

Each chunk packet lives under `qa-artifacts/audit-loop/<chunk-id>/` and should include:

- `main-audit.md`: scope, files inspected, technical findings, severity, evidence, and open questions.
- `scientific-review.md`: scientific/safety claims, evidence anchors, limitations, and conservative interpretation.
- `test-map.md`: relevant tests, missing tests, commands run, and coverage limits.
- `reviewer-score.md`: independent reviewer verdict, score, remaining `P0-P4` findings, and closure status.
- `fix-pass.md`: only when a reviewed finding is fixed, with changed files and verification results.

Generated audit packets stay in `qa-artifacts/audit-loop/` and are not committed by default. Committed docs under `docs/qa/` define the process, templates, and durable rules.

Every audit packet must explicitly cover:

- Engine/UI boundary and whether screens own business logic.
- Boxing-only scope and absence of generic combat-sport defaults.
- Generated sparring/contact/fight-simulation safety boundary.
- Manual input as first-class behavior and wearable freshness/consistency limits.
- Cycle support as optional, private, and symptom-aware.
- Missing-data semantics: unknown is not safe, and missing logs alone are not positive risk evidence.
- Scientific/safety evidence for nutrition, hydration, training, weight, readiness, cycle, or medical claims.
- Safety versus performance and weight-class pressure.
- Secrets, privacy, Supabase service-role, and production-data boundaries.
- Tests and quality gates required before handoff.

## Severity Scale

- `P0`: immediate safety, privacy, secret, data-loss, release-blocking, or catastrophic correctness issue.
- `P1`: serious safety, scientific, security, persistence, or user-impacting correctness issue.
- `P2`: important coverage, process, maintainability, or behavior issue that can mislead the audit or product.
- `P3`: lower-risk but real inconsistency, missing evidence, confusing copy, or edge-case defect.
- `P4`: polish, traceability, wording, or minor process issue that still needs closure under the no-P-any standard.

## Fix Pass Rules

Audit passes are observational. Do not change product behavior during an audit pass unless the harness cannot run. Start a fix pass only after the reviewer and planner scope the finding.

During a fix pass:

- Keep the write set scoped to the reviewed finding.
- Preserve unrelated user or agent changes.
- Add or update tests before relying on new engine behavior from UI.
- Run the focused failing test first.
- Run the normal quality gates from `AGENTS.md` before handoff.
- Record failed attempts and successful reruns in the fix artifact.

## Next-Goal Selection

The planner chooses the next main-agent goal from the scored findings. Highest unresolved severity wins unless an audit dependency must be fixed first. New audit chunks should not begin while a reviewed higher-severity process or safety finding is still open.

Reviewer scoring drives the next main-agent goal. The main agent should not self-declare a chunk clean without the reviewer score.
