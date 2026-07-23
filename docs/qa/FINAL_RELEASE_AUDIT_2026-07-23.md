# Final Release Audit - 2026-07-23

> Historical audit baseline for `053465c`. The subsequent fix/verification state is tracked in `docs/qa/QA_LOOP_STATE.md` and the generated QA bundle.

- Audit date: 2026-07-23
- Commit tested: `053465cc17a0e294f99d4b0a22ccbd56f2bfcc57` (`053465c`)
- Branch: `codex/development`
- Audit type: observational launch-readiness review, with QA-harness repairs only
- Browser/viewports: Chromium desktop (`1280x900`) and mobile (`390x844`)
- QA bundle: `qa-artifacts/corneriq-agent-qa-bundle.zip`
- Automated analysis: `qa-artifacts/reports/agent-qa-analysis.md`
- Gate results: `qa-artifacts/reports/agent-gate-results.md`

## Decision

**Do not submit this build yet.**

The core app is in good shape locally: typecheck, lint, 914 automated tests, coverage, 11 browser journeys, deterministic safety scans, and engine persona review all passed. The redesigned main screens are visually consistent and the plan wizard's build, single-fight, and tournament paths are operable at a mobile viewport.

Submission is still blocked by two concrete release issues and several required external checks:

1. Expo Doctor reports `expo-asset` is not declared as a direct dependency required by `expo-audio`; Expo warns that a standalone build may crash even when Expo Go works.
2. The Apple-submission preflight fails because the paid build is not explicitly enabled and the RevenueCat iOS public SDK key is not configured.
3. There is no current iOS candidate artifact or physical-iPhone smoke for this commit, no live purchase/restore proof, and no current live Supabase/migration/auth proof.

## What Passed

| Area | Result | Evidence |
| --- | --- | --- |
| Install | Pass | `npm install`; 873 packages installed. |
| Typecheck | Pass | `npm run typecheck`. |
| Unit/integration | Pass | 914 passed; one live DB smoke intentionally skipped. |
| Lint | Pass | `npm run lint`. |
| Quality | Pass | `npm run quality`. |
| Coverage | Pass | Statements 87.79%, branches 83.49%, functions 89.70%, lines 87.79%. |
| Beta preflight | Pass with Apple warnings | `npm run preflight:beta`. |
| Apple submission preflight | Fail | Missing paid-build flag and RevenueCat iOS key. |
| Browser QA | Pass | 11/11 journeys, including expanded mobile plan-wizard coverage. |
| Engine output | Pass | No generated sparring/contact, hard-stop self-clear, unsafe cut language, secret exposure, or missing-data-as-safe result found. |
| Expo health | Fail | 17/18 checks; direct `expo-asset` peer declaration missing. |
| Dependency audit | Needs review | 11 production-tree advisories: 1 high and 10 moderate; the high item is PostCSS under Expo Metro. |
| GitHub status | Missing | No combined status or PR-triggered workflow run was returned for `053465c`. |

## Findings

### B1 - Standalone build dependency is incomplete

- Severity: Blocker
- Screen/flow: Native build/startup
- What the user may see: A standalone app can crash even though Expo Go and web QA work.
- Evidence: `npx expo-doctor` passed 17/18 checks and reported `expo-asset` as a missing required peer of `expo-audio`. `npm ls` confirms it exists only transitively; it is absent from the root `package.json` dependencies.
- Suspected owner/file: `package.json`, `package-lock.json`
- Fix pass required: yes

### B2 - Paid Apple submission configuration fails closed

- Severity: Blocker
- Screen/flow: App Store subscription gate
- What the user may see: A paid iOS build cannot be submitted with the intended subscription behavior.
- Evidence: `CORNERIQ_APPLE_SUBMISSION=1 npm run preflight:production` exits 1 for missing `EXPO_PUBLIC_CORNERIQ_PAYWALL_ENABLED=1` and `EXPO_PUBLIC_CORNERIQ_REVENUECAT_IOS_API_KEY`.
- Suspected owner/file: EAS production environment and RevenueCat/App Store Connect configuration
- Fix pass required: yes

### H1 - The current release candidate has no native acceptance evidence

- Severity: High
- Screen/flow: Whole app on iPhone; subscription purchase/restore
- What the user may see: Native-only regressions in safe area, keyboard, touch, audio, purchase, restore, or startup can escape local web QA.
- Evidence: The latest documented build artifact predates the July 23 candidate. No physical-iPhone pass or live TestFlight purchase/restore pass exists for `053465c`.
- Suspected owner/file: Release process / EAS / App Store Connect / RevenueCat
- Fix pass required: yes

### H2 - Live backend alignment is not current

- Severity: High
- Screen/flow: Sign-up, email confirmation, persistence, RLS, migrations, export/delete
- What the user may see: Local demo behavior can pass while live auth or persistence fails.
- Evidence: The automated suite intentionally skips `src/tests/live/liveDbSmoke.test.ts`. Existing QA state records the live smoke as blocked by invalid credentials and requires fresh migration/dry-run evidence.
- Suspected owner/file: Supabase project, smoke credentials, migration/release process
- Fix pass required: yes

