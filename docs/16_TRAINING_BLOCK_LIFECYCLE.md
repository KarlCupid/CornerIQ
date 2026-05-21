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

`resolveAndPersistPerformanceState` persists block, microcycle, day plans, week summary, progression decision, timeline events, and then the next-week preview. During a boundary refresh it preserves due accepted previews long enough for `autoRollForwardTrainingPlan` to materialize them instead of superseding them with the next preview first.

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
- `supersedePreviewsForBlock` supersedes older preview/accepted rows when a new preview wins.
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
- detailed generated sessions;
- persisted next-week sessions appear through normal training state only on their planned date;
- progression/analytics;
- exercise history grouped into recent actuals, pain flags, prescribed-only rows, RPE, strength notes, and explicit free-text-load/pain-flag safety copy;
- per-exercise grouped counts for completed, partial, prescribed-only, pain flags, recent RPE, and latest load notes;
- top pain-flagged and repeated exercise summaries without inferring numeric progression.

## Current Verification

Local:
- `cmd /c npm run typecheck`: passed.
- `cmd /c npm test`: passed, `315` tests passed and `1` skipped.
- `cmd /c npm run quality`: passed, including typecheck plus tests with `315` tests passed and `1` skipped.
- `cmd /c npm run lint`: passed.
- Extended live smoke: passed, `1` test passed, test body `12772ms`, duration `15.10s`.

Remote:
- Supabase migration list shows `001` through `008` applied.
- Supabase dry run reports `Remote database is up to date.`
- Live smoke passes with ignored `.env` loaded and `CORNERIQ_LIVE_DB_SMOKE=1`.

Smoke coverage includes weekly summaries, progression decisions, timeline events, persisted next-week previews, accept-preview action, auto-roll-forward pre-boundary non-materialization, smoke-only boundary auto materialization, future generated support sessions, `autoRollForward`, `generatedSessionCount`, repeated-call no-duplicate behavior, actor-scoped adjustment payloads, safe coach relationship RLS read, and scoped cleanup/restoration of smoke-created or smoke-touched rows.

## Still Scaffolded

- Numeric load progression is intentionally deferred until structured load fields exist.
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
