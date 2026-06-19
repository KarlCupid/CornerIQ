import {
  TrainingBlockTimelineEventSchema,
  TrainingProgressionDecisionSchema,
  TrainingWeekSummarySchema,
  type TrainingBlockTimelineEvent,
  type TrainingProgressionDecision,
  type TrainingProgressionDecisionValue,
  type TrainingWeekSummary
} from "../../engine/training/trainingBlockHistoryTypes";
import type { CornerSupabaseClient } from "./client";
import type { TableInsert, TableRow } from "./repositoryTypes";
import { assertUserId, numericValue, parseWithSchema, payloadObject, readDataOrThrow, readMaybeDataOrThrow, toJson } from "./repositoryTypes";

export interface UpsertTrainingWeekSummaryInput {
  userId: string;
  trainingBlockId: string;
  trainingMicrocycleId?: string | null | undefined;
  summary: TrainingWeekSummary;
}

export interface InsertTrainingProgressionDecisionInput {
  userId: string;
  trainingBlockId: string;
  weekSummaryId?: string | null | undefined;
  weekIndex: number;
  decision: TrainingProgressionDecision;
  engineVersion: string;
  inputHash: string;
  outputHash: string;
}

export interface InsertTrainingBlockTimelineEventInput {
  userId: string;
  trainingBlockId: string | null;
  event: TrainingBlockTimelineEvent;
}

type TrainingWeekSummaryRow = Pick<
  TableRow<"training_week_summaries">,
  | "id"
  | "training_block_id"
  | "week_start_date"
  | "week_end_date"
  | "week_index"
  | "completion_count"
  | "skipped_count"
  | "prescribed_only_count"
  | "partial_result_count"
  | "completed_result_count"
  | "pain_flag_count"
  | "average_session_rpe"
  | "average_exercise_rpe"
  | "hard_days_completed"
  | "protected_anchor_count"
  | "generated_support_count"
  | "underfueling_flag"
  | "high_cycle_symptom_flag"
  | "safety_flag_count"
  | "summary_payload"
  | "summary_lifecycle"
  | "summary_generated_at"
  | "finalized_at"
  | "plan_revision_id"
>;

type TrainingProgressionDecisionRow = Pick<
  TableRow<"training_progression_decisions">,
  "week_index" | "decision" | "reason" | "next_week_phase" | "decision_payload" | "created_at" | "decision_lifecycle" | "plan_revision_id" | "generated_at"
>;

type TrainingBlockTimelineEventRow = Pick<TableRow<"training_block_timeline_events">, "event_type" | "event_date" | "event_payload">;

function decisionValue(value: string, context: string): TrainingProgressionDecisionValue {
  if (value === "progress" || value === "repeat" || value === "regress" || value === "deload" || value === "taper" || value === "recovery" || value === "coach_review" || value === "hold") {
    return value;
  }
  throw new Error(`${context}: unknown progression decision ${value}`);
}

export function mapTrainingWeekSummaryRow(row: TrainingWeekSummaryRow): TrainingWeekSummary {
  const payload = payloadObject(row.summary_payload, "training_week_summaries.summary_payload");
  return parseWithSchema(
    TrainingWeekSummarySchema,
    {
      blockId: row.training_block_id,
      weekIndex: row.week_index,
      weekStartDate: row.week_start_date,
      weekEndDate: row.week_end_date,
      completionCount: row.completion_count,
      skippedCount: row.skipped_count,
      prescribedOnlyCount: row.prescribed_only_count,
      partialResultCount: row.partial_result_count,
      completedResultCount: row.completed_result_count,
      painFlagCount: row.pain_flag_count,
      averageSessionRpe: row.average_session_rpe === null ? null : numericValue(row.average_session_rpe, "training_week_summaries.average_session_rpe"),
      averageExerciseRpe: row.average_exercise_rpe === null ? null : numericValue(row.average_exercise_rpe, "training_week_summaries.average_exercise_rpe"),
      hardDaysCompleted: row.hard_days_completed,
      protectedAnchorCount: row.protected_anchor_count,
      generatedSupportCount: row.generated_support_count,
      underfuelingFlag: row.underfueling_flag,
      highCycleSymptomFlag: row.high_cycle_symptom_flag,
      safetyFlagCount: row.safety_flag_count,
      summary: typeof payload.summary === "string" ? payload.summary : "Week summary persisted without display copy.",
      reasons: Array.isArray(payload.reasons) ? payload.reasons.filter((reason): reason is string => typeof reason === "string") : [],
      lifecycle: row.summary_lifecycle ?? (typeof payload.lifecycle === "string" ? payload.lifecycle : "final"),
      generatedAt: row.summary_generated_at ?? (typeof payload.generatedAt === "string" ? payload.generatedAt : row.finalized_at ?? undefined),
      finalizedAt: row.finalized_at ?? (typeof payload.finalizedAt === "string" ? payload.finalizedAt : null),
      ...(row.plan_revision_id ?? (typeof payload.planRevisionId === "string" ? payload.planRevisionId : null) ? { planRevisionId: row.plan_revision_id ?? (payload.planRevisionId as string) } : {})
    },
    "training_week_summaries"
  );
}

