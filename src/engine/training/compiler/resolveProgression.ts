import type { ExerciseResultRecord } from "../types";
import type { SessionIntent } from "./types";

export interface ProgressionResolution {
  intent: SessionIntent["progressionIntent"];
  rationale: readonly string[];
}

function recentRelevantResults(input: { intent: SessionIntent; history: readonly ExerciseResultRecord[] }): readonly ExerciseResultRecord[] {
  const patterns = new Set(input.intent.movementPatterns);
  return input.history.filter((result) => {
    const prescribed = result.prescribed as { movementPattern?: string | undefined; adaptation?: string | undefined };
    return prescribed.adaptation === input.intent.primaryAdaptation || (prescribed.movementPattern ? patterns.has(prescribed.movementPattern as never) : false);
  });
}

export function resolveProgression(input: { intent: SessionIntent; exerciseHistory?: readonly ExerciseResultRecord[] | undefined }): ProgressionResolution {
  const history = recentRelevantResults({ intent: input.intent, history: input.exerciseHistory ?? [] }).slice(-6);
  if (history.length === 0) {
    return {
      intent: input.intent.progressionIntent,
      rationale: ["No recent structured evidence exists for this adaptation, so the session starts conservatively."]
    };
  }
  if (history.some((result) => result.painFlag || result.technicalQuality === "technical_breakdown" || result.technicalQuality === "stopped_for_pain")) {
    return {
      intent: "regress",
      rationale: ["Recent relevant pain or technical breakdown keeps the next exposure easier and simpler."]
    };
  }
  if (history.some((result) => typeof result.rpe === "number" && result.rpe >= 8)) {
    return {
      intent: "repeat",
      rationale: ["Recent high RPE repeats the relevant target instead of progressing fatigue."]
    };
  }
  if (history.every((result) => result.resultStatus === "completed")) {
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
