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

## GitHub Actions

Run the `Agent QA Loop` workflow with `workflow_dispatch` when a remote evidence bundle is useful. It uses Node 22, `npm ci`, Playwright Chromium, and `npm run qa:agent:ci`. It uploads `corneriq-agent-qa-bundle` even if the audit fails.

The workflow must not require Supabase secrets. Live smoke remains an explicit release-owner activity outside routine agent QA.

## Sharing With ChatGPT Or Another AI Reviewer

Use:

```powershell
cmd /c npm run qa:agent:ci
```

Then share `qa-artifacts/corneriq-agent-qa-bundle.zip`. The bundle includes:

- `qa-artifacts/reports/agent-ai-review-brief.md`
- `qa-artifacts/reports/agent-qa-analysis.md`
- `qa-artifacts/reports/engine-output-review.md`
- contact sheet HTML and markdown
- latest browser audit report
- screenshot manifest
- screenshots and page-text snapshots
- Playwright JSON and traces/videos/screenshots when present
- `docs/qa/QA_LOOP_STATE.md`, `QA_RUBRIC.md`, and `QA_SURFACE_MATRIX.md`

Ask the reviewer to use `QA_RUBRIC.md` and to keep human-only gates human-only.

## State Updates

After every pass, update `docs/qa/QA_LOOP_STATE.md` with:

- Current QA phase.
- Last commit tested.
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

