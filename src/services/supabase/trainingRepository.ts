import { CompletedTrainingSessionSchema, GeneratedTrainingSessionSchema } from "../../engine/core/schemas";
import type { CompletedTrainingSession, GeneratedTrainingSession, ISODateString } from "../../engine/core/types";
import type { CornerSupabaseClient } from "./client";
import type { TableInsert, TableRow } from "./repositoryTypes";
import { assertUserId, parseWithSchema, payloadObject, readDataOrThrow, toJson } from "./repositoryTypes";

export type GeneratedTrainingSessionRow = Pick<TableRow<"generated_training_sessions">, "id" | "block_id" | "planned_date" | "session_payload">;
export type CompletedTrainingSessionRow = Pick<TableRow<"completed_training_sessions">, "id" | "completed_date" | "session_payload">;

export interface ListGeneratedSessionsOptions {
  asOfDate?: ISODateString | undefined;
  trainingBlockId?: string | null | undefined;
}

export function mapGeneratedTrainingSessionRow(row: GeneratedTrainingSessionRow): GeneratedTrainingSession {
  const payload = payloadObject(row.session_payload, "generated_training_sessions.session_payload");
  return parseWithSchema(
    GeneratedTrainingSessionSchema,
    {
      ...payload,
      id: typeof payload.id === "string" ? payload.id : row.id,
      date: row.planned_date,
      ...(typeof payload.trainingBlockId === "string" ? { trainingBlockId: payload.trainingBlockId } : row.block_id ? { trainingBlockId: row.block_id } : {})
    },
    "generated_training_sessions"
  );
}

export function mapCompletedTrainingSessionRow(row: CompletedTrainingSessionRow): CompletedTrainingSession {
  const payload = payloadObject(row.session_payload, "completed_training_sessions.session_payload");
  const legacySource = payload.source === "manual" || payload.source === "generated_session" || payload.source === "protected_anchor" ? payload.source : undefined;
  const completionSource =
    payload.completionSource === "manual" || payload.completionSource === "generated_session" || payload.completionSource === "protected_anchor"
      ? payload.completionSource
      : legacySource ?? "manual";
  const completionStatus = payload.completionStatus === "skipped" ? "skipped" : "completed";
  const painNotes = Array.isArray(payload.painNotes) ? payload.painNotes.filter((item): item is string => typeof item === "string") : [];
  return parseWithSchema(
    CompletedTrainingSessionSchema,
    {
      ...payload,
      id: row.id,
      date: row.completed_date,
      completionStatus,
      painNotes,
      completionSource,
      ...(payload.source === undefined ? {} : { source: legacySource })
    },
    "completed_training_sessions"
  );
}

function rowMatchesGeneratedSessionScope(row: GeneratedTrainingSessionRow, options: ListGeneratedSessionsOptions): boolean {
  if (options.trainingBlockId === undefined) {
    return true;
  }
  const payload = payloadObject(row.session_payload, "generated_training_sessions.session_payload");
  return (typeof payload.trainingBlockId === "string" && payload.trainingBlockId === options.trainingBlockId) || row.block_id === options.trainingBlockId;
}

export function createTrainingRepository(client: CornerSupabaseClient) {
  return {
    async listGeneratedSessions(userId: string, options: ListGeneratedSessionsOptions = {}): Promise<GeneratedTrainingSession[]> {
      const safeUserId = assertUserId(userId, "generated_training_sessions.listGeneratedSessions");
      const query = client
        .from("generated_training_sessions")
        .select("id, block_id, planned_date, session_payload")
        .eq("user_id", safeUserId);
      const scopedQuery = options.asOfDate ? query.gte("planned_date", options.asOfDate) : query;
      const response = await scopedQuery.order("planned_date", { ascending: true });
      return readDataOrThrow(response, "generated_training_sessions.listGeneratedSessions")
        .filter((row) => rowMatchesGeneratedSessionScope(row, options))
        .map(mapGeneratedTrainingSessionRow);
    },

    async listCompletedTrainingSessions(userId: string): Promise<CompletedTrainingSession[]> {
      const safeUserId = assertUserId(userId, "completed_training_sessions.listCompletedTrainingSessions");
      const response = await client
        .from("completed_training_sessions")
        .select("id, completed_date, session_payload")
        .eq("user_id", safeUserId)
        .order("completed_date", { ascending: true });
      return readDataOrThrow(response, "completed_training_sessions.listCompletedTrainingSessions").map(mapCompletedTrainingSessionRow);
    },

    async insertCompletedTrainingSession(userId: string, session: CompletedTrainingSession): Promise<{ id: string }> {
      const safeUserId = assertUserId(userId, "completed_training_sessions.insertCompletedTrainingSession");
      const validated = parseWithSchema(CompletedTrainingSessionSchema, session, "completed_training_sessions.insertCompletedTrainingSession");
      const insert: TableInsert<"completed_training_sessions"> = {
        user_id: safeUserId,
        completed_date: validated.date,
        session_payload: toJson({
          type: validated.type,
          durationMinutes: validated.durationMinutes,
          intensity: validated.intensity,
          rounds: validated.rounds,
          completionStatus: validated.completionStatus,
          sessionRpe: validated.sessionRpe,
          painNotes: validated.painNotes,
          athleteNotes: validated.athleteNotes,
          generatedSessionId: validated.generatedSessionId,
          engineVersion: validated.engineVersion,
          completionSource: validated.completionSource,
          smokeRunId: validated.smokeRunId,
          note: validated.note,
          source: validated.source ?? validated.completionSource,
          linkedProtectedWorkoutId: validated.linkedProtectedWorkoutId
        })
      };
      const response = await client.from("completed_training_sessions").insert(insert).select("id").single();
      return readDataOrThrow(response, "completed_training_sessions.insertCompletedTrainingSession");
    }
  };
}
