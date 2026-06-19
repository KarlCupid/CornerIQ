import type { TrainingBlock, TrainingDayPlan } from "./trainingBlockTypes";
import type { GeneratedTrainingSession, ProtectedWorkout } from "./types";
import { isHighStimulusGeneratedSession, isHighStimulusProtectedWorkout } from "./trainingStimulus";
import {
  actorForAdjustmentCommand,
  type PersistedTrainingPlanAdjustment,
  type TrainingPlanAdjustmentActor,
  type TrainingPlanAdjustmentCommand,
  type TrainingPlanAdjustmentResult
} from "./planAdjustmentTypes";

export interface TrainingPlanAdjustmentEngineInput {
  activeBlock: TrainingBlock;
  dayPlans: readonly TrainingDayPlan[];
  command: TrainingPlanAdjustmentCommand;
}

export interface TrainingPlanAdjustmentApplication {
  activeBlock: TrainingBlock;
  dayPlans: readonly TrainingDayPlan[];
  decisions: readonly TrainingPlanAdjustmentResult[];
  activeAdjustments: readonly PersistedTrainingPlanAdjustment[];
}

function protectedHardAnchor(anchor: ProtectedWorkout): boolean {
  return isHighStimulusProtectedWorkout(anchor);
}

function hasProtectedSparringOrCompetition(day: TrainingDayPlan): boolean {
  return day.protectedAnchors.some((anchor) => anchor.type === "sparring" || anchor.type === "competition");
}

function hardDayFor(day: TrainingDayPlan, generatedSessions: readonly GeneratedTrainingSession[]): boolean {
  return day.protectedAnchors.some(protectedHardAnchor) || generatedSessions.some(isHighStimulusGeneratedSession);
}

function fuelDemandFor(day: TrainingDayPlan, generatedSessions: readonly GeneratedTrainingSession[]): TrainingDayPlan["fuelDemand"] {
  if (hardDayFor(day, generatedSessions) || generatedSessions.some((session) => session.fuelDemand === "high")) {
    return "high";
  }
  if (generatedSessions.some((session) => session.fuelDemand === "moderate")) {
    return "moderate";
  }
  return "low";
}

function recoveryDay(day: TrainingDayPlan, explanation: string): TrainingDayPlan {
  const generatedSessions: readonly GeneratedTrainingSession[] = [];
  const hardDay = hardDayFor(day, generatedSessions);
  return {
    ...day,
    generatedSessions,
    hardDay,
    role: hardDay ? "hard_day" : "recovery_day",
    recoveryPriority: hardDay ? "moderate" : "high",
    fuelDemand: fuelDemandFor(day, generatedSessions),
    explanation
  };
}

function hardDayCount(dayPlans: readonly TrainingDayPlan[]): number {
  return dayPlans.filter((day) => day.hardDay).length;
}

function safetyBlocksMove(day: TrainingDayPlan): string | null {
  if (day.recoveryPriority === "hard_stop") {
    return "Target day has a hard-stop recovery priority, so generated work cannot be moved there.";
  }
  const weighInFlag = day.safetyFlags.find((flag) => /weigh[- ]?in|same-day|unsafe/i.test(flag));
  if (weighInFlag) {
    return `Target day has a weigh-in safety constraint: ${weighInFlag}`;
  }
  if (day.safetyFlags.some((flag) => /hard stop|hard-stop|blocked|safety override/i.test(flag))) {
    return "Target day has active safety flags, so generated work cannot be moved there.";
  }
  return null;
}

function result(input: {
  status: TrainingPlanAdjustmentResult["status"];
  explanation: string;
  modifiedDayPlans: readonly TrainingDayPlan[];
  safetyFlags?: readonly string[] | undefined;
  command: TrainingPlanAdjustmentCommand;
}): TrainingPlanAdjustmentResult {
  return {
    status: input.status,
    explanation: input.explanation,
    modifiedDayPlans: input.modifiedDayPlans,
    safetyFlags: input.safetyFlags ?? [],
    persistedAdjustmentPayload: {
      command: input.command,
      actor: actorForAdjustmentCommand(input.command, defaultActor()),
      explanation: input.explanation,
      modifiedDayPlanDates: input.modifiedDayPlans.map((day) => day.date)
    }
  };
}

function defaultActor(): TrainingPlanAdjustmentActor {
  return {
    actorType: "athlete",
    actorId: "unknown"
  };
}

function actorAllowed(actor: TrainingPlanAdjustmentActor, command: TrainingPlanAdjustmentCommand): boolean {
  switch (actor.actorType) {
    case "athlete":
      return command.type === "protect_day" || command.type === "mark_unavailable" || command.type === "request_deload" || command.type === "restore_engine_plan" || command.type === "move_generated_session" || command.type === "note";
    case "coach":
      return (
        command.type === "coach_note" ||
        command.type === "move_generated_session" ||
        command.type === "protect_day" ||
        command.type === "request_deload" ||
        command.type === "mark_unavailable" ||
        command.type === "restore_engine_plan"
      );
    case "engine":
      return command.type === "restore_engine_plan";
  }
}

