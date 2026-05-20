import type { ISODateString } from "../core/sharedTypes";
import type { NextWeekTrainingMaterialization } from "./nextWeekMaterializationEngine";
import type { ProtectedWorkout } from "./types";
import type { RecoveryPriority, TrainingBlock, TrainingDayPlan, TrainingDayRole, TrainingMicrocycle } from "./trainingBlockTypes";

export interface NextWeekPreviewToMicrocycleInput {
  materialization: NextWeekTrainingMaterialization;
  currentBlock: TrainingBlock;
  protectedWorkouts: readonly ProtectedWorkout[];
  asOfDate: ISODateString;
}

export interface NextWeekPreviewToMicrocycleResult {
  microcycle: TrainingMicrocycle;
  dayPlans: readonly TrainingDayPlan[];
}

function anchorsForDate(anchors: readonly ProtectedWorkout[], date: ISODateString): readonly ProtectedWorkout[] {
  return anchors.filter((anchor) => anchor.date === date);
}

function hasHardProtectedAnchor(anchors: readonly ProtectedWorkout[]): boolean {
  return anchors.some((anchor) => anchor.type === "competition" || anchor.intensity === "hard" || anchor.intensity === "max");
}

function safeRole(input: {
  previewRole: TrainingDayRole;
  hardDay: boolean;
  hardDayCount: number;
  hardDayCap: number;
  strategy: NextWeekTrainingMaterialization["materializedVolumeStrategy"];
}): { hardDay: boolean; role: TrainingDayRole } {
  if (input.strategy === "hold_for_review") {
    return { hardDay: false, role: "recovery_day" };
  }
  if (input.strategy === "tournament_conserve") {
    return { hardDay: input.hardDay && input.hardDayCount < input.hardDayCap, role: "tournament_conservation_day" };
  }
  if (input.strategy === "taper") {
    return { hardDay: input.hardDay && input.hardDayCount < input.hardDayCap, role: "taper_day" };
  }
  if (!input.hardDay || input.hardDayCount >= input.hardDayCap) {
    return { hardDay: false, role: input.strategy === "deload" || input.strategy === "reduce_volume" ? "recovery_day" : "support_day" };
  }
  return { hardDay: true, role: input.previewRole === "hard_day" ? "hard_day" : input.previewRole };
}

function recoveryPriority(role: TrainingDayRole, strategy: NextWeekTrainingMaterialization["materializedVolumeStrategy"], safetyNotes: readonly string[]): RecoveryPriority {
  if (safetyNotes.some((note) => note.toLowerCase().includes("hard-stop") || note.toLowerCase().includes("red readiness"))) {
    return "hard_stop";
  }
  if (strategy === "hold_for_review" || strategy === "deload" || role === "recovery_day") {
    return "high";
  }
  if (strategy === "reduce_volume" || strategy === "taper" || strategy === "tournament_conserve") {
    return "moderate";
  }
  return "low";
}

function supportSummaryNote(daySupport: string): string {
  return `Generated support remains a summary until a safe generated session mapping exists: ${daySupport}`;
}

export function nextWeekPreviewToMicrocycle(input: NextWeekPreviewToMicrocycleInput): NextWeekPreviewToMicrocycleResult {
  const hardDayCap = input.materialization.targetHardDayCap;
  let hardDayCount = 0;
  const dayPlans: TrainingDayPlan[] = input.materialization.nextWeekDayPlanPreview.map((dayPreview) => {
    const protectedAnchors = anchorsForDate(input.protectedWorkouts, dayPreview.date);
    const protectedHard = hasHardProtectedAnchor(protectedAnchors);
    const role = safeRole({
      previewRole: dayPreview.role,
      hardDay: dayPreview.hardDay || protectedHard,
      hardDayCount,
      hardDayCap,
      strategy: input.materialization.materializedVolumeStrategy
    });
    if (role.hardDay) {
      hardDayCount += 1;
    }
    return {
      date: dayPreview.date,
      protectedAnchors,
      generatedSessions: [],
      completedSessions: [],
      hardDay: role.hardDay,
      role: role.role,
      recoveryPriority: recoveryPriority(role.role, input.materialization.materializedVolumeStrategy, input.materialization.safetyNotes),
      fuelDemand: role.hardDay ? dayPreview.fuelDemand : input.materialization.materializedVolumeStrategy === "progress_small" ? dayPreview.fuelDemand : "low",
      cycleAdjustment: null,
      safetyFlags: [...dayPreview.safetyNotes, supportSummaryNote(dayPreview.generatedSupport)],
      explanation: `${dayPreview.explanation} ${supportSummaryNote(dayPreview.generatedSupport)}`
    };
  });
  return {
    microcycle: {
      weekStartDate: input.materialization.nextWeekStartDate,
      weekEndDate: input.materialization.nextWeekEndDate,
      hardDayCap,
      plannedHardDays: dayPlans.filter((day) => day.hardDay).length,
      protectedAnchorCount: dayPlans.reduce((count, day) => count + day.protectedAnchors.length, 0),
      generatedSupportCount: 0,
      recoveryDays: dayPlans.filter((day) => day.role === "recovery_day" || day.recoveryPriority === "high" || day.recoveryPriority === "hard_stop").map((day) => day.date),
      notes: [
        `Materialized from accepted next-week preview for ${input.currentBlock.phase.replaceAll("_", " ")} block.`,
        "Generated support remains explanatory only; no future generated session objects were created.",
        `Materialized as of ${input.asOfDate}.`
      ]
    },
    dayPlans
  };
}
