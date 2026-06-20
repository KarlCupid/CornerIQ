import { CompletedTrainingSessionSchema, GeneratedTrainingSessionSchema } from "../../engine/core/schemas";
import { stableHash } from "../../engine/core/stableHash";
import type { CompletedTrainingSession, GeneratedTrainingSession, ISODateString } from "../../engine/core/types";
import type { CornerSupabaseClient } from "./client";
import type { TableInsert, TableRow, TableUpdate } from "./repositoryTypes";
import { assertUserId, isoDateTimeValue, parseWithSchema, payloadObject, readDataOrThrow, readMaybeDataOrThrow, RepositoryError, toJson } from "./repositoryTypes";

export type GeneratedTrainingSessionRow = Pick<
  TableRow<"generated_training_sessions">,
  | "id"
  | "block_id"
  | "planned_date"
  | "original_planned_date"
  | "current_scheduled_date"
  | "plan_revision_id"
  | "week_id"
  | "week_index"
  | "prescription_slot_id"
  | "generated_session_lifecycle"
  | "session_payload"
>;
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

export type WorkoutCompletionOperationStatus = "pending" | "completion_written" | "results_written" | "event_written" | "completed" | "failed_retryable";

export interface UpsertWorkoutCompletionOperationInput {
  operationKey: string;
  generatedSessionId: string;
  completionKey: string;
  operationStatus: WorkoutCompletionOperationStatus;
  completedTrainingSessionId?: string | undefined;
  eventKey?: string | undefined;
  resultKeys?: readonly string[] | undefined;
  recordedAt: string;
  operationPayload?: Record<string, unknown> | undefined;
}

export function mapGeneratedTrainingSessionRow(row: GeneratedTrainingSessionRow): GeneratedTrainingSession {
  const payload = payloadObject(row.session_payload, "generated_training_sessions.session_payload");
  const payloadDate = typeof payload.date === "string" ? payload.date : row.planned_date;
  const originalPlannedDate = row.original_planned_date ?? (typeof payload.originalPlannedDate === "string" ? payload.originalPlannedDate : row.planned_date);
  const currentScheduledDate = row.current_scheduled_date ?? (typeof payload.currentScheduledDate === "string" ? payload.currentScheduledDate : payloadDate);
  return parseWithSchema(
    GeneratedTrainingSessionSchema,
    {
      ...payload,
      id: typeof payload.id === "string" ? payload.id : row.id,
      date: currentScheduledDate,
      originalPlannedDate,
      currentScheduledDate,
      ...(row.plan_revision_id ? { planRevisionId: row.plan_revision_id } : {}),
      ...(row.week_id ? { weekId: row.week_id } : {}),
      ...(row.week_index ? { weekIndex: row.week_index } : {}),
      ...(row.prescription_slot_id ? { prescriptionSlotId: row.prescription_slot_id } : {}),
      generatedSessionLifecycle:
        row.generated_session_lifecycle === "completed" ||
        row.generated_session_lifecycle === "skipped" ||
        row.generated_session_lifecycle === "unresolved" ||
        row.generated_session_lifecycle === "moved" ||
        row.generated_session_lifecycle === "superseded" ||
        row.generated_session_lifecycle === "canceled"
          ? row.generated_session_lifecycle
          : typeof payload.generatedSessionLifecycle === "string"
            ? payload.generatedSessionLifecycle
            : "active",
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
      ...(typeof payload.exerciseResultFingerprint === "string" ? { exerciseResultFingerprint: payload.exerciseResultFingerprint } : {}),
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
      exerciseResultFingerprint: validated.exerciseResultFingerprint,
      resolutionLifecycle: validated.resolutionLifecycle ?? "current",
      supersededAt: validated.supersededAt,
      smokeRunId: validated.smokeRunId,
      note: validated.note,
      source: validated.source ?? validated.completionSource,
      linkedProtectedWorkoutId: validated.linkedProtectedWorkoutId
    })
  };
}

