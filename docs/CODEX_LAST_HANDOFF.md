# Codex Last Handoff

Date: 2026-05-23 America/Vancouver

Pass: Beta-readiness agent QA loop.

Current branch during this pass: `main`

Commit target for this run: `Add beta-readiness agent QA loop`.

## What Changed

- Added the persistent QA loop docs, rubric, surface matrix, state ledger, and Codex runbook under `docs/qa/`.
- Added the full evidence toolchain:
  - `scripts/run-agent-qa-ci.mjs`
  - `scripts/analyze-agent-qa-evidence.mjs`
  - `scripts/create-agent-qa-bundle.mjs`
  - `scripts/create-agent-qa-contact-sheet.mjs`
  - `scripts/create-engine-output-review.mjs`
  - `scripts/print-qa-loop-state.mjs`
- Added npm scripts for analysis, contact sheet, bundle, engine review, full QA CI, and state printing.
- Added `.github/workflows/agent-qa-loop.yml`, which runs the local-only agent loop and uploads `corneriq-agent-qa-bundle`.
- Expanded Playwright agent QA with matching page-text snapshots, screenshot manifest, Train, Plan, Profile Data controls, Profile Settings sign-out, and error/recovery static checks.
- Added local E2E-only stubs for workout completion, plan adjustments, next-week preview actions, and data preview rows. These do not contact Supabase.
- Added static tests to guard QA loop docs, scripts, workflow, artifact naming, ignored artifacts, page-text docs, AI review brief docs, expanded coverage, and no service-role/live Supabase secret requirements.
- Updated AGENTS, QA docs, known gaps, and the beta checklist to reference the full QA loop and its human-only boundaries.

## QA Loop Result

Latest local `qa:agent:ci`: passed.

- Playwright scenarios: 9/9 passed.
- Deterministic analysis: pass.
- Blockers: 0.
- High: 0.
- Required Medium before beta from automation: 0.
- Human/AI limitation count in analysis: 3.
- Safety scan: pass.
- Secret scan: pass.
- Comprehension scan: required evidence present, still `needs_ai_review`.

Generated but ignored artifacts:

- `qa-artifacts/corneriq-agent-qa-bundle.zip`
- `qa-artifacts/reports/agent-ai-review-brief.md`
- `qa-artifacts/reports/agent-qa-analysis.md`
- `qa-artifacts/reports/engine-output-review.md`
- `qa-artifacts/browser-audit/current/screenshot-manifest.json`
- `qa-artifacts/browser-audit/current/page-text/`

`qa-artifacts/` remains ignored and was not committed.

## Commands Run

- `cmd /c npm run qa:engine:review`: passed after tightening prohibited-phrase scan context.
- `cmd /c npm run qa:agent:ci`: failed during development because the Plan assertion expected one next-week phrase while local state showed review-required copy.
- `cmd /c npm run qa:agent:ci`: failed during development because the AI brief template had unescaped backticks, then because a static recovery assertion was too broad, then because the deterministic generated-contact scan matched a report heading. Each was fixed.
- `cmd /c npm run qa:agent:ci`: final required run passed with 9 Playwright scenarios and created the bundle.
- `cmd /c npm install`: passed.
- `cmd /c npm run typecheck`: passed.
- `cmd /c npm run lint`: initially failed on unused imports and `Buffer` globals in scripts; passed after fixes.
- `cmd /c npm run preflight:beta`: passed.
- `cmd /c npm test`: sandboxed run failed with the known Windows/esbuild access-denied config issue.
- Approved `cmd /c npm test`: passed with 375 tests passed and 1 live DB smoke skipped.
- `cmd /c npm run quality`: sandboxed run failed at the nested Vitest/esbuild step with the same access-denied issue.
- Approved `cmd /c npm run quality`: passed with 375 tests passed and 1 live DB smoke skipped.
- `cmd /c npm run qa:agent:bundle`: passed after final state updates so the bundle includes current state.

Notes:

- Expo still logs the existing non-blocking React Native DevTools dotslash fallback error; Metro continues and Playwright passes.
- Vitest still emits existing `react-test-renderer` deprecation output and one existing onboarding `act(...)` warning.

## Current QA State

`docs/qa/QA_LOOP_STATE.md` is updated to `needs_ai_review`, not beta-ready. Automatable local gates passed, but the next action is AI qualitative review followed by physical iPhone and live Supabase/release-owner checks.

Human/release-owner gates still required:

- Real Supabase auth, email confirmation, session persistence, RLS, feedback persistence/cleanup, export/delete scope, and live smoke.
- Physical iPhone touch, keyboard, scrolling, safe area, density, and Expo/EAS behavior.
- Human boxer comprehension, trust, weight-class pressure interpretation, and usefulness.
- Distribution/EAS setup and preview build artifact. Distributed beta remains blocked until an artifact exists.
