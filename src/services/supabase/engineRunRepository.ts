import { RiskFlagSchema } from "../../engine/core/schemas";
import type { DecisionTrace, GeneratedTrainingSession, ISODateString, PerformanceState, RiskFlag } from "../../engine/core/types";
import { normalizeAthleteTrainingProfile, normalizePlanIntent } from "../../engine/training/compiler/normalizePlanInputs";
import { TRAINING_COMPILER_CONTRACT_VERSION } from "../../engine/training/compiler/types";
import type { CornerSupabaseClient } from "./client";
import type { TableInsert, TableRow, TableUpdate } from "./repositoryTypes";
import { RepositoryError, assertUserId, parseWithSchema, payloadObject, readDataOrThrow, readMaybeDataOrThrow, toJson } from "./repositoryTypes";

export type RiskFlagRow = Pick<TableRow<"risk_flags">, "id" | "domain" | "code" | "severity" | "status" | "flag_payload">;
type ActiveEngineRiskFlagRow = Pick<TableRow<"risk_flags">, "id" | "domain" | "code" | "flag_payload">;
type GeneratedSessionSlotRow = Pick<TableRow<"generated_training_sessions">, "id" | "current_scheduled_date" | "generated_session_lifecycle" | "session_payload">;

const GENERATED_SESSION_SCHEMA_VERSION_V2 = "generated_training_session_v2";
const V2_MUTABLE_GENERATED_SESSION_LIFECYCLES = new Set(["active", "moved", "unresolved"]);

