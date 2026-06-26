# Database Schema

## Supabase Principle

Canonical records live in Supabase. Engine outputs are reproducible from canonical rows. Generated plans store engine version, source record ids, and invalidation rules. Daily mission snapshots are not source of truth.

## Common Columns

Every user-owned table includes:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

RLS:

```sql
alter table table_name enable row level security;
create policy "Users manage own rows"
on table_name
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

## Tables

### users_public

Public mirror for app-owned display state:

- `user_id uuid primary key references auth.users(id)`
- `display_name text`
- `created_at timestamptz`

### athlete_profiles

- demographic and boxing profile
- private fields: sex_at_birth, gender, pregnancy_status, medical_flags, medications, cycle preferences
- equipment, schedule, protected defaults

### athlete_journey_events

- `event_type text not null`
- `event_payload jsonb not null`
- `occurred_at timestamptz not null`
- `event_key text` optional idempotency key for retry-safe service events
- append-only except admin/support correction workflow

### fight_opportunities

- status, opponent, bout date/time, weigh-in date/time/type, rounds, weight class, allowance, travel, timezone, hydration testing, post-weigh-in cap

### tournament_plans

- date range, possible bout dates, daily weigh-ins, weigh-in time, rehydration windows, strategy mode

### protected_workouts

- type, date/time, duration, rounds, intensity, coach-owned flag, travel/recovery marker

### generated_training_blocks

- engine version, phase, objective, valid dates, source hash, invalidation reason

### generated_training_sessions

- block id, planned date, original/current scheduled dates, plan revision, week id, prescription slot, lifecycle, engine version
- V2 workout content authority lives in `session_payload.structuredPrescriptionV2.canonicalWorkoutSession`
- scheduling/lifecycle metadata may change after creation; canonical workout content must not be mutated in place

### completed_training_sessions

- generated session id optional, protected workout id optional, completion, RPE, pain, notes
- generated-session completions use stable completion keys and immutable correction lifecycle metadata

### exercise_results

- session id, exercise id, sets, reps, load, RPE/RIR, pain
- `result_key text` optional idempotency key for retry-safe generated-session completion result writes
- template feedback metadata: `template_id`, `template_block_id`, `template_slot_id`, `movement_pattern`, `adaptation`
- result payload also stores prescribed dose and completed dose so progression can reason by template slot

### workout_completion_operations

- generated-session completion retry ledger keyed by `operation_key`
- records staged persistence status, completion row id, result keys, event key, payload summary, and recorded time
- lets retries repair missing exercise-result or journey-event writes without treating missing data as safe

### readiness_checkins

- manual sleep, energy, soreness, stress, mood, pain, illness, hydration notes, cycle symptoms linkage

### body_mass_logs

- body mass value/unit, source, log date/time, confidence, notes

### nutrition_targets

- engine version, date, calories, macros, fiber, sodium, water, session fueling, source hash

### food_logs

- meal time, food items, calories/macros, fiber, sodium, confidence, source

### water_logs

- amount, unit, timestamp, source

### electrolyte_logs

- sodium, potassium optional, product optional, timestamp

### cycle_logs

- consent version, bleed start/end, flow, contraception context, regularity, privacy metadata

### cycle_symptom_logs

- symptom, severity, timestamp, notes

### wearable_connections

- platform, permission scopes, status, granted_at, revoked_at

### wearable_signal_logs

- platform, signal type, value, unit, timestamp, confidence, source id

### weight_class_plans

- target class, contracted weight, timeline, feasibility state, professional-review state

### fight_week_protocols

- protocol state, gates passed/failed, education acknowledgment, review requirement, source hash

### weigh_in_logs

- weigh-in timestamp, body mass, official/unofficial, hydration test result, notes

### rehydration_plans

- weigh-in id, time window, fluid/electrolyte/carb plan, warnings, decision trace id

### risk_flags

- domain, code, severity, status, evidence, blocks plan, hard stop, review required

### training_plan_intents

- source fact for plan generation intent and active plan revision identity
- queryable columns: status, action, goal, focus, dose, support days, durations, equipment, preferences, limitations, plan start, requested time
- `intent_payload jsonb` stores the full validated plan intent payload
- one active plan intent per user; new active revisions explicitly supersede older active intents

### decision_traces

- engine, step, input summary, selected decision, rejected alternatives, rationale, confidence, timestamp

### engine_runs

- engine version, as_of_date, input hash, output hash, generated_at, invalidated_at, invalidation reason
- `run_payload.workoutEngineInputSnapshot` stores normalized plan intent, athlete training profile, fixed training, readiness/cycle/nutrition/safety context, recent completions/results, source ids, and input hash
- `run_payload.workoutEngineOutputSnapshot` stores output hash, generated session ids, canonical workout session ids, fingerprints, and validation status

## Sensitive Data

Cycle, medical, pregnancy, medication, ED risk, symptoms, plan intent, engine snapshots, and exercise-result template metadata require explicit privacy docs, export support, and delete support.
