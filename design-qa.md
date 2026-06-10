# Product Design QA - Bottom Navigation/Tab Tuning

- source visual truth path: `qa-artifacts/browser-audit/current/screenshots/10-today-after-real-onboarding.png`
- implementation screenshot paths: `qa-artifacts/browser-audit/current/screenshots/10-today-after-real-onboarding.png`, `qa-artifacts/browser-audit/current/screenshots/12-fuel-screen.png`, `qa-artifacts/browser-audit/current/screenshots/11-mobile-today-after-real-onboarding.png`, `qa-artifacts/browser-audit/current/screenshots/smoke-06-mobile-live-workout-player.png`
- viewport: desktop `1280x900`; mobile Today and workout smoke captured at `390x844`
- state: local E2E demo after onboarding on `2026-05-19`; mobile live-workout smoke uses the `due_workout_today` scenario on `2026-05-18`
- full-view comparison evidence: `qa-artifacts/browser-audit/current/screenshots/design-nav-tabs-contact-sheet.png`
- focused region comparison evidence: the full-view contact sheet was enough for the bottom navigation and workout dock because the acceptance target was tab size, placement, label position, active state, and colour treatment across screen widths.

## Findings

No actionable P0/P1/P2 findings remain.

P3 follow-up only: the mobile Today screenshot still shows a local Expo/dev overlay in the lower-left corner. It is not in the app source and the browser audit confirms the tab bar remains clickable, but physical-phone review should still check safe-area feel, thumb reach, and whether any development overlay hides the launch build.

## Patches Made

- Bottom tab labels are forced below icons across viewports, avoiding the desktop/tablet side-label drift.
- The tab bar is shorter and tighter, with centered items, no fixed-width collapse, and a smaller active marker around the icon.
- Active tabs now use one CornerIQ cyan treatment instead of per-tab rainbow colours.
- Inactive tabs use a softer blue-gray tint and the bar uses a calmer dark surface with a lighter top border.
- A fixed-width tab experiment was caught by browser QA because it intercepted the Fuel tab click; that approach was removed before final verification.
- `docs/qa/QA_LOOP_STATE.md` records the 2026-06-10 navigation verification pass and remaining human-review boundaries.

## Verification

- `cmd /c npm install`: passed
- `cmd /c npm run typecheck`: passed
- `cmd /c npm test`: passed, 554 tests passed and 1 live-smoke test skipped
- `cmd /c npm run lint`: passed
- `cmd /c npm run quality`: passed
- `cmd /c npm run preflight:beta`: passed
- `cmd /c npm run qa:agent:audit`: final approved rerun passed, 10/10 scenarios

final result: passed
