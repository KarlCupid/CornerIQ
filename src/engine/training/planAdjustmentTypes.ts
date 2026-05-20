import { z } from "zod";
import { TrainingDayPlanSchema } from "../core/schemas";
import type { ISODateString, ISODateTimeString } from "../core/sharedTypes";
import type { TrainingDayPlan } from "./trainingBlockTypes";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoDateTimeSchema = z.string().datetime();
const requesterSchema = z.enum(["user", "coach"]).optional();
const reasonSchema = z.string().min(1);
export const TrainingPlanAdjustmentActorSchema = z.object({
  actorType: z.enum(["athlete", "coach", "engine"]),
  actorId: z.string().min(1),
  actorLabel: z.string().min(1).optional()
});

export type TrainingPlanAdjustmentActor = z.infer<typeof TrainingPlanAdjustmentActorSchema>;

const actorFieldSchema = TrainingPlanAdjustmentActorSchema.optional();

const protectDayCommandSchema = z.object({
  type: z.literal("protect_day"),
  date: isoDateSchema,
  reason: reasonSchema,
  requestedBy: requesterSchema,
  actor: actorFieldSchema,
  createdAt: isoDateTimeSchema.optional()
});

const moveGeneratedSessionCommandSchema = z.object({
  type: z.literal("move_generated_session"),
  sessionId: z.string().min(1),
  fromDate: isoDateSchema,
  toDate: isoDateSchema,
  reason: reasonSchema,
  requestedBy: requesterSchema,
  actor: actorFieldSchema,
  createdAt: isoDateTimeSchema.optional()
});

const requestDeloadCommandSchema = z.object({
  type: z.literal("request_deload"),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  reason: reasonSchema,
  requestedBy: requesterSchema,
  actor: actorFieldSchema,
  createdAt: isoDateTimeSchema.optional()
});

const markUnavailableCommandSchema = z.object({
  type: z.literal("mark_unavailable"),
  date: isoDateSchema,
  reason: reasonSchema,
  requestedBy: requesterSchema,
  actor: actorFieldSchema,
  createdAt: isoDateTimeSchema.optional()
});

const restoreEnginePlanCommandSchema = z.object({
  type: z.literal("restore_engine_plan"),
  date: isoDateSchema.optional(),
  sessionId: z.string().min(1).optional(),
  reason: reasonSchema,
  requestedBy: requesterSchema,
  actor: actorFieldSchema,
  createdAt: isoDateTimeSchema.optional()
});

const noteCommandSchema = z.object({
  type: z.literal("note"),
  date: isoDateSchema.optional(),
  note: z.string().min(1),
  reason: z.string().min(1).optional(),
  requestedBy: requesterSchema,
  actor: actorFieldSchema,
  createdAt: isoDateTimeSchema.optional()
});

const coachNoteCommandSchema = z.object({
  type: z.literal("coach_note"),
  date: isoDateSchema.optional(),
  note: z.string().min(1),
  reason: z.string().min(1).optional(),
  requestedBy: z.literal("coach").optional(),
  actor: actorFieldSchema,
  createdAt: isoDateTimeSchema.optional()
});

export const TrainingPlanAdjustmentCommandSchema = z.discriminatedUnion("type", [
  protectDayCommandSchema,
  moveGeneratedSessionCommandSchema,
  requestDeloadCommandSchema,
  markUnavailableCommandSchema,
  restoreEnginePlanCommandSchema,
  noteCommandSchema,
  coachNoteCommandSchema
]);

export type TrainingPlanAdjustmentCommand = z.infer<typeof TrainingPlanAdjustmentCommandSchema>;
export type TrainingPlanAdjustmentType = TrainingPlanAdjustmentCommand["type"];
export type TrainingPlanAdjustmentDecisionStatus = "applied" | "rejected" | "needs_review";
export type PersistedTrainingPlanAdjustmentStatus = "requested" | "applied" | "rejected" | "superseded";

export interface TrainingPlanAdjustmentResult {
  status: TrainingPlanAdjustmentDecisionStatus;
  explanation: string;
  modifiedDayPlans: readonly TrainingDayPlan[];
  safetyFlags: readonly string[];
  persistedAdjustmentPayload: Record<string, unknown>;
}

export const TrainingPlanAdjustmentResultSchema: z.ZodType<TrainingPlanAdjustmentResult> = z.object({
  status: z.enum(["applied", "rejected", "needs_review"]),
  explanation: z.string().min(1),
  modifiedDayPlans: z.array(TrainingDayPlanSchema),
  safetyFlags: z.array(z.string()),
  persistedAdjustmentPayload: z.record(z.unknown())
});

export interface PersistedTrainingPlanAdjustment {
  id: string;
  userId?: string | undefined;
  trainingBlockId: string | null;
  planDate: ISODateString | null;
  adjustmentType: TrainingPlanAdjustmentType;
  command: TrainingPlanAdjustmentCommand;
  status: PersistedTrainingPlanAdjustmentStatus;
  engineResponse: TrainingPlanAdjustmentResult;
  createdAt: ISODateTimeString;
  updatedAt?: ISODateTimeString | undefined;
}

export const PersistedTrainingPlanAdjustmentSchema: z.ZodType<PersistedTrainingPlanAdjustment> = z.object({
  id: z.string().min(1),
  userId: z.string().min(1).optional(),
  trainingBlockId: z.string().min(1).nullable(),
  planDate: isoDateSchema.nullable(),
  adjustmentType: z.enum(["protect_day", "move_generated_session", "request_deload", "mark_unavailable", "restore_engine_plan", "note", "coach_note"]),
  command: TrainingPlanAdjustmentCommandSchema,
  status: z.enum(["requested", "applied", "rejected", "superseded"]),
  engineResponse: TrainingPlanAdjustmentResultSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema.optional()
});

export function planDateForAdjustment(command: TrainingPlanAdjustmentCommand): ISODateString | null {
  switch (command.type) {
    case "protect_day":
    case "mark_unavailable":
      return command.date;
    case "move_generated_session":
      return command.toDate;
    case "request_deload":
      return command.startDate;
    case "restore_engine_plan":
      return command.date ?? null;
    case "note":
      return command.date ?? null;
    case "coach_note":
      return command.date ?? null;
  }
}

export function actorForAdjustmentCommand(command: TrainingPlanAdjustmentCommand, fallbackActor: TrainingPlanAdjustmentActor): TrainingPlanAdjustmentActor {
  if (command.actor) {
    return command.actor;
  }
  if (command.requestedBy === "coach") {
    return {
      actorType: "coach",
      actorId: fallbackActor.actorId,
      actorLabel: "Legacy coach actor"
    };
  }
  return fallbackActor;
}

export function commandWithActor(command: TrainingPlanAdjustmentCommand, actor: TrainingPlanAdjustmentActor): TrainingPlanAdjustmentCommand {
  return {
    ...command,
    actor,
    requestedBy: actor.actorType === "coach" ? "coach" : "user"
  } as TrainingPlanAdjustmentCommand;
}
