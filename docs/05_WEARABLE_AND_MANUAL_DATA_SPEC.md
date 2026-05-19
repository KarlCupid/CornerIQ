# Wearable And Manual Data Spec

## Principle

Manual-only athletes get complete value. Wearables enrich confidence but never become mandatory and never override hard-stop symptoms.

## Manual Readiness Inputs

- sleep duration estimate
- sleep quality 1 to 5
- energy 1 to 5
- soreness 1 to 5
- stress 1 to 5
- mood 1 to 5
- pain/injury notes
- illness symptoms
- cycle symptoms if enabled
- morning weight
- resting pulse optional
- hydration/urine color optional
- session RPE after training

## Wearable Platforms

Initial planned platforms:

- Apple Health / HealthKit on iOS
- Android Health Connect

Future platforms:

- Garmin
- Whoop
- Oura
- Fitbit
- Polar
- Coros

Manual-only is represented as a valid platform state.

## Wearable Signals

- resting heart rate
- heart rate variability
- sleep duration
- sleep stages
- respiratory rate
- skin temperature
- body temperature
- blood oxygen
- step count
- workouts
- active energy
- body mass
- cycle tracking data

## Signal Model

Every signal stores:

- source platform
- permission scope
- timestamp
- value
- unit
- freshness
- confidence
- whether it conflicts with manual logs

Stale signals cannot drive hard decisions. Outliers are checked against manual logs when available.

## Apple Health

HealthKit integration later must:

- request only needed permissions
- show why each signal helps boxing planning
- source-tag every sample
- handle revoked permissions
- avoid showing raw metrics without meaning

## Health Connect

Health Connect integration later must:

- request granular permissions
- handle Android availability and permission revocation
- source-tag every record
- treat missing data as unknown, not zero

## Manual Fallback

When no wearable exists:

- readiness uses manual sleep, energy, soreness, stress, mood, pain, illness, and optional resting pulse
- training adjusts with manual readiness
- nutrition uses planned and completed sessions
- body-mass trend uses manual logs
- cycle support uses manual logs when enabled
- confidence explains manual-only status without shame

## UI Rule

Show meaning first, details second.

Instead of raw-only:

- "HRV 42ms, RHR +7"

Show:

- "Recovery signal is lower than usual. Your sleep and resting pulse suggest we should keep today’s extra work easy."

Then allow details for HRV, resting HR, sleep duration, source, and confidence.
