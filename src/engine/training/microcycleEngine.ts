import { addDays } from "../core/dates";
import type {
  CompletedTrainingSession,
  CycleState,
  GeneratedTrainingSession,
  ProtectedWorkout,
  ReadinessState,
  RiskDomain,
  RiskFlag,
  TrainingDayPlan,
  TrainingBlockPhase,
  TrainingMicrocycle,
  WeeklyTrainingStructure
} from "../core/types";
import { anchorsForDate } from "./protectedAnchors";
import { BOXING_SKILL_GENERATED_FAMILIES, isHighStimulusTrainingDay } from "./trainingStimulus";
import { readinessHasHardStop } from "./trainingReadinessFuelingIntegration";

const MICROCYCLE_TRAINING_SAFETY_DOMAINS = new Set<RiskDomain>(["training", "readiness", "medical", "cycle", "plan_integrity", "hydration", "fight", "tournament"]);

export interface WeeklyMicrocycleInput {
  asOfDate: string;
  weekStartDate?: string | undefined;
  blockPhase: TrainingBlockPhase;
  protectedWorkouts: readonly ProtectedWorkout[];
  generatedSessions: readonly GeneratedTrainingSession[];
  completedSessions: readonly CompletedTrainingSession[];
  readiness: ReadinessState;
  cycle: CycleState;
  safetyFlags: readonly RiskFlag[];
  underFuelingRisk: boolean;
}

function hardDayCapForPhase(phase: TrainingBlockPhase): number {
  switch (phase) {
    case "build_power":
    case "build_strength":
    case "camp_support":
    case "aerobic_base":
      return 3;
    case "maintenance":
      return 2;
    case "fight_week_taper":
    case "tournament_week":
    case "recovery_deload":
      return 1;
  }
}

function sessionFuelDemand(sessions: readonly GeneratedTrainingSession[], hardDay: boolean): "low" | "moderate" | "high" {
  if (sessions.some((session) => session.fuelDemand === "high") || hardDay) {
    return "high";
  }
  if (sessions.some((session) => session.fuelDemand === "moderate")) {
    return "moderate";
  }
  return "low";
}

function dayRole(input: {
  blockPhase: TrainingBlockPhase;
  hardDay: boolean;
  recoveryPriority: TrainingDayPlan["recoveryPriority"];
  generated: readonly GeneratedTrainingSession[];
}): TrainingDayPlan["role"] {
  if (input.blockPhase === "tournament_week") {
    return "tournament_conservation_day";
  }
  if (input.blockPhase === "fight_week_taper") {
    return "taper_day";
  }
  if (input.recoveryPriority === "high" || input.recoveryPriority === "hard_stop" || input.generated.some((session) => session.family === "recovery_reset")) {
    return "recovery_day";
  }
  if (input.hardDay) {
    return "hard_day";
  }
  return "support_day";
}

function recoveryPriority(input: {
  date: string;
  asOfDate: string;
  blockPhase: TrainingBlockPhase;
  generated: readonly GeneratedTrainingSession[];
  readiness: ReadinessState;
  safetyFlags: readonly RiskFlag[];
}): TrainingDayPlan["recoveryPriority"] {
  if (
    input.date === input.asOfDate &&
    (readinessHasHardStop(input.readiness, input.safetyFlags) ||
      input.safetyFlags.some((flag) => flag.status === "active" && flag.hardStop && MICROCYCLE_TRAINING_SAFETY_DOMAINS.has(flag.domain)))
  ) {
    return "hard_stop";
  }
  if (input.blockPhase === "recovery_deload" || input.generated.some((session) => session.family === "recovery_reset")) {
    return "high";
  }
  if (input.blockPhase === "fight_week_taper" || input.blockPhase === "tournament_week") {
    return "moderate";
  }
  return "low";
}

