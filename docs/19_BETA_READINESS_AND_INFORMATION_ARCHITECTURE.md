# Beta Readiness And Information Architecture

Date: 2026-05-21

This document describes historical beta UX / information architecture hardening across Today, Fuel, Train, Plan, and Profile; structured beta testing; release operations; automated beta scenario QA; focused friction polish; and release-candidate distribution readiness.

Superseded launch note: the early Profile Audit feedback/history, beta health preflight, beta tester notice, and in-app issue-reporting surfaces were later removed from launch runtime. Active launch guidance uses Profile Data/Safety, outside-app support, private facilitator notes, and the private incident triage runbook instead of Profile > Audit or `beta_feedback_reports`.

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
- Adjustments: active/rejected adjustment summary and Plan Adjustment Controls. Screens request changes; services and engines decide what applies. Controls now use "Keep for boxing," "Mark unavailable," "Request deload," and "Restore plan" copy, and rejected/review-needed responses render as risk explanations.

Profile owns athlete summary, settings, data controls, and safety-history copy. It now has local sections:

- Athlete: profile summary, wearable status, cycle tracking status, privacy copy, and cycle context.
- Settings: profile settings and sign out.
- Data: export preview, DELETE-gated app-data deletion, and account-deletion limitation copy.
- Safety: saved training history, Fuel safety history, journey history, outside-app support guidance, and privacy/safety copy.

## Feedback Workflow

Launch runtime no longer exposes Profile > Audit, a Beta feedback panel, recent feedback history, beta health, a beta tester notice, or signed-in issue reporting. Feedback for structured beta sessions is collected outside the app through private facilitator notes or a release-owner-controlled support path.

Private notes may record app section, category, severity, a short product summary, and action taken. They must not include secrets, emergency details, medical records, full health histories, credentials, or personal contact details.

Historical `beta_feedback_reports` references describe a removed pre-launch surface. The final launch schema removes that table from active runtime/export/delete scope.

Facilitator reminders:

- Do not include emergency details or secrets.
- This is not emergency support and is not medical review.
- If safety concern is selected: If this is urgent, stop and seek qualified support.

Feedback does not do these things:

- It is not medical review.
- It is not a reviewer workflow.
- It is not emergency support.
- It does not clear hard stops.
- It does not expose coach, clinician, reviewer, or admin UI.

App-level error recovery catches React tree errors, hides raw stack traces, shows retry/support guidance, and directs users to outside-app support. The launch runtime does not submit in-app issue reports.

Beta testing scripts and prompts live in `docs/20_BETA_TESTING_AND_FEEDBACK_PLAN.md`. Release operations live in `docs/21_BETA_RELEASE_OPERATIONS.md`.

## Beta Health Preflight

Superseded launch note: Profile > Audit beta-health runtime UI was removed before launch. Runtime config and release evidence are checked by scripts and docs, not by an athlete-facing beta-health panel. Checks may show public variable names, but never values. Live smoke remains a docs/operations verification, not a runtime assertion.

## Beta Tester Notice

Superseded launch note: the in-app beta tester notice was removed before launch. Facilitators still tell testers:

- This is a beta.
- It is not medical advice.
- It is not a replacement for qualified human judgment.
- There is no emergency support.
- Urgent symptoms and urgent weight-class or health concerns need qualified support outside the app.
- The app cannot be used to self-clear hard stops.
- Wearables are optional.
- Manual logs are enough.
- Feedback is outside-app product feedback and may be reviewed manually.
- Feedback should not contain secrets, emergency details, medical records, full health histories, credentials, or personal contact details.

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
- Profile data controls and safety-history summaries are behind Profile sections.
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
- Support workouts must not prescribe sparring or contact drills.
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
| Profile | Beta testable | Athlete/Settings/Data/Safety sections; DELETE gate remains hard to trigger. |
| Feedback | Outside-app | Runtime feedback and issue-reporting surfaces were removed from launch; facilitators use private notes or outside-app support without collecting emergency details or private health histories in the app. |
| Error recovery | Beta testable | App-level boundary catches React tree errors, retries, hides raw stacks, and directs users to outside-app support. |
| Beta health | Superseded | Runtime beta-health panel was removed; release readiness is checked by scripts, docs, and generated evidence. |
| Beta tester notice | Superseded | In-app beta tester notice was removed; facilitators provide beta boundaries before guided testing. |
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
- Review beta boundaries verbally before guided testing.
- Ask testers not to paste secrets, emergency details, medical records, full health histories, credentials, or personal contact details into any app field or support note.
- Use test accounts whenever export/delete or smoke cleanup is being exercised.
- Ask testers to narrate the first action they think CornerIQ is asking for on Today, Fuel, Train, and Plan.
- Capture confusion through private facilitator notes or outside-app support, then compare it with the script in `docs/20_BETA_TESTING_AND_FEEDBACK_PLAN.md`.

## Auditor Inspect First

1. `src/design/components/SectionTabs.tsx`
2. `src/design/components/RiskBanner.tsx`
3. `src/design/components/EmptyState.tsx`
4. `src/design/components/DisclosureCard.tsx`
5. `src/app/components/AppErrorBoundary.tsx`
6. `src/app/components/AppErrorState.tsx`
7. `src/app/supportCopy.ts`
8. `eas.json`
9. `src/app/screens/TodayScreen.tsx`
10. `src/app/screens/FuelScreen.tsx`
11. `src/app/screens/TrainScreen.tsx`
12. `src/app/screens/PlanScreen.tsx`
13. `src/app/screens/ProfileScreen.tsx`
14. `src/app/App.tsx`
15. `.github/workflows/quality.yml`
16. `src/tests/app/appShell.test.ts`
17. `src/tests/beta/betaScenarioFlows.test.ts`
18. `src/tests/static/betaSafetyStatic.test.ts`
19. `src/tests/static/betaReleaseConfigStatic.test.ts`
20. `src/tests/docs/betaReleaseCandidateChecklist.test.ts`
21. `docs/20_BETA_TESTING_AND_FEEDBACK_PLAN.md`
22. `docs/21_BETA_RELEASE_OPERATIONS.md`
23. `docs/22_BETA_SCENARIO_QA_RESULTS.md`
24. `docs/23_BETA_RELEASE_CANDIDATE_CHECKLIST.md`
25. `docs/24_EXPO_EAS_BETA_DISTRIBUTION.md`
26. `docs/qa/INCIDENT_TRIAGE_RUNBOOK.md`
