# AI Comprehension Pass

- Audit date: 2026-06-30
- Commit tested: `e7fc92e9cf57ea861e09ad4f290e93ec01b1f92c`
- Agent: Codex AI comprehension review
- Scenario: Local launch QA bundle across onboarding, Today, Fuel, Train, Plan, Profile, workout player, and engine-output personas.
- Browser/viewports: Local Playwright QA web run with desktop and mobile-size captures.
- Report path: `docs/qa/AI_COMPREHENSION_PASS_2026-06-30.md`
- Screenshot artifact paths:
  - `qa-artifacts/browser-audit/current/screenshots/05-onboarding-fixed-boxing-schedule.png`
  - `qa-artifacts/browser-audit/current/screenshots/mobile-first-viewport-01-today.png`
  - `qa-artifacts/browser-audit/current/screenshots/12-fuel-screen.png`
  - `qa-artifacts/browser-audit/current/screenshots/16-train-screen.png`
  - `qa-artifacts/browser-audit/current/screenshots/20-plan-screen.png`
  - `qa-artifacts/browser-audit/current/screenshots/21-plan-tools-schedule-screen.png`
  - `qa-artifacts/browser-audit/current/screenshots/smoke-06-mobile-live-workout-player.png`

## Summary

- Pass/fail: Automated gates passed; AI comprehension pass found polish issues.
- Highest severity: Medium.
- Next recommended fix area: Train date/action disambiguation, fixed sparring framing, Fuel command tone, and icon accessibility cleanup.

## Strengths

- The app consistently keeps missing data unknown rather than safe. Today, Fuel, Train, and workout-player copy all repeat that boundary clearly.
- Manual input is understandable and visible. The app does not require a wearable to proceed.
- The workout player is the clearest high-value surface in this pass: movement, cue, timer, stop rule, and next action are easy to parse.
- Profile data deletion and export controls are intentionally cautious and readable. The destructive actions require preview and exact confirmation.
- Deterministic QA found no blockers, high findings, secret leaks, unsafe generated sparring/contact, self-clear paths, or object serialization leaks.

## Findings

### Finding 1

- Severity: Medium
- Screen/flow: Train screen, Today-to-Train handoff
- What the user sees: The Train page says `PLANNED FOR Today May 19, 2026`, shows a `Still open` workout planned for `2026-05-18`, then shows `Aerobic base support` with copy saying it is scheduled for `2026-05-20`.
- Steps to reproduce: Run `cmd /c npm run qa:agent:ci`, then review `qa-artifacts/browser-audit/current/page-text/16-train-screen.txt` and `qa-artifacts/browser-audit/current/screenshots/16-train-screen.png`.
- Expected behavior: A first-time boxer should immediately understand whether the right action is to resolve yesterday, train today, or wait for a future support workout.
- Actual behavior: The screen exposes all three date contexts close together. The information is technically useful, but the priority is easy to misread without knowing the app's scheduling model.
- Evidence:
  - `qa-artifacts/browser-audit/current/page-text/16-train-screen.txt`
  - `qa-artifacts/browser-audit/current/screenshots/16-train-screen.png`
- Suspected owner/file: `src/app/screens/TrainScreen.tsx`, `src/engine/presentation/trainViewModel.ts`
- Fix pass required: yes

### Finding 2

- Severity: Medium
- Screen/flow: Onboarding fixed boxing schedule, Plan schedule
- What the user sees: Onboarding offers `Scheduled sparring` as a session type, and Plan shows an upcoming `Sparring` hard session.
- Steps to reproduce: Review `qa-artifacts/browser-audit/current/page-text/05-onboarding-fixed-boxing-schedule.txt`, `qa-artifacts/browser-audit/current/page-text/21-plan-tools-schedule-screen.txt`, and matching screenshots.
- Expected behavior: A reviewer or new boxer should understand these are athlete-entered or coach/team-scheduled fixed boxing commitments that CornerIQ protects around, not app-generated sparring.
- Actual behavior: The broader app rules are safe, but the local labels can be read out of context as if the app supports sparring as a planned workout category.
- Evidence:
  - `qa-artifacts/browser-audit/current/screenshots/05-onboarding-fixed-boxing-schedule.png`
  - `qa-artifacts/browser-audit/current/screenshots/21-plan-tools-schedule-screen.png`
  - `qa-artifacts/browser-audit/current/page-text/05-onboarding-fixed-boxing-schedule.txt`
  - `qa-artifacts/browser-audit/current/page-text/21-plan-tools-schedule-screen.txt`
- Suspected owner/file: `src/app/screens/onboarding/*`, `src/app/screens/plan/*`, fixed-boxing presentation copy
- Fix pass required: yes

### Finding 3

