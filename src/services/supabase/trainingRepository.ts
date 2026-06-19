import { CompletedTrainingSessionSchema, GeneratedTrainingSessionSchema } from "../../engine/core/schemas";
import type { CompletedTrainingSession, GeneratedTrainingSession, ISODateString } from "../../engine/core/types";
import type { CornerSupabaseClient } from "./client";
import type { TableInsert, TableRow, TableUpdate } from "./repositoryTypes";
import { assertUserId, isoDateTimeValue, parseWithSchema, payloadObject, readDataOrThrow, readMaybeDataOrThrow, toJson } from "./repositoryTypes";

export type GeneratedTrainingSessionRow = Pick<TableRow<"generated_training_sessions">, "id" | "block_id" | "planned_date" | "session_payload">;
export type CompletedTrainingSessionRow = Pick<
  TableRow<"completed_training_sessions">,
  | "id"
  | "completion_key"
  | "completed_date"
  | "generated_session_id"
  | "planned_date"
  | "performed_date"
  | "recorded_at"
  | "resolution_lifecycle"
  | "superseded_at"
  | "session_payload"
>;

export interface ListGeneratedSessionsOptions {
  asOfDate?: ISODateString | undefined;
  endDate?: ISODateString | undefined;
  startDate?: ISODateString | undefined;
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
      ...(row.completion_key === null ? {} : { completionKey: row.completion_key }),
      date: row.performed_date ?? row.completed_date,
      plannedDate: row.planned_date ?? (typeof payload.plannedDate === "string" ? payload.plannedDate : row.completed_date),
      performedDate: row.performed_date ?? (typeof payload.performedDate === "string" ? payload.performedDate : row.completed_date),
      ...(row.recorded_at ? { recordedAt: isoDateTimeValue(row.recorded_at, "completed_training_sessions.recorded_at") } : typeof payload.recordedAt === "string" ? { recordedAt: payload.recordedAt } : {}),
      completionStatus,
      painNotes,
      completionSource,
      ...(row.generated_session_id ? { generatedSessionId: row.generated_session_id } : typeof payload.generatedSessionId === "string" ? { generatedSessionId: payload.generatedSessionId } : {}),
      resolutionLifecycle: row.resolution_lifecycle === "superseded" ? "superseded" : "current",
      ...(row.superseded_at ? { supersededAt: isoDateTimeValue(row.superseded_at, "completed_training_sessions.superseded_at") } : {}),
      ...(payload.source === undefined ? {} : { source: legacySource })
    },
    "completed_training_sessions"
  );
}

export function completionKeyForCompletedTrainingSession(session: CompletedTrainingSession): string | null {
  if (session.completionSource !== "generated_session" || !session.generatedSessionId) {
    return session.completionKey ?? null;
  }
  return `generated_session_completion:${session.generatedSessionId}`;
}

const completedSessionSelect =
  "id, completion_key, completed_date, generated_session_id, planned_date, performed_date, recorded_at, resolution_lifecycle, superseded_at, session_payload";

function completedSessionMutation(
  userId: string,
  validated: CompletedTrainingSession,
  completionKey: string | null
): TableInsert<"completed_training_sessions"> & TableUpdate<"completed_training_sessions"> {
  const plannedDate = validated.plannedDate ?? validated.date;
  const performedDate = validated.performedDate ?? validated.date;
  return {
    user_id: userId,
    completion_key: completionKey,
    generated_session_id: validated.generatedSessionId ?? null,
    planned_date: plannedDate,
    performed_date: performedDate,
    recorded_at: validated.recordedAt ?? null,
    resolution_lifecycle: validated.resolutionLifecycle ?? "current",
    superseded_at: validated.supersededAt ?? null,
    completed_date: performedDate,
    session_payload: toJson({
      completionKey,
      plannedDate,
      performedDate,
      recordedAt: validated.recordedAt,
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
      resolutionLifecycle: validated.resolutionLifecycle ?? "current",
      supersededAt: validated.supersededAt,
      smokeRunId: validated.smokeRunId,
      note: validated.note,
      source: validated.source ?? validated.completionSource,
      linkedProtectedWorkoutId: validated.linkedProtectedWorkoutId
    })
  };
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
      const startDate = options.startDate ?? options.asOfDate;
      let scopedQuery = startDate ? query.gte("planned_date", startDate) : query;
      scopedQuery = options.endDate ? scopedQuery.lte("planned_date", options.endDate) : scopedQuery;
      const response = await scopedQuery.order("planned_date", { ascending: true });
      return readDataOrThrow(response, "generated_training_sessions.listGeneratedSessions")
        .filter((row) => rowMatchesGeneratedSessionScope(row, options))
        .map(mapGeneratedTrainingSessionRow);
    },

    async listCompletedTrainingSessions(userId: string): Promise<CompletedTrainingSession[]> {
      const safeUserId = assertUserId(userId, "completed_training_sessions.listCompletedTrainingSessions");
      const response = await client
        .from("completed_training_sessions")
        .select(completedSessionSelect)
        .eq("user_id", safeUserId)
        .order("completed_date", { ascending: true });
      return readDataOrThrow(response, "completed_training_sessions.listCompletedTrainingSessions").map(mapCompletedTrainingSessionRow);
    },

    async insertCompletedTrainingSession(userId: string, session: CompletedTrainingSession): Promise<{ id: string; existing?: boolean | undefined; corrected?: boolean | undefined }> {
      const safeUserId = assertUserId(userId, "completed_training_sessions.insertCompletedTrainingSession");
      const validated = parseWithSchema(CompletedTrainingSessionSchema, session, "completed_training_sessions.insertCompletedTrainingSession");
      const completionKey = completionKeyForCompletedTrainingSession(validated);
      if (completionKey) {
        const existingResponse = await client
          .from("completed_training_sessions")
          .select(completedSessionSelect)
          .eq("user_id", safeUserId)
          .eq("completion_key", completionKey)
          .limit(1)
          .maybeSingle();
        const existing = readMaybeDataOrThrow(existingResponse, "completed_training_sessions.insertCompletedTrainingSession.findExisting");
        if (existing) {
          const mapped = mapCompletedTrainingSessionRow(existing);
          if (mapped.completionStatus === validated.completionStatus) {
            return { id: existing.id, existing: true };
          }
          const update = completedSessionMutation(safeUserId, validated, completionKey);
          const updateResponse = await client
            .from("completed_training_sessions")
            .update(update)
            .eq("id", existing.id)
            .eq("user_id", safeUserId)
            .select("id")
            .single();
          const updated = readDataOrThrow(updateResponse, "completed_training_sessions.insertCompletedTrainingSession.correctExisting");
          return { id: updated.id, existing: true, corrected: true };
        }
      }
      const insert: TableInsert<"completed_training_sessions"> = completedSessionMutation(safeUserId, validated, completionKey);
      const response = await client.from("completed_training_sessions").insert(insert).select("id").single();
      if (response.error?.code === "23505" && completionKey) {
        const existingResponse = await client
          .from("completed_training_sessions")
          .select("id")
          .eq("user_id", safeUserId)
          .eq("completion_key", completionKey)
          .limit(1)
          .maybeSingle();
        const existing = readMaybeDataOrThrow(existingResponse, "completed_training_sessions.insertCompletedTrainingSession.findAfterConflict");
        if (existing) {
          return { id: existing.id, existing: true };
        }
      }
      return readDataOrThrow(response, "completed_training_sessions.insertCompletedTrainingSession");
    }
  };
}
