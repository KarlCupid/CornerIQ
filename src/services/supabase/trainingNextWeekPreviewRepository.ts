import {
  NextWeekGeneratedSupportBiasSchema,
  NextWeekTrainingMaterializationSchema,
  NextWeekTrainingVolumeStrategySchema,
  type NextWeekGeneratedSupportBias,
  type NextWeekTrainingMaterialization,
  type NextWeekTrainingVolumeStrategy
} from "../../engine/training/nextWeekMaterializationEngine";
import type { TrainingBlockPhase, TrainingProgressionDecisionValue } from "../../engine/training/types";
import type { CornerSupabaseClient } from "./client";
import type { TableInsert, TableRow, TableUpdate } from "./repositoryTypes";
import { assertUserId, isoDateTimeValue, parseWithSchema, payloadObject, readDataOrThrow, readMaybeDataOrThrow, toJson } from "./repositoryTypes";

export type TrainingNextWeekPreviewStatus = "preview" | "accepted" | "materialized" | "superseded" | "rejected";

export interface PersistedTrainingNextWeekPreview {
  id: string;
  userId: string;
  trainingBlockId: string;
  weekIndex: number;
  weekStartDate: string;
  weekEndDate: string;
  materializedPhase: TrainingBlockPhase;
  materializedDecision: TrainingProgressionDecisionValue;
  volumeStrategy: NextWeekTrainingVolumeStrategy;
  generatedSupportBias: NextWeekGeneratedSupportBias;
  targetHardDayCap: number;
  engineVersion: string;
  inputHash: string;
  outputHash: string;
  status: TrainingNextWeekPreviewStatus;
  acceptedAt: string | null;
  materializedAt: string | null;
  supersededAt: string | null;
  preview: NextWeekTrainingMaterialization;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertTrainingNextWeekPreviewInput {
  userId: string;
  trainingBlockId: string;
  preview: NextWeekTrainingMaterialization;
  engineVersion: string;
  inputHash: string;
  outputHash: string;
}

type TrainingNextWeekPreviewRow = Pick<
  TableRow<"training_next_week_previews">,
  | "accepted_at"
  | "created_at"
  | "engine_version"
  | "generated_support_bias"
  | "id"
  | "input_hash"
  | "materialized_at"
  | "materialized_decision"
  | "materialized_phase"
  | "output_hash"
  | "preview_payload"
  | "status"
  | "superseded_at"
  | "target_hard_day_cap"
  | "training_block_id"
  | "updated_at"
  | "user_id"
  | "volume_strategy"
  | "week_end_date"
  | "week_index"
  | "week_start_date"
>;

const previewSelect =
  "id, user_id, training_block_id, week_index, week_start_date, week_end_date, materialized_phase, materialized_decision, volume_strategy, generated_support_bias, target_hard_day_cap, engine_version, input_hash, output_hash, status, accepted_at, materialized_at, superseded_at, preview_payload, created_at, updated_at";

function statusValue(value: string, context: string): TrainingNextWeekPreviewStatus {
  if (value === "preview" || value === "accepted" || value === "materialized" || value === "superseded" || value === "rejected") {
    return value;
  }
  throw new Error(`${context}: unknown preview status ${value}`);
}

function trainingBlockPhaseValue(value: string, context: string): TrainingBlockPhase {
  const parsed = NextWeekTrainingMaterializationSchema.shape.materializedPhase.safeParse(value);
  if (!parsed.success) {
    throw new Error(`${context}: unknown training block phase ${value}`);
  }
  return parsed.data;
}

function progressionDecisionValue(value: string, context: string): TrainingProgressionDecisionValue {
  const parsed = NextWeekTrainingMaterializationSchema.shape.materializedDecision.safeParse(value);
  if (!parsed.success) {
    throw new Error(`${context}: unknown progression decision ${value}`);
  }
  return parsed.data;
}

function volumeStrategyValue(value: string, context: string): NextWeekTrainingVolumeStrategy {
  return parseWithSchema(NextWeekTrainingVolumeStrategySchema, value, context);
}

function generatedSupportBiasValue(value: string, context: string): NextWeekGeneratedSupportBias {
  return parseWithSchema(NextWeekGeneratedSupportBiasSchema, value, context);
}

function nullableDateTimeValue(value: string | null, context: string): string | null {
  return value === null ? null : isoDateTimeValue(value, context);
}

export function mapTrainingNextWeekPreviewRow(row: TrainingNextWeekPreviewRow): PersistedTrainingNextWeekPreview {
  const preview = parseWithSchema(NextWeekTrainingMaterializationSchema, payloadObject(row.preview_payload, "training_next_week_previews.preview_payload"), "training_next_week_previews.preview_payload");
  return {
    id: row.id,
    userId: row.user_id,
    trainingBlockId: row.training_block_id,
    weekIndex: row.week_index,
    weekStartDate: row.week_start_date,
    weekEndDate: row.week_end_date,
    materializedPhase: trainingBlockPhaseValue(row.materialized_phase, "training_next_week_previews.materialized_phase"),
    materializedDecision: progressionDecisionValue(row.materialized_decision, "training_next_week_previews.materialized_decision"),
    volumeStrategy: volumeStrategyValue(row.volume_strategy, "training_next_week_previews.volume_strategy"),
    generatedSupportBias: generatedSupportBiasValue(row.generated_support_bias, "training_next_week_previews.generated_support_bias"),
    targetHardDayCap: row.target_hard_day_cap,
    engineVersion: row.engine_version,
    inputHash: row.input_hash,
    outputHash: row.output_hash,
    status: statusValue(row.status, "training_next_week_previews.status"),
    acceptedAt: nullableDateTimeValue(row.accepted_at, "training_next_week_previews.accepted_at"),
    materializedAt: nullableDateTimeValue(row.materialized_at, "training_next_week_previews.materialized_at"),
    supersededAt: nullableDateTimeValue(row.superseded_at, "training_next_week_previews.superseded_at"),
    preview,
    createdAt: isoDateTimeValue(row.created_at, "training_next_week_previews.created_at"),
    updatedAt: isoDateTimeValue(row.updated_at, "training_next_week_previews.updated_at")
  };
}

function previewInsert(input: UpsertTrainingNextWeekPreviewInput): TableInsert<"training_next_week_previews"> {
  const userId = assertUserId(input.userId, "training_next_week_previews.upsertTrainingNextWeekPreview");
  const preview = parseWithSchema(NextWeekTrainingMaterializationSchema, input.preview, "training_next_week_previews.upsertTrainingNextWeekPreview.preview");
  return {
    user_id: userId,
    training_block_id: input.trainingBlockId,
    week_index: preview.nextWeekIndex,
    week_start_date: preview.nextWeekStartDate,
    week_end_date: preview.nextWeekEndDate,
    materialized_phase: preview.materializedPhase,
    materialized_decision: preview.materializedDecision,
    volume_strategy: preview.materializedVolumeStrategy,
    generated_support_bias: preview.generatedSupportBias,
    target_hard_day_cap: preview.targetHardDayCap,
    engine_version: input.engineVersion,
    input_hash: input.inputHash,
    output_hash: input.outputHash,
    status: "preview",
    preview_payload: toJson(preview)
  };
}

function previewLifecycleUpdate(status: TrainingNextWeekPreviewStatus): TableUpdate<"training_next_week_previews"> {
  const timestamp = new Date().toISOString();
  if (status === "accepted") {
    return { status, accepted_at: timestamp };
  }
  if (status === "materialized") {
    return { status, materialized_at: timestamp };
  }
  if (status === "superseded") {
    return { status, superseded_at: timestamp };
  }
  return { status };
}

export function createTrainingNextWeekPreviewRepository(client: CornerSupabaseClient) {
  return {
    async upsertTrainingNextWeekPreview(input: UpsertTrainingNextWeekPreviewInput): Promise<PersistedTrainingNextWeekPreview> {
      const record = previewInsert(input);
      const previewPayload = record.preview_payload ?? toJson(input.preview);
      const existingResponse = await client
        .from("training_next_week_previews")
        .select(previewSelect)
        .eq("user_id", record.user_id)
        .eq("training_block_id", record.training_block_id)
        .eq("week_index", record.week_index)
        .eq("input_hash", record.input_hash)
        .eq("output_hash", record.output_hash)
        .limit(1)
        .maybeSingle();
      const existing = readMaybeDataOrThrow(existingResponse, "training_next_week_previews.upsertTrainingNextWeekPreview.findExisting");
      if (existing) {
        const update: TableUpdate<"training_next_week_previews"> = {
          engine_version: record.engine_version,
          materialized_phase: record.materialized_phase,
          materialized_decision: record.materialized_decision,
          volume_strategy: record.volume_strategy,
          generated_support_bias: record.generated_support_bias,
          target_hard_day_cap: record.target_hard_day_cap,
          preview_payload: previewPayload
        };
        const updateResponse = await client
          .from("training_next_week_previews")
          .update(update)
          .eq("id", existing.id)
          .eq("user_id", record.user_id)
          .select(previewSelect)
          .single();
        return mapTrainingNextWeekPreviewRow(readDataOrThrow(updateResponse, "training_next_week_previews.upsertTrainingNextWeekPreview.updateExisting"));
      }

      const response = await client.from("training_next_week_previews").insert(record).select(previewSelect).single();
      return mapTrainingNextWeekPreviewRow(readDataOrThrow(response, "training_next_week_previews.upsertTrainingNextWeekPreview.insert"));
    },

    async getLatestPreviewForBlock(userId: string, trainingBlockId: string): Promise<PersistedTrainingNextWeekPreview | null> {
      const safeUserId = assertUserId(userId, "training_next_week_previews.getLatestPreviewForBlock");
      const response = await client
        .from("training_next_week_previews")
        .select(previewSelect)
        .eq("user_id", safeUserId)
        .eq("training_block_id", trainingBlockId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const row = readMaybeDataOrThrow(response, "training_next_week_previews.getLatestPreviewForBlock");
      return row ? mapTrainingNextWeekPreviewRow(row) : null;
    },

    async listPreviewsForBlock(userId: string, trainingBlockId: string): Promise<PersistedTrainingNextWeekPreview[]> {
      const safeUserId = assertUserId(userId, "training_next_week_previews.listPreviewsForBlock");
      const response = await client
        .from("training_next_week_previews")
        .select(previewSelect)
        .eq("user_id", safeUserId)
        .eq("training_block_id", trainingBlockId)
        .order("week_index", { ascending: true })
        .order("created_at", { ascending: true });
      return readDataOrThrow(response, "training_next_week_previews.listPreviewsForBlock").map(mapTrainingNextWeekPreviewRow);
    },

    async markPreviewAccepted(userId: string, previewId: string): Promise<PersistedTrainingNextWeekPreview> {
      const safeUserId = assertUserId(userId, "training_next_week_previews.markPreviewAccepted");
      const response = await client
        .from("training_next_week_previews")
        .update(previewLifecycleUpdate("accepted"))
        .eq("user_id", safeUserId)
        .eq("id", previewId)
        .select(previewSelect)
        .single();
      return mapTrainingNextWeekPreviewRow(readDataOrThrow(response, "training_next_week_previews.markPreviewAccepted"));
    },

    async markPreviewMaterialized(userId: string, previewId: string): Promise<PersistedTrainingNextWeekPreview> {
      const safeUserId = assertUserId(userId, "training_next_week_previews.markPreviewMaterialized");
      const response = await client
        .from("training_next_week_previews")
        .update(previewLifecycleUpdate("materialized"))
        .eq("user_id", safeUserId)
        .eq("id", previewId)
        .select(previewSelect)
        .single();
      return mapTrainingNextWeekPreviewRow(readDataOrThrow(response, "training_next_week_previews.markPreviewMaterialized"));
    },

    async supersedePreviewsForBlock(userId: string, trainingBlockId: string, exceptPreviewId?: string | undefined): Promise<{ ids: readonly string[] }> {
      const safeUserId = assertUserId(userId, "training_next_week_previews.supersedePreviewsForBlock");
      const query = client
        .from("training_next_week_previews")
        .update(previewLifecycleUpdate("superseded"))
        .eq("user_id", safeUserId)
        .eq("training_block_id", trainingBlockId)
        .in("status", ["preview", "accepted"]);
      const scoped = exceptPreviewId ? query.neq("id", exceptPreviewId) : query;
      const response = await scoped.select("id");
      const rows = readDataOrThrow(response, "training_next_week_previews.supersedePreviewsForBlock");
      return { ids: rows.map((row) => row.id) };
    }
  };
}
