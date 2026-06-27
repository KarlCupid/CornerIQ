# Nutrition And Weight-Class Lifecycle

Date: 2026-06-27

This document describes the Fuel / Weight-Class Command Center after the Fuel science overhaul. Fuel now resolves evidence-traceable target ranges, input-confidence states, food-log quality, energy-availability risk, Hydration V2, conservative fight-week/tournament behavior, and a canonical nutrition safety review lifecycle. It still does not add barcode scanning, full meal planning, a detailed food database, reviewer-clear UI, or unsafe weight-cut instructions.

## Engine Shape

Fuel decisions remain engine-owned. Screens render `FuelViewModel` fields and do not recompute body-mass, fight-week, cycle, tournament, or safety decisions.

Primary files:

- `src/engine/nutrition/fuelCommandTypes.ts`
- `src/engine/nutrition/fuelCommandEngine.ts`
- `src/engine/nutrition/evidenceRegistry.ts`
- `src/engine/nutrition/nutritionSafetyReviewTypes.ts`
- `src/engine/nutrition/nutritionEngine.ts`
- `src/engine/nutrition/macroTargets.ts`
- `src/engine/nutrition/foodLogSummary.ts`
- `src/engine/nutrition/energyAvailability.ts`
- `src/engine/nutrition/hydrationEngine.ts`
- `src/engine/nutrition/reviewerWorkflow.ts`
- `src/engine/presentation/fuelViewModel.ts`
- `src/engine/presentation/nutritionReviewHistoryViewModel.ts`
- `src/engine/presentation/fuelHistoryViewModel.ts`
- `src/engine/presentation/bodyMassTrajectoryViewModel.ts`
- `src/services/nutrition/requestNutritionSafetyReview.ts`
- `src/services/nutrition/loadNutritionSafetyReviewHistory.ts`
- `src/services/supabase/nutritionSafetyReviewRepository.ts`
- `supabase/functions/review-nutrition-safety/policy.ts`
- `src/app/screens/FuelScreen.tsx`
- `src/app/screens/fuel/NutritionSafetyReviewCard.tsx`
- `src/app/screens/fuel/NutritionReviewHistoryPanel.tsx`
- `src/app/screens/fuel/FuelHistoryPanel.tsx`
- `src/app/screens/fuel/BodyMassTrajectoryPanel.tsx`

## Persisted Review Lifecycle

Migration `008_nutrition_safety_reviews.sql` added:

- `nutrition_safety_reviews`
- `nutrition_safety_review_events`

Both tables are owner-scoped with RLS using `auth.uid() = user_id`. No permissive coach, clinician, dietitian, admin, or reviewer write policy was added. Migration `20260627090000_nutrition_safety_review_canonical_statuses.sql` canonicalizes old rows and tightens table constraints/policies.

Review statuses:

- `requested`
- `acknowledged_by_athlete`
- `reviewer_reviewing`
- `cleared_by_reviewer`
- `not_cleared`
- `superseded`

`cleared_by_reviewer` exists in the schema and mappers for future permissioned workflows only. The current client exposes no athlete method or button that can set it.

Event types:

- `requested`
- `acknowledged_by_athlete`
- `reviewer_reviewing`
- `reviewer_assigned`
- `reviewer_note`
- `cleared_by_reviewer`
- `not_cleared`
- `superseded`

Current athlete actions:

- Request a nutrition safety review when the engine says one is required.
- Acknowledge an active `requested` or `not_cleared` review.
- See active review status, review id, reasons, blocking flags, and suggested next steps.

Current athlete non-actions:

- Cannot clear a hard stop.
- Cannot mark a review as `cleared_by_reviewer`.
- Cannot assign a reviewer.
- Cannot write coach, clinician, dietitian, or admin review events.

Hard stops remain active after request and acknowledgement. Reviewer transitions are centralized in `canTransitionNutritionSafetyReview`. Clear/not-clear/reviewing transitions require trusted server-side reviewer/admin identity and audit event creation. The `review-nutrition-safety` Edge Function is intentionally non-operative until relationship lookup and audit persistence are wired.

## Target Confidence

`nutrition.fuelTargetRange`, `nutrition.targetConfidence`, and `FuelMacroTargetsViewModel.targetConfidence` surface whether Fuel targets are `confident`, `provisional`, `low_confidence`, `numeric_unavailable`, or `blocked_by_safety`.

