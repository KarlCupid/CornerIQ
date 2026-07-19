# Premium Dark-Glass Design QA

final result: passed

## First-Login Welcome Screen Image-to-Code QA

### Reference and capture

- Selected source mock: `C:\Users\karll\.codex\generated_images\019f7419-db17-7ef3-a083-a4dced6bbae4\exec-890270a1-07ec-4720-9f84-4c81125a0509.png`
- Implementation capture: `qa-artifacts/design-qa/welcome-implementation-final.png`
- Full-view side-by-side comparison: `qa-artifacts/design-qa/welcome-comparison-final.png`
- Focused content comparison: `qa-artifacts/design-qa/welcome-comparison-detail-final.png`
- Viewport: 390 x 844 CSS pixels
- State: first authenticated visit before onboarding starts, using the local E2E account path without Supabase credentials.

### Comparison history

- Pass 1 exposed document overflow from the web image element, which clipped the wordmark and shifted the whole composition upward.
- Pass 2 fixed the viewport geometry and card wrapping, then exposed a clipped welcome heading and a background crop that did not match the centered ring-corner reference.
- Pass 3 introduced a clean, text-free ring background derived from the selected reference and corrected the heading size.
- Final pass tightened the subtitle measure and removed welcome-screen-owned deprecated pointer-event props. The final full and focused composites were reviewed together against the source.

### Final visual findings

- No P0, P1, or P2 mismatch remains.
- The centered ring post, blue overhead lights, dark negative space, wordmark, welcome hierarchy, cyan glass border, copy groups, primary action, and quiet sign-out action match the approved direction.
- Runtime text is slightly crisper and heavier than text in the generated raster mock, but the typography, wrapping, spacing, and hierarchy remain faithful and readable.
- The primary button keeps a 54px minimum touch target and the sign-out action keeps a 44px minimum touch target, so the lower card is marginally taller than the idealized mock while preserving mobile accessibility.

### Functional QA

- `Sign out` returned to the authentication screen.
- `Start setup` opened onboarding step 1 of 6.
- The per-user setup-started marker was covered by automated tests so returning users resume onboarding instead of seeing the welcome screen again.
- Browser console review found no errors. The only warning observed during the combined auth-to-welcome check is the existing React Native Web `pointerEvents` deprecation from the authentication background shell, outside this screen.
- The structured local browser audit passed all 11 scenarios, including full first-time onboarding and mobile-size smoke coverage.

## References

- Today / mixed cards: `C:\Users\karll\.codex\generated_images\019f10e3-29d8-7193-97f0-639f401e509d\ig_0ee5d6ad45cd1889016a41ca93f2d88198b13ba4263d65d972.png`
- Train option 2: `C:\Users\karll\.codex\generated_images\019f10e3-29d8-7193-97f0-639f401e509d\ig_05fda47f4c667283016a41c8b262f08198a95c5677c45e33d1.png`
- Fuel: `C:\Users\karll\.codex\generated_images\019f10e3-29d8-7193-97f0-639f401e509d\ig_0ee5d6ad45cd1889016a41cb0768508198892a3daa8640ede3.png`
- Plan / profile accents: `C:\Users\karll\.codex\generated_images\019f10e3-29d8-7193-97f0-639f401e509d\ig_0ee5d6ad45cd1889016a41cb4de5a08198a79f9f2fa7190e2e.png`

## Captures Reviewed

- `qa-artifacts/browser-audit/current/screenshots/mobile-first-viewport-01-today.png`
- `qa-artifacts/browser-audit/current/screenshots/mobile-first-viewport-02-train.png`
- `qa-artifacts/browser-audit/current/screenshots/mobile-first-viewport-03-fuel.png`
- `qa-artifacts/browser-audit/current/screenshots/mobile-first-viewport-04-plan.png`
- `qa-artifacts/browser-audit/current/screenshots/mobile-first-viewport-05-profile.png`

## Pass Criteria

- Floating tab bar keeps the approved translucent rounded pill, raised active circular glow, muted inactive tabs, and safe-area behavior.
- Today, Train, Fuel, and Plan use the premium dark-glass surface system: thin dividers, slimmer borders, subtle glow, restrained radii, compact metric/timeline rows, and domain accent colors.
- Train follows the approved option 2 structure most closely: image-led hero, large workout title, compact metadata chips, violet primary action, text-link details, and timeline session plan.
- Fuel preserves amber unknown/caution semantics; missing data is not shown as safe or normal.
- Manual input, optional private cycle support, and confidence-only wearable language remain visible without requiring a wearable.
- No broad fitness, MMA, sparring, contact drill, fight simulation, or unsafe weight-cut pressure was introduced.
- Icon/splash files are wired in `app.json`; this QA note verifies presence only, not final App Store artwork acceptance.

## Resolved Audit Findings

- P1: Bottom dock overlap/content bleed was resolved by tightening tab-screen bottom padding while keeping the floating rounded glass pill safe-area aware.
- P1: Fuel unknown state mismatch was resolved. Today and Fuel both show missing fuel as amber `Unknown`, not safe/normal.
- P2: Cheap/generated hero feel was reduced by keeping subtle tab hero assets while removing full-screen background images from app screens.
- P2: Train visual structure was brought closer to the mock: hero image emphasis, larger title section, violet action hierarchy, and timeline-style session plan.
- P2: Plan now keeps the week summary and Adjust Plan action without the completion ring or week-details accordion.

## Remaining P3 Polish

- The app font stack renders heavier in the Expo web capture than the generated mock typography, especially on small labels and card body copy.
- Real product data creates denser copy than the idealized mockups. Some truncation/line wrapping is intentional to keep engine-owned safety copy intact.
- Profile has no dedicated approved full-screen reference, so it follows the cool neutral glass language rather than claiming exact 1:1 fidelity.
- Browser captures are 430x932 mobile QA screenshots; the reference images are taller generated portrait comps, so exact vertical card count per viewport is approximate.

No P0/P1/P2 visual, navigation, or safety blockers remain in the reviewed mobile captures.
