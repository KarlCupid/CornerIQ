# CornerIQ Design QA

final result: passed

## Opening Bell Full-Bleed Hero Correction

### Reference and capture

- Source device feedback - Sign In: `C:\Users\karll\Downloads\IMG_0151.PNG`
- Source device feedback - Welcome: `C:\Users\karll\Downloads\IMG_0152.PNG`
- Corrected Sign In capture: `qa-artifacts/design-qa/auth-full-bleed-fix-390x844.png`
- Corrected Welcome capture: `qa-artifacts/design-qa/welcome-full-bleed-fix-390x844.png`
- Combined comparison: `qa-artifacts/design-qa/auth-welcome-full-bleed-comparison.png`
- Viewport: 390 x 844 CSS pixels. The orange banner and green notice are local-only test surfaces and are excluded from product-fidelity judgments.

### Finding and correction

- The supplied iPhone captures exposed a P2 layout issue: the photo layer stopped before the physical right edge while the rest of each screen remained full width.
- The root cause was content padding applied directly to `ImageBackground`, which also constrained its native image layer.
- Both heroes now use an explicit, absolutely positioned full-width image beneath a separately padded content overlay. The logo, headline, supporting copy, crop, and body spacing remain unchanged.
- Browser geometry confirms each hero image spans from `left: 0` through the full 390-point viewport width on Sign In and Welcome, with no remaining right-edge strip.
- Final confirmation of the platform-specific behavior remains a physical-iPhone review item; the implementation and responsive browser comparison have no remaining actionable P0, P1, or P2 issue.

final result: passed

## Opening Bell Device Refinement QA

### Reference and capture

- Source device feedback — Sign In: `C:\Users\karll\Desktop\WhatsApp Image 2026-07-19 at 1.09.12 AM.jpeg`
- Source device feedback — Welcome: `C:\Users\karll\Desktop\WhatsApp Image 2026-07-19 at 1.09.13 AM.jpeg`
- Selected design board: `C:\Users\karll\.codex\generated_images\019f7419-db17-7ef3-a083-a4dced6bbae4\exec-c69cc44b-000c-40d2-9fdc-91429283fb53.png`
- Refined Sign In capture: `qa-artifacts/design-qa/auth-opening-bell-v2-360x800.png`
- Refined Welcome capture: `qa-artifacts/design-qa/welcome-opening-bell-v2-360x800.png`
- Secondary 390 x 844 captures: `qa-artifacts/design-qa/auth-opening-bell-v2-390x844.png` and `qa-artifacts/design-qa/welcome-opening-bell-v2-390x844.png`
- Device-feedback comparison: `qa-artifacts/design-qa/auth-welcome-device-feedback-comparison-v2.png`
- Selected-board comparison: `qa-artifacts/design-qa/auth-welcome-comparison-v2.png`
- Viewports: 360 x 800 to match the supplied phone captures, plus the Product Design 390 x 844 baseline.
- States: local-only E2E Sign In and first-login Welcome. The orange E2E banner and green local sign-in notice are test-only surfaces and are excluded from product-fidelity judgments.
- The individual 360 x 800 screenshots provide focused, readable evidence for typography, crop, fields, and actions; separate detail crops were unnecessary.

### Comparison history

- Pass 0 found a P1 Welcome composition failure: the hero image ended through the approved subtitle, the dark seam clipped that copy, and the headline sat too close to the image boundary.
- Pass 0 also found P2 polish drift on both screens: landscape photos were being aggressively center-cropped into shallow phone headers, boxing subjects became oversized, and the form controls lacked a deliberate focus and grouping system.
- Pass 1 regenerated both photographs for the real mobile slots, positioned every important subject inside the center-crop safe region, removed percentage sizing from the background image layer, and rebuilt the responsive hero spacing.
- Pass 1 constrained Welcome to a stable two-line display heading, preserves the complete subtitle above the seam, and uses the lower viewport with a space-between body layout so actions remain balanced and visible without scrolling.
- Pass 1 refined labels, input surfaces, focus borders, the password icon, button feedback, action grouping, and the shared sharp 6px control language.
- Post-fix device and selected-board comparisons found no remaining actionable P0, P1, or P2 mismatch.

### Required fidelity surfaces

