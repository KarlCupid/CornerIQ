# Testing Strategy

## Principle

Engine tests come before UI reliance. Dangerous edge cases need fixtures and deterministic assertions.

## Test Layers

- Type-level compile checks through strict TypeScript.
- Unit tests for pure engine modules.
- Fixture scenario tests for full kernel output.
- Simulation tests for multi-day camp, tournament, and recovery later.
- Repository tests for Supabase mappers and RLS later.
- React Native Testing Library tests for screens and view-model rendering.
- E2E tests only after a retained web or device flow exists.

## Fixture Families

Required fixtures:

- amateur_novice_build
- amateur_open_tournament
- amateur_elite_camp_same_day_weigh_in
- pro_4_round_build_strength
- pro_8_round_camp_day_before_weigh_in
- pro_12_round_taper
- short_notice_unsafe_cut
- minor_athlete_weight_cut_blocked
- underfueling_risk_camp
- no_data_low_confidence
- menstruating_athlete_build_phase_scale_noise
- menstruating_athlete_camp_heavy_symptoms
- hormonal_contraception_athlete_symptom_based
- no_wearable_manual_only
- apple_health_wearable_enhanced
- health_connect_wearable_enhanced

## Nutrition Scenarios

- build lean gain with heavy S&C
- build gradual cut with no fight date
- same-day weigh-in aggressive acute cut blocked
- amateur tournament keeps athlete near class
- pro day-before safe trend
- short-notice unsafe loss blocked
- minor acute cut blocked
- dizziness/fainting hard stop
- under-fueling risk from rapid loss and missed targets
- no body-mass logs gives low confidence and no acute protocol
- 24-hour rehydration staged plan
- 4-hour same-day conservative rehydration
- sparring plus strength preserves carbs
- red readiness protects recovery
- excessive plain water with low sodium warning
- cycle scale spike reduces scale confidence
- heavy bleeding plus dizziness blocks cut
- missed period plus rapid loss flags RED-S-style risk

## Training Scenarios

- amateur novice, 3 boxing sessions, no equipment
- amateur open sparring Tuesday/Friday avoids conflicts
- pro 12-round taper discipline
- short-notice load increase blocked
- red readiness blocks hard work
- shoulder pain replaces pressing
- knee pain changes roadwork/plyos
- limited availability preserves protected boxing
- missed workouts repeat/regress
- fight week taper drops volume
- tournament week avoids hard conditioning plus dehydration
- build strength progresses while protecting boxing
- protected or manually logged roadwork reduces generated roadwork
- sparring day cannot receive hard intervals
- generated session includes fuel-demand handoff
- high cycle symptoms trim optional work
- contraception uses symptom-based adjustments
- manual-only readiness works
- wearable confidence improves but hard stops win

## UI Scenarios

- Today shows useful next action first.
- Fuel shows "hit these first" before charts.
- Train card explains why session changed.
- Cycle context appears only when enabled and relevant.
- No-wearable user never sees missing-wearable shame copy.
- Risk flags are visible.
- Every main card has a why detail.

## Determinism

No engine test depends on random values, wall clock, network, service state, or mutable singletons. Dates are passed into the kernel.