Factors include:

- missing or stale body mass
- low-confidence body-mass trend
- missing, partial, calories-only, macro-partial, or low-confidence food logs
- cycle-related scale noise
- under-fueling evidence
- hard-stop safety flags
- active nutrition safety review

Fuel UI shows status and ranges before any midpoint-style numbers so targets do not look more exact than the inputs support. Under-fueling and hard-stop states preserve useful fueling context but explicitly block deficit pressure. Missing or stale body mass returns `numeric_unavailable`; it does not fall back to a default body weight.

## Food-Log Quality

Food logging accepts manual, calories-only, macro-partial, macro-complete, and day-total inputs. Calories are first-class; protein, carbohydrate, fat, fiber, and sodium can be unknown. The engine records:

- per-nutrient completeness
- `targetComparisonAllowedByNutrient`
- whether the food log can create under-fueling evidence
- confidence reasons and evidence ids

Calories-only and macro-partial logs can guide execution for known nutrients. They cannot prove safety, cannot clear a review, and cannot create under-fueling evidence unless the day is complete enough and confidence is high enough.

## Energy Availability And Hydration V2

`energyAvailabilityEstimate` is exact only when complete intake, planned exercise energy, and fat-free mass are available. Otherwise it is `not_estimated` or `proxy_only`. Low energy availability or RED-S/ED risk blocks deficit pressure and acute protocol support.

`hydrationPlanV2` uses body mass, manual water/electrolyte logs, training demand, phase, weigh-in context, warning symptoms, and medical flags. It returns baseline context, session plan, sweat-rate-based context, post-weigh-in context, review-required, or blocked. Baseline fluid ranges use 30-40 ml/kg context when body mass is current enough. Hydration testing, post-weigh-in fluid caps, warning symptoms, and overdrinking risk are review-gated; the app does not generate dehydration, water-loading, sodium-manipulation, or fluid-restriction protocols.

## Body-Weight Freshness

`BodyMassState.freshness` separates trend history from current weight-class authorization:

- no active weight target: today’s scale check is optional;
- active normal cut: recent body weight can support trend context, but stale or missing values pause scale-driven decisions;
- fight-week or short-notice context: same-day body weight is required;
- stale active-cut body weight raises `stale_current_body_mass` and leaves feasibility `unknown` instead of using an old latest value.

Trend history still renders in Fuel and Recent Logs, but stale values cannot authorize acute or scale-driven recommendations.

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

Recent review events are loaded through `loadAthleteJourney` with a bounded repository query. `loadNutritionSafetyReviewHistory` provides a lightweight service for active reviews plus recent review events without requiring a large performance state payload.

## Review UI And History

Fuel now uses a dashboard-first screen:

- Dashboard: macro summary, hydration/sodium, meal distribution, body-mass and fueling trend, recovery support, and today's recommendation.
- Manual logging: `Log meal` and `Add water` open supported quick-log paths without requiring a wearable or food database.
- Reviews: active review status plus `NutritionSafetyReviewCard` and `NutritionReviewHistoryPanel`.
- Body Mass: dashboard trend context, target confidence, and cycle scale-noise copy when relevant.

If an active nutrition review exists and the athlete switches away from Command or Reviews, `FuelScreen` renders a RiskBanner at the top. Safety review visibility is therefore not hidden by section state.

`NutritionSafetyReviewCard` now shows:

- Active review status.
- Review id.
- Reasons.
- Blocking flags.
- Suggested next steps.
- Request action when required but not yet persisted.
- Acknowledge action for active `requested` or `not_cleared` reviews.
- Hard-stop-remains copy.
- "This does not clear the plan" copy.

There is no clear button in the client.

`NutritionReviewHistoryPanel` now shows:

- Active review count.
- Hard-stop review count.
- Active review cards with status, type, severity, reasons, blocking flags, suggested next steps, request time, acknowledgement state, and `canSelfClear: false`.
- Review event timeline with date, event type, actor type, and summary.
- No-history copy.
- Safety copy stating that acknowledgement or history visibility does not clear the plan.
- Future-only copy that reviewer-clear workflow is not exposed in the app yet.

