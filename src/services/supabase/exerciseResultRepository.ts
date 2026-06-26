import { z } from "zod";
import type {
  ExerciseResultDraft,
  ExerciseResultLoadUnit,
  ExerciseResultRecord,
  ExerciseResultSide,
  ExerciseResultStatus,
  ExerciseResultTechnicalQuality
} from "../../engine/core/types";
import type { MovementPattern, TrainingAdaptation } from "../../engine/training/compiler/types";
import type { CornerSupabaseClient } from "./client";
import type { TableInsert, TableRow } from "./repositoryTypes";
import { assertUserId, isoDateTimeValue, parseWithSchema, payloadObject, readDataOrThrow, toJson } from "./repositoryTypes";

const ExerciseResultPayloadSchema = z.object({
  exerciseId: z.string().min(1),
  exerciseName: z.string().min(1),
  section: z.string().min(1),
  templateId: z.string().min(1).optional(),
  templateBlockId: z.string().min(1).optional(),
  templateSlotId: z.string().min(1).optional(),
  movementPattern: z.string().min(1).optional(),
  adaptation: z.string().min(1).optional(),
  canonicalSessionId: z.string().min(1).optional(),
  prescribedSets: z.number().int().nonnegative().optional(),
  prescribedReps: z.number().int().nonnegative().optional(),
  prescribedDurationSeconds: z.number().nonnegative().optional(),
  prescribedLoadTarget: z.string().min(1).optional(),
  prescribedRpe: z.number().min(1).max(10).optional(),
  prescribedRir: z.number().int().nonnegative().optional(),
  prescribedRestSeconds: z.number().nonnegative().optional(),
  prescribed: z.record(z.unknown()),
  resultStatus: z.enum(["prescribed_only", "completed", "partial", "skipped"]).optional(),
  completedSets: z.number().int().nonnegative().optional(),
  loadValue: z.number().positive().optional(),
  loadUnit: z.enum(["kg", "lb", "bodyweight", "band", "other"]).optional(),
  repsCompleted: z.number().int().nonnegative().optional(),
  timeSeconds: z.number().positive().optional(),
  distanceMeters: z.number().positive().optional(),
  side: z.enum(["left", "right", "bilateral", "alternating", "not_applicable"]).optional(),
  technicalQuality: z.enum(["clean", "mostly_clean", "technical_breakdown", "stopped_for_pain", "unknown"]).optional(),
  loadText: z.string().optional(),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
  painFlag: z.boolean().optional(),
  source: z.string().min(1),
  engineVersion: z.string().min(1),
  generatedSessionId: z.string().min(1).optional(),
  smokeRunId: z.string().min(1).optional()
});

export interface InsertExerciseResultInput {
  userId: string;
  completedTrainingSessionId: string;
  generatedTrainingSessionDbId?: string | undefined;
  generatedSessionId?: string | undefined;
  resultKey?: string | undefined;
  result: ExerciseResultDraft;
  source: string;
  engineVersion: string;
  recordedAt?: string | undefined;
  completedAt?: string | undefined;
  smokeRunId?: string | undefined;
}

export interface ListExerciseResultsForDateRangeOptions {
  startDate: string;
  endDate: string;
}

export type ExerciseResultRow = Pick<
  TableRow<"exercise_results">,
  | "id"
  | "exercise_key"
  | "exercise_id"
  | "exercise_name"
  | "adaptation"
  | "completed_training_session_id"
  | "generated_training_session_id"
  | "movement_pattern"
  | "recorded_at"
  | "completed_at"
  | "result_key"
  | "source"
  | "template_block_id"
  | "template_id"
  | "template_slot_id"
  | "result_payload"
>;

