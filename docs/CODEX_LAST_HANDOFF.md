# Codex Last Handoff

Date: 2026-05-25 America/Vancouver

Pass: Action-first mobile UX refactor.

Current branch during this pass: `main`

Evidence metadata: `qa:agent:ci` reports pre-commit HEAD `5bd9ddfc0cf37d47c36177e6c2e74c393725f80e` (short `5bd9ddf`) because verification ran before committing. The verified working tree contains this action-first mobile UX pass.

## Scope

This pass focused on making the existing app feel clearer, less dense, and more action-led without adding broad new features.

No barcode scanning, meal planning, food database, coach UI, reviewer-clear UI, external analytics, drag/drop calendar, admin dashboard, Supabase schema changes, migrations, EAS/TestFlight work, generated contact drills, unsafe weight-cut copy, service-role keys, or secret display were added.

## What Changed

- Extended the shared `ActionCard` pattern so major cards can lead with action, why, status, highlights, and collapsed detail without moving business decisions into screens.
- Made Today prompt for readiness and body mass when due, then collapse logged-today inputs into compact summaries with update affordances.
- Clarified hydration as incremental add-to-today logging on Today and Fuel, including "Today's hydration total" summary language instead of pretending to set a daily total.
- Clarified Fuel food logging as "Add meal/snack" with copy explaining that one meal/snack or a day total can be entered and multiple entries add up in today's context.
- Reworked Train so generated support cards show title, duration, purpose, and concrete prescription lines first, with safety/why detail collapsed unless critical.
- Simplified generated workout detail around "What to do", "Log result", optional exercise details, and collapsed why/safety; session RPE remains 1-10.
- Moved manual training logging below generated workout sections and collapsed it as "Log your own training" with boxing class, roadwork, sparring, or strength helper copy.
- Updated Plan to show protected boxing work separately from generated support, including the local E2E preset sparring anchor and a reason when support work is low because protected boxing already creates hard days.
- Collapsed fight/tournament setup by default while keeping Add fight/Add tournament actions visible.
- Added `qa-artifacts/**` to ESLint ignores so generated QA evidence remains uncommitted and outside source linting.
- Updated app tests, Playwright agent audit assertions, local E2E data, `docs/qa/QA_LOOP_STATE.md`, and this handoff. Human comprehension, physical iPhone behavior, live Supabase/RLS/auth/data, and distribution remain `human_review_required`.

## QA Loop Result

Latest approved clean `qa:agent:ci`: passed.

- Normal gates in `qa:agent:ci`: install context, typecheck, tests, lint, quality, and beta preflight all passed.
- Tests: 42 files passed, 1 live DB smoke file skipped; 387 tests passed and 1 skipped.
- Playwright agent audit: 9/9 scenarios passed.
- Deterministic analysis: pass, with action-first Today/Fuel/Train/Plan evidence present; nuanced comprehension still needs AI/human review.
- Safety, secret, and object-serialization scans: pass.
- Engine-output review, contact sheet, gate-result artifacts, canonical bundle manifest, and bundle were generated.
- Bundle path: `qa-artifacts/corneriq-agent-qa-bundle.zip`.

Generated but ignored artifacts:

- `qa-artifacts/corneriq-agent-qa-bundle.zip`
- `qa-artifacts/reports/agent-gate-results.md`
- `qa-artifacts/reports/agent-gate-results.json`
- `qa-artifacts/reports/agent-ai-review-brief.md`
- `qa-artifacts/reports/agent-qa-analysis.md`
- `qa-artifacts/reports/engine-output-review.md`
- `qa-artifacts/reports/agent-qa-bundle-manifest.json`
- `qa-artifacts/browser-audit/current/`
- `qa-artifacts/playwright/`

`qa-artifacts/` remains ignored and must not be committed.

## Commands Run

- `cmd /c npm install`: passed in the sandbox and in final `qa:agent:ci`.
- `cmd /c npm run typecheck`: passed in the sandbox and in final `qa:agent:ci`.
- `cmd /c npm test`: sandboxed run failed with the known Windows/esbuild access-denied config issue; approved reruns passed after action-first test assertions were fixed.
- `cmd /c npm run lint`: passed standalone before the final QA loop and passed in final `qa:agent:ci`; `qa-artifacts/**` is now ignored by ESLint.
- `cmd /c npm run quality`: sandboxed run failed at nested Vitest with the same Windows/esbuild access-denied issue; approved rerun passed, and final `qa:agent:ci` quality passed.
- `cmd /c npm run preflight:beta`: passed in the sandbox and in final `qa:agent:ci`.
- `cmd /c npm run qa:agent:ci`: sandboxed run failed at nested Vitest/quality with the Windows/esbuild access-denied issue, generated-artifact lint pickup, and Expo localhost startup restrictions; an approved rerun exposed one stale Playwright helper expecting only `Log readiness`; the final approved rerun passed after accepting both `Log readiness` and `Update readiness`.

Notes:

- Live Supabase smoke was not run; it remains explicit and opt-in.
- No service-role keys or production data were used.
- No Supabase schema or migrations were changed.
- Existing `react-test-renderer` deprecation output and the existing onboarding `act(...)` warning still appear during Vitest.
- Approved `qa:agent:ci` reported existing `npm audit` output: 11 moderate severity advisories. Dependency remediation was not part of this product-feel pass.

## Current QA State

`docs/qa/QA_LOOP_STATE.md` remains `needs_human_review`, not beta-ready. Automated evidence for the product-feel pass is passing, but these gates still require real evidence:

- Real boxer comprehension of the action-first Today/Fuel/Train/Plan flows in Expo Go.
- Physical iPhone touch, keyboard, scrolling, safe area, density, and Expo Go behavior.
- Real Supabase auth, email confirmation, session persistence, RLS, feedback persistence/cleanup, export/delete scope, and live smoke.
- Human safety interpretation for weight-class pressure language.
- Distribution/EAS setup and preview build artifact.
