# Codex Last Handoff

Date: 2026-05-25 America/Vancouver

Pass: Expose engine value and reduce card density.

Current branch during this pass: `main`

Evidence metadata: `qa:agent:ci` reports pre-commit HEAD `7701745e4349acd9b73e4ecbf2a40077ae30761c` (short `7701745`) because verification ran before committing. The verified working tree contains this focused engine-value/density pass.

## Scope

This pass exposed value already produced by deterministic engine/view-model layers and reduced dense or redundant mobile cards. It did not add broad product features.

No barcode scanning, meal planning, food database, coach UI, reviewer-clear UI, external analytics, drag/drop calendar, Supabase schema changes, migrations, EAS/TestFlight work, generated contact drills, unsafe weight-cut copy, service-role keys, or secret display were added.

## What Changed

- Added a top-level Fuel macro targets card from existing nutrition engine output: calories, protein, carbs, fat, fiber, water, logged progress, and lower-confidence/missing-log framing.
- Simplified Train Today to one main workout command with title, duration, purpose, concrete prescription lines, and the primary "Open workout" / "Log result" path.
- Collapsed Train block context, fuel handoff, safety detail, and manual logging unless critical; fuel copy now uses plain language about carbs/fluids or normal meals.
- Reworked Workout detail around "What to do", "Log result", optional exercise details, and collapsed why/safety while keeping Session RPE 1-10.
- Reduced Exercise History density so the default shows latest workout, key change, and no fake numeric progression; prescribed-only counts and grouped rows are behind "Show details".
- Reduced Plan warning noise by keeping only critical hard stops prominent and moving nonblocking warnings/review notes under "Plan review notes".
- Clarified Plan Week and Next Week with concise top cards for protected anchors, generated support, recovery/rest days, support rationale, planned support count, protected anchors considered, and review/materialization status.
- Replaced duplicate-prone React keys in Plan/Block History and other mapped rows with stable composite/index keys.
- Updated Playwright agent QA and static/app tests to cover macro targets, duplicate key warnings, Train card density, practical workout detail, collapsed Exercise History detail, and Plan Week/Next Week separation.
- Updated `docs/qa/QA_LOOP_STATE.md` and this handoff. Human comprehension, physical iPhone behavior, live Supabase/RLS/auth/data, and distribution remain `human_review_required`.

## QA Loop Result

Latest approved clean `qa:agent:ci`: passed.

- Normal gates in `qa:agent:ci`: install context, typecheck, tests, lint, quality, and beta preflight all passed.
- Tests: 42 files passed, 1 live DB smoke file skipped; 388 tests passed and 1 skipped.
- Playwright agent audit: 9/9 scenarios passed.
- Duplicate React key runtime guard: passed; the reported warning did not appear.
- Deterministic analysis: passed.
- Safety, secret, and object-serialization scans: passed.
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

- `cmd /c npm install`: passed standalone and in final `qa:agent:ci`.
- `cmd /c npm run typecheck`: passed standalone and in final `qa:agent:ci`.
- `cmd /c npm test`: sandboxed run failed earlier with the known Windows/esbuild access-denied config issue; approved rerun passed after this pass.
- `cmd /c npm run lint`: passed standalone and in final `qa:agent:ci`.
- `cmd /c npm run quality`: approved rerun passed after the earlier nested Vitest sandbox failure pattern; final `qa:agent:ci` quality also passed.
- `cmd /c npm run preflight:beta`: passed standalone and in final `qa:agent:ci`.
- `cmd /c npm run qa:agent:ci`: sandboxed run failed earlier at nested Vitest/Expo localhost restrictions; first approved rerun exposed Exercise History dense copy still visible by default; final approved rerun passed after moving that copy behind the detail disclosure.

Notes:

- Live Supabase smoke was not run; it remains explicit and opt-in.
- No service-role keys or production data were used.
- No Supabase schema or migrations were changed.
- Existing `react-test-renderer` deprecation output and the existing onboarding `act(...)` warning still appear during Vitest.
- Approved `qa:agent:ci` reported existing `npm audit` output: 11 moderate severity advisories. Dependency remediation was not part of this pass.

## Current QA State

`docs/qa/QA_LOOP_STATE.md` remains `needs_human_review`, not beta-ready. Automated evidence for this focused pass is passing, but these gates still require real evidence:

- Real boxer comprehension of the Fuel target, Train workout, Exercise History, and Plan Week/Next Week flows in Expo Go.
- Physical iPhone touch, keyboard, scrolling, safe area, density, and Expo Go behavior.
- Real Supabase auth, email confirmation, session persistence, RLS, feedback persistence/cleanup, export/delete scope, and live smoke.
- Human safety interpretation for weight-class pressure language.
- Distribution/EAS setup and preview build artifact.
