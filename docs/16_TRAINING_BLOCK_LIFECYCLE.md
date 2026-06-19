# Training Block Lifecycle

Date: 2026-05-20

This document is for future Codex/ChatGPT audits of CornerIQ's weekly boxing programming lifecycle. It describes how current week plans are generated, how summaries/decisions/previews persist, how accepted previews auto-materialize into future support sessions at the week boundary, how coach approval is gated server-side, and where the current implementation still stops.

## Scope Rules

- Business logic lives in deterministic engine modules and service layers, not screens.
- The system is boxing-only. It does not generate sparring, contact drills, broad fitness plans, MMA language, or unsafe weight-cut instructions.
- Manual input is first-class. Wearables can raise confidence only when fresh and consistent.
- Missing data stays unknown; it is not treated as safe or successful.
- Cycle support is optional, private, and symptom-aware.
- Safety beats performance and weight-class pressure.

## Current Week Generation

1. `resolvePerformanceState` builds a `TrainingState` from the athlete journey.
2. `resolveWeeklyTrainingPlan` creates generated support sessions around protected boxing anchors.
3. `trainingBlockEngine` resolves or preserves the active `TrainingBlock`.
4. `microcycleEngine` builds the current `TrainingMicrocycle` and seven `TrainingDayPlan` rows.
5. `planAdjustmentEngine` applies active/requested adjustments through engine-owned commands.
6. Persisted generated sessions from prior materialization are merged into training state by date; future sessions do not appear as today's work early.
7. Screens read `PlanViewModel` and `TrainViewModel`; screens do not query repositories or own programming logic.

Current week remains stable during next-week preview persistence and accept/materialize actions. The roll-forward service does not mutate `state.training.dayPlans` prematurely.

## Temporal Integrity Model

CornerIQ separates prescription, execution, and logging time:

- `plannedDate` is the date a generated session was originally prescribed.
- `performedDate` is the date the athlete says the work actually happened.
- `recordedAt` is when the athlete entered or corrected the log.
- `planRevisionId` is stable for one accepted plan revision and no longer uses `asOfDate` as a fallback identity input. When no explicit plan intent exists, fallback identity uses the active block start date once a block exists, so crossing into week two does not create a new revision.
- `weekId` identifies the plan revision/week that produced generated support.
- `prescriptionSlotId` is the stable generated-support slot identity. It is built from the revision, week, original full-week slot index, original planned date, and deterministic plan seed, not from the set of dates remaining after `asOfDate`.
- `generatedSessionId` is derived from the prescription slot, not the resolved family. Transient readiness, food, hydration, or actual-load overlays cannot create a different session identity.
- `originalPlannedDate` is preserved on the generated session. `currentScheduledDate` changes only after an explicit audited move.
- `generatedSessionLifecycle` records active, moved, completed/skipped overlay, superseded, unresolved, or canceled schedule state.
- Unresolved is derived when a past generated session has no current resolution.

Shared temporal selectors in `src/engine/core/temporalSelectors.ts` build the journey snapshot used by `resolvePerformanceState`. Date-scoped rows are filtered by effective date, while `generatedAt` is the recorded-time knowledge cutoff for replay. Historical replays do not use later logs, readiness revisions, exercise results, body-weight rows, journey events, nutrition status events, active safety flags, nutrition safety reviews, plan adjustments, summaries, decisions, or timeline events. Persisted moved generated sessions are projected back to `originalPlannedDate` when the move adjustment was not visible at the replay cutoff.

Generated-session loading uses the active microcycle week window, not only `planned_date >= asOfDate`. `loadAthleteJourney` requests generated sessions from active week start through active week end, scoped to the active training block. That lets the engine see earlier active-week prescriptions, today, and future active-week prescriptions at the same time.

Generated-session persistence also stores `plan_revision_id`, `week_id`, `week_index`, `prescription_slot_id`, `original_planned_date`, `current_scheduled_date`, and `generated_session_lifecycle` columns. Migration `20260619194631_generated_session_identity_lifecycle.sql` backfills legacy rows from payloads, marks duplicate active slot rows as `superseded`, and adds active-slot/current-date indexes while preserving old audit rows.

## Prescription Vs Execution Overlay

Base generated sessions remain the stable prescription: identity, planned date, family, duration target, intensity target, template/recipe, rationale, block/week, and plan revision. Current readiness, fueling, hydration, and safety context are applied as an execution overlay during state resolution and view-model building.

Today’s readiness or food log can change today’s start gate or downshift copy. It must not rewrite a future base session payload. Explicit plan adjustments or safety-driven plan amendments are the path for changing future prescriptions, and the audit exposes `scheduleRevisionChanged` plus `scheduleChangeReasons`.

