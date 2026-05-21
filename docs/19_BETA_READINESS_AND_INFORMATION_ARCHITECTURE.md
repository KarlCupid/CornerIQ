# Beta Readiness And Information Architecture

Date: 2026-05-20

This document describes the twentieth implementation pass: a beta UX / information architecture hardening pass across Today, Fuel, Train, Plan, and Profile. The pass added reusable UI primitives and local screen sections without adding new domain complexity, routed drilldowns, coach UI, reviewer-clear UI, barcode scanning, full meal planning, a detailed food database, numeric load progression, or drag/drop calendar behavior.

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
- Adjustments: active/rejected adjustment summary and Plan Adjustment Controls. Screens request changes; services and engines decide what applies.

Profile owns athlete summary, settings, data controls, and audit copy. It now has local sections:

- Athlete: profile summary, wearable status, cycle tracking status, privacy copy, and cycle context.
- Settings: profile settings and sign out.
- Data: export preview, DELETE-gated app-data deletion, and account-deletion limitation copy.
- Audit: compact training audit, Fuel review audit summary, journey history, and privacy/safety copy.

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

## Beta Readiness Checklist

| Area | Status | Notes |
| --- | --- | --- |
| Auth | MVP | Supabase email/password flow works; no production account recovery UX yet. |
| Onboarding | MVP | Boxer-specific setup exists; settings edit is available in Profile. |
| Today | Beta testable | Primary action first, risk banner, no-shame missing-log copy, why disclosure, quick logs. |
| Fuel | Beta testable | Command/History/Reviews/Body Mass sections; active reviews stay visible; no unsafe cut instructions. |
| Train | Beta testable | Today/Workout/Exercise History/Progression sections; completion flow still dense but functional. |
| Plan | Beta testable | Week/Next Week/Block History/Adjustments sections; no drag/drop; controls remain service-owned. |
| Profile | Beta testable | Athlete/Settings/Data/Audit sections; DELETE gate remains hard to trigger. |
| Smoke | Passing | Live smoke passes with ignored `.env` values, public Supabase URL, and anon key only. |
| Data deletion | MVP | App data deletion is DELETE-gated; Supabase auth account deletion remains server-side future work. |
| Privacy | Beta testable | Cycle privacy copy visible; no service role in client. |
| Safety copy | Beta testable | Risk banners, hard-stop copy, no self-clear copy, no unsafe Fuel terms in tested output. |

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

## Auditor Inspect First

1. `src/design/components/SectionTabs.tsx`
2. `src/design/components/RiskBanner.tsx`
3. `src/design/components/EmptyState.tsx`
4. `src/design/components/DisclosureCard.tsx`
5. `src/app/screens/TodayScreen.tsx`
6. `src/app/screens/FuelScreen.tsx`
7. `src/app/screens/TrainScreen.tsx`
8. `src/app/screens/PlanScreen.tsx`
9. `src/app/screens/ProfileScreen.tsx`
10. `src/app/components/AppErrorState.tsx`
11. `src/app/App.tsx`
12. `src/tests/app/appShell.test.ts`
