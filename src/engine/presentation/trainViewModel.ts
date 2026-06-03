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
      return "Generated training day around protected boxing.";
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
    boxingSkillTheme: session.boxingSkillTheme ?? null,
    tacticalTheme: session.tacticalTheme ?? null,
    technicalEmphasis: session.technicalEmphasis ?? [],
    roundStructure: session.roundStructure ?? null,
    equipmentMode: session.equipmentMode ?? null,
    addOnBlocks: session.addOnBlocks ?? [],
    sessionPriority: session.sessionPriority ?? "secondary",
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

function upcomingSummary(sessions: readonly ReturnType<typeof compactSession>[]): string {
  if (sessions.length === 0) {
    return "No generated training today.";
  }
  return `No generated training today. Upcoming this week: ${sessions
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
  if (state.nutrition.actualIntakeSummary.status === "not_tracking_today") {
    return {
      preSessionFuelHint: "Food is marked not tracking today: fuel the session normally and start without turning missing food into under-fueling evidence.",
      postSessionFuelHint: "Log food only if it helps; not-tracking keeps training guidance available.",
      hydrationHint: "Use thirst, urine color, heat, and session length; no wearable or food log is required."
    };
  }
  if (state.nutrition.actualIntakeSummary.status === "partial_day" || state.nutrition.actualIntakeSummary.status === "likely_partial" || state.nutrition.actualIntakeSummary.status === "auto_closed_incomplete") {
    return {
      preSessionFuelHint: "Partial food log so far: use it as execution context, not under-fueling evidence.",
      postSessionFuelHint: "If today is complete later, mark it done; until then, recovery fuel guidance stays advisory.",
      hydrationHint: "Use thirst, urine color, heat, and session length; no wearable or complete food log is required."
    };
  }
  if (state.nutrition.actualIntakeSummary.status === "no_log") {
    return {
      preSessionFuelHint: "No food log today: fuel this session normally and log meals to personalize recovery guidance.",
      postSessionFuelHint: "Log food only if it helps; missing fuel data lowers confidence without removing planned training.",
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
      title: detail.title,
      duration: `${detail.durationMinutes} min`,
      intensity: detail.intensity,
      sectionCount: detail.sections.length,
      firstExercises: detail.sections.flatMap((section) => section.exercises.map((exercise) => exercise.name)).slice(0, 3),
      whyThisMattersForBoxing: detail.whyThisMattersForBoxing,
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
      title: session.title,
      duration: `${session.durationMinutes} min`,
      intensity: session.intensity,
      sectionCount: 0,
      firstExercises: [],
      whyThisMattersForBoxing: error instanceof Error ? `Detailed session unavailable: ${error.message}` : "Detailed session unavailable. Keep work easy and use the protected-session plan.",
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
    label: dayLabel(session.date),
    summary: `${session.durationMinutes} min, ${session.intensity}. Fuel: ${session.fuelDemand}.`
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
      ? "Safety overrides are active; no generated workout today unless the engine limits the action to recovery only."
      : state.training.executionReadiness.readinessStatus === "red_hard_stop"
        ? "Readiness hard-stop symptoms are active, so CornerIQ limits generated work to recovery-only guidance."
        : state.training.executionReadiness.readinessStatus === "red_non_hard_stop"
          ? "Readiness is red without hard-stop symptoms; CornerIQ keeps planned training available with conservative execution gates."
        : plan?.explanation ?? state.training.explanation;
  const primaryTrainingAction =
    state.safety.hardStops.length > 0
      ? "Follow the safety stop. Do not add generated training today."
      : todayGeneratedSessions.length > 0
        ? "Open Workout when you are ready, then log completed or skipped."
        : "No generated training is due. Log protected or manual boxing if it happens.";
  const supportGenerationSummary = {
    targetGeneratedSupportCount: state.training.supportGenerationAudit.targetGeneratedSupportCount,
    actualGeneratedSupportCount: state.training.supportGenerationAudit.actualGeneratedSupportCount,
    todayGeneratedSupportCount: todayGeneratedSessions.length,
    weekDevelopmentTheme: state.training.supportGenerationAudit.boxingDevelopmentThemeTitle,
    athleteFacingWeekSummary: state.training.supportGenerationAudit.athleteFacingWeekSummary,
    targetStimulusMix: state.training.supportGenerationAudit.targetStimulusMix,
    actualStimulusMix: state.training.supportGenerationAudit.actualStimulusMix,
    currentWeekGeneratedSessionDates: currentWeekGeneratedSessions.map((session) => session.date),
    currentWeekGeneratedSessionTitles: currentWeekGeneratedSessions.map((session) => session.title),
    currentWeekGeneratedSessionFamilies: currentWeekGeneratedSessions.map((session) => session.family),
    selectedSupportDays: state.training.supportGenerationAudit.selectedSupportDays,
    blockedGenerationReasons: state.training.supportGenerationAudit.blockedGenerationReasons,
    durationAudit: state.training.supportGenerationAudit.generatedSessionDurationAudit,
    reducedBy: state.training.supportGenerationAudit.reducedBy
  };
  return {
    title: "Train for boxing",
    executionOverlay: {
      plannedTraining: todayGeneratedSessions.length > 0 ? todayGeneratedSessions.map((session) => `${session.title} (${session.durationMinutes} min)`).join(", ") : upcomingSummary(upcomingGeneratedSessions),
      executionGuidance: state.training.dailyOperatingMode.executionGuidance,
      missingDataAdvisories: todayGeneratedSessions.flatMap((session) => session.missingDataAdvisories ?? []),
      safetyOverrideReason: state.training.dailyOperatingMode.safetyOverrideReason
    },
    topAction: {
      title: "Training action",
      purpose: "Use Train for today's generated boxing training and what to log after.",
      primaryAction: primaryTrainingAction,
      why: generationExplanation,
      optional: "Exercise history and progression can wait. Session RPE is enough when time is tight."
    },
    todaySummary: todayGeneratedSessions.length > 0 ? todayGeneratedSessions.map((session) => session.title).join(", ") : upcomingSummary(upcomingGeneratedSessions),
    todayGeneratedSessions,
    upcomingGeneratedSessions,
    currentWeekGeneratedSessions,
    nextGeneratedSession,
    weeklyWorkoutCards,
    supportGenerationSummary,
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
    sessionCards: todayGeneratedSessionsRaw.map((session) => ({
      title: session.title,
      trainingStimulus: session.trainingStimulus,
      sessionTypeLabel: session.sessionTypeLabel,
      intensity: session.intensity,
      durationMinutes: session.durationMinutes,
      prescription: session.prescription,
      why: session.rationale,
      modifications: session.modifications,
      protects: session.protects,
      fuelDemand: session.fuelDemand,
      durationPolicyCategory: session.durationPolicyCategory ?? (session.durationMinutes < 25 ? "microdose" : "normal_support"),
      durationReductionReasons: session.durationReductionReasons ?? [],
      boxingSkillTheme: session.boxingSkillTheme ?? null,
      tacticalTheme: session.tacticalTheme ?? null,
      technicalEmphasis: session.technicalEmphasis ?? [],
      roundStructure: session.roundStructure ?? null,
      addOnBlocks: session.addOnBlocks ?? [],
      sessionPriority: session.sessionPriority ?? "secondary",
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
    })),
    detailedTodaySessions,
    detailedWeeklySessions,
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