Weekly minute repair does not roll the full-week target onto the remaining future slots after earlier unpersisted days fall behind `asOfDate`; missed or unknown work remains unresolved instead of becoming longer future work.

## Session Resolution

Generated workout resolution is canonical per user and `generatedSessionId`:

- `completed_training_sessions.completion_key` now uses `generated_session_completion:{generatedSessionId}` for current generated-session rows.
- `generated_session_id`, `planned_date`, `performed_date`, `recorded_at`, `resolution_lifecycle`, and `superseded_at` are explicit columns.
- Correcting skipped to completed updates the canonical row and appends a correction event instead of counting both records.
- Legacy duplicates are preserved as `superseded`; the newest recorded resolution becomes current.
- Missing completion stays unresolved. It is not treated as skipped, completed, safe adherence, or progression evidence.

The Train view model exposes `workoutLooseEnds` for unresolved past generated sessions. The compact card asks: "This workout was planned for {date}. Did it happen?" Actions resolve the session as completed/skipped, request an explicit move adjustment, or leave it unknown. Leaving it unknown creates no completion row.

Explicit moves keep the same `generatedSessionId` and `prescriptionSlotId`, preserve `originalPlannedDate`, set `currentScheduledDate`, and mark the generated session `moved`. Moves from stale clients are rejected when the source row is superseded/canceled or is no longer scheduled on the requested source date. The adjustment service also re-reads persisted generated sessions for the active week when available, so a client with stale state cannot persist a move after the server already sees that session on another date.

## Planned And Actual Load

`TrainingState` now carries:

- `plannedLoadLedger`: protected boxing anchors plus generated prescriptions, with `source: planned` and planned row ids.
- `actualLoadLedger`: current completed sessions plus linked exercise-result evidence, using the completed session `performedDate`; skipped, superseded, unresolved, stale exercise rows, and future completions are excluded.

Planned load prevents scheduling conflicts. Actual load drives adaptation, recovery, progression interpretation, and recent-load evidence. There is no compatibility `loadLedger` alias; consumers must choose planned or actual explicitly. Backfilled completions assign actual load to `performedDate`, while `recordedAt` remains log-entry metadata.

Actual structured metrics are evidence-only. Completed session rows count completed minutes, hard-day dates, boxing rounds, and sparring rounds when those fields are logged. Strength set counts and interval counts come from logged exercise result fields only; the engine does not infer fixed set or interval counts from a session family or completed session type.

Current-week actual hard work reserves hard-day capacity before future generated prescription is selected. Manual hard work and completed protected boxing count only after completion; scheduled but unlogged work remains planned, not actual. Linked exercise results stop contributing to current actual load when their generated completion is corrected to skipped.

The support-generation audit includes `loadComparison`, `recentTrainingEvidence`, and `prescriptionAdaptationDecision`. The adaptation decision records evidence ids, missing actual metrics, before/after generated hard-day targets, confidence, safety implications, and whether a base-prescription revision is required.

## Persistence Tables

Migration `004_training_block_persistence.sql` persists:
- `training_blocks`
- `training_microcycles`
- `training_day_plans`
- `training_plan_adjustments`

Migration `005_training_block_weekly_progression.sql` persists:
- `training_week_summaries`
- `training_progression_decisions`
- `training_block_timeline_events`

Migration `006_coach_team_relationships.sql` scaffolds:
- `athlete_coach_relationships`

Migration `007_training_next_week_previews.sql` persists:
- `training_next_week_previews`
- timeline event types `next_week_preview_accepted` and `next_week_materialized`

Migration `014_temporal_integrity_session_resolution.sql` adds:
- readiness `recorded_at` for latest same-day revision selection;
- generated-session resolution identity/date/lifecycle columns on `completed_training_sessions`;
- summary/decision lifecycle columns for provisional vs final week history;
- indexes for generated-session resolution, performed-date lookup, readiness revisions, preview status, and history lifecycle ordering.

Migration `20260619194631_generated_session_identity_lifecycle.sql` adds generated-session schedule identity/lifecycle columns and active-slot indexes for deterministic retries, explicit moves, and legacy duplicate reconciliation.

Training projection/progression/preview rows are user-owned where applicable, RLS-protected, and treated as engine audit/progression records. They are not medical directives and should not be mutated directly by screens.

## Week Summary And Decision Persistence

`summarizeTrainingWeek` converts structured training evidence into `TrainingWeekSummary`.

