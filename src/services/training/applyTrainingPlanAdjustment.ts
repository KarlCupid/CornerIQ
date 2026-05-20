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
import type { PerformanceState } from "../../engine/core/types";
import type { AthleteJourneyRepositories } from "../supabase/loadAthleteJourney";
import { assertUserId, parseWithSchema } from "../supabase/repositoryTypes";

export interface ApplyTrainingPlanAdjustmentInput {
  userId: string;
  state: PerformanceState;
  actor?: TrainingPlanAdjustmentActor | undefined;
  trustedActor?: boolean | undefined;
  command: TrainingPlanAdjustmentCommand;
  repositories: Pick<AthleteJourneyRepositories, "journey" | "trainingBlock" | "trainingProgression">;
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

export async function applyTrainingPlanAdjustmentService(input: ApplyTrainingPlanAdjustmentInput): Promise<ApplyTrainingPlanAdjustmentServiceResult> {
  const userId = assertUserId(input.userId, "applyTrainingPlanAdjustmentService");
  const parsedCommand = parseWithSchema(TrainingPlanAdjustmentCommandSchema, input.command, "applyTrainingPlanAdjustmentService.command");
  const actor = actorForAdjustmentCommand(parsedCommand, input.actor ?? defaultAthleteActor(userId));
  const command = commandWithActor(parsedCommand, actor);
  const trainingBlockId = await resolveTrainingBlockId({ ...input, userId, command });
  const result =
    actor.actorType === "coach" && !input.trustedActor
      ? permissionRejectedResult(command, actor)
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
