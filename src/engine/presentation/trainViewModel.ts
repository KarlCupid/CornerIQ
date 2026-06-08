import type { CycleTrainingDecisionViewModel, PerformanceState, TrainViewModel, TrainingDayPlan } from "../core/types";
import { buildDetailedTrainingSession } from "../training/detailedSessionEngine";
import { buildTrainingAnalytics } from "../training/trainingAnalytics";
import { buildExerciseHistoryViewModel } from "./exerciseHistoryViewModel";
import { riskSummary } from "./explanationCopy";
import { plainFuelDemandLabel, plainGeneratedSessionFamilyLabel, plainIntensityLabel, plainTrainingCopy, plainWorkoutTitle } from "./trainingCopy";

function todayPlan(state: PerformanceState): TrainingDayPlan | null {
  return state.training.dayPlans.find((plan) => plan.date === state.asOfDate) ?? null;
}

function roleSummary(plan: TrainingDayPlan | null): string {
  if (!plan) {
    return "Today is unknown until the weekly plan resolves.";
  }
  switch (plan.role) {
    case "hard_day":
      return "Hard day inside this week's limit.";
    case "recovery_day":
      return "Recovery day.";
    case "support_day":
      return "Support workout day.";
    case "taper_day":
      return "Fight-week day: keep speed, drop volume.";
    case "tournament_conservation_day":
      return "Tournament day: no extra hard conditioning.";
  }
}