It counts completed/skipped sessions, completed/partial/prescribed-only/skipped exercise rows, pain flags, RPE averages, hard days, protected anchors, generated support, under-fueling flags, high cycle symptom flags, and safety flags.

`rollForwardTrainingBlock` then produces a conservative progression decision:
- Fight week and tournament context override normal progression with taper/conserve behavior.
- Red readiness and hard safety stops push toward recovery or deload.
- Pain/professional review flags push toward `coach_review` or hold.
- Under-fueling risk holds or reduces pressure; it does not progress.
- Good completion, green readiness, and no pain can progress.
- Skipped/missed sessions repeat.
- High cycle symptoms can trim or hold optional volume without automatic deload.
- Missing history does not fake progress.

Week summaries and progression decisions now carry lifecycle metadata:

- Active-week summaries are `provisional`.
- Post-week summaries are `final`.
- Corrected final records use `corrected_final`, are preserved separately from the original `final`, and outrank the original final for current authority.
- Legacy or duplicate records may be retained as `superseded`; selectors keep them available for audit but exclude them from current progression authority.
- `week_completed` timeline events are emitted only for final summaries.
- Provisional progression decisions may still support next-week preview planning, but they are marked with `decisionLifecycle: provisional`.
- Same-week decision ordering is centralized in `trainingHistoryAuthority`: active plan revision, highest week, corrected final over final, final over provisional, newest `generatedAt`, then stable row id.
- Migration `20260619190201_training_week_finalization_authority.sql` adds deterministic `summary_authority_key`, `decision_authority_key`, and `event_key` columns so repeated refreshes and stale read retries use database-backed conflict targets. Final and corrected-final lifecycles have separate authority keys; timeline event keys include summary/decision lifecycle so a corrected-final event cannot overwrite the original final event.

`resolveAndPersistPerformanceState` persists block, microcycle, day plans, week summary, progression decision, timeline events, and then the next-week preview. During a boundary refresh it preserves due accepted previews long enough for `autoRollForwardTrainingPlan` to materialize them instead of superseding them with the next preview first.

Before the current-week projection is written, `resolveAndPersistPerformanceState` now finalizes any prior compatible block weeks that do not already have a `final` or `corrected_final` summary. It promotes the latest provisional summary when one exists; otherwise it creates a conservative final summary from available completion/evidence records without treating missing data as safe. Each finalized week writes its final progression decision and one idempotent `week_completed` timeline event before current-week provisional persistence continues.

Boundary finalization is resumable. If a retry or crash leaves a final summary without its matching final progression decision or `week_completed` event, the next service refresh resumes those missing writes instead of skipping the week as already complete.

## Next-Week Preview Persistence

`materializeNextWeekTrainingPlan` in `src/engine/training/nextWeekMaterializationEngine.ts` produces a `NextWeekTrainingMaterialization` from the latest persisted summary/decision.

The persisted row stores:
- user and training block ids;
- next week index/start/end;
- materialized phase/decision;
- volume strategy;
- generated support bias;
- hard-day cap;
- engine version;
- input hash and preview output hash;
- lifecycle status;
- full validated preview payload.

Repository rules:
- `upsertTrainingNextWeekPreview` is idempotent by user/block/week/inputHash/outputHash.
- Existing accepted/materialized lifecycle state is not downgraded by an identical resolve.
- `supersedePreviewsForBlock` supersedes open preview rows only; accepted previews are frozen plan direction until explicit user action, accepted amendment, materialization, rejection, or a safety-block workflow changes them.
- Repository methods validate preview payloads with Zod and do not decide programming logic.

Primary files:
- `supabase/migrations/007_training_next_week_previews.sql`
- `src/services/supabase/trainingNextWeekPreviewRepository.ts`
- `src/services/engine/resolveAndPersistPerformanceState.ts`

## Accept And Materialize Lifecycle

`src/services/training/materializeNextWeekTrainingPlan.ts` is the safe roll-forward service.

Modes:
- `preview_only`: loads the preview for display; no writes.
- `accept_preview`: marks preview accepted and appends `next_week_preview_accepted`; no future sessions/day plans are created.
- `materialize_if_week_boundary`: materializes only when `asOfDate >= preview.weekStartDate`, unless a test override is explicitly supplied.

Safety gates:
- Wrong-user or wrong-block previews are rejected.
- `superseded` and `rejected` previews are rejected.
- A preview must be accepted before materialization.
- `hold_for_review` requires explicit review approval.
- Hard-stop safety blocks materialization.
- Tournament/fight-week strategies remain conservative because the preview engine created them conservatively.
- The service does not infer numeric load progression.
- No generated sparring/contact is created.

