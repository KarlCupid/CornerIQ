import type { ExerciseResultRecord } from "../types";
import { findExerciseDefinition } from "../library/exerciseDefinitions";
import type { MovementPattern, SessionIntent, TrainingAdaptation } from "./types";

export interface ProgressionResolution {
  intent: SessionIntent["progressionIntent"];
  rationale: readonly string[];
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function resultAdaptation(result: ExerciseResultRecord): TrainingAdaptation | null {
  const prescribed = result.prescribed as { adaptation?: unknown };
  const direct = stringValue(prescribed.adaptation);
  if (
    direct === "strength" ||
    direct === "conditioning" ||
    direct === "power" ||
    direct === "boxing_skill" ||
    direct === "mobility" ||
    direct === "durability" ||
    direct === "recovery"
  ) {
    return direct;
  }
  const definition = findExerciseDefinition(result.exerciseId);
  return definition?.supportedAdaptations[0] ?? null;
}

function resultMovementPattern(result: ExerciseResultRecord): MovementPattern | null {
  const prescribed = result.prescribed as { movementPattern?: unknown };
  const direct = stringValue(prescribed.movementPattern);
  if (direct) {
    return direct as MovementPattern;
  }
  return findExerciseDefinition(result.exerciseId)?.movementPattern ?? null;
}

function resultRecordedAt(result: ExerciseResultRecord): string {
  return result.completedAt ?? result.recordedAt;
}

function recentRelevantResults(input: { intent: SessionIntent; history: readonly ExerciseResultRecord[] }): readonly ExerciseResultRecord[] {
  const patterns = new Set(input.intent.movementPatterns);
  return input.history
    .filter((result) => result.resultStatus !== "prescribed_only")
    .filter((result) => resultAdaptation(result) === input.intent.primaryAdaptation || (resultMovementPattern(result) ? patterns.has(resultMovementPattern(result)!) : false))
    .sort((left, right) => resultRecordedAt(left).localeCompare(resultRecordedAt(right)));
}

function affectedPatterns(results: readonly ExerciseResultRecord[]): ReadonlySet<MovementPattern> {
  return new Set(results.map(resultMovementPattern).filter((pattern): pattern is MovementPattern => Boolean(pattern)));
}

function scopedIssue(input: { intent: SessionIntent; issueResults: readonly ExerciseResultRecord[] }): boolean {
  const affected = affectedPatterns(input.issueResults);
  return affected.size > 0 && affected.size < input.intent.movementPatterns.length;
}

export function resolveProgression(input: { intent: SessionIntent; exerciseHistory?: readonly ExerciseResultRecord[] | undefined }): ProgressionResolution {
  const history = recentRelevantResults({ intent: input.intent, history: input.exerciseHistory ?? [] }).slice(-6);
  if (history.length === 0) {
    return {
      intent: input.intent.progressionIntent,
      rationale: ["No recent structured evidence exists for this adaptation, so the session starts conservatively."]
    };
  }
  const painOrStoppedForPain = history.filter((result) => result.painFlag || result.technicalQuality === "stopped_for_pain");
  if (painOrStoppedForPain.length > 0) {
    if (scopedIssue({ intent: input.intent, issueResults: painOrStoppedForPain })) {
      return {
        intent: "maintain",
        rationale: ["Recent pain evidence is scoped to its movement pattern; unrelated work is preserved while affected exercises simplify."]
      };
    }
    return {
      intent: "regress",
      rationale: ["Recent relevant pain keeps the next exposure easier and simpler in the affected domain."]
    };
  }
  const technicalBreakdown = history.filter((result) => result.technicalQuality === "technical_breakdown");
  if (technicalBreakdown.length > 0) {
    if (scopedIssue({ intent: input.intent, issueResults: technicalBreakdown })) {
      return {
        intent: "maintain",
        rationale: ["Recent technical breakdown is scoped to its movement pattern; unrelated work is preserved while the affected exercise simplifies."]
      };
    }
    return {
      intent: "regress",
      rationale: ["Recent relevant technical breakdown keeps the next exposure simpler."]
    };
  }
  if (history.some((result) => typeof result.rpe === "number" && result.rpe >= 8.5)) {
    return {
      intent: "repeat",
      rationale: ["Recent high RPE repeats or trims the relevant target instead of progressing fatigue."]
    };
  }
  if (history.some((result) => result.resultStatus === "partial")) {
    return {
      intent: "regress",
      rationale: ["Recent partial work regresses the relevant target until the prescribed work is completed cleanly."]
    };
  }
  if (history.every((result) => result.resultStatus === "skipped")) {
    return {
      intent: "repeat",
      rationale: ["Recent skipped work repeats the relevant target; skipped unrelated work is ignored by the compiler."]
    };
  }
  if (history.every((result) => result.resultStatus === "completed" && (result.technicalQuality === undefined || result.technicalQuality === "clean" || result.technicalQuality === "mostly_clean") && (result.rpe === undefined || result.rpe < 8.5))) {
    return {
      intent: "progress",
      rationale: ["Recent clean completion allows one small progression variable."]
    };
  }
  return {
    intent: "repeat",
    rationale: ["Mixed recent completion lowers confidence, so the target repeats."]
  };
}