The panel reads `NutritionReviewHistoryViewModel`; it does not import repositories or expose coach/clinician write actions.

## Manual Fuel History

`fuelHistoryViewModel` summarizes manual inputs without turning CornerIQ into a generic diet app:

- Today summary.
- Recent manual meals.
- 7-day macro trend.
- 7-day hydration trend.
- Grouped last-7-day food and hydration records with calories, protein, carbs, fat, fiber, sodium, water liters, electrolyte summary, confidence, and notes.
- High fuel-demand session links that highlight low food-log confidence without changing targets.
- Electrolyte summary.
- Fiber/sodium summary.
- Fight-week markers for fiber/sodium context without acute manipulation guidance.
- Hydration consistency copy from water/electrolyte logs.
- Logging confidence.
- Missing-data narrative.
- Fight-week warnings when relevant.

Rules:

- Food history does not change targets by itself.
- Missing logs are low confidence, not failure.
- Sodium/fiber context is for consistency and gut comfort, not acute cut instructions.
- Barcode scanning is not required or implemented.
- Full meal planning is not implemented.

`FuelHistoryPanel` renders the history view model in Fuel after the quick/recent logging cards. It includes the explicit copy: "This does not change targets by itself." A compact list can open a stateful day detail with what happened, why it matters, confidence notes, and safety context without raw JSON.

## Body-Mass Trajectory

`bodyMassTrajectoryViewModel` adds a non-chart trajectory panel:

- Latest weight.
- Last-14-day body-mass rows with date, kg, source, and note.
- 7-day log count.
- Trend.
- Trend confidence.
- Target.
- Days to weigh-in.
- Target gap when fight setup is active.
- Status.
- Cycle-noise window note.
- Risk explanation.
- Next safe actions.
- Missing-data copy.
- Review-action visibility for blocked/unsafe states.

Rules:

- No calorie cuts based on cycle scale spikes.
- No acute protocol details.
- Unknown data stays unknown.
- Blocked/unsafe state points back to review action.

`BodyMassTrajectoryPanel` renders this as a simple list and status panel. It intentionally uses no chart package in this pass.

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

## Verification Status

Historical live smoke passed after migration 008. The canonical-status migration requires the normal migration/lint/smoke lane before release. Live Supabase smoke remains explicit and opt-in; routine agent QA must not require real Supabase credentials.

The smoke verifies:

- Manual food, water, electrolyte, readiness, body-mass, and protected-workout writes.
- Fuel history resolves after manual food/water logs.
- Body-mass trajectory resolves after a manual body-mass log.
- Nutrition target command snapshot persists and excludes tested unsafe terms.
- A benign `general_nutrition` safety review can be requested through the service.
- A `nutrition_safety_reviews` row is written.
- A `nutrition_safety_review_events` requested event is written.
- A `NutritionSafetyReviewRequested` journey event is written.
- Athlete acknowledgement updates persisted review rows to `acknowledged_by_athlete`.
- No hard stop is cleared by request or acknowledgement.
- Smoke-created review/event rows are cleaned up.

Required local verification for Fuel changes:

- `cmd /c npm install`: passed; npm reported dependencies up to date and the existing audit state of 18 vulnerabilities, 1 low and 17 moderate.
- `cmd /c npm run typecheck`: passed.
- `cmd /c npm test`: passed with `791` tests and `1` skipped.
- `cmd /c npm run lint`: passed.
- `cmd /c npm run quality`: passed with typecheck plus tests; `791` tests and `1` skipped.
- `cmd /c npm run preflight:beta`: passed via production preflight. Apple paid-submission checks remained warnings because `CORNERIQ_APPLE_SUBMISSION=1` was not set.

## Known Gaps

- No permissioned clinician, dietitian, admin, or qualified reviewer workflow yet.
- No reviewer-cleared workflow is exposed to the app.
- No coach/clinician messaging.
- History surfaces are panels, not routed detail screens.
- No full meal-planning system.
- No barcode scanning.
- No detailed food database.
- Manual food history is more explainable but still basic.
- Nutrition command snapshots still use `nutrition_targets.target_payload`; no dedicated nutrition command snapshot table exists.
- Real boxer beta user testing is still needed for Fuel Command, Reviews, Body Mass, and History comprehension.
