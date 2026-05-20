import type { PerformanceState, TrainViewModel } from "../core/types";
import { buildDetailedTrainingSession } from "../training/detailedSessionEngine";
import { buildTrainingAnalytics } from "../training/trainingAnalytics";
import { riskSummary } from "./explanationCopy";

export function buildTrainViewModel(state: PerformanceState): TrainViewModel {
  const todayAnchors = state.training.protectedAnchors.filter((anchor) => anchor.date === state.asOfDate);
  const detailedTodaySessions = state.training.todaySessions.map((session) => {
    try {
      const detail = buildDetailedTrainingSession({
        generatedSession: session,
        athlete: state.athlete,
        readiness: state.readiness,
        cycle: state.cycle,
        phase: state.phase,
        protectedWorkouts: todayAnchors,
        equipmentAccess: state.athlete.equipmentAccess
      });
      return {
        generatedSessionId: detail.generatedSessionId,
        title: detail.title,
        duration: `${detail.durationMinutes} min`,
        intensity: detail.intensity,
        sectionCount: detail.sections.length,
        firstExercises: detail.sections.flatMap((section) => section.exercises.map((exercise) => exercise.name)).slice(0, 3),
        whyThisMattersForBoxing: detail.whyThisMattersForBoxing,
        stopConditions: detail.stopConditions,
        safetyNotes: detail.safetyNotes,
        canOpenDetail: true,
        detail
      };
    } catch (error) {
      return {
        generatedSessionId: session.id,
        title: session.title,
        duration: `${session.durationMinutes} min`,
        intensity: session.intensity,
        sectionCount: 0,
        firstExercises: [],
        whyThisMattersForBoxing: error instanceof Error ? `Detailed session unavailable: ${error.message}` : "Detailed session unavailable. Keep work easy and use coach guidance.",
        stopConditions: ["Stop if pain, dizziness, or unusual symptoms appear."],
        safetyNotes: ["Detailed prescription could not be built, so do not infer extra work."],
        canOpenDetail: false,
        detail: null
      };
    }
  });
  const analytics = buildTrainingAnalytics({
    asOfDate: state.asOfDate,
    completedTrainingSessions: state.training.completedSessions,
    exerciseResults: state.training.recentExerciseResults,
    readiness: state.readiness,
    safetyFlags: state.safety.riskFlags
  });
  return {
    title: "Train for boxing",
    todaySummary: state.training.todaySessions.length > 0 ? state.training.todaySessions.map((session) => session.title).join(", ") : "No generated support today.",
    sessionCards: state.training.todaySessions.map((session) => ({
      title: session.title,
      intensity: session.intensity,
      durationMinutes: session.durationMinutes,
      why: session.rationale,
      modifications: session.modifications,
      protects: session.protects,
      fuelDemand: session.fuelDemand
    })),
    detailedTodaySessions,
    progressionSummary: analytics.progressionRecommendation,
    analytics,
    protectedAnchorSummary:
      todayAnchors.length > 0
        ? todayAnchors.map((anchor) => `${anchor.type.replaceAll("_", " ")} (${anchor.intensity})`).join(", ")
        : "No protected boxing anchors today.",
    riskSummary: riskSummary(state.safety.riskFlags.filter((flag) => flag.domain === "training" || flag.domain === "readiness"))
  };
}