export interface ListActiveRiskFlagsOptions {
  asOfDate?: ISODateString | undefined;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function requiredObjectValue(value: unknown, context: string): Record<string, unknown> {
  const parsed = objectValue(value);
  if (!parsed) {
    throw new RepositoryError("malformed_payload", context, "expected a JSON object");
  }
  return parsed;
}

function trimmedStringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function sourceRecordIdsFor(state: PerformanceState) {
  return {
    athleteProfileId: state.athlete.athleteId,
    ...(state.training.planGenerationIntent?.id ? { planIntentId: state.training.planGenerationIntent.id } : {}),
    protectedWorkoutIds: state.training.protectedAnchors.map((workout) => workout.id).sort(),
    completedSessionIds: state.training.completedSessions.map((session) => session.id).sort(),
    exerciseResultIds: state.training.recentExerciseResults.map((result) => result.id).sort(),
    readinessCheckinIds: [],
    nutritionLogIds: [],
    hydrationLogIds: [],
    electrolyteLogIds: [],
    cycleLogIds: [],
    riskFlagIds: state.safety.riskFlags.map((flag) => flag.id).sort()
  };
}

function workoutEngineInputSnapshot(userId: string, inputHash: string, state: PerformanceState) {
  const planIntent = normalizePlanIntent({
    legacyIntent: state.training.planGenerationIntent,
    userId,
    requestedStartDate: state.training.planGenerationIntent?.planStartDate ?? state.training.activeBlock.startDate,
    activeRevisionId: state.training.supportGenerationAudit.planRevisionId
  });
  const athleteTrainingProfile = normalizeAthleteTrainingProfile({
    athlete: state.athlete,
    equipment: planIntent.equipment.length > 0 ? planIntent.equipment : state.athlete.equipmentAccess,
    fixedBoxingSchedule: state.training.protectedAnchors,
    modalityAvoidances: planIntent.modalityAvoidances,
    modalityPreferences: planIntent.modalityPreferences,
    currentLimitations: planIntent.currentLimitations,
    userPreferences: planIntent.userPreferences,
    preferredSessionDurationMinutes: planIntent.preferredSessionDurationMinutes
  });
  return {
    contractVersion: `${TRAINING_COMPILER_CONTRACT_VERSION}.outside_engine_snapshot.v1`,
    asOfDate: state.asOfDate,
    planIntent,
    athleteTrainingProfile,
    fixedTraining: state.training.protectedAnchors,
    recentCompletedSessions: state.training.completedSessions,
    recentExerciseResults: state.training.recentExerciseResults,
    readiness: state.readiness,
    cycle: state.cycle,
    foodLogSummary: state.nutrition.dailyFoodLogSummary,
    hydrationLogCount: undefined,
    electrolyteLogCount: undefined,
    riskFlags: state.safety.riskFlags,
    sourceRecordIds: sourceRecordIdsFor(state),
    inputHash
  };
}

function workoutEngineOutputSnapshot(state: PerformanceState) {
  return {
    outputHash: state.outputHash,
    planInstanceFingerprint: state.training.supportGenerationAudit.planInstanceFingerprint,
    contentFingerprint: state.training.supportGenerationAudit.contentFingerprint,
    generatedSessionIds: state.training.generatedSessions.map((session) => session.id).sort(),
    canonicalWorkoutSessionIds: state.training.generatedSessions
      .map((session) => session.structuredPrescriptionV2?.canonicalWorkoutSession?.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
      .sort(),
    validationPassed: state.training.supportGenerationAudit.prescriptionValidationPassed,
    validationFailures: state.training.supportGenerationAudit.prescriptionValidationFailures
  };
}

export function mapPerformanceStateToEngineRun(userId: string, inputHash: string, state: PerformanceState): TableInsert<"engine_runs"> {
  return {
    user_id: userId,
    engine_version: state.engineVersion,
    as_of_date: state.asOfDate,
    input_hash: inputHash,
    output_hash: state.outputHash,
    run_payload: toJson({
      phase: state.phase.phase,
      objective: state.objective,
      confidence: state.confidence.level,
      outputHash: state.outputHash,
      riskCount: state.safety.riskFlags.length,
      workoutEngineInputSnapshot: workoutEngineInputSnapshot(userId, inputHash, state),
      workoutEngineOutputSnapshot: workoutEngineOutputSnapshot(state)
    })
  };
}

export function mapDecisionTraceToRow(userId: string, engineRunId: string, trace: DecisionTrace): TableInsert<"decision_traces"> {
  return {
    user_id: userId,
    engine_run_id: engineRunId,
    engine: trace.engine,
    step: trace.step,
    trace_payload: toJson({
      ...trace,
      engineRunId
    })
  };
}

export function mapRiskFlagToRow(userId: string, flag: RiskFlag, inputHash?: string, asOfDate?: ISODateString): TableInsert<"risk_flags"> {
  return {
    user_id: userId,
    domain: flag.domain,
    code: flag.code,
    severity: flag.severity,
    status: flag.status,
    flag_payload: toJson({
      ...flag,
      projectionSource: "engine_projection",
      ...(inputHash ? { inputHash } : {}),
      ...(asOfDate ? { asOfDate } : {})
    })
  };
}

export function mapRiskFlagRow(row: RiskFlagRow): RiskFlag {
  return parseWithSchema(
    RiskFlagSchema,
    {
      ...payloadObject(row.flag_payload, "risk_flags.flag_payload"),
      id: row.id,
      domain: row.domain,
      code: row.code,
      severity: row.severity,
      status: row.status
    },
    "risk_flags"
  ) as RiskFlag;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function stringArrayValue(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function payloadDateMatches(payload: Record<string, unknown>, asOfDate: ISODateString): boolean {
  const directDates = [
    stringValue(payload.asOfDate),
    stringValue(payload.date),
    stringValue(payload.logDate),
    stringValue(payload.checkInDate),
    stringValue(payload.validForDate)
  ];
  if (directDates.includes(asOfDate)) {
    return true;
  }
  const dateList = [...stringArrayValue(payload.dates), ...stringArrayValue(payload.validForDates), ...stringArrayValue(payload.activeDates)];
  return dateList.includes(asOfDate);
}

function payloadWindowIncludes(payload: Record<string, unknown>, asOfDate: ISODateString): boolean {
  const activeFrom = stringValue(payload.activeFrom);
  const activeUntil = stringValue(payload.activeUntil) ?? stringValue(payload.validUntil) ?? stringValue(payload.expiresAt);
  if (activeFrom || activeUntil) {
    return (!activeFrom || activeFrom <= asOfDate) && (!activeUntil || activeUntil >= asOfDate);
  }
  return false;
}

function riskFlagPayloadIsCurrentForDate(flag: RiskFlag, payload: Record<string, unknown>, asOfDate: ISODateString): boolean {
  if (flag.status !== "active") {
    return false;
  }
  if (flag.code === "external_safety_flag") {
    return true;
  }
  if (payloadDateMatches(payload, asOfDate) || payloadWindowIncludes(payload, asOfDate)) {
    return true;
  }
  const evidence = payload.evidence;
  if (evidence === null || typeof evidence !== "object" || Array.isArray(evidence)) {
    return false;
  }
  return payloadDateMatches(evidence as Record<string, unknown>, asOfDate) || payloadWindowIncludes(evidence as Record<string, unknown>, asOfDate);
}

export function mapNutritionTargetToRow(userId: string, state: PerformanceState, inputHash: string): TableInsert<"nutrition_targets"> {
  return {
    user_id: userId,
    target_date: state.asOfDate,
    target_payload: toJson({
      nutrition: state.nutrition,
      hydration: state.hydration,
      engineVersion: state.engineVersion,
      inputHash,
      outputHash: state.outputHash
    }),
    engine_version: state.engineVersion
  };
}

export function generatedTrainingSessionKey(session: GeneratedTrainingSession): string {
  return session.prescriptionSlotId ?? session.id;
}

const RECONCILED_GENERATED_SESSION_LIFECYCLES = ["active", "moved", "completed", "skipped", "unresolved"] as const;

const EXECUTION_OVERLAY_MODIFICATION_MARKERS = [
  "No readiness check-in",
  "No food log today",
  "Food log is incomplete",
  "Food marked not tracking today",
  "Quick fuel check supports execution only",
  "Hydration confidence is advisory",
  "Amber readiness execution",
  "Red readiness without hard-stop symptoms: session stays planned",
  "One complete low intake day",
  "Under-fueling evidence: remove all-out finishers",
  "Hard-stop evidence: do not turn this into hard training"
];

function baseGeneratedSessionForPersistence(session: GeneratedTrainingSession): GeneratedTrainingSession {
  const baseSession: GeneratedTrainingSession = {
    ...session,
    modifications: session.modifications.filter((modification) => !EXECUTION_OVERLAY_MODIFICATION_MARKERS.some((marker) => modification.includes(marker)))
  };
  delete baseSession.readinessGate;
  delete baseSession.fuelingGate;
  delete baseSession.hydrationGate;
  delete baseSession.executionReadinessStatus;
  delete baseSession.preSessionChecklist;
  delete baseSession.downshiftIf;
  delete baseSession.fuelBefore;
  delete baseSession.fuelAfter;
  delete baseSession.confidenceImpact;
  delete baseSession.missingDataAdvisories;
  return baseSession;
}

function riskFlagPersistenceKey(record: Pick<TableInsert<"risk_flags">, "code" | "domain">): string {
  return `${record.domain}:${record.code}`;
}

function assertV2GeneratedSessionAuthority(record: TableInsert<"generated_training_sessions">): void {
  const payload = payloadObject(record.session_payload ?? toJson({}), "generated_training_sessions.validateV2.session_payload");
  if (payload.generatedSessionSchemaVersion !== GENERATED_SESSION_SCHEMA_VERSION_V2) {
    return;
  }
  const structured = requiredObjectValue(payload.structuredPrescriptionV2, "generated_training_sessions.validateV2.structuredPrescriptionV2");
  requiredObjectValue(structured.sessionIntent, "generated_training_sessions.validateV2.sessionIntent");
  requiredObjectValue(structured.compiledSession, "generated_training_sessions.validateV2.compiledSession");
  const canonical = requiredObjectValue(structured.canonicalWorkoutSession, "generated_training_sessions.validateV2.canonicalWorkoutSession");
  requiredObjectValue(structured.adaptationBudget, "generated_training_sessions.validateV2.adaptationBudget");

  const templateId = trimmedStringValue(payload.templateId);
  if (!templateId) {
    throw new RepositoryError("missing_required_data", "generated_training_sessions.validateV2", "templateId is required for V2 generated sessions");
  }
  const canonicalTemplateId = trimmedStringValue(canonical.templateId);
  if (canonicalTemplateId && canonicalTemplateId !== templateId) {
    throw new RepositoryError("malformed_payload", "generated_training_sessions.validateV2", "canonical templateId must match top-level templateId");
  }
  const recordSlotId = trimmedStringValue(record.prescription_slot_id);
  const payloadSlotId = trimmedStringValue(payload.prescriptionSlotId);
  const sessionIntentId = trimmedStringValue((structured.sessionIntent as Record<string, unknown>).id);
  const sessionIntentPayloadId = trimmedStringValue(payload.sessionIntentId);
  if (!recordSlotId || (recordSlotId !== payloadSlotId && recordSlotId !== sessionIntentId && recordSlotId !== sessionIntentPayloadId)) {
    throw new RepositoryError(
      "malformed_payload",
      "generated_training_sessions.validateV2",
      "prescription_slot_id must match the V2 session intent or payload slot id"
    );
  }
  if (V2_MUTABLE_GENERATED_SESSION_LIFECYCLES.has(record.generated_session_lifecycle ?? "active") && (!record.plan_revision_id || !record.week_id || !record.block_id)) {
    throw new RepositoryError("missing_required_data", "generated_training_sessions.validateV2", "plan_revision_id, week_id, and block_id are required for active V2 sessions");
  }
}

function assertGeneratedContentNotMutated(record: TableInsert<"generated_training_sessions">, existing: GeneratedSessionSlotRow): void {
  const nextPayload = payloadObject(record.session_payload ?? toJson({}), "generated_training_sessions.immutability.next");
  const existingPayload = payloadObject(existing.session_payload, "generated_training_sessions.immutability.existing");
  if (nextPayload.generatedSessionSchemaVersion !== GENERATED_SESSION_SCHEMA_VERSION_V2 || existingPayload.generatedSessionSchemaVersion !== GENERATED_SESSION_SCHEMA_VERSION_V2) {
    return;
  }
  const nextContentFingerprint = trimmedStringValue(nextPayload.contentFingerprint);
  const existingContentFingerprint = trimmedStringValue(existingPayload.contentFingerprint);
  if (nextContentFingerprint && existingContentFingerprint && nextContentFingerprint !== existingContentFingerprint) {
    throw new RepositoryError(
      "malformed_payload",
      "generated_training_sessions.upsertGeneratedSessions.immutableContent",
      "generated workout content is immutable for an existing generated-session slot; create a new plan revision or supersede the old session"
    );
  }
}

function generatedSessionScheduleAuditUpdate(
  record: TableInsert<"generated_training_sessions">,
  existing: GeneratedSessionSlotRow
): TableUpdate<"generated_training_sessions"> {
  const existingPayload = payloadObject(existing.session_payload, "generated_training_sessions.preserveMoved.existing");
  const nextPayload = payloadObject(record.session_payload ?? toJson({}), "generated_training_sessions.preserveMoved.next");
  const preserveMovedDate = existing.generated_session_lifecycle === "moved" && record.generated_session_lifecycle === "active";
  const lifecycle = preserveMovedDate ? "moved" : record.generated_session_lifecycle ?? existing.generated_session_lifecycle;
  const currentScheduledDate =
    (preserveMovedDate
      ? existing.current_scheduled_date ?? (typeof existingPayload.currentScheduledDate === "string" ? existingPayload.currentScheduledDate : null)
      : null) ??
    record.current_scheduled_date ??
    record.planned_date;
  return {
    planned_date: record.planned_date,
    ...(record.original_planned_date === undefined ? {} : { original_planned_date: record.original_planned_date }),
    current_scheduled_date: currentScheduledDate,
    generated_session_lifecycle: lifecycle,
    session_payload: toJson({
      ...existingPayload,
      date: currentScheduledDate,
      currentScheduledDate,
      generatedSessionLifecycle: lifecycle,
      inputHash: nextPayload.inputHash ?? existingPayload.inputHash,
      outputHash: nextPayload.outputHash ?? existingPayload.outputHash,
      projectionSource: "engine_projection",
      ...(preserveMovedDate ? { movedDatePreservedBySlotReconciliation: true } : {})
    })
  };
}

export function mapGeneratedSessionToRow(
  userId: string,
  engineVersion: string,
  session: GeneratedTrainingSession,
  inputHash: string,
  outputHash: string,
  metadata: Record<string, unknown> = {}
): TableInsert<"generated_training_sessions"> {
  const baseSession = baseGeneratedSessionForPersistence(session);
  const generatedSessionKey = generatedTrainingSessionKey(baseSession);
  const trainingBlockId = typeof metadata.trainingBlockId === "string" ? metadata.trainingBlockId : baseSession.trainingBlockId;
  return {
    user_id: userId,
    planned_date: baseSession.originalPlannedDate ?? baseSession.date,
    original_planned_date: baseSession.originalPlannedDate ?? baseSession.date,
    current_scheduled_date: baseSession.currentScheduledDate ?? baseSession.date,
    plan_revision_id: baseSession.planRevisionId ?? null,
    week_id: baseSession.weekId ?? null,
    week_index: baseSession.weekIndex ?? null,
    prescription_slot_id: baseSession.prescriptionSlotId ?? null,
    generated_session_lifecycle: baseSession.generatedSessionLifecycle ?? "active",
    generated_session_key: generatedSessionKey,
    session_payload: toJson({
      ...baseSession,
      generatedSessionKey,
      inputHash,
      outputHash,
      projectionSource: "engine_projection",
      ...(trainingBlockId ? { trainingBlockId } : {}),
      ...metadata
    }),
    engine_version: engineVersion,
    block_id: trainingBlockId ?? null
  };
}

export function createEngineRunRepository(client: CornerSupabaseClient) {
  const repository = {
    async listActiveRiskFlags(userId: string, options: ListActiveRiskFlagsOptions = {}): Promise<RiskFlag[]> {
      const safeUserId = assertUserId(userId, "risk_flags.listActiveRiskFlags");
      const response = await client
        .from("risk_flags")
        .select("id, domain, code, severity, status, flag_payload")
        .eq("user_id", safeUserId)
        .eq("status", "active")
        .order("severity", { ascending: false });
      return readDataOrThrow(response, "risk_flags.listActiveRiskFlags")
        .map((row) => {
          const payload = payloadObject(row.flag_payload, "risk_flags.flag_payload");
          return { flag: mapRiskFlagRow(row), payload };
        })
        .filter(({ flag, payload }) => !options.asOfDate || riskFlagPayloadIsCurrentForDate(flag, payload, options.asOfDate))
        .map(({ flag }) => flag);
    },

    async upsertRun(record: TableInsert<"engine_runs">): Promise<{ id: string }> {
      assertUserId(record.user_id, "engine_runs.upsertRun");
      const response = await client
        .from("engine_runs")
        .upsert(record, { onConflict: "user_id,as_of_date,engine_version,input_hash" })
        .select("id")
        .single();
      return readDataOrThrow(response, "engine_runs.upsertRun");
    },

    async saveDecisionTracesForRun(userId: string, engineRunId: string, records: readonly TableInsert<"decision_traces">[]): Promise<void> {
      const safeUserId = assertUserId(userId, "decision_traces.saveDecisionTracesForRun");
      records.forEach((record) => {
        assertUserId(record.user_id, "decision_traces.saveDecisionTracesForRun");
        if (record.engine_run_id !== engineRunId) {
          throw new Error("decision_traces.saveDecisionTracesForRun: trace engine_run_id must match the persisted engine run");
        }
      });
      const deleteResponse = await client.from("decision_traces").delete().eq("user_id", safeUserId).eq("engine_run_id", engineRunId);
      readDataOrThrow({ data: [], error: deleteResponse.error }, "decision_traces.saveDecisionTracesForRun.deleteExisting");
      if (records.length === 0) {
        return;
      }
      const response = await client.from("decision_traces").insert([...records]);
      readDataOrThrow({ data: response.data ?? [], error: response.error }, "decision_traces.saveDecisionTracesForRun.insert");
    },

    async upsertRiskFlags(records: readonly TableInsert<"risk_flags">[]): Promise<void> {
      if (records.length === 0) {
        return;
      }
      for (const record of records) {
        const safeUserId = assertUserId(record.user_id, "risk_flags.upsertRiskFlags");
        if (record.status === "active") {
          const existingResponse = await client
            .from("risk_flags")
            .select("id")
            .eq("user_id", safeUserId)
            .eq("domain", record.domain)
            .eq("code", record.code)
            .eq("status", record.status)
            .limit(1)
            .maybeSingle();
          const existing = readMaybeDataOrThrow(existingResponse, "risk_flags.upsertRiskFlags.findExisting");
          if (existing) {
            const updateResponse = await client
              .from("risk_flags")
              .update({
                severity: record.severity,
                flag_payload: record.flag_payload ?? toJson({})
              })
              .eq("id", existing.id)
              .select("id")
              .single();
            readDataOrThrow(updateResponse, "risk_flags.upsertRiskFlags.updateExisting");
            continue;
          }
        }

        const insertResponse = await client.from("risk_flags").insert(record).select("id").single();
        readDataOrThrow(insertResponse, "risk_flags.upsertRiskFlags.insert");
      }
    },

    async syncEngineRiskFlags(
      userId: string,
      records: readonly TableInsert<"risk_flags">[],
      input: { asOfDate: ISODateString; inputHash: string }
    ): Promise<void> {
      const safeUserId = assertUserId(userId, "risk_flags.syncEngineRiskFlags");
      records.forEach((record) => assertUserId(record.user_id, "risk_flags.syncEngineRiskFlags"));
      await repository.upsertRiskFlags(records);

      const currentKeys = new Set(records.map(riskFlagPersistenceKey));
      const activeResponse = await client
        .from("risk_flags")
        .select("id, domain, code, flag_payload")
        .eq("user_id", safeUserId)
        .eq("status", "active")
        .filter("flag_payload->>projectionSource", "eq", "engine_projection");
      const activeRows: ActiveEngineRiskFlagRow[] = readDataOrThrow(activeResponse, "risk_flags.syncEngineRiskFlags.listActiveEngineFlags");
      for (const row of activeRows) {
        if (currentKeys.has(riskFlagPersistenceKey(row))) {
          continue;
        }
        const payload = payloadObject(row.flag_payload, "risk_flags.flag_payload");
        const updateResponse = await client
          .from("risk_flags")
          .update({
            status: "resolved",
            flag_payload: toJson({
              ...payload,
              projectionSource: "engine_projection",
              lifecycleStatus: "resolved_by_engine_projection",
              resolvedAsOfDate: input.asOfDate,
              resolvedByInputHash: input.inputHash,
              activeUntil: input.asOfDate
            })
          })
          .eq("id", row.id)
          .eq("user_id", safeUserId)
          .select("id")
          .single();
        readDataOrThrow(updateResponse, "risk_flags.syncEngineRiskFlags.resolveStale");
      }
    },

    async upsertNutritionTarget(record: TableInsert<"nutrition_targets">): Promise<void> {
      assertUserId(record.user_id, "nutrition_targets.upsertNutritionTarget");
      const response = await client.from("nutrition_targets").upsert(record, { onConflict: "user_id,target_date,engine_version" });
      readDataOrThrow({ data: response.data ?? [], error: response.error }, "nutrition_targets.upsertNutritionTarget");
    },

    async upsertGeneratedSessions(records: readonly TableInsert<"generated_training_sessions">[]): Promise<void> {
      if (records.length === 0) {
        return;
      }
      records.forEach((record) => {
        assertUserId(record.user_id, "generated_training_sessions.upsertGeneratedSessions");
        assertV2GeneratedSessionAuthority(record);
      });
      const legacyRecords: TableInsert<"generated_training_sessions">[] = [];
      for (const record of records) {
        if (!record.prescription_slot_id) {
          legacyRecords.push(record);
          continue;
        }
        const planRevisionId = typeof record.plan_revision_id === "string" && record.plan_revision_id.trim().length > 0 ? record.plan_revision_id : null;
        const blockId = typeof record.block_id === "string" && record.block_id.trim().length > 0 ? record.block_id : null;
        const weekId = typeof record.week_id === "string" && record.week_id.trim().length > 0 ? record.week_id : null;
        if (!planRevisionId || !blockId || !weekId) {
          throw new RepositoryError(
            "missing_required_data",
            "generated_training_sessions.upsertGeneratedSessions.findExistingSlot",
            "plan_revision_id, block_id, and week_id are required for generated-session slot reconciliation"
          );
        }
        const existingResponse = await client
          .from("generated_training_sessions")
          .select("id, current_scheduled_date, generated_session_lifecycle, session_payload")
          .eq("user_id", record.user_id)
          .eq("engine_version", record.engine_version)
          .eq("plan_revision_id", planRevisionId)
          .eq("block_id", blockId)
          .eq("week_id", weekId)
          .eq("prescription_slot_id", record.prescription_slot_id)
          .in("generated_session_lifecycle", RECONCILED_GENERATED_SESSION_LIFECYCLES)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const existing = readMaybeDataOrThrow(existingResponse, "generated_training_sessions.upsertGeneratedSessions.findExistingSlot");
        if (existing?.generated_session_lifecycle === "completed" || existing?.generated_session_lifecycle === "skipped") {
          continue;
        }
        if (existing) {
          assertGeneratedContentNotMutated(record, existing);
          const update = generatedSessionScheduleAuditUpdate(record, existing);
          const updateResponse = await client
            .from("generated_training_sessions")
            .update(update)
            .eq("id", existing.id)
            .eq("user_id", record.user_id)
            .select("id")
            .single();
          readDataOrThrow(updateResponse, "generated_training_sessions.upsertGeneratedSessions.updateSlot");
          continue;
        }
        const insertResponse = await client.from("generated_training_sessions").insert(record).select("id").single();
        readDataOrThrow(insertResponse, "generated_training_sessions.upsertGeneratedSessions.insertSlot");
      }
      if (legacyRecords.length > 0) {
        const response = await client
          .from("generated_training_sessions")
          .upsert(legacyRecords, { onConflict: "user_id,planned_date,engine_version,generated_session_key" });
        readDataOrThrow({ data: response.data ?? [], error: response.error }, "generated_training_sessions.upsertGeneratedSessions.legacyUpsert");
      }
    }
  };
  return repository;
}
