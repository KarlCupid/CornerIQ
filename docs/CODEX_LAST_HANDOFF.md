# Codex Last Handoff

Date: 2026-05-22 00:25 America/Vancouver

Pass: Focused onboarding refinement after second human QA review.

Current branch during this pass: `main`

Commit target for this run: `Refine onboarding decision inputs`.

## Human QA Findings Addressed

- Boxer levels needed short, objective definitions so athletes can choose a level without knowing internal engine terms.
- Training availability was too vague with windows/frequency chips; it needed Monday-Sunday day selection.
- Protected anchors needed RPE input instead of easy/moderate/hard/max copy.
- Safety screening collected medication names and broad medical notes; onboarding should only collect safety restrictions that actually make the engine more conservative.

## What Changed

- Added mobile-sized boxing level definitions for aspiring boxer, amateur tiers, developing pro, and pro round contexts.
- Changed training availability chips to Monday through Sunday and kept optional availability notes for work, school, travel, or gym constraints.
- Updated onboarding defaults to store day-of-week availability strings such as `monday`, `wednesday`, and `saturday`.
- Replaced protected-anchor intensity chips with RPE 1-10 chips.
- Mapped RPE into the existing protected-workout intensity field without a schema or Supabase migration:
  - RPE 1-3 -> `easy`
  - RPE 4-6 -> `moderate`
  - RPE 7-8 -> `hard`
  - RPE 9-10 -> `max`
- Added selected RPE to protected anchor notes and summaries, for example `Weekly Tuesday - Pads or mitts - 60 min - RPE 6`.
- Removed medication collection from onboarding UI. The draft data shape remains unchanged and onboarding updates keep `medications` empty.
- Replaced free-form medical flags with engine-relevant safety restriction chips. This matches `assessMedicalReview`, where non-empty `medicalFlags` trigger review.
- Kept prior adverse weight-cut events and eating/weight-cut risk context.
- Updated component tests, static QA checks, and Playwright agent audit expectations for definitions, weekday availability, RPE, no medication UI, and constrained safety copy.

## Audit Result

The full onboarding audit passed in the final required run.

Latest generated report: `qa-artifacts/reports/agent-browser-audit-latest.md`

Final Playwright summary:

- `full first-time onboarding uses real inputs before Today`: passed
- `first launch reaches auth, local demo onboarding, Today, and quick logs`: passed
- `mobile-size browser layout smoke reaches Today`: passed

`docs/KNOWN_GAPS.md` was not updated because this pass did not introduce a new unresolved limitation.

## Commands Run

- `cmd /c npm run typecheck`: passed during the implementation check.
- `cmd /c npx vitest run src/tests/app/appShell.test.ts src/tests/static/agentQaStatic.test.ts`: sandboxed run failed with the known Windows/esbuild config access issue; approved rerun outside the sandbox passed with `80` tests.
- `cmd /c npm run qa:agent:audit`: development run passed with `3` Playwright tests.
- `cmd /c npm install`: passed.
- `cmd /c npm run typecheck`: passed.
- `cmd /c npm test`: sandboxed run failed with the known Windows/esbuild config access issue; approved rerun outside the sandbox passed with `372` tests passed and `1` skipped.
- `cmd /c npm run lint`: passed.
- `cmd /c npm run quality`: sandboxed run failed when the nested Vitest command hit the same Windows/esbuild config access issue; approved rerun outside the sandbox passed with `372` tests passed and `1` skipped.
- `cmd /c npm run preflight:beta`: passed.
- `cmd /c npm run qa:agent:audit`: final required run passed with `3` Playwright tests.

Notes:

- After the final chip-width polish, `cmd /c npm run typecheck`, approved `cmd /c npm test`, `cmd /c npm run lint`, approved `cmd /c npm run quality`, `cmd /c npm run preflight:beta`, and `cmd /c npm run qa:agent:audit` were rerun with the same passing results.
- The local QA web startup still logs the existing non-blocking React Native DevTools dotslash fallback error; Metro continues and Playwright passes.
- Vitest still emits existing `react-test-renderer` deprecation output and one existing onboarding `act(...)` warning.
- Generated `qa-artifacts/` reports, screenshots, traces, videos, and JSON were not committed.

## Human Testing Still Required

- Human review of the new onboarding wording on a phone-sized screen, especially boxing level definitions, day-of-week availability, RPE selection, and safety restriction phrasing.
- Real Supabase auth, email confirmation, account/session edge cases, and real beta data.
- Physical iPhone/Android keyboard, safe-area, touch, scrolling, and device performance.
- Confirm that constrained medical safety choices feel clear without asking for full medical history.
- Release owner checks for EAS/TestFlight/store distribution remain separate and were not touched.
