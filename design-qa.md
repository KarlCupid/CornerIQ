# Product Design QA - Card/Text Rollout

- source visual truth path: `qa-artifacts/browser-audit/current/screenshots/10-today-after-real-onboarding.png`
- implementation screenshot paths: `qa-artifacts/browser-audit/current/screenshots/12-fuel-screen.png`, `qa-artifacts/browser-audit/current/screenshots/16-train-screen.png`, `qa-artifacts/browser-audit/current/screenshots/20-plan-screen.png`, `qa-artifacts/browser-audit/current/screenshots/25-profile-settings-signout.png`
- viewport: desktop `1280x900`; mobile Today smoke also captured at `390x844`
- state: local E2E demo after onboarding, date `2026-05-19`
- full-view comparison evidence: `qa-artifacts/browser-audit/current/screenshots/design-card-rollout-contact-sheet.png`
- focused region comparison evidence: focused regions were not needed after the contact sheet because the acceptance target was shared card/text language across full screens, not pixel fidelity for a single component crop.

## Findings

No actionable P0/P1/P2 findings remain.

P3 follow-up only: Plan's day cells and chart tiles are intentionally denser than the simple Today cards because they carry schedule/chart structure. They match the updated card shell and title treatment but should still get human designer review on a physical phone before external launch readiness.

## Patches Made

- Shared `DashboardCard` defaults now use compact density and quiet title-case headers.
- Fuel and Train top cards now use primary-led action layouts with quiet status rails.
- Train fuel/hydration helper content now sits in a quiet rail instead of nested helper cards.
- Profile athlete context uses a compact status strip, and Profile settings groups use shared dashboard cards.
- App shell and browser-audit assertions were updated from old uppercase/card labels to the new title-case treatment.
- `docs/qa/QA_LOOP_STATE.md` records the 2026-06-10 verification pass and remaining human-review boundaries.

## Verification

- `cmd /c npm install`: passed
- `cmd /c npm run typecheck`: passed
- `cmd /c npm test`: passed, 554 tests passed and 1 live-smoke test skipped
- `cmd /c npm run lint`: passed
- `cmd /c npm run quality`: passed
- `cmd /c npm run preflight:beta`: passed
- `cmd /c npm run qa:agent:audit`: final approved rerun passed, 10/10 scenarios

final result: passed
