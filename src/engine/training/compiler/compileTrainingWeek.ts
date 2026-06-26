import { addDays } from "../../core/dates";
import { applyDailyReadinessOverlay } from "./applyDailyReadinessOverlay";
import { applyPersistentSafetyConstraints } from "./applyPersistentSafetyConstraints";
import { allocateSessionIntents } from "./allocateSessionIntents";
import { composeTrainingSession } from "./composeTrainingSession";
import { planFingerprint } from "./planFingerprint";
import { resolveAthleteNeeds } from "./resolveAthleteNeeds";
import { resolveWeeklyAdaptationBudget } from "./resolveWeeklyAdaptationBudget";
import { TRAINING_COMPILER_CONTRACT_VERSION, type CompileTrainingWeekInput, type CompiledTrainingWeek } from "./types";
import { validateCompiledWeek } from "./validateCompiledWeek";

export function compileTrainingWeek(input: CompileTrainingWeekInput): CompiledTrainingWeek {
  const weekEndDate = addDays(input.weekStartDate, 6);
  const athleteNeeds = resolveAthleteNeeds({
    athlete: input.athlete,
    planIntent: input.planIntent
  });
  const adaptationBudget = resolveWeeklyAdaptationBudget({
    athlete: input.athlete,
    planIntent: input.planIntent,
    athleteNeeds
  });
  const sessionIntents = allocateSessionIntents({
    athlete: input.athlete,
    planIntent: input.planIntent,
    budget: adaptationBudget,
    weekStartDate: input.weekStartDate
  });
  const composedSessions = sessionIntents.map((intent) =>
    composeTrainingSession({
      athlete: input.athlete,
      intent
    })
  );
  const safetyAppliedSessions = applyPersistentSafetyConstraints({
    sessions: composedSessions,
    constraints: input.persistentSafetyConstraints ?? [],
    equipment: input.athlete.equipment
  });
  const baseWeek: Omit<CompiledTrainingWeek, "validation" | "materialFingerprint"> = {
    contractVersion: TRAINING_COMPILER_CONTRACT_VERSION,
    planRevisionId: input.planIntent.activeRevisionId,
    weekStartDate: input.weekStartDate,
    weekEndDate,
    athleteProfile: input.athlete,
    planIntent: input.planIntent,
    athleteNeeds,
    adaptationBudget,
    sessionIntents,
    compiledSessions: safetyAppliedSessions,
    unresolvedTargetDeficits: adaptationBudget.unresolvedTargetDeficits,
    decisionTrace: [
      "Normalized athlete and plan inputs before compilation.",
      "Resolved athlete needs before selecting sessions.",
      "Resolved measurable weekly adaptation budget before exercise selection.",
      "Placed session intents around fixed boxing.",
      "Composed sessions from structured exercise, conditioning, and boxing-round prescriptions.",
      "Applied explicit persistent safety constraints.",
      "Applied same-day readiness overlay only when readiness date matched a compiled session.",
      "Validated compiled week and generated material fingerprint from prescription dose."
    ]
  };
  const validation = validateCompiledWeek({ week: baseWeek });
  const weekWithValidation = {
    ...baseWeek,
    validation
  };
  const readinessAppliedSessions = applyDailyReadinessOverlay({
    sessions: safetyAppliedSessions,
    readiness: input.readiness
  });
  return {
    ...weekWithValidation,
    compiledSessions: readinessAppliedSessions,
    materialFingerprint: planFingerprint(weekWithValidation)
  };
}
