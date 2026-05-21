# Beta Scenario QA Results

Date: 2026-05-21

This document records the automated beta scenario QA pass for the current CornerIQ beta flows. It is meant for ChatGPT auditors and for human beta planning before real boxers test the app.

## Scenarios Tested

All scenarios resolve through `resolvePerformanceState` and the existing engine-owned Today, Fuel, Train, Plan, Profile, and Beta Health view models.

| Persona | Automated status | Notes |
| --- | --- | --- |
| Amateur novice build phase | Passed | Confirms novice build support resolves without generic fitness defaults. |
| Amateur open with sparring anchors | Passed | Protected coach-led sparring can exist as a manual anchor; generated support stays easy and secondary. |
| Amateur tournament daily weigh-ins | Passed | Tournament Fuel and Plan context remain visible without unsafe weight-pressure copy. |
| Pro camp day-before weigh-in | Passed | Pro fight context and day-before weigh-in rules resolve through the engine. |
| Same-day weigh-in amateur | Passed | Amateur same-day weigh-in context resolves without acute unsafe instructions. |
| Cycle-enabled athlete with high symptoms | Passed | High symptoms drive symptom-aware training reduction or safety review behavior. |
| Manual-only no wearable athlete | Passed | Manual-only mode remains valid and no wearable is required. |
| Under-fueling risk case | Passed | Under-fueling risk is visible and progression does not auto-progress. |
| Red readiness case | Passed | Red readiness blocks hard generated work and drives recovery/safety-first copy. |
| No-equipment boxer | Passed | No-equipment substitutions appear without adding broad fitness defaults. |

## Automated Assertions

`src/tests/beta/betaScenarioFlows.test.ts` now asserts for each persona:

- `PerformanceState` resolves with engine version and output hash.
- Today has a primary action.
- Fuel has a command center and safety action.
- Train has an engine-owned training decision or recovery state.
- Plan has weekly structure and seven day plans.
- Profile view model and Beta Health view model can be built.
- Unsafe Fuel copy is absent from Fuel view models.
- Generated support output does not prescribe sparring, contact, fight simulation, or partner drills.
- Nutrition review history never exposes `canSelfClear: true`.
- Missing or unknown data is not described as safe.
- Manual-only athletes remain valid without a wearable.
- Red readiness or hard stops do not allow hard/max generated work.

Additional static scans in `src/tests/static/betaSafetyStatic.test.ts` cover unsafe Fuel terms, generated contact-work phrasing, self-clear surfaces, coach-control exposure, external analytics packages, service-role client surfaces, and feedback copy boundaries.

## Friction Notes

- Quick logs were understandable but too form-like for beta interruptions. Copy now emphasizes "log enough for today," optional fields, unknown missing data, accessible action labels, and busy states.
- Workout completion was functional but dense. Copy now makes the low-friction path explicit: session RPE is enough, blank exercise rows become `prescribed_only`, skipped sessions do not save exercise rows, and pain notes help avoid automatic progression.
- Plan adjustments were safe but read like direct edits. Copy now frames buttons as engine requests and shows rejected or review-needed explanations in a risk banner.
- Feedback and error reporting were present but needed clearer boundaries. Copy now states that feedback is not emergency support, signed-out issue reporting requires sign-in, and recent feedback has a clearer empty state.
- Generated support around a protected sparring anchor now uses neutral "protected boxing support" copy while still allowing protected sparring to be logged manually.

## Known Risks For Human Beta Sessions

- Real boxer beta findings have not been captured yet.
- Quick log density may still be high on a phone after training.
- Workout completion can still feel heavy if a tester tries to fill every exercise row.
- Plan Week / Next Week / Adjustments may still require facilitator explanation.
- Manual feedback triage still happens outside the app in Supabase.
- No external analytics means friction must be captured through observation and beta feedback reports.
- Beta Health preflight is a runtime readiness check, not proof that live smoke was run.

## Intentionally Not Tested

These remain deferred and were not added or covered as product flows in this pass:

- Barcode scanning.
- Full meal planning.
- Coach UI.
- Reviewer clear.
- Numeric load progression.
- Drag/drop calendar.
- Detailed food database.
- External analytics.
- Admin triage dashboard.

## Recommended Human Beta Script Adjustments

- Ask testers to use the quick-log forms with only the required fields first, then ask whether optional fields felt safe to skip.
- In workout completion, ask testers to complete once with only session RPE and once with one exercise row, then compare friction.
- In Plan Adjustments, ask testers what they think "Protect this day," "Mark unavailable," "Request deload," and "Restore engine plan" will do before pressing anything.
- For the sparring-anchor persona, remind facilitators that sparring is a manually logged protected coach-led anchor, not generated work.
- For high-symptom and red-readiness personas, ask testers to explain in their own words why hard work was reduced or blocked.
- For feedback reporting, ask testers to submit a non-emergency confusing-moment report, then confirm the recent feedback empty/status state is understandable.

## Auditor Inspect First

1. `src/tests/beta/betaScenarioFlows.test.ts`
2. `src/tests/static/betaSafetyStatic.test.ts`
3. `src/app/screens/logging/LogCards.tsx`
4. `src/app/screens/train/WorkoutDetailPanel.tsx`
5. `src/app/screens/plan/PlanAdjustmentControls.tsx`
6. `src/app/components/BetaFeedbackPanel.tsx`
7. `src/app/components/AppErrorBoundary.tsx`
8. `src/app/components/BetaHealthPanel.tsx`
9. `src/engine/training/sessionGenerator.ts`
10. `src/tests/app/appShell.test.ts`
