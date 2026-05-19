# Cycle Support Spec

## Product Boundary

Cycle support is optional, private, consent-based, and boxing-specific. It is not fertility advice, medical diagnosis, or a deterministic phase rule system.

## Inputs

- tracking enabled/disabled
- consent version
- bleed start/end dates
- flow level
- cramps
- headache or migraine
- GI changes
- bloating
- water retention
- cravings
- mood and anxiety
- energy
- sleep quality
- temperature feeling
- hormonal contraception type
- regularity
- missed period signals
- wearable skin temperature, RHR, HRV, sleep if permitted
- manual check-ins

## Outputs

- estimated cycle day
- estimated phase
- confidence
- symptom burden score
- body-mass interpretation
- nutrition adjustment
- hydration adjustment
- training adjustment
- fight-week caution
- safety flags
- athlete-facing explanation

## Phase Estimation

The engine may estimate:

- menstruation
- early_follicular
- late_follicular
- ovulatory_window
- early_luteal
- mid_luteal
- late_luteal
- unknown
- hormonal_contraception_suppressed
- irregular_or_uncertain
- pregnancy_possible_or_confirmed
- postpartum
- perimenopause_possible

Confidence is high only with recent logs and regular patterns. Hormonal contraception contexts avoid natural-cycle phase claims unless clinically appropriate and supported by user data.

## Training Effects

The engine does not deload based only on estimated phase. It adapts to actual symptom burden and athlete pattern.

Possible adjustments:

- maintain plan with note
- lower complexity
- lower volume
- lower intensity
- switch hard conditioning to Zone 2, durability, or recovery
- preserve key sparring when safe
- reduce accessory work
- increase warm-up and mobility
- adjust roadwork modality
- add recovery reset
- flag coach/medical review when symptoms are severe or unusual

## Nutrition Effects

Cycle-aware nutrition supports:

- carbohydrate support around hard sessions
- protein consistency
- iron-rich food reminders for heavy bleeding
- hydration/electrolyte attention
- GI-sensitive food choices during cramps/GI symptoms
- no aggressive deficit when symptoms or under-fueling risk are present
- no shame around cravings

## Body-Mass Effects

The engine tags likely cycle-related scale noise when bloating, water retention, late-luteal context, menstruation, or heavy symptoms are present. It prefers rolling averages and trend windows over one-day scale spikes.

Athlete-facing actions:

- keep sodium and fluids consistent
- do not chase today’s spike
- use the 7-day trend
- log symptoms so the engine can learn the pattern

## Fight Week Effects

Fight week asks about current cycle symptoms when tracking is enabled. Severe symptoms, heavy bleeding with dizziness, migraines, unusual pain, and poor sleep trigger caution or block acute protocols.

Same-day weigh-ins require extra caution because performance and hydration margins are smaller.

## Hormonal Contraception

Supported categories:

- none
- combined_pill
- progestin_only_pill
- hormonal_iud
- copper_iud
- implant
- injection
- patch
- ring
- unknown

The engine uses contraception context, bleeding pattern, and symptoms. It does not infer fertility windows.

## Safety Flags

Cycle-related flags include:

- missed period after previously regular cycles
- very heavy bleeding
- severe pain
- dizziness/faintness
- unusual pelvic pain
- concerning migraine symptoms
- possible pregnancy
- rapid weight loss plus cycle disruption
- restrictive eating plus cycle disruption
- recurrent illness plus cycle disruption
- worsening mood or anxiety
- aggressive cut requested during high symptom burden

## UI Rules

Cycle context appears only when enabled and relevant. It is shown as performance context, not a separate pink module.

Examples:

- "Cycle symptoms are high. Keep boxing, reduce extra fatigue."
- "Scale confidence is lower today; use the trend, not one weigh-in."
- "Heavy flow logged: keep protein steady, include iron-rich foods, and do not add a deficit today."