export function mapTrainingProgressionDecisionRow(row: TrainingProgressionDecisionRow): TrainingProgressionDecision {
  const payload = payloadObject(row.decision_payload, "training_progression_decisions.decision_payload");
  return parseWithSchema(
    TrainingProgressionDecisionSchema,
    {
      weekIndex: row.week_index,
      decision: decisionValue(row.decision, "training_progression_decisions.decision"),
      reason: row.reason,
      nextWeekPhase: row.next_week_phase,
      confidence: payload.confidence,
      safetyFlags: Array.isArray(payload.safetyFlags) ? payload.safetyFlags : [],
      generatedAt: row.generated_at ?? (typeof payload.generatedAt === "string" ? payload.generatedAt : row.created_at),
      decisionLifecycle: row.decision_lifecycle ?? (typeof payload.decisionLifecycle === "string" ? payload.decisionLifecycle : "final"),
      ...(row.plan_revision_id ?? (typeof payload.planRevisionId === "string" ? payload.planRevisionId : null) ? { planRevisionId: row.plan_revision_id ?? (payload.planRevisionId as string) } : {})
    },
    "training_progression_decisions"
  );
}

export function mapTrainingBlockTimelineEventRow(row: TrainingBlockTimelineEventRow): TrainingBlockTimelineEvent {
  const payload = payloadObject(row.event_payload, "training_block_timeline_events.event_payload");
  return parseWithSchema(
    TrainingBlockTimelineEventSchema,
    {
      eventType: row.event_type,
      eventDate: row.event_date,
      title: typeof payload.title === "string" ? payload.title : row.event_type.replaceAll("_", " "),
      summary: typeof payload.summary === "string" ? payload.summary : "Timeline event persisted.",
      payload
    },
    "training_block_timeline_events"
  );
}

