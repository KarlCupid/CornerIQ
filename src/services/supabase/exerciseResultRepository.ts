import { z } from "zod";
import type { ExerciseResultDraft, ISODateTimeString } from "../../engine/core/types";
import type { CornerSupabaseClient } from "./client";
import type { TableInsert, TableRow } from "./repositoryTypes";
import { assertUserId, isoDateTimeValue, parseWithSchema, payloadObject, readDataOrThrow, toJson } from "./repositoryTypes";

const ExerciseResultPayloadSchema = z.object({
  exerciseId: z.string().min(1),
  exerciseName: z.string().min(1),
  section: z.string().min(1),
  prescribed: z.record(z.unknown()),
  completedSets: z.number().int().nonnegative().optional(),
  loadText: z.string().optional(),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
  painFlag: z.boolean().optional(),
  source: z.string().min(1),
  engineVersion: z.string().min(1),
  generatedSessionId: z.string().min(1).optional()
});

export interface ExerciseResultRecord {
  id: string;
  exerciseId: string;
  exerciseName: string;
  section: string;
  prescribed: Record<string, unknown>;
  completedSets?: number | undefined;
  loadText?: string | undefined;
  rpe?: number | undefined;
  notes?: string | undefined;
  painFlag?: boolean | undefined;
  source: string;
  engineVersion: string;
  generatedSessionId?: string | undefined;
  completedTrainingSessionId: string | null;
  generatedTrainingSessionDbId: string | null;
  recordedAt: ISODateTimeString;
  completedAt: ISODateTimeString | null;
}

export interface InsertExerciseResultInput {
  userId: string;
  completedTrainingSessionId: string;
  generatedTrainingSessionDbId?: string | undefined;
  generatedSessionId?: string | undefined;
  result: ExerciseResultDraft;
  source: string;
  engineVersion: string;
  recordedAt?: string | undefined;
  completedAt?: string | undefined;
}

export type ExerciseResultRow = Pick<
  TableRow<"exercise_results">,
  | "id"
  | "exercise_key"
  | "exercise_id"
  | "exercise_name"
  | "completed_training_session_id"
  | "generated_training_session_id"
  | "recorded_at"
  | "completed_at"
  | "source"
  | "result_payload"
>;

export function mapExerciseResultRow(row: ExerciseResultRow): ExerciseResultRecord {
  const payload = parseWithSchema(ExerciseResultPayloadSchema, payloadObject(row.result_payload, "exercise_results.result_payload"), "exercise_results");
  return {
    id: row.id,
    exerciseId: payload.exerciseId,
    exerciseName: payload.exerciseName,
    section: payload.section,
    prescribed: payload.prescribed,
    ...(payload.completedSets === undefined ? {} : { completedSets: payload.completedSets }),
    ...(payload.loadText === undefined ? {} : { loadText: payload.loadText }),
    ...(payload.rpe === undefined ? {} : { rpe: payload.rpe }),
    ...(payload.notes === undefined ? {} : { notes: payload.notes }),
    ...(payload.painFlag === undefined ? {} : { painFlag: payload.painFlag }),
    source: row.source ?? payload.source,
    engineVersion: payload.engineVersion,
    ...(payload.generatedSessionId === undefined ? {} : { generatedSessionId: payload.generatedSessionId }),
    completedTrainingSessionId: row.completed_training_session_id,
    generatedTrainingSessionDbId: row.generated_training_session_id,
    recordedAt: isoDateTimeValue(row.recorded_at, "exercise_results.recorded_at"),
    completedAt: row.completed_at ? isoDateTimeValue(row.completed_at, "exercise_results.completed_at") : null
  };
}

function resultPayload(input: InsertExerciseResultInput): z.infer<typeof ExerciseResultPayloadSchema> {
  return parseWithSchema(
    ExerciseResultPayloadSchema,
    {
      exerciseId: input.result.exerciseId,
      exerciseName: input.result.exerciseName,
      section: input.result.section,
      prescribed: input.result.prescribed,
      ...(input.result.completedSets === undefined ? {} : { completedSets: input.result.completedSets }),
      ...(input.result.loadText === undefined ? {} : { loadText: input.result.loadText }),
      ...(input.result.rpe === undefined ? {} : { rpe: input.result.rpe }),
      ...(input.result.notes === undefined ? {} : { notes: input.result.notes }),
      ...(input.result.painFlag === undefined ? {} : { painFlag: input.result.painFlag }),
      source: input.source,
      engineVersion: input.engineVersion,
      ...(input.generatedSessionId === undefined ? {} : { generatedSessionId: input.generatedSessionId })
    },
    "exercise_results.insertExerciseResult"
  );
}

export function createExerciseResultRepository(client: CornerSupabaseClient) {
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
        recorded_at: input.recordedAt ?? new Date().toISOString(),
        completed_at: input.completedAt ?? new Date().toISOString(),
        source: input.source,
        result_payload: toJson(payload)
      };
      const response = await client.from("exercise_results").insert(insert).select("id").single();
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
        .select("id, exercise_key, exercise_id, exercise_name, completed_training_session_id, generated_training_session_id, recorded_at, completed_at, source, result_payload")
        .eq("user_id", safeUserId)
        .eq("completed_training_session_id", completedTrainingSessionId)
        .order("recorded_at", { ascending: true });
      return readDataOrThrow(response, "exercise_results.listExerciseResultsForCompletedSession").map(mapExerciseResultRow);
    }
  };
}