export function mapExerciseResultRow(row: ExerciseResultRow): ExerciseResultRecord {
  const payload = parseWithSchema(ExerciseResultPayloadSchema, payloadObject(row.result_payload, "exercise_results.result_payload"), "exercise_results");
  const resultStatus = payload.resultStatus ?? inferLegacyResultStatus(payload);
  return {
    id: row.id,
    exerciseId: payload.exerciseId,
    exerciseName: payload.exerciseName,
    section: payload.section,
    ...(payload.templateId ?? row.template_id ? { templateId: payload.templateId ?? row.template_id ?? undefined } : {}),
    ...(payload.templateBlockId ?? row.template_block_id ? { templateBlockId: payload.templateBlockId ?? row.template_block_id ?? undefined } : {}),
    ...(payload.templateSlotId ?? row.template_slot_id ? { templateSlotId: payload.templateSlotId ?? row.template_slot_id ?? undefined } : {}),
    ...(payload.movementPattern ?? row.movement_pattern ? { movementPattern: (payload.movementPattern ?? row.movement_pattern) as MovementPattern } : {}),
    ...(payload.adaptation ?? row.adaptation ? { adaptation: (payload.adaptation ?? row.adaptation) as TrainingAdaptation } : {}),
    ...(payload.canonicalSessionId === undefined ? {} : { canonicalSessionId: payload.canonicalSessionId }),
    ...(payload.prescribedSets === undefined ? {} : { prescribedSets: payload.prescribedSets }),
    ...(payload.prescribedReps === undefined ? {} : { prescribedReps: payload.prescribedReps }),
    ...(payload.prescribedDurationSeconds === undefined ? {} : { prescribedDurationSeconds: payload.prescribedDurationSeconds }),
    ...(payload.prescribedLoadTarget === undefined ? {} : { prescribedLoadTarget: payload.prescribedLoadTarget }),
    ...(payload.prescribedRpe === undefined ? {} : { prescribedRpe: payload.prescribedRpe }),
    ...(payload.prescribedRir === undefined ? {} : { prescribedRir: payload.prescribedRir }),
    ...(payload.prescribedRestSeconds === undefined ? {} : { prescribedRestSeconds: payload.prescribedRestSeconds }),
    prescribed: payload.prescribed,
    resultStatus,
    ...(payload.completedSets === undefined ? {} : { completedSets: payload.completedSets }),
    ...(payload.loadValue === undefined ? {} : { loadValue: payload.loadValue as ExerciseResultRecord["loadValue"] }),
    ...(payload.loadUnit === undefined ? {} : { loadUnit: payload.loadUnit as ExerciseResultLoadUnit }),
    ...(payload.repsCompleted === undefined ? {} : { repsCompleted: payload.repsCompleted }),
    ...(payload.timeSeconds === undefined ? {} : { timeSeconds: payload.timeSeconds }),
    ...(payload.distanceMeters === undefined ? {} : { distanceMeters: payload.distanceMeters }),
    ...(payload.side === undefined ? {} : { side: payload.side as ExerciseResultSide }),
    ...(payload.technicalQuality === undefined ? {} : { technicalQuality: payload.technicalQuality as ExerciseResultTechnicalQuality }),
    ...(payload.loadText === undefined ? {} : { loadText: payload.loadText }),
    ...(payload.rpe === undefined ? {} : { rpe: payload.rpe }),
    ...(payload.notes === undefined ? {} : { notes: payload.notes }),
    ...(payload.painFlag === undefined ? {} : { painFlag: payload.painFlag }),
    source: row.source ?? payload.source,
    engineVersion: payload.engineVersion,
    ...(payload.generatedSessionId === undefined ? {} : { generatedSessionId: payload.generatedSessionId }),
    ...(payload.smokeRunId === undefined ? {} : { smokeRunId: payload.smokeRunId }),
    completedTrainingSessionId: row.completed_training_session_id,
    generatedTrainingSessionDbId: row.generated_training_session_id,
    recordedAt: isoDateTimeValue(row.recorded_at, "exercise_results.recorded_at"),
    completedAt: row.completed_at ? isoDateTimeValue(row.completed_at, "exercise_results.completed_at") : null
  };
}