function daySafetyFlags(input: {
  blockPhase: TrainingBlockPhase;
  protectedAnchors: readonly ProtectedWorkout[];
  generated: readonly GeneratedTrainingSession[];
  safetyFlags: readonly RiskFlag[];
  underFuelingRisk: boolean;
  date: string;
  asOfDate: string;
  readiness: ReadinessState;
}): readonly string[] {
  const messages = input.safetyFlags
    .filter((flag) => flag.status === "active" && MICROCYCLE_TRAINING_SAFETY_DOMAINS.has(flag.domain) && (flag.blocksPlan || flag.hardStop || flag.domain === "training" || flag.domain === "cycle"))
    .map((flag) => flag.message);
  if (input.underFuelingRisk) {
    messages.push("Under-fueling evidence changes fuel guidance, not generated workout structure.");
  }
  if (input.date === input.asOfDate && readinessHasHardStop(input.readiness, input.safetyFlags)) {
    messages.push("Readiness hard-stop symptoms override block goals today.");
  } else if (input.date === input.asOfDate && input.readiness.color === "red") {
    messages.push("Red readiness score adds execution gates today.");
  }
  if (input.protectedAnchors.some((anchor) => anchor.type === "sparring")) {
    messages.push("Coach/team sparring you added owns the hard stress; app work stays secondary.");
  }
  if (input.blockPhase === "tournament_week" && input.generated.some((session) => session.intensity === "hard")) {
    messages.push("Tournament week should avoid extra hard conditioning.");
  }
  return [...new Set(messages)];
}

function explanationForDay(input: {
  blockPhase: TrainingBlockPhase;
  protectedAnchors: readonly ProtectedWorkout[];
  generated: readonly GeneratedTrainingSession[];
  hardDay: boolean;
  recoveryPriority: TrainingDayPlan["recoveryPriority"];
}): string {
  if (input.recoveryPriority === "hard_stop") {
    return "Safety overrides the block: use recovery only and do not add hard work.";
  }
  if (input.blockPhase === "tournament_week") {
    return "Tournament week conserves legs, keeps weight pressure low, and avoids extra hard conditioning.";
  }
  if (input.blockPhase === "fight_week_taper") {
    return "Fight week taper keeps speed touched while dropping volume.";
  }
  if (input.protectedAnchors.some((anchor) => anchor.type === "sparring")) {
    return "Coach/team sparring you added is the fixed anchor; app training cannot compete with it.";
  }
  if (input.hardDay) {
    return "This is a planned hard stress day inside the weekly cap.";
  }
  if (input.generated.length > 0) {
    if (input.generated.some((session) => BOXING_SKILL_GENERATED_FAMILIES.has(session.family))) {
      return "Generated support develops technical boxing while fitting strength, conditioning, mobility, and recovery around it.";
    }
    return "Generated support fills boxing-specific strength, aerobic, power, agility, mobility, or durability gaps.";
  }
  return "No generated support is needed here; recovery and protected boxing quality stay first.";
}

function cycleAdjustment(cycle: CycleState): string | null {
  if (!cycle.trackingEnabled) {
    return null;
  }
  if (cycle.safetyFlags.some((flag) => flag.code === "heavy_bleeding_with_dizziness")) {
    return "Cycle safety review: heavy bleeding with dizziness hard-stops optional work.";
  }
  if (cycle.symptomBurden === "high") {
    return "High symptoms trim optional volume and hard work.";
  }
  if (cycle.hormonalContraception !== "none" && cycle.hormonalContraception !== "unknown") {
    return "Hormonal contraception context stays symptom-based; no natural-cycle certainty assumed.";
  }
  if (cycle.cycleRelatedWeightNoiseRisk === "high" || cycle.cycleRelatedWeightNoiseRisk === "moderate") {
    return "Cycle scale-noise context: do not chase body-mass noise with extra training.";
  }
  return "Cycle context noted; plan stays symptom-aware.";
}

