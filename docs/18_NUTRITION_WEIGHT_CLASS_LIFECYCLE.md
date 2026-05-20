# Nutrition And Weight-Class Lifecycle

Date: 2026-05-20

This document describes the eighteenth implementation pass for the Fuel / Weight-Class Command Center. The pass turns nutrition safety review from a journey-event skeleton into a persisted, auditable lifecycle and makes manual fuel history more useful without adding barcode scanning, full meal planning, a detailed food database, or unsafe weight-cut instructions.

## Engine Shape

Fuel decisions remain engine-owned. Screens render `FuelViewModel` fields and do not recompute body-mass, fight-week, cycle, tournament, or safety decisions.

Primary files:

- `src/engine/nutrition/fuelCommandTypes.ts`
- `src/engine/nutrition/fuelCommandEngine.ts`
- `src/engine/nutrition/nutritionSafetyReviewTypes.ts`
- `src/engine/nutrition/nutritionEngine.ts`
- `src/engine/presentation/fuelViewModel.ts`
- `src/engine/presentation/fuelHistoryViewModel.ts`
- `src/engine/presentation/bodyMassTrajectoryViewModel.ts`
- `src/services/nutrition/requestNutritionSafetyReview.ts`
- `src/services/supabase/nutritionSafetyReviewRepository.ts`
- `src/app/screens/FuelScreen.tsx`
- `src/app/screens/fuel/FuelCommandCards.tsx`

## Persisted Review Lifecycle

Migration `008_nutrition_safety_reviews.sql` adds:

- `nutrition_safety_reviews`
- `nutrition_safety_review_events`

Both tables are owner-scoped with RLS using `auth.uid() = user_id`. No permissive coach, clinician, dietitian, admin, or reviewer write policy was added.

Review statuses:

- `requested`
- `acknowledged`
- `in_review`
- `cleared_by_reviewer`
- `blocked`
- `superseded`

`cleared_by_reviewer` exists in the schema and mappers for future permissioned workflows only. The current client exposes no athlete method or button that can set it.

Event types:

- `requested`
- `acknowledged`
- `reviewer_assigned`
- `reviewer_note`
- `cleared_by_reviewer`
- `blocked`
- `superseded`

Current athlete actions:

- Request a nutrition safety review when the engine says one is required.
- Acknowledge an active requested or blocked review.
- See active review status, review id, reasons, blocking flags, and suggested next steps.

Current athlete non-actions:

- Cannot clear a hard stop.
- Cannot mark a review as `cleared_by_reviewer`.
- Cannot assign a reviewer.
- Cannot write coach, clinician, dietitian, or admin review events.

Hard stops remain active after request and acknowledgement. They can only be lifted by future permissioned reviewer infrastructure with relationship policy or a trusted server-side function.

## Review Persistence

`requestNutritionSafetyReview` now:

- Upserts a `nutrition_safety_reviews` row.
- Appends a `nutrition_safety_review_events` row.
- Appends the existing `NutritionSafetyReviewRequested` journey event.
- Returns `requested`, `already_active`, `not_required`, or `error`.
- Keeps `hardStopRemains` true for hard-stop states.

`resolveAndPersistPerformanceState` now:

- Persists review-required Fuel Command Center states.
- Appends an engine-origin review event only when a row is newly created.
- Avoids duplicating an existing active review with the same user/date/type/hash identity.
- Returns a ready state plus `persistenceWarning` if review persistence fails after engine resolution.
- Does not hide the engine state when persistence fails.

Active reviews are loaded through `loadAthleteJourney`, flow into the nutrition engine, and appear in the Fuel view model.

## Review UI

`NutritionSafetyReviewCard` now shows:

- Active review status.
- Review id.
- Reasons.
- Blocking flags.
- Suggested next steps.
- Request action when required but not yet persisted.
- Acknowledge action for active requested or blocked reviews.
- Hard-stop-remains copy.
- "This does not clear the plan" copy.

There is no clear button in the client.

## Manual Fuel History

`fuelHistoryViewModel` summarizes manual inputs without turning CornerIQ into a generic diet app:

- Today summary.
- Recent manual meals.
- 7-day macro trend.
- 7-day hydration trend.
- Electrolyte summary.
- Fiber/sodium summary.
- Logging confidence.
- Missing-data copy.
- Fight-week warnings when relevant.

Rules:

- Food history does not change targets by itself.
- Missing logs are low confidence, not failure.
- Sodium/fiber context is for consistency and gut comfort, not acute cut instructions.
- Barcode scanning is not required or implemented.
- Full meal planning is not implemented.

## Body-Mass Trajectory

`bodyMassTrajectoryViewModel` adds a non-chart trajectory panel:

- Latest weight.
- 7-day log count.
- Trend.
- Target.
- Days to weigh-in.
- Status.
- Cycle-noise note.
- Next safe action.
- Missing-data copy.
- Review-action visibility for blocked/unsafe states.

Rules:

- No calorie cuts based on cycle scale spikes.
- No acute protocol details.
- Unknown data stays unknown.
- Blocked/unsafe state points back to review action.

## Persistence Tables

Nutrition review persistence:

- `nutrition_safety_reviews`: one auditable review row per user/date/type/engine/input/output identity.
- `nutrition_safety_review_events`: append-only event history for the review row.

Existing nutrition command persistence remains:

- `nutrition_targets.target_payload`: stores the resolved nutrition/Fuel Command Center snapshot.
- `engine_runs` and `decision_traces`: store engine-level audit context.
- `athlete_journey_events`: records journey-level review requests.

## Safety Boundaries

The Fuel system does not show or prescribe:

- sauna
- sweat suit
- laxatives
- diuretics
- dangerous dehydration
- acute cuts for minors
- "make weight at all costs" behavior
- barcode scanning
- full meal planning

## Smoke Status

Latest live smoke passed after migration 008 was applied remotely.

The smoke verifies:

- Manual food, water, electrolyte, readiness, body-mass, and protected-workout writes.
- Fuel history resolves after manual food/water logs.
- Body-mass trajectory resolves after a manual body-mass log.
- Nutrition target command snapshot persists and excludes tested unsafe terms.
- A benign `general_nutrition` safety review can be requested through the service.
- A `nutrition_safety_reviews` row is written.
- A `nutrition_safety_review_events` requested event is written.
- A `NutritionSafetyReviewRequested` journey event is written.
- Athlete acknowledgement updates status to `acknowledged`.
- No hard stop is cleared by request or acknowledgement.
- Smoke-created review/event rows are cleaned up.

## Known Gaps

- No permissioned clinician, dietitian, admin, or coach reviewer workflow yet.
- No reviewer-cleared workflow is exposed to the app.
- No coach/clinician messaging.
- No full meal-planning system.
- No barcode scanning.
- No detailed food database.
- Manual food history is useful but still basic.
- Nutrition command snapshots still use `nutrition_targets.target_payload`; no dedicated nutrition command snapshot table exists.
