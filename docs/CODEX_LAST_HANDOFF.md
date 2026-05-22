# Codex Last Handoff

Date: 2026-05-21 16:54 America/Vancouver

Pass: First browser-test clarity pass for onboarding, auth, Today, and quick logs.

Current branch during this pass: `main`

Commit created in this run: `Improve onboarding and Today first-run clarity`.

## Tester Findings Summary

The first rough Windows/Chrome browser test reached Today and stopped because the first-time user experience was too unclear. Auth and onboarding were functional enough to proceed, but the tester did not understand several onboarding fields and had no clear first action on Today.

Main findings addressed:

- Boxing identity had an unlabeled training-age field.
- Body mass did not explain units, examples, or why each value mattered.
- Training access used ambiguous free-text fields.
- Protected anchors felt like dated one-off workouts instead of weekly commitments.
- Cycle and safety fields needed optional/private framing, and pregnancy choices were confusing after male selection.
- Goal phase did not explain each goal or fight/tournament extra fields.
- Sign-up copy was unclear.
- Today did not answer what to do first.
- Quick logs use 1-5, so the UI needed to explain that scale.

## Changes Made

- Added visible labels, helper text, and examples across onboarding fields.
- Replaced training-age text input with chips: `0`, `1`, `2`, `3-5`, and `6+`.
- Added human-readable boxing status, level, stance, cycle, wearable, and goal labels.
- Kept body-mass entry in kg/cm for this beta and made display-unit preference explicit.
- Replaced training-access comma-only inputs with equipment and availability preset chips plus optional custom notes.
- Reframed protected anchors as recurring weekly commitments with day, optional time of day, type, duration, and intensity. The UI maps them to current-week dates for the existing draft shape.
- Added plain safety copy, optional medical/medication/adverse-event labels, and hid pregnancy-specific choices when male sex-at-birth is selected.
- Made goal-phase choices self-explanatory and only shows fight/tournament fields when those modes are selected.
- Improved auth copy with sign-in/sign-up mode language and email-confirmation explanation.
- Added a Today `Start here` card, made Today's priority plain-English, moved detailed engine rationale lower, and kept `why this decision` collapsible.
- Added quick-log scale copy for 1-5 readiness values and success messages after saved logs.
- Added component/app-shell assertions for onboarding labels, Today Start here, quick-log 1-5 copy, recurring weekly anchors, and male safety pregnancy behavior.
- Added `docs/FIRST_BROWSER_TEST_FINDINGS.md`.
- Updated `docs/KNOWN_GAPS.md` with the first browser-test findings and remaining validation gap.

## Verification Results

- `cmd /c npm install`: passed.
- `cmd /c npm run typecheck`: passed.
- `cmd /c npm test`: sandboxed run failed before loading Vitest config due the known Windows/esbuild access-denied issue; approved rerun outside the sandbox passed with `368` tests passed and `1` skipped.
- `cmd /c npm run lint`: passed.
- `cmd /c npm run quality`: sandboxed run failed when the nested Vitest command hit the same Windows/esbuild access-denied issue; approved rerun outside the sandbox passed with `368` tests passed and `1` skipped.
- `cmd /c npm run preflight:beta`: passed.
- `cmd /c npm run web`: passed; Expo served web at `http://localhost:8081`.
- `Invoke-WebRequest -UseBasicParsing http://localhost:8081 | Select-Object -ExpandProperty StatusCode`: returned `200`.
- Headless Chrome screenshot smoke: passed with temporary profile and screenshot at `C:\tmp\corneriq-web-smoke-wait.png`, showing the rendered auth screen with the new sign-in copy and field labels.
- `cmd /c npm test -- src/tests/app/appShell.test.ts`: sandboxed run failed with the known Windows/esbuild config access error; approved rerun outside the sandbox passed with `76` tests passed.

Notes:

- Expo logged a non-blocking React Native DevTools fallback warning from dotslash while starting web. Metro still bundled successfully and the app served.
- Browser plugin skills are listed, but no callable Browser navigation/screenshot tools were exposed through tool search in this session. I used HTTP plus headless Chrome instead of adding Playwright.
- The full test suite still emits existing `react-test-renderer` deprecation output and an existing act warning in the onboarding render test.

## Remaining Known Gaps

- Rerun the first-time browser test from sign-up through Today after this pass lands.
- Validate the same onboarding and Today flow on a phone-sized viewport and physical device.
- Body-mass setup still asks for kg/cm in this beta even when the saved display preference is imperial.
- Protected weekly anchors are mapped to current-week dated records because the existing onboarding draft and Supabase persistence use dates.
