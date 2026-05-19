# Nutrition And Weight-Class Spec

## Responsibility

The nutrition and body-mass engines produce boxer-specific targets, feasibility, fueling windows, hydration guidance, fight-week gating, rehydration, and explanations. They do not diagnose, prescribe medical care, or encourage making weight at all costs.

## Inputs

- Athlete profile: age, height, current body mass, sex-at-birth if provided, boxing level, training age, medical flags, ED risk, weight-cut history.
- Objective: maintain, lean gain, recomposition, gradual cut, weight-class preparation, camp, tournament, recovery.
- Fight: bout date, weigh-in timing, type, target class, contracted weight, allowance, rounds, hydration testing, post-weigh-in cap.
- Tournament: daily weigh-ins, likely same-day bouts, number of potential bouts, rehydration windows.
- Training: protected boxing anchors, generated support sessions, hard-day count, sparring rounds, roadwork, S&C load.
- Readiness: sleep, energy, soreness, stress, pain, illness, RPE.
- Body mass: logs, source, freshness, trend, variability, scale-noise tags.
- Intake: food, water, electrolyte, sodium, fiber, confidence by source.
- Cycle: consent, phase estimate, symptoms, flow, contraception context, scale-noise risk.
- Wearables: optional signals and freshness.
- Safety: active risk flags and professional-review state.

## Outputs

- Calorie target and range.
- Protein, carbohydrate, fat, fiber targets.
- Sodium/electrolyte guidance.
- Water/fluid target.
- Session fueling windows.
- Body-mass trend interpretation.
- Target feasibility.
- Weigh-in risk score.
- Fight-week protocol state: no protocol, eligible education, review required, blocked.
- Low-residue/gut-content guidance when appropriate.
- Rehydration plan when post-weigh-in.
- Tournament daily plan.
- Safety warnings and decision trace.

## Build Phase

Build phase prioritizes training quality and stable development. Allowed objectives:

- maintenance
- lean gain
- recomposition
- gradual cut
- weight-class preparation

Rules:

- No acute manipulation without fight context.
- No aggressive deficit without fight date and safe trend.
- Protein remains protected.
- Carbohydrates rise around sparring, hard conditioning, roadwork, and power work.
- Cycle-related scale spikes do not trigger calorie cuts.
- Missing food logs reduce confidence but do not punish the athlete.

## Camp

Camp integrates fight date, class, trend, sparring, S&C, roadwork, readiness, sleep, symptoms, cycle context, and weigh-in logistics.

States:

- on_track
- behind
- ahead
- unsafe
- cycle_noisy
- needs_review
- unknown

Safety caps:

- Chronic body-mass loss should be gradual and individualized.
- Short-notice large losses trigger review or block.
- Hard training plus aggressive deficit plus dehydration is blocked.
- Red readiness protects recovery calories.

## Fight Week

Fight-week planning separates:

- chronic fat loss
- gut-content reduction
- glycogen and water shifts
- sodium consistency or supervised changes
- fluid manipulation
- rehydration

The engine must support a `no_protocol` state when data is incomplete or risk is high.

## Acute Protocol Gates

Water loading, sodium manipulation, carbohydrate manipulation, or meaningful acute loss require:

- athlete age >= 18
- confirmed weigh-in date/time
- current body mass
- recent daily body-mass logs
- target weight and allowance
- health-risk screen
- no dizziness, fainting, illness, kidney/cardiac red flags, or severe dehydration symptoms
- no active ED risk
- no active severe under-fueling risk
- cycle symptom screen when cycle tracking is enabled
- no pregnancy or possible pregnancy risk when relevant
- user acknowledgment that this is educational support, not medical care
- professional review when acute loss exceeds internal caps

Automatic blocks:

- minor athlete
- unknown weigh-in timing
- poor data confidence
- same-day weigh-in above conservative acute threshold
- active RED-S/under-fueling flags
- severe cycle symptoms, heavy bleeding with dizziness, or unusual pain
- severe restriction history

## Fiber And Gut Content

Low-residue guidance:

- short term only
- lower fiber does not mean lower calories
- use familiar tolerated foods
- avoid novel foods and supplements
- protect carbs and sodium around training as needed
- restore fiber after weigh-in/fight
- adjust for cramps, GI symptoms, bloating, and cycle context

## Sodium And Electrolytes

Rules:

- Build/camp default is sodium consistency.
- Hard sweating sessions increase electrolyte attention.
- Fight-week sodium changes require gates.
- Rehydration includes sodium.
- Excess plain water with low sodium triggers hyponatremia warning.
- Hypertension, kidney, cardiac, and relevant medication flags require review.

## Rehydration

Post-weigh-in output includes:

- immediate fluid plus electrolytes
- staged carbohydrate restoration
- tolerable sodium
- meal sequence by time window
- gut comfort fallback
- no novel supplements
- plain-water overdrinking warning
- same-day conservative path
- day-before fuller restoration path
- tournament repeated weigh-in path

Hard warning symptoms:

- dizziness
- confusion
- fainting
- chest pain
- severe cramping
- inability to urinate
- dark urine with symptoms
- persistent vomiting
- severe headache

## Food Logging

Food logging separates actuals from targets:

- meals
- custom foods
- recipes later
- barcode later
- water logs
- electrolyte logs
- sodium/fiber tracking
- source confidence
- recomputable summaries

Actual intake never clears safety flags by itself.
