# Codex Last Handoff

Date: 2026-05-21 22:18 America/Vancouver

Pass: Expanded agent browser QA to cover the real first-time onboarding flow.

Current branch during this pass: `main`

Commit target for this run: `Expand agent QA to cover full onboarding`.

## What Was Added

- Added a full Playwright onboarding scenario before the demo shortcut path.
- The full scenario signs in with fake local E2E credentials, completes the real setup fields, and reaches Today without Supabase credentials or production data.
- The fake boxer profile path now exercises:
  - amateur boxer, novice amateur level, training age `1`, orthodox stance
  - 82 kg current body mass, 84 kg walk-around body mass, 178 cm height
  - jump rope, dumbbells, heavy bag equipment access
  - weekday evenings, weekends, 3 days/week availability
  - Tuesday evening pads, 60 min, moderate protected anchor
  - Thursday coach-led sparring, 90 min, hard protected anchor
  - disabled cycle support
  - manual-only wearable preference
  - age 27, male sex-at-birth, blank optional medical/medication/adverse-event notes
  - build phase goal
- The full scenario asserts visible labels and helper text for training age, body mass units/examples, training access presets, recurring weekly protected anchors, cycle privacy, male safety selection, goal phase explanations, and Today arrival.
- The required onboarding screenshots are written under `qa-artifacts/browser-audit/current/screenshots/`:
  - `01-auth-screen.png`
  - `02-onboarding-boxing-basics.png`
  - `03-onboarding-body-mass.png`
  - `04-onboarding-training-access.png`
  - `05-onboarding-protected-anchors.png`
  - `06-onboarding-cycle.png`
  - `07-onboarding-wearable.png`
  - `08-onboarding-safety.png`
  - `09-onboarding-goal.png`
  - `10-today-after-real-onboarding.png`
  - `11-mobile-today-after-real-onboarding.png`
- Kept the original demo shortcut smoke audit, with `smoke-*` screenshot names so it no longer collides with the full onboarding artifacts.
- Improved `scripts/create-agent-qa-report.mjs` so generated reports include commit tested, scenario names, pass/fail counts, screenshot paths, failed assertions, next recommended fix area, and a reminder that generated artifacts are gitignored.
- Updated `docs/qa/AGENT_BROWSER_AUDIT_RUNBOOK.md` to distinguish the full onboarding audit from the faster demo shortcut smoke audit.

## Audit Result

The full onboarding audit passed in the final required run.

Latest generated report: `qa-artifacts/reports/agent-browser-audit-latest.md`

Final Playwright summary:

- `full first-time onboarding uses real inputs before Today`: passed
- `first launch reaches auth, local demo onboarding, Today, and quick logs`: passed
- `mobile-size browser layout smoke reaches Today`: passed

`docs/KNOWN_GAPS.md` was not updated because the expanded audit did not expose a new product limitation. The known limitation that local agent QA is not live auth, production data, or physical-device validation still applies.

## Commands Run

- `cmd /c npm run qa:agent:audit`: initial development run failed on a harness selector/timeout issue around the finish button accessible name; fixed before final verification.
- `cmd /c npm run qa:agent:audit`: passed with 3 Playwright tests during development check.
- `cmd /c npm install`: passed.
- `cmd /c npm run typecheck`: passed.
- `cmd /c npm test`: sandboxed run failed with the known Windows/esbuild access-denied config issue; approved rerun outside the sandbox passed with `371` tests passed and `1` skipped.
- `cmd /c npm run lint`: passed.
- `cmd /c npm run quality`: sandboxed run failed when the nested Vitest command hit the same Windows/esbuild access-denied config issue; approved rerun outside the sandbox passed with `371` tests passed and `1` skipped.
- `cmd /c npm run preflight:beta`: passed.
- `cmd /c npm run qa:agent:audit`: final required run passed with `3` Playwright tests.

Notes:

- The local QA web startup still logs the existing non-blocking React Native DevTools dotslash fallback error; Metro continues and Playwright passes.
- Vitest still emits existing `react-test-renderer` deprecation output and one existing onboarding `act(...)` warning.
- Generated `qa-artifacts/` reports, screenshots, traces, videos, and JSON were not committed.

## Human Testing Still Required

- Real Supabase auth, email confirmation, account/session edge cases, and real beta data.
- Physical iPhone/Android keyboard, safe-area, touch, scrolling, and device performance.
- Human review of onboarding clarity, Today direction, boxing safety copy, cycle privacy, and weight-class language under realistic first-run pressure.
- Release owner checks for EAS/TestFlight/store distribution.
- Any product UX fix pass based on reviewed findings.
