import { applyTrainingPlanAdjustment } from "../../engine/training/planAdjustmentEngine";
import {
  TrainingPlanAdjustmentCommandSchema,
  actorForAdjustmentCommand,
  commandWithActor,
  planDateForAdjustment,
  type TrainingPlanAdjustmentActor,
  type TrainingPlanAdjustmentCommand,
  type TrainingPlanAdjustmentResult
} from "../../engine/training/planAdjustmentTypes";
import type { GeneratedTrainingSession, PerformanceState } from "../../engine/core/types";
import type { AthleteJourneyRepositories } from "../supabase/loadAthleteJourney";
import { assertUserId, parseWithSchema } from "../supabase/repositoryTypes";
import type { createCoachRelationshipRepository } from "../supabase/coachRelationshipRepository";

type CoachRelationshipAccess = Pick<ReturnType<typeof createCoachRelationshipRepository>, "hasActiveCoachRelationship">;
type GeneratedSessionAccess = Pick<AthleteJourneyRepositories["training"], "listGeneratedSessions">;

export interface ApplyTrainingPlanAdjustmentInput {
  userId: string;
  state: PerformanceState;
  actor?: TrainingPlanAdjustmentActor | undefined;
  trustedActor?: boolean | undefined;
  command: TrainingPlanAdjustmentCommand;
  repositories: Pick<AthleteJourneyRepositories, "journey" | "trainingBlock" | "trainingProgression"> & {
    coachRelationship?: CoachRelationshipAccess | undefined;
    training?: GeneratedSessionAccess | undefined;
  };
}

export interface ApplyTrainingPlanAdjustmentServiceResult extends TrainingPlanAdjustmentResult {
  adjustmentId: string;
  trainingBlockId: string | null;
}

async function resolveTrainingBlockId(input: ApplyTrainingPlanAdjustmentInput): Promise<string | null> {
  const persistedId = input.state.training.blockPersistenceStatus?.trainingBlockId;
  if (persistedId) {
    return persistedId;
  }
  const planDate = planDateForAdjustment(input.command) ?? input.state.asOfDate;
  const active = await input.repositories.trainingBlock.getActiveTrainingBlockForDate(input.userId, planDate);
  return active?.id ?? null;
}

function defaultAthleteActor(userId: string): TrainingPlanAdjustmentActor {
  return {
    actorType: "athlete",
    actorId: userId
  };
}

function permissionRejectedResult(command: TrainingPlanAdjustmentCommand, actor: TrainingPlanAdjustmentActor): TrainingPlanAdjustmentResult {
  return {
    status: "rejected",
    explanation: `${actor.actorType} actor is not trusted for ${command.type.replaceAll("_", " ")} adjustments in this app surface.`,
    modifiedDayPlans: [],
    safetyFlags: ["training_adjustment_permission_rejected"],
    persistedAdjustmentPayload: {
      command,
      actor,
      explanation: "Adjustment rejected before programming mutation."
    }
  };
}

async function coachActorTrusted(input: Pick<ApplyTrainingPlanAdjustmentInput, "repositories" | "trustedActor"> & { athleteUserId: string; actor: TrainingPlanAdjustmentActor }): Promise<boolean> {
  if (input.actor.actorType !== "coach") {
    return true;
  }
  if (input.trustedActor) {
    return true;
  }
  if (!input.repositories.coachRelationship) {
    return false;
  }
  return input.repositories.coachRelationship.hasActiveCoachRelationship(input.athleteUserId, input.actor.actorId);
}

function staleGeneratedSessionMoveResult(command: TrainingPlanAdjustmentCommand, session: GeneratedTrainingSession): TrainingPlanAdjustmentResult | null {
  if (command.type !== "move_generated_session") {
    return null;
  }
  if (session.generatedSessionLifecycle === "superseded" || session.generatedSessionLifecycle === "canceled") {
    return {
      status: "rejected",
      explanation: `Move rejected: generated session is ${session.generatedSessionLifecycle} and cannot be changed by a stale client.`,
      modifiedDayPlans: [],
      safetyFlags: ["stale_generated_session_mutation_rejected"],
      persistedAdjustmentPayload: {
        command,
        currentScheduledDate: session.currentScheduledDate ?? session.date,
        generatedSessionLifecycle: session.generatedSessionLifecycle
      }
    };
  }
  if ((session.currentScheduledDate ?? session.date) !== command.fromDate) {
    return {
      status: "rejected",
      explanation: "Move rejected: generated session is no longer scheduled on the requested source date.",
      modifiedDayPlans: [],
      safetyFlags: ["stale_generated_session_mutation_rejected"],
      persistedAdjustmentPayload: {
        command,
        currentScheduledDate: session.currentScheduledDate ?? session.date,
        generatedSessionLifecycle: session.generatedSessionLifecycle ?? "active"
      }
    };
  }
  return null;
}

