# Training Compiler V2 Deletion Record

CornerIQ is pre-production, so the V2 workout-generation reset deleted obsolete derived workout state and legacy generator code. This document records the active V2-only workout-generation boundary and the remaining non-authority compatibility fields.

## Active Entry Points

- `src/engine/core/performanceKernel.ts` calls `resolveCompiledTrainingState`.
- `src/engine/training/compiledTrainingStateEngine.ts` normalizes plan intent, athlete context, recent results, readiness, and active safety into the V2 compiler contract before projecting the result into `TrainingState`.
- `src/engine/training/compiledWeekProjection.ts` projects compiled V2 current and future weeks into generated sessions, day plans, and next-week preview payloads. It does not regenerate workouts from family bias.
- `src/engine/training/nextWeekMaterializationContract.ts` remains a persistence schema for the V2 next-week preview payload. It carries structured V2 fields, fingerprints, and compiler-projected sessions.

## Deleted In This Reset Pass

- `src/engine/training/nextWeekGeneratedSessionEngine.ts`
- `src/tests/engine/nextWeekGeneratedSessionEngine.test.ts`
- `src/engine/training/nextWeekMaterializationEngine.ts`
- `src/tests/engine/nextWeekMaterializationEngine.test.ts`
- `src/engine/training/sessionGenerator.ts`
- `src/engine/training/weeklyPlanEngine.ts`
- `src/engine/training/boxingTrainingEngine.ts`
- `src/engine/training/weeklyTrainingPrescriptionPolicy.ts`
- `src/engine/training/weeklyTrainingCompositionPolicy.ts`
- `src/engine/training/athletePrescriptionContract.ts`
- `src/tests/engine/athletePrescriptionContract.test.ts`
- `src/engine/training/sessionDurationPolicy.ts`
- `src/tests/engine/sessionDurationPolicy.test.ts`
- `src/engine/training/exerciseCatalogValidation.ts`
- `src/tests/engine/exerciseCatalogValidation.test.ts`
- `src/engine/training/workoutTemplateCatalog.ts`
- `src/tests/engine/workoutTemplateCatalog.test.ts`
- `src/engine/training/exerciseCatalog.ts`
- `src/engine/training/substitutionEngine.ts`
- `src/engine/training/addOnBlocks.ts`

The accepted next-week preview now carries compiler-projected `generatedSessions`, `src/services/training/materializeNextWeekTrainingPlan.ts` persists those sessions directly instead of regenerating future workouts from family bias, and `src/services/engine/resolveAndPersistPerformanceState.ts` persists the V2 preview already on `state.training.nextWeekMaterialization` instead of rebuilding it from summaries.
The legacy family-first generated-session entry point, family-sequence prescription policies, V1 athlete-prescription contract, family-duration policy, and old template/catalog validation moat have also been removed from the active tree; V2 session intents, structured blocks, validation, and compiler fingerprints now own workout placement and dose allocation.
The template catalog, static exercise catalog, substitution wrapper, add-on block library, and template-catalog test have also been removed. Detailed workout rendering now refuses generated rows that do not carry a compiled V2 structured prescription instead of falling back to templates.
The old weekly-plan module name and unused boxing-training re-export have also been removed; `performanceKernel` now calls `resolveCompiledTrainingState` from the compiler-state bridge.

## Remaining Compatibility Fields

- Generated-session and audit types still expose fields such as `templateId`, `selectedTemplateId`, and `addOnBlocks` for older app-facing shapes. V2 projection either leaves these absent or derives display-only audit values from structured compiler output.
- Tests may keep stale V1 row fixtures only to prove old generated rows cannot override V2 plans. They must not import or execute a runtime V1 generator.
- Workout detail and player rendering require `structuredPrescriptionV2`; rows without it are rejected instead of being recovered from display text.

## Active Authority

- `src/engine/training/compiler/compileTrainingWeek.ts` is the single workout compiler entry.
- Current-week and future-week planning both call the same compiler with different week dates and available evidence.
- Structured prescriptions persist plan intent, weekly adaptation budget, session intent, compiled blocks, exercise dose, safety overlays, readiness overlays, validation result, and content/plan-instance fingerprints.

## Calibration Still Required

The V2 compiler is the app workout-generation authority. Dose thresholds, exercise choices, and athlete comprehension still require golden-matrix, coach, S&C, and beta review before broad launch calibration.