- Severity: Medium
- Screen/flow: Fuel screen
- What the user sees: Fuel uses a `Do not miss` section with quantified carbs, protein, and fluids while the surrounding state says fuel is `Unknown` and weight pace is `Unknown`.
- Steps to reproduce: Review `qa-artifacts/browser-audit/current/page-text/12-fuel-screen.txt` and `qa-artifacts/browser-audit/current/screenshots/12-fuel-screen.png`.
- Expected behavior: Fuel priorities should feel like context-aware support for boxing quality, not a rigid command or pressure cue.
- Actual behavior: Safety framing is present, but `Do not miss` plus exact grams can read more prescriptive than the rest of the product language, especially when confidence is still unknown.
- Evidence:
  - `qa-artifacts/browser-audit/current/page-text/12-fuel-screen.txt`
  - `qa-artifacts/browser-audit/current/screenshots/12-fuel-screen.png`
- Suspected owner/file: `src/app/screens/FuelScreen.tsx`, fuel presentation copy
- Fix pass required: yes

### Finding 4

- Severity: Medium
- Screen/flow: Cross-app accessibility and text comprehension
- What the user sees: Page-text snapshots contain private-use icon glyphs before labels, for example `ï•¹`, `ïˆ»`, `ï”¶`, and similar characters across onboarding and app screens.
- Steps to reproduce: Open page-text snapshots under `qa-artifacts/browser-audit/current/page-text/`, especially `10-today-after-real-onboarding.txt`, `16-train-screen.txt`, and `20-plan-screen.txt`.
- Expected behavior: Text snapshots and assistive technologies should expose meaningful labels without decorative icon characters.
- Actual behavior: The extracted text includes icon glyphs. This does not prove VoiceOver failure on iOS, but it is a credible accessibility and comprehension risk on web/native if icons are not hidden from accessibility trees.
- Evidence:
  - `qa-artifacts/browser-audit/current/page-text/10-today-after-real-onboarding.txt`
  - `qa-artifacts/browser-audit/current/page-text/16-train-screen.txt`
  - `qa-artifacts/browser-audit/current/page-text/20-plan-screen.txt`
- Suspected owner/file: Shared icon button/list/tab components, `src/app/navigation/AppTabs.tsx`, cross-screen disclosure rows
- Fix pass required: yes

### Finding 5

- Severity: Low
- Screen/flow: Engine-output review artifact
- What the user sees: `qa-artifacts/reports/engine-output-review.md` includes raw JSON confidence objects and standalone confidence labels in the AI-review evidence.
- Steps to reproduce: Open `qa-artifacts/reports/engine-output-review.md` and review `Missing-data handling` for any persona.
- Expected behavior: AI/human review evidence should be reviewer-readable without raw object formatting unless the raw payload is explicitly needed.
- Actual behavior: The report is deterministic and safe, but raw JSON adds friction to the qualitative review pass.
- Evidence:
  - `qa-artifacts/reports/engine-output-review.md`
- Suspected owner/file: `scripts/engine-output-review.mjs` or related QA report generation script
- Fix pass required: no, unless polishing review evidence before handoff

## Step Health

1. Auth/onboarding basics: Healthy. The setup flow is understandable and clearly boxing-specific.
2. Fixed boxing schedule: Needs polish. The app protects existing sessions, but sparring labels need stronger outside-app framing.
3. Today first action: Healthy. Mobile hierarchy makes `Check in` and then training/fuel actions visible.
4. Fuel: Needs polish. Safety framing is good, but `Do not miss` is stronger than the rest of the product tone.
5. Train: Needs polish. The screen needs clearer priority when overdue, today, and future sessions coexist.
6. Plan: Mostly healthy. The week structure is readable; fixed hard boxing labels need context.
7. Profile safety/data: Healthy. Export, delete, support, and safety-history boundaries are explicit.
8. Workout player: Healthy. Movement guidance and stop rules are clear.
9. Engine-output evidence: Healthy with a low reporting polish issue.

## Evidence Limits

- This pass used local browser QA screenshots and page-text snapshots. It does not clear physical iPhone behavior, native VoiceOver output, live Supabase auth/account behavior, or real boxer comprehension.
- The orange Local E2E banner is visible in screenshots and reduces viewport space. It is test-only, not a product UI finding.
- Screenshots show visual hierarchy, but they cannot prove final App Store screenshot quality or production build safe-area behavior.

## Human Review Still Needed

- Real Supabase auth/account state: still required for live sign-up, email confirmation, session persistence, export, and delete-account proof.
- Physical mobile device behavior: still required for touch, keyboard, scrolling, safe area, and native screen-reader checks.
- Boxing-domain safety copy: real boxer comprehension remains required, especially around fixed sparring, Fuel tone, and Train action priority.
- Privacy/secret exposure: deterministic scan passed; final App Store screenshots and review notes still need release-owner review.
- Release/launch readiness: not launch-ready until release owner accepts or fixes Medium findings and clears paid-build/App Store prerequisites.
