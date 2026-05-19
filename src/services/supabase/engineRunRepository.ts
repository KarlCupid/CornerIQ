import { RiskFlagSchema } from "../../engine/core/schemas";
import type { DecisionTrace, GeneratedTrainingSession, PerformanceState, RiskFlag } from "../../engine/core/types";
import type { CornerSupabaseClient } from "./client";
import type { TableInsert, TableRow } from "./repositoryTypes";
import { assertUserId, parseWithSchema, payloadObject, readDataOrThrow, toJson } from "./repositoryTypes";

export type RiskFlagRow = Pick<TableRow<"risk_flags">, "id" | "domain" | "code" | "severity" | "status" | "flag_payload">;

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

export function mapDecisionTraceToRow(userId: string, trace: DecisionTrace): TableInsert<"decision_traces"> {
  return {
    user_id: userId,
    engine: trace.engine,
    step: trace.step,
    trace_payload: toJson(trace)
  };
}

export function mapRiskFlagToRow(userId: string, flag: RiskFlag): TableInsert<"risk_flags"> {
  return {
    user_id: userId,
    domain: flag.domain,
    code: flag.code,
    severity: flag.severity,
    status: flag.status,
    flag_payload: toJson(flag)
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

export function mapNutritionTargetToRow(userId: string, state: PerformanceState): TableInsert<"nutrition_targets"> {
  return {
    user_id: userId,
    target_date: state.asOfDate,
    target_payload: toJson({
      nutrition: state.nutrition,
      hydration: state.hydration,
      engineVersion: state.engineVersion,
      outputHash: state.outputHash
    }),
    engine_version: state.engineVersion
  };
}

export function mapGeneratedSessionToRow(userId: string, engineVersion: string, session: GeneratedTrainingSession): TableInsert<"generated_training_sessions"> {
  return {
    user_id: userId,
    planned_date: session.date,
    session_payload: toJson(session),
    engine_version: engineVersion,
    block_id: null
  };
}

export function createEngineRunRepository(client: CornerSupabaseClient) {
  return {
    async listActiveRiskFlags(userId: string): Promise<RiskFlag[]> {
      const safeUserId = assertUserId(userId, "risk_flags.listActiveRiskFlags");
      const response = await client
        .from("risk_flags")
        .select("id, domain, code, severity, status, flag_payload")
        .eq("user_id", safeUserId)
        .eq("status", "active")
        .order("severity", { ascending: false });
      return readDataOrThrow(response, "risk_flags.listActiveRiskFlags").map(mapRiskFlagRow);
    },

    async saveRun(record: TableInsert<"engine_runs">): Promise<{ id: string }> {
      assertUserId(record.user_id, "engine_runs.saveRun");
      const response = await client.from("engine_runs").insert(record).select("id").single();
      return readDataOrThrow(response, "engine_runs.saveRun");
    },

    async saveDecisionTraces(records: readonly TableInsert<"decision_traces">[]): Promise<void> {
      if (records.length === 0) {
        return;
      }
      records.forEach((record) => assertUserId(record.user_id, "decision_traces.saveDecisionTraces"));
      const response = await client.from("decision_traces").insert([...records]);
      readDataOrThrow({ data: response.data ?? [], error: response.error }, "decision_traces.saveDecisionTraces");
    },

    async saveRiskFlags(records: readonly TableInsert<"risk_flags">[]): Promise<void> {
      if (records.length === 0) {
        return;
      }
      records.forEach((record) => assertUserId(record.user_id, "risk_flags.saveRiskFlags"));
      const response = await client.from("risk_flags").insert([...records]);
      readDataOrThrow({ data: response.data ?? [], error: response.error }, "risk_flags.saveRiskFlags");
    },

    async saveNutritionTarget(record: TableInsert<"nutrition_targets">): Promise<void> {
      assertUserId(record.user_id, "nutrition_targets.saveNutritionTarget");
      const response = await client.from("nutrition_targets").insert(record);
      readDataOrThrow({ data: response.data ?? [], error: response.error }, "nutrition_targets.saveNutritionTarget");
    },

    async saveGeneratedSessions(records: readonly TableInsert<"generated_training_sessions">[]): Promise<void> {
      if (records.length === 0) {
        return;
      }
      records.forEach((record) => assertUserId(record.user_id, "generated_training_sessions.saveGeneratedSessions"));
      const response = await client.from("generated_training_sessions").insert([...records]);
      readDataOrThrow({ data: response.data ?? [], error: response.error }, "generated_training_sessions.saveGeneratedSessions");
    }
  };
}