Materialization output:
- `nextWeekPreviewToMicrocycle` converts preview rows into a persisted next-week microcycle and day plans.
- `nextWeekGeneratedSessionEngine` converts summary-only generated support into deterministic, non-contact future support sessions.
- Protected anchors remain attached.
- Hard-day cap is enforced.
- `generated_training_sessions` are upserted with deterministic keys and smoke/audit metadata where supplied.
- The preview is marked materialized only after generated-session persistence succeeds.
- The `next_week_materialized` timeline event records `generatedSessionCount`.
- Journey audit receives `TrainingPlanAdjusted` with `source`, `previewId`, `weekIndex`, and `generatedSessionCount`; auto paths use `source: auto_roll_forward`.

Primary files:
- `src/engine/training/nextWeekPreviewToMicrocycle.ts`
- `src/engine/training/nextWeekGeneratedSessionEngine.ts`
- `src/services/training/materializeNextWeekTrainingPlan.ts`
- `src/hooks/useNextWeekPreviewActions.ts`
- `src/app/screens/PlanScreen.tsx`

## Automatic Week-Boundary Roll-Forward

`src/services/training/autoRollForwardTrainingPlan.ts` defines the app-refresh policy for accepted previews.

It auto-materializes only when:
- auto roll-forward is enabled;
- the active block is persisted;
- a preview with status `accepted` belongs to the current user and active block;
- `asOfDate >= preview.weekStartDate`, except for explicit smoke/test boundary override;
- the preview week has not already passed;
- hard-stop safety is not active;
- `hold_for_review` has explicit approval.

It does not materialize when:
- no accepted preview exists;
- the preview is still before the boundary;
- an unaccepted preview is available at boundary;
- the preview is already materialized/superseded/rejected;
- the same preview was already handled by the hook loop guard.

`src/hooks/useAutoRollForward.ts` tracks handled preview ids for the current app session so stale repository reads cannot trigger repeated materialization loops. `usePerformanceState` calls auto roll-forward after ready state resolves. If `shouldRefreshState` is true, it resolves/persists once more so Plan and Train read the materialized sessions through normal engine state. Errors are non-fatal app messages and do not hide the existing ready state.

Automatic materialization passes audit metadata into `materializeNextWeekTrainingPlan`, so `training_block_timeline_events` includes `event_type: next_week_materialized`, `autoRollForward: true`, `previewId`, `weekIndex`, `reason`, and `generatedSessionCount`.

## Coach Approval Scaffold

Coach/team relationship scaffold:
- `athlete_coach_relationships` has `pending`, `active`, and `revoked`.
- Athlete clients can request pending rows.
- Participants can read their relationship rows.
- Participants can revoke rows.
- Clients cannot self-activate active coach authority.

Trusted approval skeleton:
- `supabase/functions/approve-coach-relationship/index.ts` reads `SUPABASE_SERVICE_ROLE_KEY` only from the Supabase function environment.
- `supabase/functions/approve-coach-relationship/policy.ts` owns testable auth/payload/eligibility helpers.
- It validates request shape, requires an Authorization Bearer JWT, verifies the caller through Supabase Auth, and only allows the `athlete_user_id` on a pending row to approve.
- It sanitizes known permission keys and returns only status plus relationship id.
- `supabase/functions/approve-coach-relationship/README.md` documents deploy command, local serve command, required env vars, permission meanings, service-role boundary, revocation, and known limitations.
- Production still needs audit events, deployed function tests, admin/team policy, and athlete-facing consent copy before coach UI is exposed.

Coach UI remains hidden. `PlanAdjustmentControls` exposes only athlete-safe actions.

## UI Surfaces

Plan:
- uses local Week / Next Week / Block History / Adjustments sections;
- active block summary;
- persisted preview status;
- roll-forward status and athlete-facing copy;
- materialized generated session count and summaries;
- accept-preview action;
- materialize action only when the view model says the boundary is reached;
- hold-for-review copy;
- block history detail grouped into current block, current week, next-week preview, materialization status, decisions, adjustments, safety events, and timeline;
- grouped week rows with summary, decision, next-week preview status, materialized generated-session count, and adjustments;
- timeline event groups for training, adjustment, materialization, and safety/review events;
- explicit audit copy: "Engine-owned history" and "Screens do not mutate programming decisions."