### M1 - Plan-wizard confirmation visually collides with the underlying Plan screen

- Severity: Medium - must fix before launch
- Screen/flow: Plan > Adjust plan > confirmation
- What the user sees: The Plan screen's hero, week title, and session text remain visibly layered through or over the white confirmation panel, weakening contrast and making the popup look unfinished.
- Steps to reproduce: Open Plan at `390x844`, tap **Adjust plan**, remain on **Is this still right?**
- Expected behavior: An opaque, isolated popup with a darkened backdrop.
- Actual behavior: Underlying screen content remains visible across the popup.
- Evidence: `qa-artifacts/browser-audit/current/screenshots/22-plan-wizard-confirmation.png`
- Suspected owner/file: `src/app/screens/PlanScreen.tsx`, `PlanGoalWizardModal`, confirmation layout
- Fix pass required: yes

### M2 - “Balanced” review contains a conflicting hidden target

- Severity: Medium - must fix before launch
- Screen/flow: Plan > Adjust plan > Review step by step > Build > Review
- What the user sees: The wizard defines **Balanced** as no single priority, then reviews **Specific target: Full body strength**.
- Expected behavior: Balanced should either omit the specific target or explain why a secondary target is still applied.
- Actual behavior: The hidden default `full_body_strength` value is submitted and displayed beside Balanced.
- Evidence: `qa-artifacts/browser-audit/current/screenshots/22d-plan-wizard-review.png`; `PlanGoalFlowCard.tsx` sends `subFocus` for every build goal.
- Suspected owner/file: `src/app/screens/plan/PlanGoalFlowCard.tsx`
- Fix pass required: yes

### M3 - Workout player uses dark status-bar icons on a dark surface

- Severity: Medium - must verify/fix before launch
- Screen/flow: Train > Start session > full-screen workout player
- What the user may see: Native status-bar icons can be unreadable over the dark teal player.
- Evidence: `AppTabs.tsx` mounts `<StatusBar style="dark" />`; the absolute workout-player overlay uses `colors.cornerBlack` and does not override the status-bar style.
- Suspected owner/file: `src/app/navigation/AppTabs.tsx`, `src/app/screens/train/WorkoutPlayer.tsx`
- Fix pass required: yes

### M4 - Dependency advisories remain unresolved

- Severity: Medium
- Screen/flow: Build toolchain
- Evidence: `npm audit --omit=dev` reports 1 high and 10 moderate advisories. The high PostCSS advisory is nested under Expo Metro and the suggested automatic fix is an Expo 57 major upgrade.
- Expected handling: Confirm exploitability in this app, pin a remediation plan, and do not run a blind major upgrade immediately before submission.
- Fix pass required: risk acceptance or scoped upgrade required

### M5 - Exact-commit remote CI evidence is absent

- Severity: Medium - must fix before merge/submission
- Screen/flow: GitHub quality workflow
- Evidence: GitHub returned no combined commit status and no PR-triggered workflow run for `053465c`; there is no PR for `codex/development`.
- Fix pass required: yes

### L1 - Equipment labels lose word spacing in Profile

- Severity: Low
- Screen/flow: Profile setup snapshot/details
- What the user sees: `JumpRope,Bands` instead of `Jump Rope, Bands`.
- Evidence: `qa-artifacts/browser-audit/current/screenshots/mobile-first-viewport-05-profile.png` and `13a-profile-setup-details.png`.
- Suspected owner/file: Profile equipment label formatting
- Fix pass required: recommended

### L2 - Test renderer deprecation warnings are pervasive

- Severity: Low
- Screen/flow: Test infrastructure
- Evidence: The passing suite repeatedly warns that `react-test-renderer` is deprecated.
- Fix pass required: maintenance follow-up

## UX Flow Review

1. Sign-in and onboarding - healthy locally. Clear editorial hierarchy and successful six-step completion.
2. Today - healthy locally. Readiness is the obvious first action; weight remains optional.
3. Train and workout player - functionally healthy locally; native status-bar/device behavior remains open.
4. Fuel - healthy locally. Missing intake remains unknown and logging stays optional.
5. Plan overview - healthy locally. Weekly structure and adjustments are understandable.
6. Plan generation wizard - functionally passes Build, single-fight, and tournament branches; confirmation layering and Balanced review semantics need correction.
7. Profile/data controls - healthy locally. Export preview and destructive confirmations are gated.

## Human Review Still Needed

- Real Supabase auth, new-account email confirmation, session persistence, migrations, RLS, and data deletion/export
- Physical iPhone startup, safe areas, status bar, touch targets, keyboard, scrolling, audio cues, and Dynamic Type/VoiceOver
- Real App Store/RevenueCat localized products, purchase, cancellation, restore, entitlement refresh, and offline/foreground behavior
- Human boxer comprehension of engine recommendations and safety language
- Release-owner review of App Store metadata, agreements, privacy declarations, and final distribution settings

## Harness Changes Made During This Audit

The product was not changed. The audit harness was updated because it still expected obsolete onboarding screenshot names and did not cover the current Plan wizard. The corrected harness now requires the current onboarding sequence, manual-first/wearable-optional evidence, the five mobile tabs, workout player, and eight Plan-wizard states.
