import { z } from "zod";
import type { PlanGenerationIntent, PlanGenerationPrimaryFocus } from "../../engine/training/types";
import type { CornerSupabaseClient } from "./client";
import type { TableInsert, TableRow, TableUpdate } from "./repositoryTypes";
import { RepositoryError, assertUserId, parseWithSchema, payloadObject, readDataOrThrow, toJson } from "./repositoryTypes";

const SupportWeekdaySchema = z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);
const PlanGenerationIntentPayloadSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  action: z.enum(["start_new_plan", "amend_current_plan"]),
  goalMode: z.enum(["build", "fight", "tournament", "recovery"]),
  primaryFocus: z.enum(["balanced", "power", "conditioning", "strength", "mobility", "boxing_skill"]).optional(),
  subFocus: z.string().min(1).optional(),
  trainingDose: z.enum(["minimal", "standard", "serious", "high"]),
  selectedSupportDays: z.array(SupportWeekdaySchema),
  preferredSessionDurationMinutes: z.number().int().positive().optional(),
  maxSessionDurationMinutes: z.number().int().positive().optional(),
  targetBlockLengthWeeks: z.number().int().positive().optional(),
  equipment: z.array(z.string()).optional(),
  modalityPreferences: z.array(z.string()).optional(),
  modalityAvoidances: z.array(z.string()).optional(),
  currentLimitations: z.array(z.string()).optional(),
  userPreferences: z.array(z.string()).optional(),
  planStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  requestedAt: z.string().datetime(),
  seed: z.string().min(1),
  source: z.literal("plan_wizard"),
  status: z.enum(["active", "superseded", "completed", "canceled"])
});

export type TrainingPlanIntentRow = TableRow<"training_plan_intents">;

export interface PersistedTrainingPlanIntent extends PlanGenerationIntent {
  rowId: string;
  planRevisionId: string;
  createdAt: string;
  updatedAt: string;
  supersededAt?: string | undefined;
  supersededReason?: string | undefined;
}

function defaultPrimaryFocus(goalMode: PlanGenerationIntent["goalMode"]): PlanGenerationPrimaryFocus {
  if (goalMode === "fight") {
    return "power";
  }
  if (goalMode === "tournament" || goalMode === "recovery") {
    return "mobility";
  }
  return "balanced";
}

function normalizedIntent(intent: PlanGenerationIntent): PlanGenerationIntent {
  const withDefaults = {
    ...intent,
    primaryFocus: intent.primaryFocus ?? defaultPrimaryFocus(intent.goalMode),
    equipment: [...(intent.equipment ?? [])],
    modalityPreferences: [...(intent.modalityPreferences ?? [])],
    modalityAvoidances: [...(intent.modalityAvoidances ?? [])],
    currentLimitations: [...(intent.currentLimitations ?? [])],
    userPreferences: [...(intent.userPreferences ?? [])]
  };
  return parseWithSchema(PlanGenerationIntentPayloadSchema, withDefaults, "training_plan_intents.intent") as PlanGenerationIntent;
}

function planIntentMutation(userId: string, intent: PlanGenerationIntent): TableInsert<"training_plan_intents"> & TableUpdate<"training_plan_intents"> {
  const validated = normalizedIntent({ ...intent, userId });
  return {
    user_id: userId,
    plan_revision_id: validated.id,
    status: validated.status,
    action: validated.action,
    goal_mode: validated.goalMode,
    primary_focus: validated.primaryFocus ?? defaultPrimaryFocus(validated.goalMode),
    sub_focus: validated.subFocus ?? null,
    training_dose: validated.trainingDose,
    selected_support_days: toJson(validated.selectedSupportDays),
    preferred_session_duration_minutes: validated.preferredSessionDurationMinutes ?? null,
    max_session_duration_minutes: validated.maxSessionDurationMinutes ?? null,
    target_block_length_weeks: validated.targetBlockLengthWeeks ?? null,
    equipment: toJson(validated.equipment ?? []),
    modality_preferences: toJson(validated.modalityPreferences ?? []),
    modality_avoidances: toJson(validated.modalityAvoidances ?? []),
    current_limitations: toJson(validated.currentLimitations ?? []),
    user_preferences: toJson(validated.userPreferences ?? []),
    plan_start_date: validated.planStartDate,
    requested_at: validated.requestedAt,
    source: validated.source,
    intent_payload: toJson(validated),
    superseded_at: validated.status === "superseded" ? validated.requestedAt : null,
    superseded_reason: null
  };
}

