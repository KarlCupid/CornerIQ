# CornerIQ Product Brief

## Mission

CornerIQ is a boxing performance operating system for athletes who need one reliable place to plan training support, fueling, readiness, body mass, weight-class decisions, cycle-aware context, fight camp, fight week, weigh-ins, tournaments, and recovery.

The product promise is direct: CornerIQ gives the athlete the intelligence in their corner without pretending to replace their boxing coach, physician, or dietitian.

## Primary User

- Boxing athletes from serious amateurs to professionals.
- Athletes may be in build phase, fight camp, short-notice camp, fight week, tournament week, post-weigh-in, bout day, recovery, deload, or maintenance.
- Athletes may have no wearable, a manual-only logging habit, Apple Health, Health Connect, or future wearable sources.
- Athletes may optionally enable private cycle support.

## Secondary Future Users

- Boxing coaches reviewing protected boxing anchors and completion.
- Strength and conditioning coaches reviewing generated support work and load ledger.
- Nutrition professionals reviewing targets, body-mass trend, weigh-in protocol gates, and rehydration.
- Medical professionals only when the athlete explicitly shares or when a future consent/legal workflow exists.

## Boxing-Only Scope

CornerIQ is not a generic fitness app, MMA planner, meal tracker, wellness dashboard, or period tracker. Every recommendation must be framed around boxing performance, safe weight-class support, and athlete continuity.

## Athlete Journey

The athlete should not restart after a fight is accepted, rescheduled, missed, or completed. The app maintains a durable `AthleteJourney` and resolves it into a current `PerformanceState` for each day.

Core journey transitions:

- Onboarding to build phase.
- Build phase to fight opportunity.
- Fight opportunity to confirmed camp or short-notice camp.
- Camp to fight week.
- Fight week to weigh-in day, post-weigh-in, bout day, and recovery.
- Tournament start, repeated weigh-ins, repeated bouts, and tournament recovery.
- Deload or maintenance when readiness, injury, or plan completion requires it.

## Build Phase

Build phase has no required fight date. The engine supports long-term athletic development, stable walk-around range, body composition, strength, aerobic base, skill frequency, and safe weight-class preparation. Aggressive deficits and acute scale manipulation are blocked without a valid fight context.

## Fight Camp

Camp requires a confirmed, tentative, or short-notice fight context. The engine reads bout date, weigh-in timing, rounds, target class, travel, protected boxing sessions, readiness, cycle context, body-mass trend, and nutrition history. Camp decisions protect boxing quality first.

## Fight Week And Weigh-In

Fight week separates chronic fat loss from acute scale pressure. The engine may provide conservative gut-comfort context, carbohydrate/glycogen context, sodium-consistency reminders, and staged post-weigh-in rehydration checklists only behind strict gates. It must not generate water-loading, sodium-manipulation, dehydration, or fluid-restriction protocols.

Blocked states must explain alternatives: move weight class, extend timeline, stop cutting, or seek professional review.

## Amateur Tournaments

Tournament mode assumes repeated weigh-ins and possible same-day bouts. The default strategy is to stay near weight and avoid large daily dehydration cycles. Evening meals, hydration, travel food, hotel constraints, and morning weight are first-class inputs.

## Cycle Support

Cycle support is optional, private, and consent-based. It influences training, nutrition, readiness, body-mass interpretation, fight-week risk, and safety. It does not make fertility claims, deterministic phase prescriptions, or pink-branded assumptions.

## Wearable And No-Wearable Support

Manual input is first-class. A boxer without a wearable still receives readiness, training, nutrition, body-mass trend, fight-week support, tournament support, cycle support if enabled, and explanations.

Wearables increase confidence when fresh and consistent. They never override hard-stop symptoms and are never required.

## Non-Goals

- No generated sparring, unsupervised fight simulation, or contact coaching.
- No medical diagnosis or treatment.
- No dangerous dehydration instructions without gates.
- No sauna, sweat-suit, or extreme dehydration recommendations.
- No minor athlete acute weight manipulation.
- No generic workout fallback.
- No hidden business logic in UI.
- No legacy compatibility with Athleticore OS.
