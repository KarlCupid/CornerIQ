# Codex Last Handoff

Date: 2026-05-21 21:48 America/Vancouver

Pass: Agent browser QA system setup.

Current branch during this pass: `main`

Commit target for this run: `Set up agent browser QA system`.

## What Was Added

- Expanded root `AGENTS.md` with quality gates, browser QA workflow, secret handling, audit-vs-fix separation, release/beta QA boundaries, and commit discipline.
- Added QA docs under `docs/qa/`:
  - `README.md`
  - `FINDINGS_TEMPLATE.md`
  - `AGENT_BROWSER_AUDIT_RUNBOOK.md`
- Added Playwright as a dev dependency, `playwright.config.ts`, and the first browser audit scenario under `qa/e2e/`.
- Added npm scripts:
  - `qa:web`
  - `qa:web:update`
  - `qa:agent:audit`
  - `qa:agent:report`
- Added local-only E2E mode behind `EXPO_PUBLIC_CORNERIQ_E2E_LOCAL=1`.
  - Disabled by default.
  - Renders a visible local E2E banner.
  - Does not create a Supabase client.
  - QA scripts set `EXPO_NO_DOTENV=1` and blank Supabase-related env slots for the local process.
- Added stable test IDs/accessibility labels for Auth, onboarding, Today, and key Today audit sections.
- Added a report generator that writes markdown reports under `qa-artifacts/reports/`.
- Added static tests for the agent QA docs/scripts/local-mode boundary.

## How To Run It

- Start the local QA web app: `cmd /c npm run qa:web`
- Run the audit: `cmd /c npm run qa:agent:audit`
- Regenerate the latest report: `cmd /c npm run qa:agent:report`

Generated reports and screenshots are ignored by git under `qa-artifacts/`.

## What It Can Audit

The first Playwright scenario covers:

- First launch in local E2E mode.
- Auth screen visibility.
- Local fake sign-in.
- Local demo onboarding visibility.
- Today screen visibility.
- Today first-action content.
- Quick logs visibility.
- Mobile-size browser smoke.

Latest generated report: `qa-artifacts/reports/agent-browser-audit-latest.md`.

## Human Testing Still Required

- Real Supabase auth, email confirmation, account/session edge cases, and real beta data.
- Physical mobile keyboard, safe-area, touch, and device performance.
- Human review of boxing safety copy, cycle privacy, and weight-class language.
- Release owner checks for EAS/TestFlight/store distribution.
- Any product UX fix pass based on documented findings.

## Verification Results

- `cmd /c npm install`: passed.
- `cmd /c npm run typecheck`: passed.
- `cmd /c npm test`: sandboxed run failed with the known Windows/esbuild access-denied config issue; approved rerun outside the sandbox passed with `371` tests passed and `1` skipped.
- `cmd /c npm run lint`: passed.
- `cmd /c npm run quality`: sandboxed run failed when the nested Vitest command hit the same Windows/esbuild access-denied config issue; approved final rerun outside the sandbox passed with `371` tests passed and `1` skipped.
- `cmd /c npm run preflight:beta`: passed.
- `cmd /c npm run web`: started successfully at `http://localhost:8081`; server was stopped with `Ctrl+C`.
- `cmd /c npm run qa:agent:audit`: passed with `2` Playwright tests and screenshots for auth, onboarding, Today, and mobile Today.

Notes:

- `cmd /c npm install --save-dev @playwright/test` first failed in the sandbox while fetching from npm, then passed after approval. The final required `cmd /c npm install` passed.
- Expo web still logs a non-blocking React Native DevTools dotslash fallback error during local startup; Metro continues and the app serves.
- The Vitest suite still emits existing `react-test-renderer` deprecation output and one existing onboarding `act(...)` warning.