function inferLegacyResultStatus(payload: z.infer<typeof ExerciseResultPayloadSchema>): ExerciseResultStatus {
  if (
    payload.completedSets !== undefined ||
    payload.loadValue !== undefined ||
    payload.loadUnit !== undefined ||
    payload.repsCompleted !== undefined ||
    payload.timeSeconds !== undefined ||
    payload.distanceMeters !== undefined ||
    payload.side !== undefined ||
    payload.technicalQuality !== undefined ||
    payload.loadText ||
    payload.rpe !== undefined ||
    payload.notes ||
    payload.painFlag
  ) {
    return "partial";
  }
  return "prescribed_only";
}

function resultPayload(input: InsertExerciseResultInput): z.infer<typeof ExerciseResultPayloadSchema> {
  return parseWithSchema(
    ExerciseResultPayloadSchema,
    {
      exerciseId: input.result.exerciseId,
      exerciseName: input.result.exerciseName,
      section: input.result.section,
      ...(input.result.templateId === undefined ? {} : { templateId: input.result.templateId }),
      ...(input.result.templateBlockId === undefined ? {} : { templateBlockId: input.result.templateBlockId }),
      ...(input.result.templateSlotId === undefined ? {} : { templateSlotId: input.result.templateSlotId }),
      ...(input.result.movementPattern === undefined ? {} : { movementPattern: input.result.movementPattern }),
      ...(input.result.adaptation === undefined ? {} : { adaptation: input.result.adaptation }),
      ...(input.result.canonicalSessionId === undefined ? {} : { canonicalSessionId: input.result.canonicalSessionId }),
      ...(input.result.prescribedSets === undefined ? {} : { prescribedSets: input.result.prescribedSets }),
      ...(input.result.prescribedReps === undefined ? {} : { prescribedReps: input.result.prescribedReps }),
      ...(input.result.prescribedDurationSeconds === undefined ? {} : { prescribedDurationSeconds: input.result.prescribedDurationSeconds }),
      ...(input.result.prescribedLoadTarget === undefined ? {} : { prescribedLoadTarget: input.result.prescribedLoadTarget }),
      ...(input.result.prescribedRpe === undefined ? {} : { prescribedRpe: input.result.prescribedRpe }),
      ...(input.result.prescribedRir === undefined ? {} : { prescribedRir: input.result.prescribedRir }),
      ...(input.result.prescribedRestSeconds === undefined ? {} : { prescribedRestSeconds: input.result.prescribedRestSeconds }),
      prescribed: input.result.prescribed,
      resultStatus: input.result.resultStatus,
      ...(input.result.completedSets === undefined ? {} : { completedSets: input.result.completedSets }),
      ...(input.result.loadValue === undefined ? {} : { loadValue: input.result.loadValue }),
      ...(input.result.loadUnit === undefined ? {} : { loadUnit: input.result.loadUnit }),
      ...(input.result.repsCompleted === undefined ? {} : { repsCompleted: input.result.repsCompleted }),
      ...(input.result.timeSeconds === undefined ? {} : { timeSeconds: input.result.timeSeconds }),
      ...(input.result.distanceMeters === undefined ? {} : { distanceMeters: input.result.distanceMeters }),
      ...(input.result.side === undefined ? {} : { side: input.result.side }),
      ...(input.result.technicalQuality === undefined ? {} : { technicalQuality: input.result.technicalQuality }),
      ...(input.result.loadText === undefined ? {} : { loadText: input.result.loadText }),
      ...(input.result.rpe === undefined ? {} : { rpe: input.result.rpe }),
      ...(input.result.notes === undefined ? {} : { notes: input.result.notes }),
      ...(input.result.painFlag === undefined ? {} : { painFlag: input.result.painFlag }),
      source: input.source,
      engineVersion: input.engineVersion,
      ...(input.generatedSessionId === undefined ? {} : { generatedSessionId: input.generatedSessionId }),
      ...(input.smokeRunId === undefined ? {} : { smokeRunId: input.smokeRunId })
    },
    "exercise_results.insertExerciseResult"
  );
}