export function mapTrainingPlanIntentRow(row: TrainingPlanIntentRow): PersistedTrainingPlanIntent {
  const payload = payloadObject(row.intent_payload, "training_plan_intents.intent_payload");
  const parsed = parseWithSchema(
    PlanGenerationIntentPayloadSchema,
    {
      ...payload,
      id: row.plan_revision_id,
      userId: row.user_id,
      action: row.action,
      goalMode: row.goal_mode,
      primaryFocus: row.primary_focus,
      ...(row.sub_focus ? { subFocus: row.sub_focus } : {}),
      trainingDose: row.training_dose,
      selectedSupportDays: row.selected_support_days,
      preferredSessionDurationMinutes: row.preferred_session_duration_minutes ?? undefined,
      maxSessionDurationMinutes: row.max_session_duration_minutes ?? undefined,
      targetBlockLengthWeeks: row.target_block_length_weeks ?? undefined,
      equipment: row.equipment,
      modalityPreferences: row.modality_preferences,
      modalityAvoidances: row.modality_avoidances,
      currentLimitations: row.current_limitations,
      userPreferences: row.user_preferences,
      planStartDate: row.plan_start_date,
      requestedAt: row.requested_at,
      seed: typeof payload.seed === "string" ? payload.seed : row.plan_revision_id,
      source: row.source,
      status: row.status
    },
    "training_plan_intents"
  ) as PlanGenerationIntent;
  return {
    ...parsed,
    rowId: row.id,
    planRevisionId: row.plan_revision_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.superseded_at ? { supersededAt: row.superseded_at } : {}),
    ...(row.superseded_reason ? { supersededReason: row.superseded_reason } : {})
  };
}

const trainingPlanIntentSelect =
  "id, user_id, plan_revision_id, status, action, goal_mode, primary_focus, sub_focus, training_dose, selected_support_days, preferred_session_duration_minutes, max_session_duration_minutes, target_block_length_weeks, equipment, modality_preferences, modality_avoidances, current_limitations, user_preferences, plan_start_date, requested_at, source, intent_payload, superseded_at, superseded_reason, created_at, updated_at";

export function createTrainingPlanIntentRepository(client: CornerSupabaseClient) {
  async function supersedeOtherActiveIntent(userId: string, planRevisionId: string, supersededAt: string): Promise<void> {
    const response = await client
      .from("training_plan_intents")
      .update({
        status: "superseded",
        superseded_at: supersededAt,
        superseded_reason: "new_active_plan_revision"
      })
      .eq("user_id", userId)
      .eq("status", "active")
      .neq("plan_revision_id", planRevisionId);
    readDataOrThrow({ data: [], error: response.error }, "training_plan_intents.supersedeOtherActiveIntent");
  }

  return {
    async upsertPlanIntent(userId: string, intent: PlanGenerationIntent): Promise<{ id: string; planRevisionId: string }> {
      const safeUserId = assertUserId(userId, "training_plan_intents.upsertPlanIntent");
      const record = planIntentMutation(safeUserId, intent);
      if (record.status === "active") {
        await supersedeOtherActiveIntent(safeUserId, record.plan_revision_id, record.requested_at);
      }
      const response = await client.from("training_plan_intents").upsert(record, { onConflict: "user_id,plan_revision_id" }).select("id, plan_revision_id").single();
      const row = readDataOrThrow(response, "training_plan_intents.upsertPlanIntent");
      return { id: row.id, planRevisionId: row.plan_revision_id };
    },

    async getActivePlanIntent(userId: string): Promise<PersistedTrainingPlanIntent | null> {
      const safeUserId = assertUserId(userId, "training_plan_intents.getActivePlanIntent");
      const response = await client
        .from("training_plan_intents")
        .select(trainingPlanIntentSelect)
        .eq("user_id", safeUserId)
        .eq("status", "active")
        .order("requested_at", { ascending: false })
        .limit(2);
      const rows = readDataOrThrow(response, "training_plan_intents.getActivePlanIntent");
      if (rows.length > 1) {
        throw new Error("training_plan_intents.getActivePlanIntent: multiple active plan intents match the user");
      }
      return rows[0] ? mapTrainingPlanIntentRow(rows[0]) : null;
    },

    async listPlanIntents(userId: string): Promise<PersistedTrainingPlanIntent[]> {
      const safeUserId = assertUserId(userId, "training_plan_intents.listPlanIntents");
      const response = await client.from("training_plan_intents").select(trainingPlanIntentSelect).eq("user_id", safeUserId).order("requested_at", { ascending: false });
      return readDataOrThrow(response, "training_plan_intents.listPlanIntents").map(mapTrainingPlanIntentRow);
    },

    async supersedePlanIntent(userId: string, planRevisionId: string, reason: string, supersededAt = new Date().toISOString()): Promise<void> {
      const safeUserId = assertUserId(userId, "training_plan_intents.supersedePlanIntent");
      const revision = planRevisionId.trim();
      if (!revision) {
        throw new RepositoryError("missing_required_data", "training_plan_intents.supersedePlanIntent", "planRevisionId is required");
      }
      const response = await client
        .from("training_plan_intents")
        .update({
          status: "superseded",
          superseded_at: supersededAt,
          superseded_reason: reason.trim() || "superseded"
        })
        .eq("user_id", safeUserId)
        .eq("plan_revision_id", revision)
        .select("id")
        .single();
      readDataOrThrow(response, "training_plan_intents.supersedePlanIntent");
    }
  };
}