function supersededCompletionKey(rowId: string, generatedSessionId: string): string {
  return `generated_session_completion:${generatedSessionId}:superseded:${rowId}`;
}

function completionMaterialFingerprint(session: CompletedTrainingSession): string {
  return stableHash({
    plannedDate: session.plannedDate ?? session.date,
    performedDate: session.performedDate ?? session.date,
    type: session.type,
    durationMinutes: session.durationMinutes,
    intensity: session.intensity,
    rounds: session.rounds ?? null,
    completionStatus: session.completionStatus,
    sessionRpe: session.sessionRpe ?? null,
    painNotes: session.painNotes,
    athleteNotes: session.athleteNotes ?? null,
    generatedSessionId: session.generatedSessionId ?? null,
    engineVersion: session.engineVersion ?? null,
    completionSource: session.completionSource,
    exerciseResultFingerprint: session.exerciseResultFingerprint ?? null,
    smokeRunId: session.smokeRunId ?? null,
    note: session.note ?? null,
    source: session.source ?? null,
    linkedProtectedWorkoutId: session.linkedProtectedWorkoutId ?? null
  });
}

function recordedAtForConflict(session: CompletedTrainingSession): string {
  return session.recordedAt ?? `${session.performedDate ?? session.date}T00:00:00.000Z`;
}

