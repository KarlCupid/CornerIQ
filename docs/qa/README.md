# CornerIQ Agent QA

CornerIQ agent QA lets Codex run repeatable browser audits without a human manually documenting every screen. The routine path is local-only, visibly marked as test mode, and does not require Supabase credentials.

## Commands

- `cmd /c npm run qa:web` starts Expo web in local E2E mode for manual inspection.
- `cmd /c npm run qa:agent:audit` runs the Playwright audit and writes screenshots plus a report under `qa-artifacts/`.
- `cmd /c npm run qa:agent:report` regenerates the latest markdown report from the last audit artifacts.
- `cmd /c npm run qa:engine:review` generates `qa-artifacts/reports/engine-output-review.md`.
- `cmd /c npm run qa:agent:analyze` writes deterministic analysis and the AI review brief.
- `cmd /c npm run qa:agent:contact-sheet` writes HTML and markdown contact sheets.
- `cmd /c npm run qa:agent:bundle` writes `qa-artifacts/corneriq-agent-qa-bundle.zip`.
- `cmd /c npm run qa:agent:ci` runs the full local beta-readiness evidence loop.
- `cmd /c npm run qa:loop:state` prints persistent loop state and exit criteria.
- `cmd /c npm run qa:web:update` is reserved for refreshing Playwright snapshots if visual snapshots are added later.

## Files

- Runbook: `docs/qa/AGENT_BROWSER_AUDIT_RUNBOOK.md`
- QA loop: `docs/qa/QA_LOOP.md`
- QA state: `docs/qa/QA_LOOP_STATE.md`
- QA rubric: `docs/qa/QA_RUBRIC.md`
- QA surface matrix: `docs/qa/QA_SURFACE_MATRIX.md`
- Full loop runbook: `docs/qa/CODEX_QA_LOOP_RUNBOOK.md`
- Finding template: `docs/qa/FINDINGS_TEMPLATE.md`
- E2E tests: `qa/e2e/`
- Playwright config: `playwright.config.ts`
- Generated reports: `qa-artifacts/reports/`
- Generated screenshots: `qa-artifacts/browser-audit/current/screenshots/`
- Generated page text: `qa-artifacts/browser-audit/current/page-text/`
- Screenshot manifest: `qa-artifacts/browser-audit/current/screenshot-manifest.json`
- Shareable bundle: `qa-artifacts/corneriq-agent-qa-bundle.zip`

## Safety Boundary

Agent QA uses `EXPO_PUBLIC_CORNERIQ_E2E_LOCAL=1`. That flag is disabled by default, never creates a Supabase client, and renders a banner that says the app is in local E2E mode. The QA scripts set `EXPO_NO_DOTENV=1` and blank Supabase-related env slots for the local process. Routine browser QA must not use service-role keys, production data, or copied secret values.

## Full Beta-Readiness Loop

Use `cmd /c npm run qa:agent:ci` for the full local loop. It runs the browser audit, engine-output review, deterministic analysis, contact sheet, and bundle creation. Share `qa-artifacts/corneriq-agent-qa-bundle.zip` with ChatGPT or another AI reviewer, using `docs/qa/QA_RUBRIC.md` as the severity guide.

Update `docs/qa/QA_LOOP_STATE.md` after each pass. Automation cannot certify real Supabase auth/email confirmation, physical iPhone behavior, distribution readiness, or human boxer comprehension; those surfaces must stay `human_review_required` until a human or release owner supplies real evidence.