export function buildWeeklyMicrocycle(input: WeeklyMicrocycleInput): {
  weeklyStructure: WeeklyTrainingStructure;
  microcycle: TrainingMicrocycle;
  dayPlans: readonly TrainingDayPlan[];
} {
  const weekStartDate = input.weekStartDate ?? input.asOfDate;
  const weekEndDate = addDays(weekStartDate, 6);
  const hardDayCap = hardDayCapForPhase(input.blockPhase);
  const dayPlans = Array.from({ length: 7 }, (_, index): TrainingDayPlan => {
    const date = addDays(weekStartDate, index);
    const protectedAnchors = anchorsForDate(input.protectedWorkouts, date);
    const generated = input.generatedSessions.filter((session) => session.date === date);
    const completed = input.completedSessions.filter((session) => session.date === date);
    const hardDay = isHighStimulusTrainingDay({ protectedAnchors, generatedSessions: generated });
    const priority = recoveryPriority({
      date,
      asOfDate: input.asOfDate,
      blockPhase: input.blockPhase,
      generated,
      readiness: input.readiness,
      safetyFlags: input.safetyFlags
    });
    return {
      date,
      protectedAnchors,
      generatedSessions: generated,
      completedSessions: completed,
      hardDay,
      role: dayRole({ blockPhase: input.blockPhase, hardDay, recoveryPriority: priority, generated }),
      recoveryPriority: priority,
      fuelDemand: sessionFuelDemand(generated, hardDay),
      cycleAdjustment: cycleAdjustment(input.cycle),
      safetyFlags: daySafetyFlags({
        blockPhase: input.blockPhase,
        protectedAnchors,
        generated,
        safetyFlags: input.safetyFlags,
        underFuelingRisk: input.underFuelingRisk,
        date,
        asOfDate: input.asOfDate,
        readiness: input.readiness
      }),
      explanation: explanationForDay({ blockPhase: input.blockPhase, protectedAnchors, generated, hardDay, recoveryPriority: priority })
    };
  });
  const recoveryDays = dayPlans.filter((day) => day.role === "recovery_day" || day.recoveryPriority === "high" || day.recoveryPriority === "hard_stop").map((day) => day.date);
  const plannedHardDays = dayPlans.filter((day) => day.hardDay).length;
  const protectedAnchorCount = input.protectedWorkouts.filter((anchor) => anchor.date >= weekStartDate && anchor.date <= weekEndDate).length;
  const generatedSupportCount = input.generatedSessions.filter((session) => session.date >= weekStartDate && session.date <= weekEndDate).length;
  const skillThemes = input.generatedSessions
    .filter((session) => session.date >= weekStartDate && session.date <= weekEndDate && BOXING_SKILL_GENERATED_FAMILIES.has(session.family))
    .map((session) => session.boxingSkillTheme ?? session.title);
  const notes = [
    `${plannedHardDays}/${hardDayCap} hard days planned.`,
    `${protectedAnchorCount} protected anchors remain primary.`,
    ...(input.underFuelingRisk ? ["Under-fueling evidence keeps fuel guidance visible without changing generated workouts."] : []),
    ...(input.cycle.symptomBurden === "high" ? ["High cycle symptoms trim optional volume."] : [])
  ];
  const weeklyStructure: WeeklyTrainingStructure = {
    weekStartDate,
    weekEndDate,
    hardDayCap,
    plannedHardDays,
    protectedAnchorCount,
    generatedSupportCount,
    recoveryDays,
    dayPlans,
    summary:
      skillThemes.length > 0
        ? `This week develops ${skillThemes.slice(0, 2).join(" and ")}, strength transfer, aerobic base, and recovery quality across ${generatedSupportCount} generated sessions.`
        : `${generatedSupportCount} generated support sessions around ${protectedAnchorCount} protected anchors, with ${plannedHardDays}/${hardDayCap} hard days.`
  };
  return {
    weeklyStructure,
    dayPlans,
    microcycle: {
      weekStartDate,
      weekEndDate,
      hardDayCap,
      plannedHardDays,
      protectedAnchorCount,
      generatedSupportCount,
      recoveryDays,
      notes
    }
  };
}
