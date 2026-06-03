# Codex QA Loop Runbook

Use this runbook for a full beta-readiness QA loop. It extends the browser audit runbook with analysis, AI review, bundle creation, and persistent state.

## Local Full Loop

From the repository root:

```powershell
cmd /c npm install
cmd /c npm run typecheck
cmd /c npm test
cmd /c npm run lint
cmd /c npm run quality
cmd /c npm run preflight:beta
cmd /c npm run qa:agent:ci
cmd /c npm run qa:loop:state
```

`qa:agent:ci` writes the current evidence bundle under `qa-artifacts/` and must stay local-only. It sets no live Supabase credentials and does not need real beta accounts.

The command records structured gate results at:

- `qa-artifacts/reports/agent-gate-results.md`
- `qa-artifacts/reports/agent-gate-results.json`

Those gate results cover the named gates `ci:static`, `ci:typecheck`, `ci:unit`, `ci:lint`, `ci:preflight`, `ci:agent-browser`, `ci:engine-output-review`, and `ci:agent-bundle`. `qa:agent:ci` does not run `npm install`, does not run `npm ci`, and does not mutate lockfiles. Live Supabase smoke stays separate and opt-in.

## GitHub Actions

Run the `Agent QA Loop` workflow with `workflow_dispatch` when a remote evidence bundle is useful. It uses Node 22, one `npm ci`, Playwright Chromium, initializes gate results, then runs each named gate as its own workflow step. It uploads `corneriq-agent-qa-bundle` plus gate results and failure artifacts even if a gate fails.

The workflow must not require Supabase secrets. Live smoke remains an explicit release-owner activity outside routine agent QA.

## Sharing With ChatGPT Or Another AI Reviewer

Use:

```powershell
cmd /c npm run qa:agent:ci
```

Then share `qa-artifacts/corneriq-agent-qa-bundle.zip`. The bundle includes:

- `qa-artifacts/reports/agent-ai-review-brief.md`
- `qa-artifacts/reports/agent-qa-analysis.md`
- `qa-artifacts/reports/agent-gate-results.md`
- `qa-artifacts/reports/engine-output-review.md`
- contact sheet HTML and markdown
- latest browser audit report
- screenshot manifest
- screenshots and page-text snapshots
- Playwright JSON and traces/videos/screenshots when present
- `docs/qa/QA_LOOP_STATE.md`, `QA_RUBRIC.md`, and `QA_SURFACE_MATRIX.md`

The bundle is canonical by default: it includes the latest report filenames, current `browser-audit/current` evidence, current Playwright artifacts when present, QA docs/state/rubric/surface matrix, package scripts, workflow, and `qa-artifacts/reports/agent-qa-bundle-manifest.json`. Older timestamped `agent-browser-audit-*.md` reports are intentionally excluded.

Page-text snapshots should be scoped to the active surface rather than the whole document body when a screen or section `testID` is available. If a full-body fallback is used, the screenshot manifest must label it as `document.body fallback`.

Ask the reviewer to use `QA_RUBRIC.md` and to keep human-only gates human-only.

## State Updates

After every pass, update `docs/qa/QA_LOOP_STATE.md` with:

- Current QA phase.
- Last commit tested as the exact full SHA plus matching short SHA. Do not use ambiguous wording like "plus working tree changes from this pass."
- Last QA run result.
- Last QA bundle path.
- Last AI review brief path.
- Open Blocker, High, and required Medium counts.
- Next recommended action.
- Beta readiness decision.
- Surface statuses.

Use only these statuses:

- `not_started`
- `automated_pass`
- `needs_ai_review`
- `needs_fix`
- `fixed_needs_verification`
- `verified`
- `human_review_required`
- `blocked`
- `deferred`
- `accepted_beta_limitation`

## Stop Conditions

Stop the loop when all automatable gates pass and the next action is one of:

- `human beta session`
- `physical iPhone review`
- `live Supabase/release-owner check`
- `ready for controlled beta with documented limitations`

Never mark physical iPhone, live Supabase, email confirmation, distribution, or human comprehension complete from local E2E automation alone.
