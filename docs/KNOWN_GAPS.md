# Known Gaps

| Priority | Domain | Issue | Why it matters | Recommended next action | Blocking |
| --- | --- | --- | --- | --- | --- |
| P1 | Training block persistence | Active blocks/microcycles are resolved in-engine but not persisted. | ChatGPT and future app versions cannot audit block evolution across weeks. | Add Supabase-backed block/microcycle persistence and lifecycle events without rewriting applied migrations. | Non-blocking for current MVP, blocking for true block history. |
| P1 | Progression | `weekIndex` is scaffolded as `1`; progression is conservative but not yet a multi-week dose model. | A programming system needs week-to-week state, not just current-week heuristics. | Store block start/end, completed week summaries, and previous progression decisions. | Non-blocking. |
| P1 | Plan editing | Plan renders seven day cards but has no safe user/coach adjustment model. | Athletes/coaches need to protect anchors and move support work without screens owning business logic. | Add engine-validated adjustment commands before drag/drop UI. | Non-blocking. |
| P2 | Exercise history | Analytics use exercise results, but there is no exercise-history screen. | Athletes cannot inspect repeated pain flags, prescribed-only rows, or strength actuals over time. | Add a view-model-driven exercise history panel. | Non-blocking. |
| P2 | Numeric load progression | Free-text `loadText` is summarized but not parsed for progression. | Avoids fake progress, but limits strength progression precision. | Add structured load fields later; keep free-text as notes. | Non-blocking. |
| P2 | Completion UX density | Workout detail is still dense on mobile. | The flow is functional but can feel heavy during post-workout logging. | Split completion into a lightweight sheet or stepper while preserving `prescribed_only` defaults. | Non-blocking. |
| P2 | Cycle longitudinal UX | Cycle effects are explicit in training decisions, but history remains card-level. | Symptom-aware adjustments need better longitudinal review without fertility assumptions. | Add private trend summaries driven by cycle engine outputs. | Non-blocking. |
| P3 | Calendar polish | Plan has no drag/drop or calendar package. | Weekly command center is readable but not yet a full planner. | Add after engine-owned adjustment commands exist. | Non-blocking. |
| P3 | Export format | Export/delete controls work, but export is a preview/count flow. | Users will eventually need a portable artifact. | Add downloadable export bundle after data model settles. | Non-blocking. |