- Fonts and typography: the Bebas Neue display system and Inter Tight UI system remain intact; headings no longer clip or wrap unexpectedly at either tested phone width.
- Spacing and layout rhythm: both heroes now reserve complete copy space, Sign In retains a deliberate form buffer, and Welcome uses its full body height without the previous dead lower region.
- Colors and tokens: warm ivory photography, near-black surfaces, graphite field borders, and CornerIQ cyan remain consistent with the selected onboarding direction.
- Image quality and asset fidelity: the v2 glove and ring photographs were regenerated for center cropping, keep subjects restrained on the right, and preserve clean left-side copy fields without hard tonal boundaries.
- Copy and content: approved Sign In and Welcome wording remains unchanged and fully visible.

### Functional QA

- Filled Email and Password and confirmed Sign In transitions to the first-login Welcome screen.
- Confirmed `Start setup` transitions to `Basic information`.
- Confirmed Welcome fits at 360 x 800 and 390 x 844 without scrolling or clipped primary actions.
- Confirmed the browser console remained free of errors through the target flow.

final result: passed

## Opening Bell Auth And Welcome Image-to-Code QA

### Reference and capture

- Source visual truth: `C:\Users\karll\.codex\generated_images\019f7419-db17-7ef3-a083-a4dced6bbae4\exec-c69cc44b-000c-40d2-9fdc-91429283fb53.png`
- Sign In implementation: `qa-artifacts/design-qa/auth-opening-bell-390x844-pass1.png`
- Welcome implementation: `qa-artifacts/design-qa/welcome-opening-bell-390x844-pass1.png`
- Full-view comparison: `qa-artifacts/design-qa/auth-welcome-comparison-pass1.png`
- Viewport: 390 x 844 CSS pixels.
- States: local-only E2E Sign In with its test notice, followed by the first-login Welcome screen.
- The individual phone captures retain readable text and control detail, so they also serve as the focused comparison evidence; a separate crop was not needed.

### Comparison history

- Pass 1 found no P0, P1, or P2 visual mismatches.
- The implementation intentionally gives the Sign In form more breathing room and scales both photographs below the source board proportions, matching the request that the graphics remain restrained.
- The wider source-board compositions were adapted to a real phone aspect ratio without changing the intended hierarchy.
- Local E2E banners and notices are test-only surfaces and are excluded from product-fidelity judgments; the Sign In view remains scrollable when those test surfaces reduce its available height.

### Required fidelity surfaces

- Typography: dark editorial wordmarks and Bebas Neue display headings match the selected onboarding language, with Inter Tight retained for supporting copy and controls.
- Spacing: the form begins after a deliberate dark-space buffer, and the welcome actions fit within the phone viewport without scrolling.
- Colors: warm ivory photography, near-black body surfaces, cyan rules and primary actions, and restrained graphite borders carry the established onboarding palette through both screens.
- Imagery: Sign In uses hanging boxing gloves; Welcome uses an empty ring and stool. Both are distinct from each other and from the onboarding ring-post image.
- Copy: Sign In reads `SIGN IN` with `Access your training plan.`; Welcome reads `WELCOME TO CORNERIQ` without the conflicting repeated welcome language.

### Functional QA

- Entered local test credentials and confirmed Sign In transitions to the first-login Welcome screen.
- Confirmed `Start setup` transitions from Welcome to `Basic information`.
- Confirmed the browser console remained free of errors through the target flow.
- Verified controls preserve at least 44px touch targets and the primary actions use the selected sharp 5px corner treatment.

final result: passed

## Real-Device Onboarding Cleanup QA

### Reference and capture

- Source visual truth: `C:\Users\karll\Desktop\WhatsApp Image 2026-07-18 at 11.49.45 PM.jpeg`
- Refined implementation: `qa-artifacts/design-qa/onboarding-cleanup-basic-430x932.png`
- Refined selection controls: `qa-artifacts/design-qa/onboarding-cleanup-training-days-430x932.png`
- Full-view comparison: `qa-artifacts/design-qa/onboarding-cleanup-comparison.png`
- Focused form comparison: `qa-artifacts/design-qa/onboarding-cleanup-controls-comparison.png`
- Viewport: 430 x 932 CSS pixels, matching the source capture's aspect ratio.
- State: onboarding step 1 with age 25 and `Prefer not to say` selected; training-days controls were reviewed separately on step 3.

### Comparison history

