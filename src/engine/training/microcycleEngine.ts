import { addDays } from "../core/dates";
import type {
  CompletedTrainingSession,
  CycleState,
  GeneratedTrainingSession,
  ProtectedWorkout,
  ReadinessState,
  RiskFlag,
  TrainingDayPlan,
  TrainingBlockPhase,
  TrainingMicrocycle,
  WeeklyTrainingStructure
} from "../core/types";
import { anchorsForDate } from "./protectedAnchors";

export interface WeeklyMicrocycleInput {
  asOfDate: string;
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
      return 3;
    case "camp_support":
    case "aerobic_base":
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
  if (input.date === input.asOfDate && (input.readiness.color === "red" || input.safetyFlags.some((flag) => flag.hardStop))) {
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
  const messages = input.safetyFlags.filter((flag) => flag.blocksPlan || flag.domain === "training" || flag.domain === "nutrition" || flag.domain === "cycle").map((flag) => flag.message);
  if (input.underFuelingRisk) {
    messages.push("Under-fueling risk blocks aggressive progression this week.");
  }
  if (input.date === input.asOfDate && input.readiness.color === "red") {
    messages.push("Red readiness overrides block goals today.");
  }
  if (input.protectedAnchors.some((anchor) => anchor.type === "sparring")) {
    messages.push("Protected sparring owns the hard stress; generated work stays secondary.");
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
    return "Coach-led sparring is the protected anchor; support work cannot compete with it.";
  }
  if (input.hardDay) {
    return "This is a planned hard stress day inside the weekly cap.";
  }
  if (input.generated.length > 0) {
    return "Generated support fills boxing-specific strength, aerobic, power, or durability gaps.";
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
  const weekStartDate = input.asOfDate;
  const weekEndDate = addDays(input.asOfDate, 6);
  const hardDayCap = hardDayCapForPhase(input.blockPhase);
  const dayPlans = Array.from({ length: 7 }, (_, index): TrainingDayPlan => {
    const date = addDays(input.asOfDate, index);
    const protectedAnchors = anchorsForDate(input.protectedWorkouts, date);
    const generated = input.generatedSessions.filter((session) => session.date === date);
    const completed = input.completedSessions.filter((session) => session.date === date);
    const protectedHard = protectedAnchors.some((anchor) => anchor.type === "sparring" || anchor.type === "competition" || anchor.intensity === "hard" || anchor.intensity === "max");
    const generatedHard = generated.some((session) => session.intensity === "hard");
    const hardDay = protectedHard || generatedHard;
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
  const notes = [
    `${plannedHardDays}/${hardDayCap} hard days planned.`,
    `${protectedAnchorCount} protected anchors remain primary.`,
    ...(input.underFuelingRisk ? ["Under-fueling risk holds or reduces generated progression."] : []),
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
    summary: `${generatedSupportCount} generated support sessions around ${protectedAnchorCount} protected anchors, with ${plannedHardDays}/${hardDayCap} hard days.`
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