export function applyTrainingPlanAdjustment(input: TrainingPlanAdjustmentEngineInput): TrainingPlanAdjustmentResult {
  const { command, dayPlans } = input;
  const actor = actorForAdjustmentCommand(command, defaultActor());
  if (!actorAllowed(actor, command)) {
    return result({
      status: "rejected",
      explanation: `${actor.actorType} actor is not permitted to create ${command.type.replaceAll("_", " ")} adjustments.`,
      modifiedDayPlans: [],
      safetyFlags: ["training_adjustment_permission_rejected"],
      command
    });
  }

  switch (command.type) {
    case "protect_day": {
      const current = dayPlans.find((day) => day.date === command.date);
      if (!current) {
        return result({ status: "rejected", explanation: `No day plan exists for ${command.date}.`, modifiedDayPlans: [], command });
      }
      const modified = recoveryDay(current, `Engine-owned protect day applied: ${command.reason}. Generated support is removed while protected boxing anchors remain fixed.`);
      return result({ status: "applied", explanation: "Protect day applied by the engine; generated support was removed for that date.", modifiedDayPlans: [modified], command });
    }

    case "mark_unavailable": {
      const current = dayPlans.find((day) => day.date === command.date);
      if (!current) {
        return result({ status: "rejected", explanation: `No day plan exists for ${command.date}.`, modifiedDayPlans: [], command });
      }
      const modified = recoveryDay(current, `Unavailable day applied: ${command.reason}. Generated support is removed or deferred by the engine.`);
      return result({ status: "applied", explanation: "Unavailable day applied by the engine; generated support was removed for that date.", modifiedDayPlans: [modified], command });
    }

    case "move_generated_session": {
      const fromDay = dayPlans.find((day) => day.date === command.fromDate);
      const toDay = dayPlans.find((day) => day.date === command.toDate);
      const session = fromDay?.generatedSessions.find((item) => item.id === command.sessionId);
      if (!fromDay || !toDay || !session) {
        return result({ status: "rejected", explanation: "Generated session was not found on the requested source date.", modifiedDayPlans: [], command });
      }
      if (session.generatedSessionLifecycle === "superseded" || session.generatedSessionLifecycle === "canceled") {
        return result({
          status: "rejected",
          explanation: `Move rejected: generated session is ${session.generatedSessionLifecycle} and cannot be changed by a stale client.`,
          modifiedDayPlans: [],
          safetyFlags: ["stale_generated_session_mutation_rejected"],
          command
        });
      }
      if ((session.currentScheduledDate ?? session.date) !== command.fromDate) {
        return result({
          status: "rejected",
          explanation: "Move rejected: generated session is no longer scheduled on the requested source date.",
          modifiedDayPlans: [],
          safetyFlags: ["stale_generated_session_mutation_rejected"],
          command
        });
      }
      if (hasProtectedSparringOrCompetition(toDay)) {
        return result({
          status: "rejected",
          explanation: "Move rejected: generated work cannot be moved onto protected sparring or competition day.",
          modifiedDayPlans: [],
          safetyFlags: ["protected_boxing_anchor_conflict"],
          command
        });
      }
      const safetyBlock = safetyBlocksMove(toDay);
      if (safetyBlock) {
        return result({ status: "rejected", explanation: `Move rejected: ${safetyBlock}`, modifiedDayPlans: [], safetyFlags: toDay.safetyFlags, command });
      }

      const nextFromGenerated = fromDay.generatedSessions.filter((item) => item.id !== command.sessionId);
      const movedSession: GeneratedTrainingSession = {
        ...session,
        date: command.toDate,
        originalPlannedDate: session.originalPlannedDate ?? session.date,
        currentScheduledDate: command.toDate,
        generatedSessionLifecycle: "moved"
      };
      const nextToGenerated = [...toDay.generatedSessions, movedSession];
      const nextFrom: TrainingDayPlan = {
        ...fromDay,
        generatedSessions: nextFromGenerated,
        hardDay: hardDayFor(fromDay, nextFromGenerated),
        role: hardDayFor(fromDay, nextFromGenerated) ? "hard_day" : "support_day",
        fuelDemand: fuelDemandFor(fromDay, nextFromGenerated),
        explanation: `Generated session moved off this date by the engine: ${command.reason}.`
      };
      const nextTo: TrainingDayPlan = {
        ...toDay,
        generatedSessions: nextToGenerated,
        hardDay: hardDayFor(toDay, nextToGenerated),
        role: hardDayFor(toDay, nextToGenerated) ? "hard_day" : toDay.role === "recovery_day" ? "support_day" : toDay.role,
        fuelDemand: fuelDemandFor(toDay, nextToGenerated),
        explanation: `Generated session moved here by the engine: ${command.reason}.`
      };
      const candidate = dayPlans.map((day) => (day.date === nextFrom.date ? nextFrom : day.date === nextTo.date ? nextTo : day));
      if (hardDayCount(candidate) > input.activeBlock.weeklyStructure.hardDayCap) {
        return result({
          status: "rejected",
          explanation: "Move rejected: it would exceed the weekly hard-day cap.",
          modifiedDayPlans: [],
          safetyFlags: ["hard_day_cap_exceeded"],
          command
        });
      }
      return result({ status: "applied", explanation: "Move applied by the engine within the hard-day cap.", modifiedDayPlans: [nextFrom, nextTo], command });
    }

    case "request_deload": {
      if (command.endDate < command.startDate) {
        return result({ status: "rejected", explanation: "Deload request rejected because the end date is before the start date.", modifiedDayPlans: [], command });
      }
      const modified = dayPlans
        .filter((day) => day.date >= command.startDate && day.date <= command.endDate)
        .map((day) => recoveryDay(day, `Deload requested: ${command.reason}. Generated support is removed and recovery priority is raised.`));
      if (modified.length === 0) {
        return result({ status: "rejected", explanation: "Deload request did not match any day plans.", modifiedDayPlans: [], command });
      }
      return result({ status: "applied", explanation: "Deload request applied for the selected date range.", modifiedDayPlans: modified, command });
    }

    case "restore_engine_plan": {
      return result({ status: "applied", explanation: "Restore plan accepted; matching active changes can be replaced.", modifiedDayPlans: [], command });
    }

    case "note": {
      return result({ status: "applied", explanation: "Athlete note recorded; the plan was not changed.", modifiedDayPlans: [], command });
    }

    case "coach_note": {
      return result({ status: "applied", explanation: "Trusted note recorded; the plan was not changed.", modifiedDayPlans: [], command });
    }
  }
}