- The source capture exposed P2 clipping risk in condensed section headings, soft low-contrast control outlines, and an oversized native-storage warning that interrupted the form hierarchy.
- The cleanup pass increased condensed-font line boxes and font padding, strengthened the shared outline tokens, gave inputs and options consistent 5px corners and raised surfaces, refined selected states, and added a cyan focus state for text inputs.
- The native draft warning was traced to a runtime-computed import that Metro could not bundle reliably. The draft hook now imports the installed native storage package directly; the refined capture confirms the warning no longer appears.
- The post-fix full and focused comparisons show complete heading glyphs, clearer grouping, sharper controls, and no lost onboarding functionality.

### Required fidelity surfaces

- Fonts and typography: Bebas Neue remains the display face; header and section line heights now preserve complete ascenders and descenders without clipping.
- Spacing and layout rhythm: removing the false storage warning restores the intended step-to-form transition; control padding and 5px radii are consistent across the shared system.
- Colors and tokens: neutral outlines are slightly brighter, selected cards use a deeper cyan-black surface, and cyan remains reserved for progress, focus, and selection.
- Image quality: the existing generated ring-corner asset remains sharp and correctly cropped at the 430 x 932 viewport.
- Copy and content: all approved onboarding questions and helper copy remain unchanged; only the false storage warning disappears when native persistence is available.

### Final findings

- No actionable P0, P1, or P2 visual issue remains in the reviewed basic-information and training-days states.
- The form remains intentionally scrollable because step 1 contains the full basic-information and measurement set.
- Remaining differences between the physical screenshot and browser capture are native status-bar chrome and platform font rasterization, not product layout drift.
- The final structured browser audit passed all 11 scenarios after the local Playwright browser dependency was restored.
- The final quality run passed 903 tests; the single live-database smoke test remains intentionally skipped.

## Championship Flow Onboarding Image-to-Code QA

### Reference and capture

- Selected source mock: `C:\Users\karll\.codex\generated_images\019f7419-db17-7ef3-a083-a4dced6bbae4\exec-9515fc2f-ed85-427f-a962-e35da8367459.png`
- Generated, reusable header asset: `assets/backgrounds/onboarding-championship-ring.png`
- Implementation capture: `qa-artifacts/design-qa/onboarding-championship-training-days-390x844.png`
- Full-view side-by-side comparison: `qa-artifacts/design-qa/onboarding-championship-comparison.png`
- Focused control comparison: `qa-artifacts/design-qa/onboarding-championship-comparison-controls.png`
- Viewport: 390 x 844 CSS pixels
- State: onboarding step 3 with dumbbells, heavy bag, Monday, Wednesday, Friday, and Saturday selected through the local E2E account path.

### Comparison history

- Pass 1 exposed a header crop that showed only the empty left side of the generated ring image.
- Pass 2 rebuilt the reusable asset for its measured 430 x 340 slot and correctly placed the ring corner behind the header.
- Pass 3 exposed scroll position carrying between steps and a local draft-resume notice that crowded the branded composition.
- Final pass resets scroll position on every step, keeps routine resume text out of the visual hierarchy, compacts the controls, and fits the complete training-days task and actions into the 390 x 844 viewport.

### Final visual findings

- No P0, P1, or P2 mismatch remains in the full-view or focused comparison.
- The warm photographic header, black diagonal seam, condensed uppercase typography, cyan progress and selection states, dark equipment grid, unified weekday rail, and bottom Back/Next flow match the selected direction.
- The implementation deliberately shows step 3 of 6 rather than the mock's step 3 of 5 because CornerIQ's approved onboarding still contains six functional steps.
- The implementation uses the app's real copy, equipment model, schedule data, validation, and engine-backed draft behavior rather than mock-only content.
- Selected and unselected controls maintain clear contrast and 44px-or-larger interaction targets.

### Functional QA

- The local browser journey reached and rendered all six onboarding steps in order.
- Equipment and weekday selections updated visibly, Back and Next remained operable, and every step reset to its top when opened.
- Existing-training, cycle-support, and goal controls remained interactive with their prior draft and validation behavior.
- The structured local browser audit passed all 11 scenarios, including the real-input six-step onboarding journey and mobile-size smoke coverage.
- The final repository quality run passed 903 tests; the single live-database smoke test remains intentionally skipped.

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
