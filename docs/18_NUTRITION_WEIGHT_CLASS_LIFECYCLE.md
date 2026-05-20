# Nutrition And Weight-Class Lifecycle

Date: 2026-05-20

This document describes the seventeenth implementation pass for the Fuel / Weight-Class Command Center.

## Engine Shape

Fuel decisions remain engine-owned. Screens render `FuelViewModel` fields and do not recompute body-mass, fight-week, cycle, tournament, or safety decisions.

Primary files:

- `src/engine/nutrition/fuelCommandTypes.ts`
- `src/engine/nutrition/fuelCommandEngine.ts`
- `src/engine/nutrition/nutritionEngine.ts`
- `src/engine/presentation/fuelViewModel.ts`
- `src/app/screens/FuelScreen.tsx`
- `src/app/screens/fuel/FuelCommandCards.tsx`

## Phases

The command center normalizes nutrition-facing phases to:

- `build`: fuel training quality, keep body composition pressure conservative, avoid aggressive deficits.
- `camp`: monitor safe weight-class trajectory while protecting boxing-session carbohydrates.
- `fight_week`: separate chronic body-composition work from gut-comfort choices; lower-fiber guidance never means lower calories.
- `tournament`: favor stay-near-weight, repeated fueling, travel food control, and between-bout recovery.
- `weigh_in_day`: same-day weigh-ins stay conservative and function-first.
- `post_weigh_in`: staged refuel and rehydration checklist can appear when safe.
- `bout_day`: protect usable fuel and gut comfort.
- `recovery`: protect calories, fluids, and recovery.

## Body-Mass Status

`WeightClassStatus` translates existing body-mass feasibility into athlete-readable action:

- `no_active_weight_target`: no fight/tournament class pressure today.
- `on_track`: hold conservative trajectory and fuel boxing.
- `behind`: do not force an acute cut; review class/timeline/fuel.
- `ahead`: protect calories and recovery instead of continuing pressure.
- `cycle_noisy`: use the 7-day trend; do not react to a short-term cycle spike.
- `unsafe` / `blocked`: stop automatic weight-class pressure and require review.
- `needs_review`: keep training fuel while the target is reviewed.
- `unknown`: missing data stays unknown, not safe.

## Cycle And Scale Noise

Cycle support remains optional, private, and symptom-aware. Cycle-related scale noise can lower weight-class confidence and prevents calorie cuts from short-term spikes. Heavy flow, heavy symptoms, dizziness, or hard-stop cycle flags raise safety/review copy rather than pressure.

## Under-Fueling Safety

Rapid loss, repeated low intake, or missed-period under-fueling risk blocks deficit pressure. Red readiness protects calories and recovery fuel. Food logs increase confidence, but missing logs are not treated as failure or permission to cut.

## Fight Week

Fight-week fuel plan fields cover fiber, sodium, carbohydrates, hydration, gut comfort, safe actions, blocked reasons, and review reasons.

Rules:

- Lower-residue guidance is only gut-comfort guidance; calories stay protected.
- Sodium and hydration guidance is conservative and safety-gated.
- Same-day weigh-ins are function-first and conservative.
- Day-before weigh-ins can show a fuller staged post-weigh-in checklist when safe.
- Minors and possible/confirmed pregnancy block acute protocols.
- Heavy bleeding plus dizziness blocks cut pressure.

## Rehydration Checklist

`RehydrationChecklist` is now athlete-usable:

- immediate actions
- first meal
- next meal
- fluids/electrolytes
- carb priority
- gut comfort rules
- warning symptoms
- confidence

Same-day windows stay small and conservative. Day-before windows can stage fluids, electrolytes, sodium-containing foods, and carbohydrate restoration when safety allows. Warning symptoms remain visible.

## Tournament Mode

`TournamentFuelPlan` makes amateur tournament support first-class:

- stay-near-weight strategy
- daily weigh-in priorities
- between-bout priorities
- evening meal guidance
- travel/hotel food guidance
- warning flags
- explanation

The plan avoids large repeated scale swings and recommends review, a safer class, or stopping automatic pressure when unsafe.

## Safety Review Workflow

`NutritionSafetyReview` is a service-level skeleton, not a clinician workflow. The UI can log that review is needed through `requestNutritionSafetyReview`, which appends `NutritionSafetyReviewRequested` to journey events. This does not self-clear a hard stop.

## Persistence Status

No `008` migration was added. Existing tables are sufficient for this pass:

- `nutrition_targets.target_payload` now persists the resolved fuel command snapshot because `mapNutritionTargetToRow` stores `state.nutrition`.
- `engine_runs` and `decision_traces` still persist engine-level audit context.
- `athlete_journey_events` records safety-review requests.

The live smoke now verifies that the persisted nutrition target payload contains the command center and weight-class status and does not contain the tested unsafe terms.

## Intentionally Not Shown

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

## Known Gaps

- Food logging remains manual and simple.
- No full meal-planning system.
- No barcode scanning.
- No clinician/coach messaging integration for review requests.
- No dedicated nutrition audit table yet; existing `nutrition_targets` is used for command snapshots.
- No detailed nutrition history drill-down.
