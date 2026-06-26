# Training Compiler V2 Deletion Target

CornerIQ is pre-production, so the V2 workout-generation reset is allowed to delete obsolete derived workout state and legacy generator code. This document is a Phase 1 target map, not a completion claim.

## Current Legacy And Interim Entry Points

- `src/engine/core/performanceKernel.ts` calls `resolveWeeklyTrainingPlan`.
- `src/engine/training/boxingTrainingEngine.ts` re-exports `resolveWeeklyTrainingPlan`.
- `src/engine/training/weeklyPlanEngine.ts` is still the exported orchestration file, but its active resolver delegates current-week and future-week projections through the V2 compiler projection. The file still contains legacy V1 code and imports that must be deleted before completion.
- `src/engine/training/nextWeekMaterializationContract.ts` owns only the preview payload contract/schema needed by existing persistence while the final persistence model is being built.
- `src/engine/training/compiledWeekProjection.ts` is now the bridge that projects compiled V2 current and future weeks into existing persistence/view-model shapes while the final persistence model is being built.

## Deleted In This Reset Pass

- `src/engine/training/nextWeekGeneratedSessionEngine.ts`
- `src/tests/engine/nextWeekGeneratedSessionEngine.test.ts`
- `src/engine/training/nextWeekMaterializationEngine.ts`
- `src/tests/engine/nextWeekMaterializationEngine.test.ts`
- `src/engine/training/sessionGenerator.ts`
- `src/engine/training/weeklyTrainingPrescriptionPolicy.ts`
- `src/engine/training/weeklyTrainingCompositionPolicy.ts`
- `src/engine/training/athletePrescriptionContract.ts`
- `src/tests/engine/athletePrescriptionContract.test.ts`
- `src/engine/training/sessionDurationPolicy.ts`
- `src/tests/engine/sessionDurationPolicy.test.ts`
- `src/engine/training/exerciseCatalogValidation.ts`
- `src/tests/engine/exerciseCatalogValidation.test.ts`

The accepted next-week preview now carries compiler-projected `generatedSessions`, `src/services/training/materializeNextWeekTrainingPlan.ts` persists those sessions directly instead of regenerating future workouts from family bias, and `src/services/engine/resolveAndPersistPerformanceState.ts` persists the V2 preview already on `state.training.nextWeekMaterialization` instead of rebuilding it from summaries.
The legacy family-first generated-session entry point, family-sequence prescription policies, V1 athlete-prescription contract, family-duration policy, and old template/catalog validation moat have also been removed from the active tree; V2 session intents, structured blocks, validation, and compiler fingerprints now own workout placement and dose allocation.

## Deletion Targets Before Completion

- Remaining template-first detailed-session rendering and template-order fallback selection.
- `selectionScore` as the primary plan-construction mechanism.
- Remaining tests or fixtures that simulate stale V1 generated rows must keep those strings local to the test and cannot import a runtime V1 contract.
- Legacy preview payload compatibility that remains until the final compiler persistence model replaces `nextWeekMaterializationContract.ts`.
- Any future-workout regeneration from family bias.
- Legacy future generated-session compatibility branches that can override V2 plans.
- Static exercise display strings as the final prescription authority.
- Tests that only prove family counts, title variety, or total minutes.

## Required Replacement Authority

- `src/engine/training/compiler/compileTrainingWeek.ts` is the intended single compiler entry.
- Current-week and future-week planning must both call the same compiler with different week dates and available evidence.
- Structured prescriptions must persist plan intent, weekly adaptation budget, session intent, compiled blocks, exercise dose, safety overlays, readiness overlays, validation result, and material fingerprint.

## Not Complete Yet

The V2 compiler foundation exists and the separate next-week generated-session/materialization engines have been deleted, but the app is not fully cut over. V1 files, legacy contracts, legacy persistence shapes, and compatibility projections remain until integration, persistence migration/reset, UI rendering, golden output review, and final legacy deletion are finished.