async function persistedMovePrecondition(input: {
  command: TrainingPlanAdjustmentCommand;
  repositories: ApplyTrainingPlanAdjustmentInput["repositories"];
  state: PerformanceState;
  trainingBlockId: string | null;
  userId: string;
}): Promise<TrainingPlanAdjustmentResult | null> {
  if (input.command.type !== "move_generated_session" || !input.repositories.training) {
    return null;
  }
  const command = input.command;
  const persistedSessions = await input.repositories.training.listGeneratedSessions(input.userId, {
    startDate: input.state.training.currentMicrocycle.weekStartDate,
    endDate: input.state.training.currentMicrocycle.weekEndDate,
    trainingBlockId: input.trainingBlockId
  });
  const persistedSession = persistedSessions.find((session) => session.id === command.sessionId);
  return persistedSession ? staleGeneratedSessionMoveResult(command, persistedSession) : null;
}

export async function applyTrainingPlanAdjustmentService(input: ApplyTrainingPlanAdjustmentInput): Promise<ApplyTrainingPlanAdjustmentServiceResult> {
  const userId = assertUserId(input.userId, "applyTrainingPlanAdjustmentService");
  const parsedCommand = parseWithSchema(TrainingPlanAdjustmentCommandSchema, input.command, "applyTrainingPlanAdjustmentService.command");
  const actor = actorForAdjustmentCommand(parsedCommand, input.actor ?? defaultAthleteActor(userId));
  const command = commandWithActor(parsedCommand, actor);
  const trainingBlockId = await resolveTrainingBlockId({ ...input, userId, command });
  const trustedCoach = await coachActorTrusted({ repositories: input.repositories, trustedActor: input.trustedActor, athleteUserId: userId, actor });
  const persistedPrecondition = await persistedMovePrecondition({ command, repositories: input.repositories, state: input.state, trainingBlockId, userId });
  const result =
    actor.actorType === "coach" && !trustedCoach
      ? permissionRejectedResult(command, actor)
      : persistedPrecondition
        ? persistedPrecondition
      : applyTrainingPlanAdjustment({
          activeBlock: input.state.training.activeBlock,
          dayPlans: input.state.training.dayPlans,
          command
        });

  if (command.type === "restore_engine_plan" && result.status === "applied") {
    await input.repositories.trainingBlock.supersedeTrainingPlanAdjustments(userId, trainingBlockId, planDateForAdjustment(command));
  }

  const persisted = await input.repositories.trainingBlock.insertTrainingPlanAdjustment({
    userId,
    trainingBlockId,
    command,
    result
  });

  await input.repositories.journey.appendEvent(userId, "TrainingPlanAdjusted", {
    blockId: trainingBlockId,
    adjustmentId: persisted.id,
    adjustmentType: command.type,
    status: result.status,
    reason: "reason" in command ? command.reason : command.note,
    explanation: result.explanation,
    source: "engine_owned_training_plan_adjustment"
  });

  if (command.type === "request_deload") {
    await input.repositories.journey.appendEvent(userId, "TrainingDeloadRequested", {
      blockId: trainingBlockId,
      adjustmentId: persisted.id,
      adjustmentType: command.type,
      status: result.status,
      reason: command.reason,
      startDate: command.startDate,
      endDate: command.endDate,
      source: "engine_owned_training_plan_adjustment"
    });
  }

  if (trainingBlockId && result.status === "applied") {
    await input.repositories.trainingProgression.insertTrainingBlockTimelineEvent({
      userId,
      trainingBlockId,
      event: {
        eventType: command.type === "request_deload" ? "deload_requested" : "adjustment_applied",
        eventDate: planDateForAdjustment(command) ?? input.state.asOfDate,
        title: command.type === "request_deload" ? "Deload requested" : "Adjustment applied",
        summary: result.explanation,
        payload: {
          blockId: trainingBlockId,
          adjustmentId: persisted.id,
          adjustmentType: command.type,
          status: result.status,
          actor
        }
      }
    });
  }

  return {
    ...result,
    adjustmentId: persisted.id,
    trainingBlockId
  };
}