function dayLabel(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

function compactSession(session: PerformanceState["training"]["generatedSessions"][number]) {
  return {
    id: session.id,
    title: plainWorkoutTitle(session.title, session.family),
    date: session.date,
    family: session.family,
    trainingStimulus: session.trainingStimulus,
    sessionTypeLabel: session.sessionTypeLabel,
    intensity: session.intensity,
    durationMinutes: session.durationMinutes,
    fuelDemand: session.fuelDemand,
    targetDurationMinutes: session.targetDurationMinutes ?? session.durationMinutes,
    durationPolicyCategory: session.durationPolicyCategory ?? (session.durationMinutes < 25 ? "microdose" : "normal_support"),
    durationReductionReasons: session.durationReductionReasons ?? [],
    selectedTemplateId: session.selectedTemplateId ?? session.templateId ?? null,
    selectedTemplateDefaultDuration: session.selectedTemplateDefaultDuration ?? null,
    boxingSkillTheme: session.boxingSkillTheme ? plainTrainingCopy(session.boxingSkillTheme) : null,
    tacticalTheme: session.tacticalTheme ? plainTrainingCopy(session.tacticalTheme) : null,
    technicalEmphasis: (session.technicalEmphasis ?? []).map(plainTrainingCopy),
    roundStructure: session.roundStructure ?? null,
    equipmentMode: session.equipmentMode ?? null,
    addOnBlocks: session.addOnBlocks ?? [],
    sessionPriority: session.sessionPriority ?? "secondary",
    readinessGate: session.readinessGate,
    fuelingGate: session.fuelingGate,
    hydrationGate: session.hydrationGate,
    executionReadinessStatus: session.executionReadinessStatus,
    preSessionChecklist: (session.preSessionChecklist ?? []).map(plainTrainingCopy),
    downshiftIf: (session.downshiftIf ?? []).map(plainTrainingCopy),
    fuelBefore: session.fuelBefore ? plainTrainingCopy(session.fuelBefore) : undefined,
    fuelAfter: session.fuelAfter ? plainTrainingCopy(session.fuelAfter) : undefined,
    confidenceImpact: session.confidenceImpact ? plainTrainingCopy(session.confidenceImpact) : undefined,
    missingDataAdvisories: (session.missingDataAdvisories ?? []).map(plainTrainingCopy)
  };
}

function upcomingSummary(sessions: readonly ReturnType<typeof compactSession>[]): string {
  if (sessions.length === 0) {
    return "No support workout today.";
  }
  return `No support workout today. Upcoming this week: ${sessions
    .slice(0, 3)
    .map((session) => `${dayLabel(session.date)} - ${plainWorkoutTitle(session.title, session.family)}`)
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
      summary: "Heavy bleeding with dizziness stops optional training for safety.",
      action: "Choose recovery only and seek qualified help if symptoms persist or worsen."
    };
  }
  if (state.cycle.symptomBurden === "high") {
    return {
      status: "symptom_trim",
      summary: "High cycle symptoms trim optional training volume.",
      action: "Keep boxing you added only if safe; remove extra hard support work."
    };
  }
  if (state.cycle.cycleRelatedWeightNoiseRisk === "high" || state.cycle.cycleRelatedWeightNoiseRisk === "moderate") {
    return {
      status: "scale_noise",
      summary: "Cycle context may add body weight noise.",
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
      preSessionFuelHint: "Fuel and recovery first. Do not add extra work today.",
      postSessionFuelHint: "Protein plus carbs after training.",
      hydrationHint: "Keep fluids and electrolytes steady."
    };
  }
  if (state.nutrition.actualIntakeSummary.status === "not_tracking_today") {
    return {
      preSessionFuelHint: "Food is not tracked today. Fuel normally.",
      postSessionFuelHint: "Log food only if it helps.",
      hydrationHint: "Use thirst, urine color, heat, and session length."
    };
  }
  if (state.nutrition.actualIntakeSummary.status === "partial_day" || state.nutrition.actualIntakeSummary.status === "likely_partial" || state.nutrition.actualIntakeSummary.status === "auto_closed_incomplete") {
    return {
      preSessionFuelHint: "Partial food log. Use it as a guide, not proof.",
      postSessionFuelHint: "Mark food done later if the day is complete.",
      hydrationHint: "Use thirst, urine color, heat, and session length."
    };
  }
  if (state.nutrition.actualIntakeSummary.status === "no_log") {
    return {
      preSessionFuelHint: "No food log today. Fuel the session normally.",
      postSessionFuelHint: "Log food only if it helps.",
      hydrationHint: "Use thirst, urine color, heat, and session length."
    };
  }
  if (state.training.activeBlock.phase === "tournament_week") {
    return {
      preSessionFuelHint: "Use familiar carbs and fluids before training.",
      postSessionFuelHint: "Refuel gently and keep protein steady.",
      hydrationHint: "Keep fluids and sodium consistent."
    };
  }
  if (plan?.fuelDemand === "high") {
    return {
      preSessionFuelHint: "Carbs and fluids before training.",
      postSessionFuelHint: "Protein plus carbs after.",
      hydrationHint: "Bring fluids and electrolytes."
    };
  }
  if (plan?.role === "recovery_day" || plan?.fuelDemand === "low") {
    return {
      preSessionFuelHint: "Normal meals are enough; keep fluids consistent.",
      postSessionFuelHint: "Use the easy day to restore.",
      hydrationHint: "Keep fluids consistent."
    };
  }
  return {
    preSessionFuelHint: "Carbs and fluids before training.",
    postSessionFuelHint: "Protein after training supports repair.",
    hydrationHint: "Thirst, urine color, and heat matter."
  };
}

function detailedSessionCard(state: PerformanceState, session: PerformanceState["training"]["generatedSessions"][number]) {
  const protectedWorkouts = state.training.protectedAnchors.filter((anchor) => anchor.date === session.date);
  try {
    const detail = buildDetailedTrainingSession({
      generatedSession: session,
      athlete: state.athlete,
      readiness: state.readiness,
      cycle: state.cycle,
      phase: state.phase,
      protectedWorkouts,
      equipmentAccess: state.athlete.equipmentAccess
    });
    return {
      generatedSessionId: detail.generatedSessionId,
      date: detail.date,
      title: plainWorkoutTitle(detail.title, detail.family),
      duration: `${detail.durationMinutes} min`,
      intensity: detail.intensity,
      sectionCount: detail.sections.length,
      firstExercises: detail.sections.flatMap((section) => section.exercises.map((exercise) => exercise.name)).slice(0, 3),
      whyThisMattersForBoxing: plainTrainingCopy(detail.whyThisMattersForBoxing),
      stopConditions: detail.stopConditions,
      safetyNotes: detail.safetyNotes,
      canOpenDetail: true,
      detail,
      readinessGate: detail.readinessGate,
      fuelingGate: detail.fuelingGate,
      hydrationGate: detail.hydrationGate,
      executionReadinessStatus: detail.executionReadinessStatus,
      preSessionChecklist: detail.preSessionChecklist ?? [],
      downshiftIf: detail.downshiftIf ?? [],
      fuelBefore: detail.fuelBefore,
      fuelAfter: detail.fuelAfter,
      confidenceImpact: detail.confidenceImpact,
      missingDataAdvisories: detail.missingDataAdvisories ?? []
    };
  } catch (error) {
    return {
      generatedSessionId: session.id,
      date: session.date,
      title: plainWorkoutTitle(session.title, session.family),
      duration: `${session.durationMinutes} min`,
      intensity: session.intensity,
      sectionCount: 0,
      firstExercises: [],
      whyThisMattersForBoxing: error instanceof Error ? `Workout detail unavailable: ${error.message}` : "Workout detail unavailable. Keep work easy and log the session manually.",
      stopConditions: ["Stop if pain, dizziness, or unusual symptoms appear."],
      safetyNotes: ["Detailed prescription could not be built, so do not infer extra work."],
      canOpenDetail: false,
      detail: null,
      readinessGate: session.readinessGate,
      fuelingGate: session.fuelingGate,
      hydrationGate: session.hydrationGate,
      executionReadinessStatus: session.executionReadinessStatus,
      preSessionChecklist: session.preSessionChecklist ?? [],
      downshiftIf: session.downshiftIf ?? [],
      fuelBefore: session.fuelBefore,
      fuelAfter: session.fuelAfter,
      confidenceImpact: session.confidenceImpact,
      missingDataAdvisories: session.missingDataAdvisories ?? []
    };
  }
}

export function buildTrainViewModel(state: PerformanceState): TrainViewModel {
  const todayAnchors = state.training.protectedAnchors.filter((anchor) => anchor.date === state.asOfDate);
  const plan = todayPlan(state);
  const currentWeekGeneratedSessionsRaw = state.training.generatedSessions
    .filter((session) => session.date >= state.training.currentMicrocycle.weekStartDate && session.date <= state.training.currentMicrocycle.weekEndDate)
    .sort((left, right) => left.date.localeCompare(right.date));
  const todayGeneratedSessionsRaw = currentWeekGeneratedSessionsRaw.filter((session) => session.date === state.asOfDate);
  const currentWeekGeneratedSessions = currentWeekGeneratedSessionsRaw.map(compactSession);
  const todayGeneratedSessions = todayGeneratedSessionsRaw.map(compactSession);
  const upcomingGeneratedSessions = currentWeekGeneratedSessions.filter((session) => session.date > state.asOfDate);
  const nextGeneratedSession = [...todayGeneratedSessions, ...upcomingGeneratedSessions][0] ?? null;
  const weeklyWorkoutCards = currentWeekGeneratedSessions.map((session) => ({
    ...session,
    title: plainWorkoutTitle(session.title, session.family),
    label: dayLabel(session.date),
    summary: `${session.durationMinutes} min, ${plainIntensityLabel(session.intensity)}. ${plainFuelDemandLabel(session.fuelDemand)}.`
  }));
  const detailedTodaySessions = todayGeneratedSessionsRaw.map((session) => detailedSessionCard(state, session));
  const detailedWeeklySessions = currentWeekGeneratedSessionsRaw.map((session) => detailedSessionCard(state, session));
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
      ? "Safety stops are active; recovery only today."
      : state.training.executionReadiness.readinessStatus === "red_hard_stop"
        ? "Stop-for-safety symptoms are active. Recovery only."
        : state.training.executionReadiness.readinessStatus === "red_non_hard_stop"
          ? "Readiness is red, so keep training conservative."
        : plainTrainingCopy(plan?.explanation ?? state.training.explanation);
  const primaryTrainingAction =
    state.safety.hardStops.length > 0
      ? "Follow the safety stop. No extra support workout."
      : todayGeneratedSessions.length > 0
        ? "Start today's support workout when ready."
        : "No support workout is due. Log boxing if it happens.";
  const supportGenerationSummary = {
    targetGeneratedSupportCount: state.training.supportGenerationAudit.targetGeneratedSupportCount,
    actualGeneratedSupportCount: state.training.supportGenerationAudit.actualGeneratedSupportCount,
    todayGeneratedSupportCount: todayGeneratedSessions.length,
    weekDevelopmentTheme: state.training.supportGenerationAudit.boxingDevelopmentThemeTitle,
    athleteFacingWeekSummary: state.training.supportGenerationAudit.athleteFacingWeekSummary,
    targetStimulusMix: state.training.supportGenerationAudit.targetStimulusMix,
    actualStimulusMix: state.training.supportGenerationAudit.actualStimulusMix,
    currentWeekGeneratedSessionDates: currentWeekGeneratedSessions.map((session) => session.date),
    currentWeekGeneratedSessionTitles: currentWeekGeneratedSessions.map((session) => plainWorkoutTitle(session.title, session.family)),
    currentWeekGeneratedSessionFamilies: currentWeekGeneratedSessions.map((session) => plainGeneratedSessionFamilyLabel(session.family)),
    selectedSupportDays: state.training.supportGenerationAudit.selectedSupportDays,
    blockedGenerationReasons: state.training.supportGenerationAudit.blockedGenerationReasons,
    durationAudit: state.training.supportGenerationAudit.generatedSessionDurationAudit,
    reducedBy: state.training.supportGenerationAudit.reducedBy
  };
  return {
    title: "Train",
    executionOverlay: {
      plannedTraining: todayGeneratedSessions.length > 0
        ? todayGeneratedSessions.map((session) => `${plainWorkoutTitle(session.title, session.family)} (${session.durationMinutes} min)`).join(", ")
        : upcomingSummary(upcomingGeneratedSessions),
      executionGuidance: state.training.dailyOperatingMode.executionGuidance,
      missingDataAdvisories: todayGeneratedSessions.flatMap((session) => session.missingDataAdvisories ?? []),
      safetyOverrideReason: state.training.dailyOperatingMode.safetyOverrideReason
    },
    topAction: {
      title: "Training overview",
      purpose: "Use Train for today's support workout and boxing log.",
      primaryAction: primaryTrainingAction,
      why: generationExplanation,
      optional: "Session RPE is enough when time is tight."
    },
    todaySummary: todayGeneratedSessions.length > 0
      ? todayGeneratedSessions.map((session) => plainWorkoutTitle(session.title, session.family)).join(", ")
      : upcomingSummary(upcomingGeneratedSessions),
    todayGeneratedSessions,
    upcomingGeneratedSessions,
    currentWeekGeneratedSessions,
    nextGeneratedSession,
    weeklyWorkoutCards,
    supportGenerationSummary,
    blockPhase: state.training.activeBlock.phase,
    blockGoal: state.training.activeBlock.primaryGoal.replaceAll("_", " "),
    blockExplanation: plainTrainingCopy(state.training.blockRecommendation.reason),
    todayRole: {
      status: plan?.role ?? "support_day",
      summary: roleSummary(plan),
      explanation: generationExplanation
    },
    blockProgression: analytics.progressionRecommendation,
    ...hints,
    cycleTrainingDecision: cycleTrainingDecision(state),
    sessionCards: todayGeneratedSessionsRaw.map((session) => ({
      title: plainWorkoutTitle(session.title, session.family),
      trainingStimulus: session.trainingStimulus,
      sessionTypeLabel: session.sessionTypeLabel,
      intensity: session.intensity,
      durationMinutes: session.durationMinutes,
      prescription: session.prescription.map(plainTrainingCopy),
      why: plainTrainingCopy(session.rationale),
      modifications: session.modifications.map(plainTrainingCopy),
      protects: session.protects.map(plainTrainingCopy),
      fuelDemand: session.fuelDemand,
      durationPolicyCategory: session.durationPolicyCategory ?? (session.durationMinutes < 25 ? "microdose" : "normal_support"),
      durationReductionReasons: session.durationReductionReasons ?? [],
      boxingSkillTheme: session.boxingSkillTheme ? plainTrainingCopy(session.boxingSkillTheme) : null,
      tacticalTheme: session.tacticalTheme ? plainTrainingCopy(session.tacticalTheme) : null,
      technicalEmphasis: (session.technicalEmphasis ?? []).map(plainTrainingCopy),
      roundStructure: session.roundStructure ?? null,
      addOnBlocks: session.addOnBlocks ?? [],
      sessionPriority: session.sessionPriority ?? "secondary",
      readinessGate: session.readinessGate,
      fuelingGate: session.fuelingGate,
      hydrationGate: session.hydrationGate,
      executionReadinessStatus: session.executionReadinessStatus,
      preSessionChecklist: (session.preSessionChecklist ?? []).map(plainTrainingCopy),
      downshiftIf: (session.downshiftIf ?? []).map(plainTrainingCopy),
      fuelBefore: session.fuelBefore ? plainTrainingCopy(session.fuelBefore) : undefined,
      fuelAfter: session.fuelAfter ? plainTrainingCopy(session.fuelAfter) : undefined,
      confidenceImpact: session.confidenceImpact ? plainTrainingCopy(session.confidenceImpact) : undefined,
      missingDataAdvisories: (session.missingDataAdvisories ?? []).map(plainTrainingCopy)
    })),
    detailedTodaySessions,
    detailedWeeklySessions,
    progressionSummary: analytics.progressionRecommendation,
    analytics,
    exerciseHistory,
    protectedAnchorSummary:
      todayAnchors.length > 0
        ? todayAnchors.map((anchor) => `${anchor.type.replaceAll("_", " ")} (${anchor.intensity})`).join(", ")
        : "No boxing you added today.",
    riskSummary: riskSummary(state.safety.riskFlags.filter((flag) => flag.domain === "training" || flag.domain === "readiness"))
  };
}
