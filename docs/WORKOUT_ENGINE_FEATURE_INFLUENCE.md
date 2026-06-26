# Workout Engine Feature Influence Contract

CornerIQ keeps workout generation deterministic by separating source facts, context signals, engine prescriptions, and UI display.

```txt
Supabase owns source facts.
The workout engine owns prescriptions.
Other features own context signals.
UI owns display only.
```

## Influence Matrix

| Feature | Future generation? | Same-day execution? | Contract |
|---|---:|---:|---|
| Plan wizard | Yes | Yes | Creates a new or amended active plan intent revision. |
| Profile/equipment | Yes | Yes | Plan-level changes create a new revision or explicit regeneration; same-day constraints are execution overlays unless the user updates the plan. |
| Protected workouts | Yes | Yes | Fixed training calendar and hard-day constraints. |
| Readiness | No, unless safety flag | Yes | Same-day execution overlay only; hard-stop evidence can become a safety constraint. |
| Nutrition | No | Yes | Fueling gate and advisory only. |
| Hydration/electrolytes | No | Yes | Hydration gate and advisory only. |
| Cycle symptoms | Usually no | Yes | Same-day downshift overlay; safety-relevant symptoms can become risk flags. |
| Risk flags | Yes | Yes | Persistent safety constraints. |
| Workout completions | Yes | No immediate rewrite | Progression evidence for future prescriptions. |
| Wearables | Usually no | Yes | Readiness/confidence signal only when fresh and consistent. |
| Manual move/reschedule | No content change | Yes | Scheduling/lifecycle metadata update only. |

## Content-Changing Operations

Only these operations may change future generated workout content:

- New plan intent or deliberately amended plan intent.
- Profile/equipment update that creates a new plan revision or explicit future regeneration.
- Protected workout calendar change that invalidates or recompiles future sessions.
- Persistent safety constraint added or cleared.
- Completion/progression evidence used on the next compile.

Readiness, nutrition, hydration, cycle symptoms, and wearable signals generally apply to same-day execution overlays. They must not directly rewrite future canonical workout content.

## Persistence Rules

- `training_plan_intents` stores the active plan intent source fact and full validated payload.
- `engine_runs.run_payload.workoutEngineInputSnapshot` records the normalized inputs the engine saw.
- `generated_training_sessions.session_payload.structuredPrescriptionV2.canonicalWorkoutSession` is the V2 workout-content authority.
- Generated workout content is immutable after creation. Lifecycle, schedule, completion linkage, supersede reason, and audit metadata may change.
- `exercise_results` preserves `template_id`, `template_block_id`, `template_slot_id`, `movement_pattern`, and `adaptation` so progression can reason by template slot.
