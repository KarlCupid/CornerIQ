import { RiskFlagSchema } from "../../engine/core/schemas";
import type { DecisionTrace, GeneratedTrainingSession, ISODateString, PerformanceState, RiskFlag } from "../../engine/core/types";
import type { CornerSupabaseClient } from "./client";
import type { TableInsert, TableRow } from "./repositoryTypes";
import { assertUserId, parseWithSchema, payloadObject, readDataOrThrow, readMaybeDataOrThrow, toJson } from "./repositoryTypes";

export type RiskFlagRow = Pick<TableRow<"risk_flags">, "id" | "domain" | "code" | "severity" | "status" | "flag_payload">;

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
  return `${session.id}:${session.date}:${session.family}`;
}

export function mapGeneratedSessionToRow(
  userId: string,
  engineVersion: string,
  session: GeneratedTrainingSession,
  inputHash: string,
  outputHash: string,
  metadata: Record<string, unknown> = {}
): TableInsert<"generated_training_sessions"> {
  const generatedSessionKey = generatedTrainingSessionKey(session);
  const trainingBlockId = typeof metadata.trainingBlockId === "string" ? metadata.trainingBlockId : session.trainingBlockId;
  return {
    user_id: userId,
    planned_date: session.date,
    generated_session_key: generatedSessionKey,
    session_payload: toJson({
      ...session,
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
  return {
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
}