export function createTrainingProgressionRepository(client: CornerSupabaseClient) {
  return {
    async upsertTrainingWeekSummary(input: UpsertTrainingWeekSummaryInput): Promise<{ id: string }> {
      const safeUserId = assertUserId(input.userId, "training_week_summaries.upsertTrainingWeekSummary");
      const summary = parseWithSchema(TrainingWeekSummarySchema, input.summary, "training_week_summaries.upsertTrainingWeekSummary.summary");
      const record: TableInsert<"training_week_summaries"> = {
        user_id: safeUserId,
        training_block_id: input.trainingBlockId,
        training_microcycle_id: input.trainingMicrocycleId ?? null,
        week_start_date: summary.weekStartDate,
        week_end_date: summary.weekEndDate,
        week_index: summary.weekIndex,
        completion_count: summary.completionCount,
        skipped_count: summary.skippedCount,
        prescribed_only_count: summary.prescribedOnlyCount,
        partial_result_count: summary.partialResultCount,
        completed_result_count: summary.completedResultCount,
        pain_flag_count: summary.painFlagCount,
        average_session_rpe: summary.averageSessionRpe,
        average_exercise_rpe: summary.averageExerciseRpe,
        hard_days_completed: summary.hardDaysCompleted,
        protected_anchor_count: summary.protectedAnchorCount,
        generated_support_count: summary.generatedSupportCount,
        underfueling_flag: summary.underfuelingFlag,
        high_cycle_symptom_flag: summary.highCycleSymptomFlag,
        safety_flag_count: summary.safetyFlagCount,
        summary_lifecycle: summary.lifecycle ?? "final",
        summary_generated_at: summary.generatedAt ?? null,
        finalized_at: summary.lifecycle === "final" ? summary.finalizedAt ?? summary.generatedAt ?? null : null,
        plan_revision_id: summary.planRevisionId ?? null,
        summary_payload: toJson(summary)
      };
      const response = await client.from("training_week_summaries").upsert(record, { onConflict: "user_id,training_block_id,week_index" }).select("id").single();
      return readDataOrThrow(response, "training_week_summaries.upsertTrainingWeekSummary");
    },

    async listTrainingWeekSummaries(userId: string, trainingBlockId: string): Promise<TrainingWeekSummary[]> {
      const safeUserId = assertUserId(userId, "training_week_summaries.listTrainingWeekSummaries");
      const response = await client
        .from("training_week_summaries")
        .select(
          "id, training_block_id, week_start_date, week_end_date, week_index, completion_count, skipped_count, prescribed_only_count, partial_result_count, completed_result_count, pain_flag_count, average_session_rpe, average_exercise_rpe, hard_days_completed, protected_anchor_count, generated_support_count, underfueling_flag, high_cycle_symptom_flag, safety_flag_count, summary_payload"
            + ", summary_lifecycle, summary_generated_at, finalized_at, plan_revision_id"
        )
        .eq("user_id", safeUserId)
        .eq("training_block_id", trainingBlockId)
        .order("week_index", { ascending: true });
      return readDataOrThrow(response, "training_week_summaries.listTrainingWeekSummaries").map((row) => mapTrainingWeekSummaryRow(row as unknown as TrainingWeekSummaryRow));
    },

    async insertTrainingProgressionDecision(input: InsertTrainingProgressionDecisionInput): Promise<{ id: string }> {
      const safeUserId = assertUserId(input.userId, "training_progression_decisions.insertTrainingProgressionDecision");
      const decision = parseWithSchema(TrainingProgressionDecisionSchema, input.decision, "training_progression_decisions.insertTrainingProgressionDecision.decision");
      const existingResponse = await client
        .from("training_progression_decisions")
        .select("id")
        .eq("user_id", safeUserId)
        .eq("training_block_id", input.trainingBlockId)
        .eq("week_index", input.weekIndex)
        .eq("input_hash", input.inputHash)
        .eq("output_hash", input.outputHash)
        .eq("decision", decision.decision)
        .eq("decision_lifecycle", decision.decisionLifecycle ?? "final")
        .limit(1)
        .maybeSingle();
      const existing = readMaybeDataOrThrow(existingResponse, "training_progression_decisions.insertTrainingProgressionDecision.findExisting");
      if (existing) {
        return { id: existing.id };
      }
      const record: TableInsert<"training_progression_decisions"> = {
        user_id: safeUserId,
        training_block_id: input.trainingBlockId,
        week_summary_id: input.weekSummaryId ?? null,
        week_index: input.weekIndex,
        decision: decision.decision,
        reason: decision.reason,
        next_week_phase: decision.nextWeekPhase,
        engine_version: input.engineVersion,
        input_hash: input.inputHash,
        output_hash: input.outputHash,
        decision_lifecycle: decision.decisionLifecycle ?? "final",
        plan_revision_id: decision.planRevisionId ?? null,
        generated_at: decision.generatedAt,
        decision_payload: toJson(decision)
      };
      const response = await client.from("training_progression_decisions").insert(record).select("id").single();
      return readDataOrThrow(response, "training_progression_decisions.insertTrainingProgressionDecision");
    },

    async listTrainingProgressionDecisions(userId: string, trainingBlockId: string): Promise<TrainingProgressionDecision[]> {
      const safeUserId = assertUserId(userId, "training_progression_decisions.listTrainingProgressionDecisions");
      const response = await client
        .from("training_progression_decisions")
        .select("week_index, decision, reason, next_week_phase, decision_payload, created_at, decision_lifecycle, plan_revision_id, generated_at")
        .eq("user_id", safeUserId)
        .eq("training_block_id", trainingBlockId)
        .order("week_index", { ascending: true })
        .order("generated_at", { ascending: true })
        .order("created_at", { ascending: true });
      return readDataOrThrow(response, "training_progression_decisions.listTrainingProgressionDecisions").map(mapTrainingProgressionDecisionRow);
    },

    async insertTrainingBlockTimelineEvent(input: InsertTrainingBlockTimelineEventInput): Promise<{ id: string }> {
      const safeUserId = assertUserId(input.userId, "training_block_timeline_events.insertTrainingBlockTimelineEvent");
      const event = parseWithSchema(TrainingBlockTimelineEventSchema, input.event, "training_block_timeline_events.insertTrainingBlockTimelineEvent.event");
      const record: TableInsert<"training_block_timeline_events"> = {
        user_id: safeUserId,
        training_block_id: input.trainingBlockId,
        event_type: event.eventType,
        event_date: event.eventDate,
        event_payload: toJson(event)
      };
      const response = await client.from("training_block_timeline_events").insert(record).select("id").single();
      return readDataOrThrow(response, "training_block_timeline_events.insertTrainingBlockTimelineEvent");
    },

    async listTrainingBlockTimelineEvents(userId: string, trainingBlockId: string): Promise<TrainingBlockTimelineEvent[]> {
      const safeUserId = assertUserId(userId, "training_block_timeline_events.listTrainingBlockTimelineEvents");
      const response = await client
        .from("training_block_timeline_events")
        .select("event_type, event_date, event_payload")
        .eq("user_id", safeUserId)
        .eq("training_block_id", trainingBlockId)
        .order("event_date", { ascending: true })
        .order("created_at", { ascending: true });
      return readDataOrThrow(response, "training_block_timeline_events.listTrainingBlockTimelineEvents").map(mapTrainingBlockTimelineEventRow);
    },

    async getLatestWeekIndex(userId: string, trainingBlockId: string): Promise<number> {
      const safeUserId = assertUserId(userId, "training_progression.getLatestWeekIndex");
      const summaryResponse = await client
        .from("training_week_summaries")
        .select("week_index")
        .eq("user_id", safeUserId)
        .eq("training_block_id", trainingBlockId)
        .order("week_index", { ascending: false })
        .limit(1)
        .maybeSingle();
      const decisionResponse = await client
        .from("training_progression_decisions")
        .select("week_index")
        .eq("user_id", safeUserId)
        .eq("training_block_id", trainingBlockId)
        .order("week_index", { ascending: false })
        .limit(1)
        .maybeSingle();
      const summary = readMaybeDataOrThrow(summaryResponse, "training_progression.getLatestWeekIndex.summary");
      const decision = readMaybeDataOrThrow(decisionResponse, "training_progression.getLatestWeekIndex.decision");
      return Math.max(summary?.week_index ?? 0, decision?.week_index ?? 0);
    }
  };
}