export function createExerciseResultRepository(client: CornerSupabaseClient) {
  const exerciseResultSelect =
    "id, exercise_key, exercise_id, exercise_name, completed_training_session_id, generated_training_session_id, template_id, template_block_id, template_slot_id, movement_pattern, adaptation, recorded_at, completed_at, result_key, source, result_payload";
  return {
    async insertExerciseResult(input: InsertExerciseResultInput): Promise<{ id: string }> {
      const safeUserId = assertUserId(input.userId, "exercise_results.insertExerciseResult");
      const payload = resultPayload(input);
      const insert: TableInsert<"exercise_results"> = {
        user_id: safeUserId,
        completed_training_session_id: input.completedTrainingSessionId,
        ...(input.generatedTrainingSessionDbId === undefined ? {} : { generated_training_session_id: input.generatedTrainingSessionDbId }),
        exercise_key: payload.exerciseId,
        exercise_id: payload.exerciseId,
        exercise_name: payload.exerciseName,
        template_id: payload.templateId ?? null,
        template_block_id: payload.templateBlockId ?? null,
        template_slot_id: payload.templateSlotId ?? null,
        movement_pattern: payload.movementPattern ?? null,
        adaptation: payload.adaptation ?? null,
        result_key: input.resultKey ?? null,
        recorded_at: input.recordedAt ?? new Date().toISOString(),
        completed_at: input.completedAt ?? new Date().toISOString(),
        source: input.source,
        result_payload: toJson(payload)
      };
      const response = input.resultKey
        ? await client.from("exercise_results").upsert(insert, { onConflict: "user_id,result_key" }).select("id").single()
        : await client.from("exercise_results").insert(insert).select("id").single();
      return readDataOrThrow(response, "exercise_results.insertExerciseResult");
    },

    async insertExerciseResults(inputs: readonly InsertExerciseResultInput[]): Promise<{ ids: readonly string[] }> {
      const ids: string[] = [];
      for (const input of inputs) {
        ids.push((await this.insertExerciseResult(input)).id);
      }
      return { ids };
    },

    async listExerciseResultsForCompletedSession(userId: string, completedTrainingSessionId: string): Promise<ExerciseResultRecord[]> {
      const safeUserId = assertUserId(userId, "exercise_results.listExerciseResultsForCompletedSession");
      const response = await client
        .from("exercise_results")
        .select(exerciseResultSelect)
        .eq("user_id", safeUserId)
        .eq("completed_training_session_id", completedTrainingSessionId)
        .order("recorded_at", { ascending: true });
      return readDataOrThrow(response, "exercise_results.listExerciseResultsForCompletedSession").map(mapExerciseResultRow);
    },

    async listExerciseResultsForDateRange(userId: string, options: ListExerciseResultsForDateRangeOptions): Promise<ExerciseResultRecord[]> {
      const safeUserId = assertUserId(userId, "exercise_results.listExerciseResultsForDateRange");
      const response = await client
        .from("exercise_results")
        .select(exerciseResultSelect)
        .eq("user_id", safeUserId)
        .gte("completed_at", `${options.startDate}T00:00:00.000Z`)
        .lte("completed_at", `${options.endDate}T23:59:59.999Z`)
        .order("completed_at", { ascending: true })
        .order("recorded_at", { ascending: true });
      return readDataOrThrow(response, "exercise_results.listExerciseResultsForDateRange").map(mapExerciseResultRow);
    },

    async listRecentExerciseResults(userId: string, limit = 25): Promise<ExerciseResultRecord[]> {
      const safeUserId = assertUserId(userId, "exercise_results.listRecentExerciseResults");
      const response = await client
        .from("exercise_results")
        .select(exerciseResultSelect)
        .eq("user_id", safeUserId)
        .order("recorded_at", { ascending: false })
        .limit(limit);
      return readDataOrThrow(response, "exercise_results.listRecentExerciseResults").map(mapExerciseResultRow);
    }
  };
}
