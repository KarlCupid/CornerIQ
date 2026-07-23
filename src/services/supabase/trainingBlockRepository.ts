import { TrainingBlockSchema, TrainingDayPlanSchema, TrainingMicrocycleSchema } from "../../engine/core/schemas";
import type { ISODateString, TrainingBlock, TrainingDayPlan, TrainingMicrocycle } from "../../engine/core/types";
import {
  PersistedTrainingPlanAdjustmentSchema,
  TrainingPlanAdjustmentCommandSchema,
  TrainingPlanAdjustmentResultSchema,
  planDateForAdjustment,
  type PersistedTrainingPlanAdjustment,
  type PersistedTrainingPlanAdjustmentStatus,
  type TrainingPlanAdjustmentCommand,
  type TrainingPlanAdjustmentResult
} from "../../engine/training/planAdjustmentTypes";
import type { CornerSupabaseClient } from "./client";
import type { TableInsert, TableRow } from "./repositoryTypes";
import { assertUserId, isoDateTimeValue, parseWithSchema, payloadObject, readDataOrThrow, toJson } from "./repositoryTypes";

export type TrainingBlockStatus = "active" | "superseded" | "completed" | "canceled";
export type TrainingBlockLifecycle = "created" | "updated" | "superseded_previous";

export interface PersistedTrainingBlock {
  id: string;
  userId: string;
  blockKey: string;
  status: TrainingBlockStatus;
  planRevisionId?: string | undefined;
  inputHash: string;
  outputHash: string;
  block: TrainingBlock;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertActiveTrainingBlockInput {
  userId: string;
  block: TrainingBlock;
  inputHash: string;
  outputHash: string;
}

export interface UpsertActiveTrainingBlockResult {
  id: string;
  blockKey: string;
  lifecycle: TrainingBlockLifecycle;
}

export interface UpsertTrainingMicrocycleInput {
  userId: string;
  trainingBlockId: string;
  microcycle: TrainingMicrocycle;
  weekIndex: number;
}

export interface UpsertTrainingDayPlansInput {
  userId: string;
  trainingBlockId: string;
  trainingMicrocycleId: string;
  dayPlans: readonly TrainingDayPlan[];
}

export interface InsertTrainingPlanAdjustmentInput {
  userId: string;
  trainingBlockId?: string | null | undefined;
  command: TrainingPlanAdjustmentCommand;
  result: TrainingPlanAdjustmentResult;
}

type TrainingBlockRow = Pick<
  TableRow<"training_blocks">,
  "id" | "user_id" | "block_key" | "status" | "plan_revision_id" | "input_hash" | "output_hash" | "block_payload" | "created_at" | "updated_at"
>;

type TrainingPlanAdjustmentRow = Pick<
  TableRow<"training_plan_adjustments">,
  "id" | "user_id" | "training_block_id" | "plan_date" | "adjustment_type" | "adjustment_payload" | "status" | "engine_response_payload" | "created_at" | "updated_at"
>;

function blockKeyFor(block: TrainingBlock): string {
  if (block.planRevisionId) {
    return `block:${block.athleteId}:${block.planRevisionId}`;
  }
  return `block:${block.athleteId}:${block.startDate}:${block.endDate}`;
}

function statusValue(value: string, context: string): TrainingBlockStatus {
  if (value === "active" || value === "superseded" || value === "completed" || value === "canceled") {
    return value;
  }
  throw new Error(`${context}: unknown training block status ${value}`);
}

function adjustmentStatusValue(value: string, context: string): PersistedTrainingPlanAdjustmentStatus {
  if (value === "requested" || value === "applied" || value === "rejected" || value === "superseded") {
    return value;
  }
  throw new Error(`${context}: unknown training adjustment status ${value}`);
}

export function mapTrainingBlockRow(row: TrainingBlockRow): PersistedTrainingBlock {
  const payload = payloadObject(row.block_payload, "training_blocks.block_payload");
  const createdAt = isoDateTimeValue(row.created_at, "training_blocks.created_at");
  const updatedAt = isoDateTimeValue(row.updated_at, "training_blocks.updated_at");
  return {
    id: row.id,
    userId: row.user_id,
    blockKey: row.block_key,
    status: statusValue(row.status, "training_blocks.status"),
    ...(row.plan_revision_id ? { planRevisionId: row.plan_revision_id } : {}),
    inputHash: row.input_hash,
    outputHash: row.output_hash,
    block: parseWithSchema(
      TrainingBlockSchema,
      {
        ...payload,
        ...(row.plan_revision_id ? { planRevisionId: row.plan_revision_id } : {}),
        recordedAt: createdAt
      },
      "training_blocks.block_payload"
    ),
    createdAt,
    updatedAt
  };
}

export function mapTrainingPlanAdjustmentRow(row: TrainingPlanAdjustmentRow): PersistedTrainingPlanAdjustment {
  const command = parseWithSchema(TrainingPlanAdjustmentCommandSchema, payloadObject(row.adjustment_payload, "training_plan_adjustments.adjustment_payload"), "training_plan_adjustments.command");
  const engineResponse = parseWithSchema(
    TrainingPlanAdjustmentResultSchema,
    payloadObject(row.engine_response_payload, "training_plan_adjustments.engine_response_payload"),
    "training_plan_adjustments.engine_response"
  );
  return parseWithSchema(
    PersistedTrainingPlanAdjustmentSchema,
    {
      id: row.id,
      userId: row.user_id,
      trainingBlockId: row.training_block_id,
      planDate: row.plan_date,
      adjustmentType: row.adjustment_type,
      command,
      status: adjustmentStatusValue(row.status, "training_plan_adjustments.status"),
      engineResponse,
      createdAt: isoDateTimeValue(row.created_at, "training_plan_adjustments.created_at"),
      updatedAt: isoDateTimeValue(row.updated_at, "training_plan_adjustments.updated_at")
    },
    "training_plan_adjustments"
  );
}

function blockInsert(input: UpsertActiveTrainingBlockInput, blockKey: string): TableInsert<"training_blocks"> {
  const block = parseWithSchema(TrainingBlockSchema, input.block, "training_blocks.upsertActiveTrainingBlock.block");
  const safeUserId = assertUserId(input.userId, "training_blocks.upsertActiveTrainingBlock");
  return {
    user_id: safeUserId,
    athlete_id: block.athleteId,
    block_key: blockKey,
    block_phase: block.phase,
    primary_goal: block.primaryGoal,
    plan_revision_id: block.planRevisionId ?? null,
    start_date: block.startDate,
    end_date: block.endDate,
    linked_fight_id: block.linkedFightId ?? null,
    linked_tournament_id: block.linkedTournamentId ?? null,
    engine_version: block.engineVersion,
    input_hash: input.inputHash,
    output_hash: input.outputHash,
    status: "active",
    block_payload: toJson({
      ...block,
      blockKey,
      planRevisionId: block.planRevisionId,
      inputHash: input.inputHash,
      outputHash: input.outputHash,
      projectionSource: "engine_training_block"
    }),
    created_by: block.createdBy
  };
}

export function createTrainingBlockRepository(client: CornerSupabaseClient) {
  return {
    async upsertActiveTrainingBlock(input: UpsertActiveTrainingBlockInput): Promise<UpsertActiveTrainingBlockResult> {
      const safeUserId = assertUserId(input.userId, "training_blocks.upsertActiveTrainingBlock");
      const block = parseWithSchema(TrainingBlockSchema, input.block, "training_blocks.upsertActiveTrainingBlock.block");
      const blockKey = blockKeyFor(block);
      const record = blockInsert({ ...input, userId: safeUserId, block }, blockKey);
      const existingResponse = await client
        .from("training_blocks")
        .select("id, input_hash, output_hash")
        .eq("user_id", safeUserId)
        .eq("block_key", blockKey)
        .eq("status", "active")
        .order("updated_at", { ascending: false });
      const existingRows = readDataOrThrow(existingResponse, "training_blocks.upsertActiveTrainingBlock.findExisting");
      if (existingRows.length > 1) {
        throw new Error("training_blocks.upsertActiveTrainingBlock: multiple active blocks share the same revision key");
      }
      const existing = existingRows[0];

      if (existing) {
        const updateResponse = await client.from("training_blocks").update(record).eq("id", existing.id).eq("user_id", safeUserId).select("id").single();
        const updated = readDataOrThrow(updateResponse, "training_blocks.upsertActiveTrainingBlock.updateActiveBlock");
        return { id: updated.id, blockKey, lifecycle: "updated" };
      }

      const response = await client.from("training_blocks").insert(record).select("id").single();
      const inserted = readDataOrThrow(response, "training_blocks.upsertActiveTrainingBlock.insert");
      const supersededResponse = await client
        .from("training_blocks")
        .update({ status: "superseded", superseded_at: new Date().toISOString(), superseded_by: inserted.id })
        .eq("user_id", safeUserId)
        .eq("status", "active")
        .neq("id", inserted.id)
        .select("id");
      const superseded = readDataOrThrow(supersededResponse, "training_blocks.upsertActiveTrainingBlock.supersedePreviousActive");
      return { id: inserted.id, blockKey, lifecycle: superseded.length > 0 ? "superseded_previous" : "created" };
    },

    async upsertTrainingMicrocycle(input: UpsertTrainingMicrocycleInput): Promise<{ id: string }> {
      const safeUserId = assertUserId(input.userId, "training_microcycles.upsertTrainingMicrocycle");
      const microcycle = parseWithSchema(TrainingMicrocycleSchema, input.microcycle, "training_microcycles.upsertTrainingMicrocycle.microcycle");
      const record: TableInsert<"training_microcycles"> = {
        user_id: safeUserId,
        training_block_id: input.trainingBlockId,
        week_start_date: microcycle.weekStartDate,
        week_end_date: microcycle.weekEndDate,
        week_index: input.weekIndex,
        hard_day_cap: microcycle.hardDayCap,
        planned_hard_days: microcycle.plannedHardDays,
        microcycle_payload: toJson({
          ...microcycle,
          weekIndex: input.weekIndex,
          projectionSource: "engine_training_microcycle"
        })
      };
      const response = await client
        .from("training_microcycles")
        .upsert(record, { onConflict: "user_id,training_block_id,week_start_date" })
        .select("id")
        .single();
      return readDataOrThrow(response, "training_microcycles.upsertTrainingMicrocycle");
    },

    async upsertTrainingDayPlans(input: UpsertTrainingDayPlansInput): Promise<{ ids: readonly string[] }> {
      const safeUserId = assertUserId(input.userId, "training_day_plans.upsertTrainingDayPlans");
      const records: TableInsert<"training_day_plans">[] = input.dayPlans.map((dayPlan) => {
        const day = parseWithSchema(TrainingDayPlanSchema, dayPlan, "training_day_plans.upsertTrainingDayPlans.dayPlan");
        return {
          user_id: safeUserId,
          training_block_id: input.trainingBlockId,
          training_microcycle_id: input.trainingMicrocycleId,
          plan_date: day.date,
          role: day.role,
          hard_day: day.hardDay,
          recovery_priority: day.recoveryPriority,
          fuel_demand: day.fuelDemand,
          day_payload: toJson({
            ...day,
            projectionSource: "engine_training_day_plan"
          })
        };
      });
      if (records.length === 0) {
        return { ids: [] };
      }
      const response = await client
        .from("training_day_plans")
        .upsert(records, { onConflict: "user_id,training_block_id,plan_date" })
        .select("id");
      const rows = readDataOrThrow(response, "training_day_plans.upsertTrainingDayPlans");
      return { ids: rows.map((row) => row.id) };
    },

    async listActiveTrainingBlocks(userId: string): Promise<PersistedTrainingBlock[]> {
      const safeUserId = assertUserId(userId, "training_blocks.listActiveTrainingBlocks");
      const response = await client
        .from("training_blocks")
        .select("id, user_id, block_key, status, plan_revision_id, input_hash, output_hash, block_payload, created_at, updated_at")
        .eq("user_id", safeUserId)
        .eq("status", "active")
        .order("start_date", { ascending: true });
      return readDataOrThrow(response, "training_blocks.listActiveTrainingBlocks").map(mapTrainingBlockRow);
    },

    async getActiveTrainingBlockForDate(userId: string, asOfDate: ISODateString, planRevisionId?: string | undefined): Promise<PersistedTrainingBlock | null> {
      const safeUserId = assertUserId(userId, "training_blocks.getActiveTrainingBlockForDate");
      const query = client
        .from("training_blocks")
        .select("id, user_id, block_key, status, plan_revision_id, input_hash, output_hash, block_payload, created_at, updated_at")
        .eq("user_id", safeUserId)
        .eq("status", "active")
        .lte("start_date", asOfDate)
        .gte("end_date", asOfDate);
      const scopedQuery = planRevisionId ? query.eq("plan_revision_id", planRevisionId) : query;
      const response = await scopedQuery
        .order("created_at", { ascending: false })
        .limit(2);
      const rows = readDataOrThrow(response, "training_blocks.getActiveTrainingBlockForDate");
      if (rows.length > 1) {
        throw new Error("training_blocks.getActiveTrainingBlockForDate: multiple active blocks match the active plan revision");
      }
      return rows[0] ? mapTrainingBlockRow(rows[0]) : null;
    },

    async supersedeActiveTrainingBlocks(userId: string, blockKey: string, supersededById: string): Promise<{ ids: readonly string[] }> {
      const safeUserId = assertUserId(userId, "training_blocks.supersedeActiveTrainingBlocks");
      const response = await client
        .from("training_blocks")
        .update({ status: "superseded", superseded_at: new Date().toISOString(), superseded_by: supersededById })
        .eq("user_id", safeUserId)
        .eq("block_key", blockKey)
        .eq("status", "active")
        .neq("id", supersededById)
        .select("id");
      const rows = readDataOrThrow(response, "training_blocks.supersedeActiveTrainingBlocks");
      return { ids: rows.map((row) => row.id) };
    },

    async supersedeActiveTrainingBlock(userId: string, trainingBlockId: string): Promise<{ ids: readonly string[] }> {
      const safeUserId = assertUserId(userId, "training_blocks.supersedeActiveTrainingBlock");
      const response = await client
        .from("training_blocks")
        .update({ status: "superseded", superseded_at: new Date().toISOString(), superseded_by: null })
        .eq("user_id", safeUserId)
        .eq("id", trainingBlockId)
        .eq("status", "active")
        .select("id");
      const rows = readDataOrThrow(response, "training_blocks.supersedeActiveTrainingBlock");
      return { ids: rows.map((row) => row.id) };
    },

    async listTrainingPlanAdjustments(userId: string, trainingBlockId: string | null = null): Promise<PersistedTrainingPlanAdjustment[]> {
      const safeUserId = assertUserId(userId, "training_plan_adjustments.listTrainingPlanAdjustments");
      const query = client
        .from("training_plan_adjustments")
        .select("id, user_id, training_block_id, plan_date, adjustment_type, adjustment_payload, status, engine_response_payload, created_at, updated_at")
        .eq("user_id", safeUserId)
        .order("created_at", { ascending: true });
      const response = trainingBlockId ? await query.eq("training_block_id", trainingBlockId) : await query;
      return readDataOrThrow(response, "training_plan_adjustments.listTrainingPlanAdjustments").map(mapTrainingPlanAdjustmentRow);
    },

    async insertTrainingPlanAdjustment(input: InsertTrainingPlanAdjustmentInput): Promise<{ id: string }> {
      const safeUserId = assertUserId(input.userId, "training_plan_adjustments.insertTrainingPlanAdjustment");
      const command = parseWithSchema(TrainingPlanAdjustmentCommandSchema, input.command, "training_plan_adjustments.insertTrainingPlanAdjustment.command");
      const engineResponse = parseWithSchema(TrainingPlanAdjustmentResultSchema, input.result, "training_plan_adjustments.insertTrainingPlanAdjustment.result");
      const status: PersistedTrainingPlanAdjustmentStatus =
        engineResponse.status === "applied" ? "applied" : engineResponse.status === "rejected" ? "rejected" : "requested";
      const record: TableInsert<"training_plan_adjustments"> = {
        user_id: safeUserId,
        training_block_id: input.trainingBlockId ?? null,
        plan_date: planDateForAdjustment(command),
        adjustment_type: command.type,
        adjustment_payload: toJson(command),
        status,
        engine_response_payload: toJson(engineResponse)
      };
      const response = await client.from("training_plan_adjustments").insert(record).select("id").single();
      return readDataOrThrow(response, "training_plan_adjustments.insertTrainingPlanAdjustment");
    },

    async supersedeTrainingPlanAdjustments(userId: string, trainingBlockId: string | null, planDate: ISODateString | null): Promise<{ ids: readonly string[] }> {
      const safeUserId = assertUserId(userId, "training_plan_adjustments.supersedeTrainingPlanAdjustments");
      const query = client
        .from("training_plan_adjustments")
        .update({ status: "superseded" })
        .eq("user_id", safeUserId)
        .in("status", ["requested", "applied"])
        .neq("adjustment_type", "restore_engine_plan");
      const scopedByBlock = trainingBlockId ? query.eq("training_block_id", trainingBlockId) : query.is("training_block_id", null);
      const scopedByDate = planDate ? scopedByBlock.eq("plan_date", planDate) : scopedByBlock;
      const response = await scopedByDate.select("id");
      const rows = readDataOrThrow(response, "training_plan_adjustments.supersedeTrainingPlanAdjustments");
      return { ids: rows.map((row) => row.id) };
    }
  };
}
