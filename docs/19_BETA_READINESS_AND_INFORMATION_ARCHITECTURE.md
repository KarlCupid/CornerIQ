# Beta Readiness And Information Architecture

Date: 2026-05-21

This document describes the twentieth through twenty-fourth implementation passes: beta UX / information architecture hardening across Today, Fuel, Train, Plan, and Profile; privacy-safe beta feedback/testing; structured beta release operations; automated beta scenario QA; focused friction polish; and release-candidate distribution readiness. These passes added reusable UI primitives, local screen sections, Profile Audit feedback/history, app-level recovery, a beta health preflight panel, beta tester notice, EAS preview profiles, runtime public-env validation, CI quality checks, scenario QA coverage, and structured beta testing/release documentation without adding deep new product complexity, routed drilldowns, coach UI, reviewer-clear UI, barcode scanning, full meal planning, a detailed food database, numeric load progression, external analytics, admin triage, or drag/drop calendar behavior.

## Main App Sections

Today owns the first daily decision. It remains a single page, but the order is now:

1. Primary action.
2. Safety check when risk exists.
3. Today's decision stack.
4. Training.
5. Fuel.
6. Weight / safety context.
7. Quick logs.
8. Why disclosure.
9. Recent summary or no-log empty state.

Quick-log cards now reinforce "log enough for today," optional fields, unknown missing data, accessible main actions, and saving/disabled states.

Fuel owns nutrition, weight-class context, manual fuel history, nutrition review history, and body-mass trajectory. It now has local sections:

- Command: Fuel Command Card, active Nutrition Safety Review Card, Weight-Class Status Card, Session Fueling Card, active fight-week/rehydration/tournament context when applicable, and fuel quick logs.
- History: actual-vs-target, grouped Fuel history, manual history detail, hydration/electrolyte context, and recent fuel logs.
- Reviews: Nutrition Safety Review Card, Nutrition Review History Panel, and risk/why copy.
- Body Mass: body-mass trajectory summary, body-mass trajectory detail, targets, cycle scale-noise context, and review-action visibility.

Train owns today's generated support, workout completion, protected workout logging, exercise history, and progression analytics. It now has local sections:

- Today: active block/day role, today's generated support, next best action, stop conditions, fuel handoff, and cycle training decision.
- Workout: Workout Detail Panel, complete/skip controls, protected workout logging, and no-workout empty state.
- Exercise History: Exercise History Panel plus recent training context.
- Progression: progression summary, analytics, pain flags, completion counts, and no numeric load progression copy.

Plan owns the current week, next-week preview lifecycle, block history, and service-owned adjustment controls. It now has local sections:

- Week: active block, hard-day cap, seven day plans, warnings, and fight/tournament setup.
- Next Week: persisted preview status, accept/materialize actions, review-required copy, materialized generated-session count, and day-plan preview.
- Block History: compact timeline, week summary, latest progression decision, and Training Block History Panel.
- Adjustments: active/rejected adjustment summary and Plan Adjustment Controls. Screens request changes; services and engines decide what applies. Controls now use "Protect this day," "Mark unavailable," "Request deload," and "Restore engine plan" copy, and rejected/review-needed responses render as risk explanations.

Profile owns athlete summary, settings, data controls, and audit copy. It now has local sections:

- Athlete: profile summary, wearable status, cycle tracking status, privacy copy, and cycle context.
- Settings: profile settings and sign out.
- Data: export preview, DELETE-gated app-data deletion, and account-deletion limitation copy.
- Audit: beta tester notice, beta health preflight, beta feedback panel with recent report history/status, compact training audit, Fuel review audit summary, journey history, and privacy/safety copy.

## Beta Feedback Workflow

Profile > Audit now exposes a compact Beta feedback panel. It lets authenticated beta users choose:

- App section: Today, Fuel, Train, Plan, Profile, Onboarding, Auth, or Unknown.
- Category: confusing, bug, safety concern, copy issue, missing feature, workout feedback, fuel feedback, weight-class feedback, cycle feedback, or other.
- Severity: low, medium, high, or critical.
- Short message.

