import type { CycleTrainingDecisionViewModel, PerformanceState, TrainViewModel, TrainingDayPlan } from "../core/types";
import { buildDetailedTrainingSession } from "../training/detailedSessionEngine";
import { buildTrainingAnalytics } from "../training/trainingAnalytics";
import { buildExerciseHistoryViewModel } from "./exerciseHistoryViewModel";
import { riskSummary } from "./explanationCopy";

function todayPlan(state: PerformanceState): TrainingDayPlan | null {
  return state.training.dayPlans.find((plan) => plan.date === state.asOfDate) ?? null;
}

function roleSummary(plan: TrainingDayPlan | null): string {
  if (!plan) {
    return "Today is unknown until the weekly plan resolves.";
  }
  switch (plan.role) {
    case "hard_day":
      return "Hard day inside the weekly cap.";
    case "recovery_day":
      return "Recovery day; block goals are secondary.";
    case "support_day":
      return "Support day around protected boxing.";
    case "taper_day":
      return "Taper day: touch speed, drop volume.";
    case "tournament_conservation_day":
      return "Tournament conservation day: no extra hard conditioning.";
  }
}

function dayLabel(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

function compactSession(session: PerformanceState["training"]["generatedSessions"][number]) {
  return {
    id: session.id,
    title: session.title,
    date: session.date,
    intensity: session.intensity,
    durationMinutes: session.durationMinutes,
    fuelDemand: session.fuelDemand
  };
}

function upcomingSummary(sessions: readonly ReturnType<typeof compactSession>[]): string {
  if (sessions.length === 0) {
    return "No generated support today.";
  }
  return `No generated support today. Upcoming: ${sessions
    .slice(0, 3)
    .map((session) => `${dayLabel(session.date)} - ${session.title}`)
    .join("; ")}.`;
}

function cycleTrainingDecision(state: PerformanceState): CycleTrainingDecisionViewModel {
  if (!state.cycle.trackingEnabled) {
    return {
      status: "none",
      summary: "No cycle assumptions are applied.",
      action: "Use readiness and manual symptoms if they are logged."
    };
  }
  if (state.cycle.safetyFlags.some((flag) => flag.code === "heavy_bleeding_with_dizziness")) {
    return {
      status: "safety_review",
      summary: "Heavy bleeding with dizziness hard-stops optional training.",
      action: "Choose recovery only and seek qualified help if symptoms persist or worsen."
    };
  }
  if (state.cycle.symptomBurden === "high") {
    return {
      status: "symptom_trim",
      summary: "High cycle symptoms trim optional training volume.",
      action: "Keep protected boxing only if safe; remove extra hard generated work."
    };
  }
  if (state.cycle.cycleRelatedWeightNoiseRisk === "high" || state.cycle.cycleRelatedWeightNoiseRisk === "moderate") {
    return {
      status: "scale_noise",
      summary: "Cycle context may add body-mass noise.",
      action: "Do not chase scale movement with extra conditioning or food restriction."
    };
  }
  return {
    status: "none",
    summary: "Cycle context is symptom-based today.",
    action:
      state.cycle.hormonalContraception !== "none" && state.cycle.hormonalContraception !== "unknown"
        ? "Hormonal contraception means symptoms guide training, not natural-cycle phase certainty."
        : "Plan can stay as written unless symptoms change."
  };
}

function fuelHints(state: PerformanceState, plan: TrainingDayPlan | null): Pick<TrainViewModel, "preSessionFuelHint" | "postSessionFuelHint" | "hydrationHint"> {
  const underFueling = Boolean(state.nutrition.underFuelingRiskNote);
  if (underFueling) {
    return {
      preSessionFuelHint: "Fuel and recovery come first today; do not add extra work while under-fueling risk is active.",
      postSessionFuelHint: "Use protein plus carbs after training, then log the result honestly.",
      hydrationHint: "Keep fluids and electrolytes consistent; avoid weight-pressure tactics."
    };
  }
  if (state.nutrition.actualIntakeSummary.logCount === 0) {
    return {
      preSessionFuelHint: "Fueling data is missing, so CornerIQ keeps the session conservative. Use familiar carbs and fluids before boxing support.",
      postSessionFuelHint: "Log food only if it helps; missing fuel data stays unknown, not unsafe.",
      hydrationHint: "Use thirst, urine color, heat, and session length; no wearable or food log is required."
    };
  }
  if (state.training.activeBlock.phase === "tournament_week") {
    return {
      preSessionFuelHint: "Fuel this session with familiar carbs and fluids before training.",
      postSessionFuelHint: "Refuel gently and keep protein steady between bouts or weigh-ins.",
      hydrationHint: "Use consistent fluids and sodium; avoid dehydration pressure."
    };
  }
  if (plan?.fuelDemand === "high") {
    return {
      preSessionFuelHint: "Fuel this session with carbs and fluids before training.",
      postSessionFuelHint: "Recover with protein plus carbs so next boxing quality is protected.",
      hydrationHint: "Bring fluids and electrolytes, especially around hard or longer work."
    };
  }
  if (plan?.role === "recovery_day" || plan?.fuelDemand === "low") {
    return {
      preSessionFuelHint: "Normal meals are enough; keep fluids consistent.",
      postSessionFuelHint: "Use the easy day to restore, not to compensate.",
      hydrationHint: "Keep fluids consistent and do not force extra water."
    };
  }
  return {
    preSessionFuelHint: "Fuel this session with carbs and fluids before training.",
    postSessionFuelHint: "Protein after training supports repair without changing the safety rules.",
    hydrationHint: "Manual thirst, urine color, and planned heat matter; no wearable is required."
  };
}

export function buildTrainViewModel(state: PerformanceState): TrainViewModel {
  const todayAnchors = state.training.protectedAnchors.filter((anchor) => anchor.date === state.asOfDate);
  const plan = todayPlan(state);
  const currentWeekGeneratedSessions = state.training.generatedSessions
    .filter((session) => session.date >= state.training.currentMicrocycle.weekStartDate && session.date <= state.training.currentMicrocycle.weekEndDate)
    .sort((left, right) => left.date.localeCompare(right.date))
    .map(compactSession);
  const upcomingGeneratedSessions = currentWeekGeneratedSessions.filter((session) => session.date > state.asOfDate);
  const nextGeneratedSession = [...state.training.todaySessions.map(compactSession), ...upcomingGeneratedSessions][0] ?? null;
  const weeklyWorkoutCards = currentWeekGeneratedSessions.map((session) => ({
    ...session,
    label: dayLabel(session.date),
    summary: `${session.durationMinutes} min, ${session.intensity}. Fuel: ${session.fuelDemand}.`
  }));
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
  const exerciseHistory = buildExerciseHistoryViewModel(state.training.recentExerciseResults);
  const hints = fuelHints(state, plan);
  const generationExplanation =
    state.safety.hardStops.length > 0
      ? "Safety overrides are active; no generated workout today unless the engine limits the action to recovery only."
      : state.readiness.color === "red"
        ? "Readiness is red, so CornerIQ generated recovery-only work."
        : plan?.explanation ?? state.training.explanation;
  const primaryTrainingAction =
    state.safety.hardStops.length > 0
      ? "Follow the safety stop. Do not add generated support today."
      : state.training.todaySessions.length > 0
        ? "Open Workout when you are ready, then log completed or skipped."
        : "No generated support is due. Log coach-led boxing if it happens.";
  return {
    title: "Train for boxing",
    topAction: {
      title: "Training action",
      purpose: "Use Train for today's boxing-support work and what to log after.",
      primaryAction: primaryTrainingAction,
      why: generationExplanation,
      optional: "Exercise history and progression can wait. Session RPE is enough when time is tight."
    },
    todaySummary: state.training.todaySessions.length > 0 ? state.training.todaySessions.map((session) => session.title).join(", ") : upcomingSummary(upcomingGeneratedSessions),
    upcomingGeneratedSessions,
    currentWeekGeneratedSessions,
    nextGeneratedSession,
    weeklyWorkoutCards,
    blockPhase: state.training.activeBlock.phase,
    blockGoal: state.training.activeBlock.primaryGoal.replaceAll("_", " "),
    blockExplanation: state.training.blockRecommendation.reason,
    todayRole: {
      status: plan?.role ?? "support_day",
      summary: roleSummary(plan),
      explanation: generationExplanation
    },
    blockProgression: analytics.progressionRecommendation,
    ...hints,
    cycleTrainingDecision: cycleTrainingDecision(state),
    sessionCards: state.training.todaySessions.map((session) => ({
      title: session.title,
      intensity: session.intensity,
      durationMinutes: session.durationMinutes,
      prescription: session.prescription,
      why: session.rationale,
      modifications: session.modifications,
      protects: session.protects,
      fuelDemand: session.fuelDemand
    })),
    detailedTodaySessions,
    progressionSummary: analytics.progressionRecommendation,
    analytics,
    exerciseHistory,
    protectedAnchorSummary:
      todayAnchors.length > 0
        ? todayAnchors.map((anchor) => `${anchor.type.replaceAll("_", " ")} (${anchor.intensity})`).join(", ")
        : "No protected boxing anchors today.",
    riskSummary: riskSummary(state.safety.riskFlags.filter((flag) => flag.domain === "training" || flag.domain === "readiness"))
  };
}
