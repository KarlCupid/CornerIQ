import type { SupabaseClient } from "@supabase/supabase-js";
import type { DecisionTrace, PerformanceState } from "../../engine/core/types";

export interface EngineRunInsert {
  user_id: string;
  engine_version: string;
  as_of_date: string;
  input_hash: string;
  output_hash: string;
  run_payload: Record<string, unknown>;
}

export function mapPerformanceStateToEngineRun(userId: string, inputHash: string, state: PerformanceState): EngineRunInsert {
  return {
    user_id: userId,
    engine_version: state.engineVersion,
    as_of_date: state.asOfDate,
    input_hash: inputHash,
    output_hash: state.outputHash,
    run_payload: {
      phase: state.phase.phase,
      confidence: state.confidence.level,
      riskCount: state.safety.riskFlags.length
    }
  };
}

export function mapDecisionTraceToRow(userId: string, trace: DecisionTrace): Record<string, unknown> {
  return {
    user_id: userId,
    engine: trace.engine,
    step: trace.step,
    trace_payload: trace
  };
}

export function createEngineRunRepository(client: SupabaseClient) {
  return {
    saveRun: (record: Record<string, unknown>) => client.from("engine_runs").insert(record).select("id").single(),
    saveDecisionTrace: (records: readonly Record<string, unknown>[]) => client.from("decision_traces").insert(records)
  };
}