function mergeModifiedDayPlans(dayPlans: readonly TrainingDayPlan[], modifiedDayPlans: readonly TrainingDayPlan[]): readonly TrainingDayPlan[] {
  if (modifiedDayPlans.length === 0) {
    return dayPlans;
  }
  const byDate = new Map(modifiedDayPlans.map((day) => [day.date, day]));
  return dayPlans.map((day) => byDate.get(day.date) ?? day);
}

function adjustedBlock(activeBlock: TrainingBlock, decisions: readonly TrainingPlanAdjustmentResult[], dayPlans: readonly TrainingDayPlan[]): TrainingBlock {
  const deloadApplied = decisions.some((decision) => {
    const command = decision.persistedAdjustmentPayload.command;
    return decision.status === "applied" && typeof command === "object" && command !== null && "type" in command && command.type === "request_deload";
  });
  const plannedHardDays = hardDayCount(dayPlans);
  return {
    ...activeBlock,
    weeklyStructure: {
      ...activeBlock.weeklyStructure,
      dayPlans,
      plannedHardDays,
      recoveryDays: dayPlans.filter((day) => day.role === "recovery_day" || day.recoveryPriority === "high" || day.recoveryPriority === "hard_stop").map((day) => day.date),
      generatedSupportCount: dayPlans.reduce((count, day) => count + day.generatedSessions.length, 0),
      summary: `${dayPlans.reduce((count, day) => count + day.generatedSessions.length, 0)} generated support sessions around ${activeBlock.weeklyStructure.protectedAnchorCount} protected anchors, with ${plannedHardDays}/${activeBlock.weeklyStructure.hardDayCap} hard days.`
    },
    progressionState: deloadApplied
      ? {
          ...activeBlock.progressionState,
          status: "deload",
          progressionRecommendation: "deload",
          reason: "User or trusted external deload request was accepted by the engine."
        }
      : activeBlock.progressionState
  };
}

export function applyTrainingPlanAdjustments(input: {
  activeBlock: TrainingBlock;
  dayPlans: readonly TrainingDayPlan[];
  adjustments: readonly PersistedTrainingPlanAdjustment[];
}): TrainingPlanAdjustmentApplication {
  let dayPlans = input.dayPlans;
  const decisions: TrainingPlanAdjustmentResult[] = [];
  const activeAdjustments = input.adjustments.filter((adjustment) => adjustment.status === "applied" || adjustment.status === "requested");
  for (const adjustment of activeAdjustments) {
    if (adjustment.command.type === "restore_engine_plan" || adjustment.status === "rejected") {
      continue;
    }
    const decision = applyTrainingPlanAdjustment({ activeBlock: input.activeBlock, dayPlans, command: adjustment.command });
    decisions.push(decision);
    if (decision.status === "applied") {
      dayPlans = mergeModifiedDayPlans(dayPlans, decision.modifiedDayPlans);
    }
  }
  const activeBlock = adjustedBlock(input.activeBlock, decisions, dayPlans);
  return {
    activeBlock,
    dayPlans,
    decisions,
    activeAdjustments
  };
}
