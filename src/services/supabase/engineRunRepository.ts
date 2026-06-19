import { RiskFlagSchema } from "../../engine/core/schemas";
import type { DecisionTrace, GeneratedTrainingSession, ISODateString, PerformanceState, RiskFlag } from "../../engine/core/types";
import type { CornerSupabaseClient } from "./client";
import type { TableInsert, TableRow } from "./repositoryTypes";
import { assertUserId, parseWithSchema, payloadObject, readDataOrThrow, readMaybeDataOrThrow, toJson } from "./repositoryTypes";

export type RiskFlagRow = Pick<TableRow<"risk_flags">, "id" | "domain" | "code" | "severity" | "status" | "flag_payload">;
type ActiveEngineRiskFlagRow = Pick<TableRow<"risk_flags">, "id" | "domain" | "code" | "flag_payload">;

export interface ListActiveRiskFlagsOptions {
  asOfDate?: ISODateString | undefined;
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
      riskCount: state.safety.riskFlags.length
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
      records.forEach((record) => assertUserId(record.user_id, "generated_training_sessions.upsertGeneratedSessions"));
      const response = await client
        .from("generated_training_sessions")
        .upsert([...records], { onConflict: "user_id,planned_date,engine_version,generated_session_key" });
      readDataOrThrow({ data: response.data ?? [], error: response.error }, "generated_training_sessions.upsertGeneratedSessions");
    }
  };
  return repository;
}
