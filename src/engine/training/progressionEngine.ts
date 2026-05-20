import type { CompletedTrainingSession, JourneyEvent, ProgressionRecommendation, ReadinessState, RiskFlag } from "../core/types";

export interface ProgressionEngineInput {
  completedTrainingSessions: readonly CompletedTrainingSession[];
  readiness: ReadinessState;
  painNotes?: readonly string[] | undefined;
  journeyEvents?: readonly JourneyEvent[] | undefined;
  safetyFlags?: readonly RiskFlag[] | undefined;
}

function textIncludesConcern(value: string): boolean {
  const normalized = value.toLowerCase();
  return ["pain", "sharp", "numb", "tingling", "swelling", "dizzy", "faint"].some((term) => normalized.includes(term));
}

function sessionRpeFromNote(note: string | undefined): number | null {
  if (!note) {
    return null;
  }
  const match = /session\s*rpe\s*[:=]\s*(\d+(?:\.\d+)?)/i.exec(note);
  if (!match?.[1]) {
    return null;
  }
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function skippedRecently(events: readonly JourneyEvent[] | undefined): boolean {
  return Boolean(events?.some((event) => event.type === "TrainingSessionCompleted" && event.payload.status === "skipped"));
}

export function recommendTrainingProgression(input: ProgressionEngineInput): ProgressionRecommendation {
  const notes = [
    ...(input.painNotes ?? []),
    ...input.completedTrainingSessions.flatMap((session) => (session.note ? [session.note] : []))
  ];
  if (notes.some(textIncludesConcern) || input.completedTrainingSessions.some((session) => (session.note ? sessionRpeFromNote(session.note) ?? 0 : 0) >= 9)) {
    return {
      status: "coach_review",
      summary: "Hold progression for coach review.",
      why: "Pain notes, concerning symptoms, or very high session RPE were found in recent history."
    };
  }

  if (input.readiness.color === "red" || input.safetyFlags?.some((flag) => flag.hardStop)) {
    return {
      status: "deload",
      summary: "Deload today.",
      why: "Red readiness or a hard-stop safety flag blocks normal progression."
    };
  }

  if (skippedRecently(input.journeyEvents)) {
    return {
      status: "repeat",
      summary: "Repeat the last safe prescription.",
      why: "A recent generated support session was skipped, so the engine should not fake progress."
    };
  }

  if (input.completedTrainingSessions.length === 0) {
    return {
      status: "unknown",
      summary: "Progression is unknown until completion history exists.",
      why: "Missing history is unknown, not a reason to progress automatically."
    };
  }

  const latest = input.completedTrainingSessions.at(-1);
  const latestRpe = sessionRpeFromNote(latest?.note);
  if (latestRpe !== null && latestRpe >= 8.5) {
    return {
      status: "repeat",
      summary: "Repeat before progressing.",
      why: "The latest session was completed, but high RPE says the next dose should stay stable."
    };
  }

  if (input.readiness.color === "green" && (latestRpe === null || latestRpe <= 8)) {
    return {
      status: "can_progress",
      summary: "Progression can be considered.",
      why: "Recent completion exists, readiness is green, and no pain or high-RPE flags were found."
    };
  }

  return {
    status: "repeat",
    summary: "Repeat the current dose.",
    why: "Completion exists, but readiness or effort history is not strong enough to progress."
  };
}

export function progressionEngineScope(): string {
  return "Progress only with completion, stable pain, readiness, nutrition support, and safe schedule load.";
}