Feedback persists to `beta_feedback_reports` through `src/services/supabase/betaFeedbackRepository.ts` and `src/services/feedback/submitBetaFeedback.ts`. The service validates user ID, section, category, severity, and message length; rejects empty messages; and sanitizes obvious password/token fields before saving. The hook `src/hooks/useBetaFeedback.ts` keeps the UI thin.

Privacy reminders are visible in the panel:

- Do not include emergency details or secrets.
- This is not emergency support and is not medical review.
- If safety concern is selected: If this is urgent, stop and seek qualified support.

Feedback does not do these things:

- It is not medical review.
- It is not a reviewer workflow.
- It is not emergency support.
- It does not clear hard stops.
- It does not expose coach, clinician, reviewer, or admin UI.

Recent feedback now appears below the form with created date, screen, category, severity, and read-only status chips. Athletes can see that a report was received, reviewed, resolved, or dismissed, but the client does not expose status editing.

App-level error reporting reuses the same feedback service for signed-in users. `AppErrorBoundary` catches React tree errors, hides raw stack traces, shows "Something went wrong." and "Your data is still protected.", and can submit a sanitized bug report when a signed-in user chooses Report this issue. There is no automatic third-party reporting.

Signed-out issue reporting now says sign-in is required. Recent feedback has a clearer empty state so testers understand where submitted report status will appear.

Beta testing scripts and prompts live in `docs/20_BETA_TESTING_AND_FEEDBACK_PLAN.md`. Release operations live in `docs/21_BETA_RELEASE_OPERATIONS.md`.

## Beta Health Preflight

Profile > Audit includes `BetaHealthPanel`, driven by `src/engine/presentation/betaHealthViewModel.ts`. The view model checks public Supabase runtime configuration, auth session, profile completion, engine readiness, safety review visibility, feedback availability, export/delete availability, cycle privacy visibility, and manual/no-wearable readiness.

