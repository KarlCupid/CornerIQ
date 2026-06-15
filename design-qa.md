# Product Design QA - Tab Photo Headers

- source visual truth path: `C:/Users/karll/Downloads/ChatGPT Image Jun 14, 2026, 10_57_13 PM (2).png`
- implementation screenshot path: `qa-artifacts/browser-audit/current/screenshots/00-focused-mobile-today-hero.png`
- comparison evidence: `qa-artifacts/browser-audit/current/screenshots/design-qa-comparison.png`
- page-text evidence: `qa-artifacts/browser-audit/current/page-text/00-focused-mobile-today-hero.txt`
- viewport: mobile `390x844`
- state: local E2E demo profile on Today, `2026-05-19`, no Supabase credentials
- focused region comparison evidence: header and first content card are visible in the side-by-side comparison. A deeper focused crop was not needed because the requested work is the tab hero/header treatment, not the downstream dashboard data cards.

## Findings

No actionable P0/P1/P2 findings remain.

The implementation uses the supplied visual language: dark photographic hero, tab-specific accent, framed icon, uppercase title treatment, short subtitle, and matching bottom-tab icons. The real app content below the header intentionally remains engine/view-model driven, so readiness values and action labels differ from the static mock.

## Required Fidelity Surfaces

- Fonts and typography: passed. The app uses the existing CornerIQ heavy display hierarchy with uppercase visual transform, 0 letter spacing, and tighter subtitle sizing. It is not an exact font clone of the mock, but the weight, hierarchy, and wrapping match the app's current system.
- Spacing and layout rhythm: passed. The header keeps safe top spacing, rounded 20px photo framing, a 52px icon frame, and enough gap before the primary task card. The local E2E banner is test-only and not part of production UI.
- Colors and visual tokens: passed. Today cyan, Train purple, Fuel amber, Plan green, and Profile neutral/blue-gray map to the supplied prompt and existing theme tokens.
- Image quality and asset fidelity: passed. The five hero photos are real local PNG assets cropped from the supplied prompt image, with no CSS art or placeholder imagery.
- Copy and content: passed. Header copy matches the supplied prompt; lower-screen copy remains app-specific safety/performance copy.

## Patches Made

- Added five local hero image assets under `assets/backgrounds/`.
- Added `tabHeroHeaders` config for Today, Train, Fuel, Plan, and Profile.
- Expanded `ScreenHeader` into a reusable photo hero while preserving the simple title-only path for onboarding and other non-tab screens.
- Wired all five tab screens to the new hero config.
- Updated Fuel, Plan, and Profile tab icons to match the supplied prompt direction.
- Added a static guard that verifies hero assets and tab/header icons stay wired.

## Verification

- `cmd /c npm install`: passed
- `cmd /c npm run typecheck`: passed
- `cmd /c npm test`: passed, 569 passed and 1 live-smoke test skipped
- `cmd /c npm run lint`: passed
- `cmd /c npm run quality`: passed, 569 passed and 1 live-smoke test skipped
- `cmd /c npm run preflight:beta`: passed with existing Apple submission warnings for final icon, splash, and privacy policy URL
- `cmd /c npm run qa:agent:audit`: blocked by an existing onboarding-copy assertion before reaching Today: expected `Used for age-based safety rules.`
- focused mobile capture: passed via `qa-artifacts/scripts/capture-focused-mobile-today.mjs`

## Follow-up Polish

- P3: The Today hero is intentionally darker and more compact than the phone mock because it sits inside the existing CornerIQ scroll surface and below the local E2E banner. A later full app redesign could make the photo full-bleed at the very top like the mock.

final result: passed