Train:
- uses local Today / Workout / Exercise History / Progression sections;
- detailed generated sessions;
- persisted next-week sessions appear through normal training state only on their planned date;
- unresolved past generated sessions appear as compact loose-end cards instead of silently rolling forward;
- a dev-only Training Schedule Debug card shows as-of date, week window, plan revision, placed/completed/skipped/unresolved counts, generated-session resolutions, planned and actual load ledgers, accepted preview status, summary/decision lifecycle, auto-roll-forward prevention, and schedule-change reasons;
- progression/analytics;
- exercise history grouped into recent actuals, pain flags, prescribed-only rows, RPE, strength notes, and explicit free-text-load/pain-flag safety copy;
- per-exercise grouped counts for completed, partial, prescribed-only, pain flags, recent RPE, and latest load notes;
- top pain-flagged and repeated exercise summaries without inferring numeric progression.

## Readiness And Body Weight Freshness

Readiness check-ins can have multiple same-day revisions. The engine selects the latest same-day `recordedAt`; historical replay with a `generatedAt` cutoff cannot see a future readiness revision.

Body-weight trend history remains available, but current scale-driven decisions require fresh context:

- outside an active weight target, today’s body weight is optional;
- active cut context treats missing or stale values as paused scale-driven decisions;
- fight-week or short-notice context requires same-day body weight;
- stale active-cut body weight raises `stale_current_body_mass` and leaves feasibility unknown instead of authorizing acute decisions from old data.

## As-Of Replay Guarantees

`resolvePerformanceState` filters effective-dated collections before they enter prescription and progression: completed sessions, exercise results, readiness, body weight, nutrition, hydration, electrolytes, cycle logs, wearables, safety flags, plan adjustments, generated sessions, decisions, timeline events, and journey events. Missing data remains unknown. Future facts do not leak backward into earlier `asOfDate` resolution.

Twentieth-pass IA hardening:
- `SectionTabs` keeps dense surfaces local without adding routed navigation yet.
- `RiskBanner` keeps hard-stop/training-warning states visible above section content.
- Workout detail remains expandable/collapsible inside the Workout section.
- Protected workout logging remains manual and athlete-facing; coach UI remains hidden.
- Plan adjustment controls moved into the Adjustments section and remain service-owned.
- Future generated support sessions still do not appear as today's work before their planned date.

## Current Verification

Latest local temporal-integrity pass, 2026-06-19:

- `cmd /c npm install`: passed; npm audit reported 19 known vulnerabilities without failing install.
- `cmd /c npm run typecheck`: passed.
- Focused temporal regression suite: passed, `273` tests.
- `cmd /c npm test`: passed, `623` tests passed and `1` live smoke test skipped by default.
- `cmd /c npm run lint`: passed.
- `cmd /c npm run quality`: passed, including typecheck plus tests with `623` passed and `1` skipped.
- `cmd /c npm run preflight:beta`: passed.

No destructive remote migration command was run in this pass. Live Supabase smoke remains explicit and opt-in with `CORNERIQ_LIVE_DB_SMOKE=1`.

## Still Scaffolded

- Numeric load progression is intentionally deferred until structured load fields exist.
- Server-scheduled/background week finalization remains deferred; app/service refresh owns deterministic catch-up finalization when called after the week end.
- Coach UI remains hidden while approval audit/admin/team policy matures.
- Team memberships are deferred.
- Server-scheduled/background roll-forward is deferred; app-refresh automation is implemented.
- Block history UI is a panel, not routed drill-down navigation.
- Exercise history UI is a panel, not full exercise drill-down navigation.
- Calendar drag/drop polish is intentionally deferred.

## Auditor Inspect First

1. `supabase/migrations/007_training_next_week_previews.sql`
2. `src/services/supabase/trainingNextWeekPreviewRepository.ts`
3. `src/services/training/autoRollForwardTrainingPlan.ts`
4. `src/hooks/useAutoRollForward.ts`
5. `src/hooks/usePerformanceState.ts`
6. `src/services/engine/resolveAndPersistPerformanceState.ts`
7. `src/services/training/materializeNextWeekTrainingPlan.ts`
8. `src/engine/training/nextWeekGeneratedSessionEngine.ts`
9. `src/engine/training/nextWeekPreviewToMicrocycle.ts`
10. `src/engine/presentation/planViewModel.ts`
11. `src/app/screens/plan/TrainingBlockHistoryPanel.tsx`
12. `src/engine/presentation/exerciseHistoryViewModel.ts`
13. `src/app/screens/train/ExerciseHistoryPanel.tsx`
14. `src/app/screens/PlanScreen.tsx`
15. `supabase/functions/approve-coach-relationship/policy.ts`
16. `supabase/functions/approve-coach-relationship/index.ts`
17. `docs/17_COACH_TEAM_PERMISSIONS.md`
18. `src/tests/live/liveDbSmoke.test.ts`
