# Corner Engine Spec

## Engine Rule

Corner Engine is the source of truth for business decisions. Screens read view models from engine output. External data is runtime-validated before it reaches the engine. Core functions are pure, synchronous, deterministic, and reproducible from canonical records.

## Canonical Records

`AthleteJourney` contains:

- `athlete`: immutable and mutable athlete profile fields.
- `activePhase`: current phase if explicitly set, otherwise resolved.
- `activeObjective`: build, recomposition, gradual cut, lean gain, maintain, camp, tournament, recovery.
- `activeFightOpportunity`.
- `activeTournament`.
- `currentTrainingBlock`.
- Histories for body mass, nutrition, hydration, cycle, readiness, wearable signals, training, safety flags, and journey events.

Generated plans are prescriptions. Logs are actuals. Engine outputs are reproducible projections, not source of truth.

## PerformanceState

`PerformanceState` is the unified resolved state for an `asOfDate`.

Required fields:

- `athlete`
- `phase`
- `objective`
- `fightContext`
- `weighInContext`
- `tournamentContext`
- `bodyMass`
- `nutrition`
- `hydration`
- `cycle`
- `training`
- `readiness`
- `wearable`
- `safety`
- `confidence`
- `decisionTrace`
- `viewModels`
- `generatedAt`
- `asOfDate`

## Types

`Confidence`:

- `level`: `high | medium | low | unknown`
- `score`: 0 to 1
- `reasons`: evidence supporting confidence
- `missingInputs`: missing required or helpful inputs

`RiskFlag`:

- `domain`: training, nutrition, hydration, body_mass, cycle, fight, tournament, readiness, wearable, medical, plan_integrity
- `severity`: info, caution, high, critical
- `blocksPlan`: blocks the relevant plan
- `hardStop`: stops automatic plan generation
- `requiresProfessionalReview`: asks for qualified review
- `evidence`: structured supporting inputs
- `explanation`: athlete-facing reason

`DecisionTrace`:

- engine name
- step
- input summary
- selected decision
- rejected alternatives
- rationale
- safety flags
- confidence
- timestamp

## PhaseState

Valid phases:

- onboarding
- build
- camp
- short_notice_camp
- fight_week
- tournament
- weigh_in_day
- post_weigh_in
- bout_day
- recovery
- deload
- maintenance

Phase resolution order:

1. Critical safety phase override: recovery or deload when hard stops or severe readiness flags exist.
2. Tournament context when active and date is within tournament window.
3. Fight context by current date, bout date, weigh-in date/time, and completion.
4. Explicit active phase only if consistent with fight/tournament facts.
5. Build as default after onboarding.

## Engine Recompute

The kernel recomputes from canonical records when:

- a journey event is appended
- body mass, food, water, electrolyte, training, readiness, cycle, or wearable data changes
- fight details, weigh-in timing, or tournament details change
- safety flags are raised or cleared
- current date changes
- engine version changes

Read paths must not mutate source records.

## Kernel Steps

`resolvePerformanceState(input)`:

1. Validate input shape at service boundary.
2. Resolve phase and fight/tournament context.
3. Resolve cycle context and confidence.
4. Resolve body-mass trend, scale noise, and feasibility.
5. Resolve readiness from manual and optional wearable signals.
6. Resolve safety flags and hard stops.
7. Resolve protected boxing anchors and training load ledger.
8. Generate boxing-specific support plan around anchors.
9. Resolve nutrition from phase, training demand, body mass, cycle, and safety.
10. Resolve fight-week, weight-cut, rehydration, and tournament support only when gated safe.
11. Build Today, Fuel, Train, Plan, Cycle, and Profile view models.
12. Produce a decision trace.

## Missing Data

Missing data is unknown, not safe. Unknown values reduce confidence and may block protocols:

- body mass
- recent body-mass trend
- weigh-in timing
- hydration status
- intake
- sleep/readiness
- cycle status when enabled
- medical risk screen
- age
- wearable freshness

## Versioning

Every persisted engine run stores:

- `engine_version`
- input record ids and timestamps
- output hash
- decision trace ids
- invalidation reason when superseded