Runtime env validation lives in `src/services/config/betaRuntimeConfig.ts`. It reads only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`, returns missing variable names without values, and warns if the public anon-key slot appears to contain a server-only role key. It does not read smoke credentials or server-only Supabase env values.

The runtime panel does not claim live smoke status. Smoke remains a docs/operations verification, not a runtime assertion.

Warning and blocked preflight states now show a visible next safe action in the panel.

## Beta Tester Notice

Profile > Audit now includes `BetaTesterNoticePanel`.

It tells testers:

- This is a beta.
- It is not medical advice.
- It is not a replacement for qualified human judgment.
- There is no emergency support.
- Urgent symptoms and urgent weight-class or health concerns need qualified support outside the app.
- The app cannot be used to self-clear hard stops.
- Wearables are optional.
- Manual logs are enough.
- Feedback is product feedback and may be reviewed manually.
- Feedback should not contain secrets or emergency details.

Acknowledgement is local UI state only. It does not block app use and is not persisted yet.

## Release Candidate And Distribution Readiness

The twenty-fourth pass added:

- `eas.json` with `development`, `preview`, and `production` build profiles.
- `scripts/beta-preflight.mjs`, exposed as `npm run preflight:beta`.
- `docs/23_BETA_RELEASE_CANDIDATE_CHECKLIST.md`.
- `docs/24_EXPO_EAS_BETA_DISTRIBUTION.md`.
- Static tests for EAS config, package scripts, public env docs, CI secret boundaries, and beta preflight output redaction.

No EAS build was run in this pass. App icon/splash polish and store metadata remain manual release-owner tasks before broader distribution.

## First Things Athletes See

- Today: the primary action and any safety check before logs.
- Fuel: Command, with fuel action and active nutrition review visibility.
- Train: Today, with today's generated support and next best training action.
- Plan: Week, with active block, hard-day cap, and seven day plans.
- Profile: Athlete, with identity, wearable/cycle status, and privacy copy.

## Hidden Behind Sections Or Disclosures

- Fuel raw history, review history, and body-mass detail are behind Fuel sections.
- Train workout completion and exercise history are behind Train sections.
- Plan next-week preview, block history, and adjustment controls are behind Plan sections.
- Profile data controls and audit summaries are behind Profile sections.
- Today's engine rationale is behind a disclosure card so the primary action stays first.

## Safety Banners And Hard Stops

- Today shows a critical RiskBanner when risk summary exists.
- Fuel keeps active nutrition review status visible. If an active review exists and the athlete switches away from Command or Reviews, a RiskBanner remains at the top.
- Train shows a critical RiskBanner when training risk summary exists.
- Plan shows a RiskBanner when warnings or blocked roll-forward status exist.
- Auto-roll-forward messages are shown as non-fatal information and do not hide ready engine state.
- Persistence warnings are shown as app notes; non-fatal persistence issues do not erase the current engine state.

## Non-Negotiable Safety Rules

- Athletes cannot self-clear nutrition hard stops.
- Nutrition acknowledgement does not clear a plan.
- Reviewer-clear workflow is not exposed in the client.
- Generated training support must not prescribe sparring or contact drills.
- Protected boxing anchors can be logged manually; they are not generated by CornerIQ.
- Fuel and weight-class screens must not prescribe sauna, sweat suits, laxatives, diuretics, extreme dehydration, or "make weight at all costs" behavior.
- Missing data is unknown, not safe.
- Manual input remains first-class; wearables only increase confidence when fresh and consistent.
- Cycle support is optional, private, and symptom-aware.

## Reusable UI Primitives

Added in `src/design/components`:

- `SectionTabs.tsx`
- `StatusBadge.tsx`
- `ActionCard.tsx`
- `EmptyState.tsx`
- `RiskBanner.tsx`
- `TimelineList.tsx`
- `MetricRow.tsx`
- `DisclosureCard.tsx`

These primitives are React Native compatible, use the existing dark CornerIQ theme, and contain no business logic or repository access.

## Intentionally Deferred

- Barcode scanning.
- Full meal planning.
- Detailed food database.
- Numeric load progression.
- Drag/drop calendar.
- Routed drilldown screens.
- Production coach UI.
- Clinician/dietitian/reviewer workflow.
- Reviewer-clear UI.
- Coach/team production activation UX.
- Actual EAS preview build execution and app store metadata.

## Beta Readiness Checklist

| Area | Status | Notes |
| --- | --- | --- |
| Auth | MVP | Supabase email/password flow works; no production account recovery UX yet. |
| Onboarding | MVP | Boxer-specific setup exists; settings edit is available in Profile. |
| Today | Beta testable | Primary action first, risk banner, no-shame missing-log copy, why disclosure, quick logs. |
| Fuel | Beta testable | Command/History/Reviews/Body Mass sections; active reviews stay visible; no unsafe cut instructions. |
| Train | Beta testable | Today/Workout/Exercise History/Progression sections; completion flow still dense but functional. |
| Plan | Beta testable | Week/Next Week/Block History/Adjustments sections; no drag/drop; controls remain service-owned and explain engine-request results. |
| Profile | Beta testable | Athlete/Settings/Data/Audit sections; DELETE gate remains hard to trigger. |
| Feedback | Beta testable | Profile > Audit saves privacy-safe user-owned beta feedback reports with visible privacy/safety reminders and read-only recent status history. |
| Error recovery | Beta testable | App-level boundary catches React tree errors, retries, and reports sanitized bug feedback for signed-in users. |
| Beta health | Beta testable | Profile > Audit shows preflight checks without exposing env values or claiming smoke status. |
| Beta tester notice | Beta testable | Profile > Audit shows beta, not-medical-advice, not-coach-replacement, no-emergency-support, wearable-optional, manual-logs-enough, feedback privacy, and no-self-clear copy. |
| Expo/EAS readiness | Artifact produced | `eas.json`, `npm run preflight:beta`, release-candidate checklist, and EAS distribution runbook exist; EAS project `@karlcupid/corneriq` is linked, failed Android preview build `d550e9bb-b705-41a3-bae7-76c2b6d38453` is documented, and fresh Android preview build `c21c5692-011e-4c85-949f-355d0e1f753f` produced APK artifact `https://expo.dev/artifacts/eas/pYeMLGCyyhfB72dRYhG93K.apk`. |
| CI | Beta testable | GitHub Actions runs typecheck, lint, tests, coverage, fixture smoke, dependency audit, migration dry-run when configured, and CodeQL; live smoke remains manual/gated. |
| Smoke | Passing | Live smoke passes with ignored `.env` values, public Supabase URL, and anon key only. |
| Data deletion | MVP | App data deletion is DELETE-gated; Supabase auth account deletion remains server-side future work. |
| Privacy | Beta testable | Cycle privacy copy visible; no service role in client. |
| Safety copy | Beta testable | Risk banners, hard-stop copy, no self-clear copy, no unsafe Fuel terms in tested output. |
| Scenario QA | Beta testable | Ten beta personas now run through automated engine/view-model assertions plus static safety scans. |