function supersededSessionMutation(row: CompletedTrainingSessionRow, generatedSessionId: string, supersededAt: string): TableUpdate<"completed_training_sessions"> {
  const payload = payloadObject(row.session_payload, "completed_training_sessions.supersede.session_payload");
  const completionKey = supersededCompletionKey(row.id, generatedSessionId);
  return {
    completion_key: completionKey,
    generated_session_id: generatedSessionId,
    resolution_lifecycle: "superseded",
    superseded_at: supersededAt,
    session_payload: toJson({
      ...payload,
      completionKey,
      generatedSessionId,
      resolutionLifecycle: "superseded",
      supersededAt
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
  async function findCurrentGeneratedSessionResolution(
    safeUserId: string,
    completionKey: string | null,
    generatedSessionId?: string | undefined
  ): Promise<CompletedTrainingSessionRow | null> {
    if (completionKey) {
      const byKeyResponse = await client
        .from("completed_training_sessions")
        .select(completedSessionSelect)
        .eq("user_id", safeUserId)
        .eq("completion_key", completionKey)
        .limit(1)
        .maybeSingle();
      const byKey = readMaybeDataOrThrow(byKeyResponse, "completed_training_sessions.findCurrentGeneratedSessionResolution.byKey");
      if (byKey) {
        return byKey;
      }
    }
    if (!generatedSessionId) {
      return null;
    }
    const byGeneratedSessionResponse = await client
      .from("completed_training_sessions")
      .select(completedSessionSelect)
      .eq("user_id", safeUserId)
      .eq("generated_session_id", generatedSessionId)
      .eq("resolution_lifecycle", "current")
      .limit(1)
      .maybeSingle();
    return readMaybeDataOrThrow(byGeneratedSessionResponse, "completed_training_sessions.findCurrentGeneratedSessionResolution.byGeneratedSession");
  }

  async function supersedeCurrentGeneratedSessionResolution(
    safeUserId: string,
    row: CompletedTrainingSessionRow,
    generatedSessionId: string,
    supersededAt: string
  ): Promise<void> {
    const updateResponse = await client
      .from("completed_training_sessions")
      .update(supersededSessionMutation(row, generatedSessionId, supersededAt))
      .eq("id", row.id)
      .eq("user_id", safeUserId)
      .eq("resolution_lifecycle", "current")
      .select("id")
      .single();
    readDataOrThrow(updateResponse, "completed_training_sessions.supersedeCurrentGeneratedSessionResolution");
  }

  function assertCorrectionIsNotStale(existing: CompletedTrainingSession, validated: CompletedTrainingSession): void {
    if (recordedAtForConflict(validated) <= recordedAtForConflict(existing)) {
      throw new RepositoryError(
        "remote_error",
        "completed_training_sessions.insertCompletedTrainingSession.staleCorrection",
        "generated-session correction is older than the current recorded resolution"
      );
    }
  }

  async function insertCurrentCompletedTrainingSession(
    safeUserId: string,
    validated: CompletedTrainingSession,
    completionKey: string | null,
    corrected: boolean
  ): Promise<{ id: string; existing?: boolean | undefined; corrected?: boolean | undefined }> {
    const insert: TableInsert<"completed_training_sessions"> = completedSessionMutation(safeUserId, validated, completionKey);
    const response = await client.from("completed_training_sessions").insert(insert).select("id").single();
    if (response.error?.code === "23505" && completionKey) {
      const current = await findCurrentGeneratedSessionResolution(safeUserId, completionKey, validated.generatedSessionId);
      if (current) {
        const mapped = mapCompletedTrainingSessionRow(current);
        if (completionMaterialFingerprint(mapped) === completionMaterialFingerprint(validated)) {
          return { id: current.id, existing: true };
        }
        assertCorrectionIsNotStale(mapped, validated);
        await supersedeCurrentGeneratedSessionResolution(safeUserId, current, validated.generatedSessionId ?? mapped.generatedSessionId ?? "", recordedAtForConflict(validated));
        return insertCurrentCompletedTrainingSession(safeUserId, validated, completionKey, true);
      }
    }
    const inserted = readDataOrThrow(response, "completed_training_sessions.insertCompletedTrainingSession");
    return corrected ? { ...inserted, corrected: true } : inserted;
  }

  return {
    async listGeneratedSessions(userId: string, options: ListGeneratedSessionsOptions = {}): Promise<GeneratedTrainingSession[]> {
      const safeUserId = assertUserId(userId, "generated_training_sessions.listGeneratedSessions");
      const query = client
        .from("generated_training_sessions")
        .select("id, block_id, planned_date, original_planned_date, current_scheduled_date, plan_revision_id, week_id, week_index, prescription_slot_id, generated_session_lifecycle, session_payload")
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
        const existing = await findCurrentGeneratedSessionResolution(safeUserId, completionKey, validated.generatedSessionId);
        if (existing) {
          const mapped = mapCompletedTrainingSessionRow(existing);
          if (completionMaterialFingerprint(mapped) === completionMaterialFingerprint(validated)) {
            return { id: existing.id, existing: true };
          }
          assertCorrectionIsNotStale(mapped, validated);
          await supersedeCurrentGeneratedSessionResolution(safeUserId, existing, validated.generatedSessionId ?? mapped.generatedSessionId ?? "", recordedAtForConflict(validated));
          return insertCurrentCompletedTrainingSession(safeUserId, validated, completionKey, true);
        }
      }
      return insertCurrentCompletedTrainingSession(safeUserId, validated, completionKey, false);
    },

    async upsertWorkoutCompletionOperation(userId: string, input: UpsertWorkoutCompletionOperationInput): Promise<{ id: string }> {
      const safeUserId = assertUserId(userId, "workout_completion_operations.upsertWorkoutCompletionOperation");
      const record: TableInsert<"workout_completion_operations"> = {
        user_id: safeUserId,
        operation_key: input.operationKey,
        generated_session_id: input.generatedSessionId,
        completion_key: input.completionKey,
        completed_training_session_id: input.completedTrainingSessionId ?? null,
        event_key: input.eventKey ?? null,
        result_keys: [...(input.resultKeys ?? [])],
        operation_status: input.operationStatus,
        operation_payload: toJson(input.operationPayload ?? {}),
        recorded_at: input.recordedAt
      };
      const response = await client.from("workout_completion_operations").upsert(record, { onConflict: "user_id,operation_key" }).select("id").single();
      return readDataOrThrow(response, "workout_completion_operations.upsertWorkoutCompletionOperation");
    }
  };
}
