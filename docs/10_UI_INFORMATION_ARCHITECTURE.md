# UI Information Architecture

## Rule

Every screen answers:

1. What matters right now?
2. What should I do next?
3. Why?
4. What is the risk/confidence?
5. What can I log quickly?

Screens read engine view models. They do not recompute business decisions.

## Today

First:

- primary next action
- boxing/training priority
- fuel priority
- body-mass or weight-class status when relevant
- cycle context when enabled and relevant
- readiness context
- risk flags
- confidence
- one-sentence explanation
- quick logs

Example:

"Today: protect sparring"

"Pads + sparring tonight own the hard stress. Strength support is trimmed to 25 minutes."

## Fuel

First:

- "hit these first" priorities
- calories/macros in simple form
- session fueling timing
- hydration/electrolyte target
- body-mass trend interpretation
- cycle-aware note when relevant
- fight-week/tournament state when relevant
- quick logs

Behind detail:

- charts
- raw food logs
- macro math
- source confidence
- sodium/fiber details

## Train

First:

- today’s protected anchors
- generated support session if any
- why the session exists
- what it protects
- intensity target
- substitutions
- readiness/cycle/safety modifications
- completion CTA

Workout player:

- workout title and section name
- step progress
- setup/work/rest/transition/checkpoint state
- large timer
- exact beginner instruction
- one cue
- one-line intent
- visible stop rule when present
- next-up card
- pause, restart, skip, pain, and finish controls
- swap options when an exercise offers them
- finish summary and result logging

No generated sparring appears.

## Plan

First:

- weekly structure
- protected boxing anchors
- generated support
- hard days
- recovery days
- conflict warnings
- weight/fuel implications
- taper or tournament timeline

Behind detail:

- load ledger
- progression rules
- training quality vector

## Fight

First:

- fight status
- countdown
- weigh-in timing
- target class and feasibility
- next safe action
- review requirements
- travel and logistics

Fight week never hides risk behind charts.

## Cycle

Visible only when enabled or during setup.

First:

- current estimated context
- confidence
- symptoms that matter for training/fuel/weight
- pattern insights after enough data
- privacy controls

No fertility framing by default.

## Profile

Includes:

- units
- boxing level
- fight settings
- equipment
- schedule
- protected boxing defaults
- cycle tracking controls
- wearable permissions
- safety profile
- data export/delete

## Quick Logs

Global quick logs:

- body mass
- readiness check-in
- water/electrolyte
- food
- completed session/RPE
- pain/injury note
- cycle symptoms when enabled

## Risk And Confidence

Risk flags are visible in context. Confidence is plain language:

- high: enough recent data
- medium: enough to guide safely
- low: safer defaults due to missing or stale data
- unknown: cannot resolve without key inputs