## Known User-Testing Questions For Boxers

- Can a boxer understand what to do first on Today without reading the whole page?
- Does Fuel Command feel supportive rather than like a generic diet tracker?
- Is the distinction between Fuel history and engine-owned targets clear?
- Does the safety review copy make it obvious that acknowledgement is not clearance?
- Can a boxer find body-mass context without feeling pushed toward unsafe weight-cut behavior?
- Can a boxer complete or skip a generated workout after training without too much typing?
- Is exercise history useful when load is still free text and not numeric progression?
- Does Plan's Week / Next Week split make future support sessions understandable?
- Are adjustment controls understandable as requests to the engine rather than manual programming edits?
- Does Profile make cycle privacy and data deletion boundaries clear enough for beta trust?
- Does the feedback panel feel easy to use without inviting emergency details or private health histories?
- Does "log enough for today" make quick logs feel acceptable when optional fields are blank?
- Does "Complete without exercise details" reduce post-training friction without hiding `prescribed_only` behavior?

## Beta Tester Onboarding Guidance

- Tell testers this is a structured beta, not public release.
- Review the Profile > Audit beta tester notice before guided testing.
- Ask testers not to paste secrets, emergency details, medical records, or full health histories into feedback.
- Use test accounts whenever export/delete or smoke cleanup is being exercised.
- Ask testers to narrate the first action they think CornerIQ is asking for on Today, Fuel, Train, and Plan.
- Capture confusion through Profile > Audit feedback, then compare it with facilitator notes from `docs/20_BETA_TESTING_AND_FEEDBACK_PLAN.md`.

## Auditor Inspect First

1. `src/design/components/SectionTabs.tsx`
2. `src/design/components/RiskBanner.tsx`
3. `src/design/components/EmptyState.tsx`
4. `src/design/components/DisclosureCard.tsx`
5. `src/app/components/BetaFeedbackPanel.tsx`
6. `src/app/components/AppErrorBoundary.tsx`
7. `src/app/components/BetaHealthPanel.tsx`
8. `src/app/components/BetaTesterNoticePanel.tsx`
9. `src/services/config/betaRuntimeConfig.ts`
10. `src/engine/presentation/betaHealthViewModel.ts`
11. `eas.json`
12. `scripts/beta-preflight.mjs`
13. `src/services/feedback/submitBetaFeedback.ts`
14. `src/services/supabase/betaFeedbackRepository.ts`
15. `src/app/screens/TodayScreen.tsx`
16. `src/app/screens/FuelScreen.tsx`
17. `src/app/screens/TrainScreen.tsx`
18. `src/app/screens/PlanScreen.tsx`
19. `src/app/screens/ProfileScreen.tsx`
20. `src/app/App.tsx`
21. `.github/workflows/quality.yml`
22. `src/tests/app/appShell.test.ts`
23. `src/tests/engine/betaHealthViewModel.test.ts`
24. `src/tests/beta/betaScenarioFlows.test.ts`
25. `src/tests/static/betaSafetyStatic.test.ts`
26. `src/tests/static/betaReleaseConfigStatic.test.ts`
27. `src/tests/docs/betaReleaseCandidateChecklist.test.ts`
28. `docs/20_BETA_TESTING_AND_FEEDBACK_PLAN.md`
29. `docs/21_BETA_RELEASE_OPERATIONS.md`
30. `docs/22_BETA_SCENARIO_QA_RESULTS.md`
31. `docs/23_BETA_RELEASE_CANDIDATE_CHECKLIST.md`
32. `docs/24_EXPO_EAS_BETA_DISTRIBUTION.md`
