# CornerIQ Premium Dark-Glass Fidelity Audit

Date: 2026-06-28

## Scope

Convert the existing CornerIQ app UI toward the approved premium dark-glass mockups while preserving the current product structure, engine-owned behavior, original domain theming, and AGENTS.md safety rules.

This is not a product feature audit. It is a visual fidelity and implementation-readiness audit for the current second pass.

## Reference Sources

- Train / floating nav: `C:/Users/karll/.codex/generated_images/019f10e3-29d8-7193-97f0-639f401e509d/ig_05fda47f4c667283016a41c8b262f08198a95c5677c45e33d1.png`
- Mixed Today cards: `C:/Users/karll/.codex/generated_images/019f10e3-29d8-7193-97f0-639f401e509d/ig_0ee5d6ad45cd1889016a41ca93f2d88198b13ba4263d65d972.png`
- Fuel amber/orange: `C:/Users/karll/.codex/generated_images/019f10e3-29d8-7193-97f0-639f401e509d/ig_0ee5d6ad45cd1889016a41cb0768508198892a3daa8640ede3.png`
- Plan/Profile accents: `C:/Users/karll/.codex/generated_images/019f10e3-29d8-7193-97f0-639f401e509d/ig_0ee5d6ad45cd1889016a41cb4de5a08198a79f9f2fa7190e2e.png`

All approved mockups are portrait `853x1844`.

## Current Evidence State

- Last accepted first-pass captures live under `qa-artifacts/mock-fidelity/current/`.
- Second-pass capture attempts under `qa-artifacts/mock-fidelity/second-pass/` are not valid tab-screen evidence because the local session was still in onboarding.
- Fresh fidelity QA needs mobile portrait captures after the local E2E shortcut reaches Today, then tab navigation to Train, Fuel, Plan, and Profile.
- The local E2E banner is test-only and should remain visible in agent QA, but production device acceptance needs captures without that banner.

## What The Second Pass Improved

- Today now exposes mixed default cards instead of hiding the app's main tab content behind details.
- Today check-in, Training Today, Fuel Today, This Week, and Athlete Context are closer to the mock's stacked dark-glass card model.
- Train now has planned/readiness hero metadata, icon chips, and a stronger primary action.
- Fuel now has a less generic lead card, one dominant orange action, a three-up metric strip, and weight trend in the first overview.
- Plan now moves toward the mock hierarchy: plan summary, objective, upcoming sessions, then detailed calendar context.
- Shared `PremiumCard`, accent rail, and `LuminousScreen` spacing moved closer to the mocks.

## Main Fidelity Gap

The UI is no longer blocked mainly by component styling. It is blocked by assets and rendering detail.

The approved mockups rely on dark photographic environments behind the entire first viewport: corner pad/ropes for Today, heavy bag/window/ring depth for Train, meal tray/shaker for Fuel, and notebook/ropes for Plan. Current bundled assets are close in dimensions but not close enough in subject, crop, and full-screen texture to produce a 1:1 result.

## Asset Inventory

Current runtime dimensions:

- Full-screen backgrounds: `852x1846`
- Hero crops: `758x492`
- Approved mockups: `853x1844`

Adequate for now:

- `assets/backgrounds/tab-fuel-hero.png`: close subject, meal tray/shaker.
- `assets/backgrounds/tab-plan-hero.png`: close subject, notebook/pen.
- `assets/plan-calendar-icons/*.png`: technically usable because Plan tints them at render time.
- `assets/app-icon.png` and `assets/splash-screen.png`: out of scope for this mock fidelity pass.

Replace or regenerate:

- `assets/backgrounds/screen-today-background.png`
- `assets/backgrounds/screen-train-background.png`
- `assets/backgrounds/screen-fuel-background.png`
- `assets/backgrounds/screen-plan-background.png`
- `assets/backgrounds/tab-today-hero.png`
- `assets/backgrounds/tab-train-hero.png`
- `assets/backgrounds/tab-fuel-hero.png`
- `assets/backgrounds/tab-plan-hero.png`

Asset generation requirements:

- Generate background-only images with no baked UI, no text, no controls, and no status data.
- Prefer `852x1846` PNG for drop-in replacement, unless code/tests are intentionally updated to `853x1844`.
- Generate hero crops at `758x492`.
- Keep subjects in the upper/right half with dark negative space in the upper-left for title text.
- Keep visuals boxing-specific and non-contact: bags, ropes, corner pads, notebooks, food, shaker, gear.
- Do not generate sparring, contact drills, fight simulation, unsafe cut imagery, or broad combat-sports defaults.

Strongest replacement priorities:

1. Today full-screen background and hero crop: current subject misses the corner-pad composition.
2. Train full-screen background and hero crop: current crop misses the bag/window/ring-depth composition.
3. Fuel full-screen background: current full-screen texture is still too abstract compared with the mock.
4. Plan full-screen background: current full-screen texture is close but needs more premium notebook/rope depth.

## Dependency Decision

Existing dependencies already cover most UI:

- `@expo/vector-icons` for Ionicons.
- React Native `Image` / `ImageBackground` for bundled backgrounds and heroes.
- `@react-navigation/bottom-tabs` for the floating dock.
- Existing design files: `luminousTheme.ts`, `glass.ts`, `LuminousScreen.tsx`, `PremiumPrimitives.tsx`.

Add:

- `react-native-svg`: justified for smooth fuel trend lines, circular progress rings, precise arcs, and crisp vector marks. This avoids pulling in a heavy chart package.

Defer unless visual QA proves they are needed:

- `expo-linear-gradient`: useful for richer CTAs, but solid/glow buttons can hold until screenshots prove the miss.
- `expo-blur`: only if true native blur is required; RGBA glass is simpler and safer.
- `expo-image`: only if regenerated photographic assets become large enough to need different caching/decoding behavior.

Do not add:

- A general chart package. The app already has custom visual primitives; SVG is enough.

## Screen-Specific Remaining Deltas

### Today

- Match the mixed-card mock more tightly: larger icon column, quieter card fill, stronger but thinner vertical accent rail.
- Preserve caution/unknown treatment. Missing readiness remains unknown, never safe.
- Keep manual input and setup context visible without making wearables mandatory.

### Train

- Regenerate the hero/background first. The mock's premium feel depends on the heavy-bag/window scene.
- Make the session plan timeline less boxed: thinner dividers, vertical connector, row chevrons, minimal nested card framing.
- Keep non-contact labeling and readiness gates even if the mock looks visually cleaner.

### Fuel

- Regenerate the full-screen warm food/shaker background.
- Use `react-native-svg` for the weight trend so it reads like the mock's smooth orange line instead of a blockier custom chart.
- Keep the large orange action but preserve safe copy: unknown fuel data is unknown, not clearance.
- Keep symptoms and cycle support private, optional, and row-based.

### Plan

- Add engine-owned progress data before rendering exact `25% / 4 of 16 weeks` values. Do not calculate or fake this in the screen.
- Replace the temporary `W1 active` ring with an SVG progress ring once engine data exists.
- Keep the detailed calendar available, but do not let it dominate the first viewport.

### Profile / Auth / Onboarding

- Bring forms and setup cards onto the same neutral dark-glass tokens.
- Fix the local/web white-root sizing issue before treating auth/onboarding screenshots as visually valid.
- Keep setup language neutral and private; do not introduce wearable-required UX.

## Visual QA Requirements

Before calling the redesign visually acceptable:

1. Start the local QA web app.
2. Reach Today through local E2E sign-in/onboarding shortcut.
3. Capture mobile portrait first-viewport screenshots for Today, Train, Fuel, Plan, and Profile.
4. Place each reference and implementation screenshot side-by-side at the same viewport/state.
5. Judge visible differences: crop, hierarchy, card radius, rail width, divider weight, button glow, nav overlap, and text overflow.
6. Re-run after every asset replacement, because `ImageBackground resizeMode="cover"` can crop differently across web/native sizes.

## Implementation Order From Here

1. Add `react-native-svg` with the Expo-compatible installer.
2. Replace the Today and Train background/hero assets first.
3. Replace Fuel and Plan full-screen backgrounds next.
4. Convert Fuel trend and Plan progress ring to SVG primitives.
5. Tighten timeline/list components after the assets land, not before.
6. Run focused tests, then full gates:
   - `cmd /c npm install`
   - `cmd /c npm run typecheck`
   - `cmd /c npm test`
   - `cmd /c npm run lint`
   - `cmd /c npm run quality`
   - `cmd /c npm run preflight:beta`
7. Run browser QA:
   - `cmd /c npm run qa:web`
   - `cmd /c npm run qa:agent:audit`
   - `cmd /c npm run qa:agent:report`

## Guardrails

- Engine first: business logic stays in deterministic engine/presentation modules.
- Screens read view models.
- No UI-owned safety, training, nutrition, or progress calculations.
- No generated sparring, contact drills, fight simulation, or broad combat-sports defaults.
- No unsafe weight-cut pressure.
- Manual input remains first-class.
- Wearables only increase confidence when fresh and consistent.
- Cycle support remains optional, private, and symptom-aware.
- Missing data remains unknown, not safe.
- Do not commit `qa-artifacts/`, screenshots with secrets, `.env`, `.env.*`, or generated artifacts unless explicitly requested.
