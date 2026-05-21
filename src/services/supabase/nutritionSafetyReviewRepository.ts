import {
  JsonObjectSchema,
  JsonStringArraySchema,
  NutritionSafetyReviewActorTypeSchema,
  NutritionSafetyReviewEventSchema,
  NutritionSafetyReviewEventTypeSchema,
  NutritionSafetyReviewRequestSchema,
  NutritionSafetyReviewStatusSchema,
  NutritionSafetyReviewTypeSchema,
  PersistedNutritionSafetyReviewSchema,
  type NutritionSafetyReviewActorType,
  type NutritionSafetyReviewEvent,
  type NutritionSafetyReviewEventType,
  type NutritionSafetyReviewLifecycleResult,
  type NutritionSafetyReviewRequest,
  type NutritionSafetyReviewStatus,
  type NutritionSafetyReviewType,
  type PersistedNutritionSafetyReview
} from "../../engine/nutrition/nutritionSafetyReviewTypes";
import type { CornerSupabaseClient } from "./client";
import type { Json } from "./database.types";
import type { TableInsert, TableRow, TableUpdate } from "./repositoryTypes";
import { RepositoryError, assertUserId, isoDateTimeValue, parseWithSchema, payloadObject, readDataOrThrow, readMaybeDataOrThrow, toJson } from "./repositoryTypes";

const ACTIVE_REVIEW_STATUSES: readonly NutritionSafetyReviewStatus[] = ["requested", "acknowledged", "in_review", "blocked"];

type NutritionSafetyReviewRow = Pick<
  TableRow<"nutrition_safety_reviews">,
  | "as_of_date"
  | "blocking_flags"
  | "created_at"
  | "engine_version"
  | "hard_stop"
  | "id"
  | "input_hash"
  | "output_hash"
  | "reasons"
  | "review_type"
  | "reviewed_at"
  | "reviewer_role"
  | "reviewer_user_id"
  | "severity"
  | "source_payload"
  | "status"
  | "suggested_next_steps"
  | "updated_at"
  | "user_id"
>;

type NutritionSafetyReviewEventRow = Pick<
  TableRow<"nutrition_safety_review_events">,
  "actor_type" | "actor_user_id" | "created_at" | "event_payload" | "event_type" | "id" | "nutrition_safety_review_id" | "user_id"
>;

const reviewSelect =
  "id, user_id, as_of_date, review_type, status, severity, hard_stop, blocking_flags, reasons, suggested_next_steps, source_payload, reviewer_user_id, reviewer_role, reviewed_at, engine_version, input_hash, output_hash, created_at, updated_at";
const eventSelect = "id, user_id, nutrition_safety_review_id, event_type, actor_type, actor_user_id, event_payload, created_at";

export interface ListNutritionSafetyReviewFilters {
  asOfDate?: string | undefined;
  reviewType?: NutritionSafetyReviewType | undefined;
  statuses?: readonly NutritionSafetyReviewStatus[] | undefined;
}

export interface AppendNutritionSafetyReviewEventInput {
  userId: string;
  nutritionSafetyReviewId: string;
  eventType: NutritionSafetyReviewEventType;
  actorType?: NutritionSafetyReviewActorType | undefined;
  actorUserId?: string | null | undefined;
  eventPayload?: Record<string, unknown> | undefined;
}

function assertReviewId(reviewId: string | undefined, context: string): string {
  if (!reviewId) {
    throw new RepositoryError("missing_required_data", context, "reviewId is required before a Supabase call");
  }
  return reviewId;
}

function stringArrayPayload(value: Json, context: string): readonly string[] {
  return parseWithSchema(JsonStringArraySchema, value, context);
}

function objectPayload(value: Json, context: string): Record<string, unknown> {
  return parseWithSchema(JsonObjectSchema, payloadObject(value, context), context);
}

export function mapNutritionSafetyReviewRow(row: NutritionSafetyReviewRow): PersistedNutritionSafetyReview {
  return parseWithSchema(
    PersistedNutritionSafetyReviewSchema,
    {
      id: row.id,
      userId: row.user_id,
      asOfDate: row.as_of_date,
      reviewType: row.review_type,
      status: row.status,
      severity: row.severity,
      hardStop: row.hard_stop,
      blockingFlags: stringArrayPayload(row.blocking_flags, "nutrition_safety_reviews.blocking_flags"),
      reasons: stringArrayPayload(row.reasons, "nutrition_safety_reviews.reasons"),
      suggestedNextSteps: stringArrayPayload(row.suggested_next_steps, "nutrition_safety_reviews.suggested_next_steps"),
      sourcePayload: objectPayload(row.source_payload, "nutrition_safety_reviews.source_payload"),
      reviewerUserId: row.reviewer_user_id,
      reviewerRole: row.reviewer_role,
      reviewedAt: row.reviewed_at ? isoDateTimeValue(row.reviewed_at, "nutrition_safety_reviews.reviewed_at") : null,
      engineVersion: row.engine_version,
      inputHash: row.input_hash,
      outputHash: row.output_hash,
      createdAt: isoDateTimeValue(row.created_at, "nutrition_safety_reviews.created_at"),
      updatedAt: isoDateTimeValue(row.updated_at, "nutrition_safety_reviews.updated_at")
    },
    "nutrition_safety_reviews"
  );
}

export function mapNutritionSafetyReviewEventRow(row: NutritionSafetyReviewEventRow): NutritionSafetyReviewEvent {
  return parseWithSchema(
    NutritionSafetyReviewEventSchema,
    {
      id: row.id,
      userId: row.user_id,
      nutritionSafetyReviewId: row.nutrition_safety_review_id,
      eventType: row.event_type,
      actorType: row.actor_type,
      actorUserId: row.actor_user_id,
      eventPayload: objectPayload(row.event_payload, "nutrition_safety_review_events.event_payload"),
      createdAt: isoDateTimeValue(row.created_at, "nutrition_safety_review_events.created_at")
    },
    "nutrition_safety_review_events"
  );
}

function reviewInsert(input: NutritionSafetyReviewRequest): TableInsert<"nutrition_safety_reviews"> {
  const parsed = parseWithSchema(NutritionSafetyReviewRequestSchema, input, "nutrition_safety_reviews.upsertNutritionSafetyReview.input");
  const userId = assertUserId(parsed.userId, "nutrition_safety_reviews.upsertNutritionSafetyReview");
  return {
    user_id: userId,
    as_of_date: parsed.asOfDate,
    review_type: parsed.reviewType,
    status: parsed.status ?? "requested",
    severity: parsed.severity,
    hard_stop: parsed.hardStop,
    blocking_flags: toJson(parsed.blockingFlags),
    reasons: toJson(parsed.reasons),
    suggested_next_steps: toJson(parsed.suggestedNextSteps),
    source_payload: toJson(parsed.sourcePayload),
    engine_version: parsed.engineVersion,
    input_hash: parsed.inputHash,
    output_hash: parsed.outputHash
  };
}

function existingStatusForUpdate(status: string): NutritionSafetyReviewStatus {
  return parseWithSchema(NutritionSafetyReviewStatusSchema, status, "nutrition_safety_reviews.status");
}

function eventInsert(input: AppendNutritionSafetyReviewEventInput): TableInsert<"nutrition_safety_review_events"> {
  const userId = assertUserId(input.userId, "nutrition_safety_review_events.appendNutritionSafetyReviewEvent");
  const eventType = parseWithSchema(NutritionSafetyReviewEventTypeSchema, input.eventType, "nutrition_safety_review_events.event_type");
  const actorType = parseWithSchema(NutritionSafetyReviewActorTypeSchema, input.actorType ?? "athlete", "nutrition_safety_review_events.actor_type");
  return {
    user_id: userId,
    nutrition_safety_review_id: input.nutritionSafetyReviewId,
    event_type: eventType,
    actor_type: actorType,
    actor_user_id: input.actorUserId ?? userId,
    event_payload: toJson(input.eventPayload ?? {})
  };
}

export function createNutritionSafetyReviewRepository(client: CornerSupabaseClient) {
  return {
    async upsertNutritionSafetyReview(input: NutritionSafetyReviewRequest): Promise<NutritionSafetyReviewLifecycleResult> {
      const record = reviewInsert(input);
      const existingResponse = await client
        .from("nutrition_safety_reviews")
        .select(reviewSelect)
        .eq("user_id", record.user_id)
        .eq("as_of_date", record.as_of_date)
        .eq("review_type", record.review_type)
        .eq("engine_version", record.engine_version)
        .eq("input_hash", record.input_hash)
        .eq("output_hash", record.output_hash)
        .limit(1)
        .maybeSingle();
      const existing = readMaybeDataOrThrow(existingResponse, "nutrition_safety_reviews.upsertNutritionSafetyReview.findExisting");

      if (existing) {
        const existingStatus = existingStatusForUpdate(existing.status);
        const update: TableUpdate<"nutrition_safety_reviews"> = {
          status: existingStatus === "superseded" ? record.status ?? "requested" : existingStatus,
          severity: record.severity ?? "high",
          hard_stop: record.hard_stop ?? false,
          blocking_flags: record.blocking_flags ?? toJson([]),
          reasons: record.reasons ?? toJson([]),
          suggested_next_steps: record.suggested_next_steps ?? toJson([]),
          source_payload: record.source_payload ?? toJson({})
        };
        const updateResponse = await client
          .from("nutrition_safety_reviews")
          .update(update)
          .eq("id", existing.id)
          .eq("user_id", record.user_id)
          .select(reviewSelect)
          .single();
        return {
          lifecycle: "existing",
          review: mapNutritionSafetyReviewRow(readDataOrThrow(updateResponse, "nutrition_safety_reviews.upsertNutritionSafetyReview.updateExisting"))
        };
      }

      const response = await client.from("nutrition_safety_reviews").insert(record).select(reviewSelect).single();
      return {
        lifecycle: "created",
        review: mapNutritionSafetyReviewRow(readDataOrThrow(response, "nutrition_safety_reviews.upsertNutritionSafetyReview.insert"))
      };
    },

    async listActiveNutritionSafetyReviews(userId: string): Promise<PersistedNutritionSafetyReview[]> {
      const safeUserId = assertUserId(userId, "nutrition_safety_reviews.listActiveNutritionSafetyReviews");
      const response = await client
        .from("nutrition_safety_reviews")
        .select(reviewSelect)
        .eq("user_id", safeUserId)
        .in("status", [...ACTIVE_REVIEW_STATUSES])
        .order("as_of_date", { ascending: false })
        .order("created_at", { ascending: false });
      return readDataOrThrow(response, "nutrition_safety_reviews.listActiveNutritionSafetyReviews").map(mapNutritionSafetyReviewRow);
    },

    async listNutritionSafetyReviews(userId: string, filters: ListNutritionSafetyReviewFilters = {}): Promise<PersistedNutritionSafetyReview[]> {
      const safeUserId = assertUserId(userId, "nutrition_safety_reviews.listNutritionSafetyReviews");
      const reviewType = filters.reviewType ? parseWithSchema(NutritionSafetyReviewTypeSchema, filters.reviewType, "nutrition_safety_reviews.review_type") : null;
      const statuses = filters.statuses ? parseWithSchema(NutritionSafetyReviewStatusSchema.array(), [...filters.statuses], "nutrition_safety_reviews.statuses") : null;
      let query = client.from("nutrition_safety_reviews").select(reviewSelect).eq("user_id", safeUserId);
      if (filters.asOfDate) {
        query = query.eq("as_of_date", filters.asOfDate);
      }
      if (reviewType) {
        query = query.eq("review_type", reviewType);
      }
      if (statuses && statuses.length > 0) {
        query = query.in("status", statuses);
      }
      const response = await query.order("as_of_date", { ascending: false }).order("created_at", { ascending: false });
      return readDataOrThrow(response, "nutrition_safety_reviews.listNutritionSafetyReviews").map(mapNutritionSafetyReviewRow);
    },

    async getNutritionSafetyReviewById(userId: string, reviewId: string): Promise<PersistedNutritionSafetyReview | null> {
      const safeUserId = assertUserId(userId, "nutrition_safety_reviews.getNutritionSafetyReviewById");
      const response = await client
        .from("nutrition_safety_reviews")
        .select(reviewSelect)
        .eq("user_id", safeUserId)
        .eq("id", reviewId)
        .limit(1)
        .maybeSingle();
      const row = readMaybeDataOrThrow(response, "nutrition_safety_reviews.getNutritionSafetyReviewById");
      return row ? mapNutritionSafetyReviewRow(row) : null;
    },

    async appendNutritionSafetyReviewEvent(input: AppendNutritionSafetyReviewEventInput): Promise<NutritionSafetyReviewEvent> {
      const record = eventInsert(input);
      const response = await client.from("nutrition_safety_review_events").insert(record).select(eventSelect).single();
      return mapNutritionSafetyReviewEventRow(readDataOrThrow(response, "nutrition_safety_review_events.appendNutritionSafetyReviewEvent"));
    },

    async listNutritionSafetyReviewEvents(userId: string, reviewId: string): Promise<NutritionSafetyReviewEvent[]> {
      const safeUserId = assertUserId(userId, "nutrition_safety_review_events.listNutritionSafetyReviewEvents");
      const safeReviewId = assertReviewId(reviewId, "nutrition_safety_review_events.listNutritionSafetyReviewEvents");
      const response = await client
        .from("nutrition_safety_review_events")
        .select(eventSelect)
        .eq("user_id", safeUserId)
        .eq("nutrition_safety_review_id", safeReviewId)
        .order("created_at", { ascending: false });
      return readDataOrThrow(response, "nutrition_safety_review_events.listNutritionSafetyReviewEvents").map(mapNutritionSafetyReviewEventRow);
    },

    async listRecentNutritionSafetyReviewEvents(userId: string, limit = 25): Promise<NutritionSafetyReviewEvent[]> {
      const safeUserId = assertUserId(userId, "nutrition_safety_review_events.listRecentNutritionSafetyReviewEvents");
      const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
      const response = await client
        .from("nutrition_safety_review_events")
        .select(eventSelect)
        .eq("user_id", safeUserId)
        .order("created_at", { ascending: false })
        .limit(safeLimit);
      return readDataOrThrow(response, "nutrition_safety_review_events.listRecentNutritionSafetyReviewEvents").map(mapNutritionSafetyReviewEventRow);
    },

    async acknowledgeNutritionSafetyReview(userId: string, reviewId: string): Promise<PersistedNutritionSafetyReview> {
      const safeUserId = assertUserId(userId, "nutrition_safety_reviews.acknowledgeNutritionSafetyReview");
      const response = await client
        .from("nutrition_safety_reviews")
        .update({ status: "acknowledged" })
        .eq("user_id", safeUserId)
        .eq("id", reviewId)
        .in("status", ["requested", "blocked", "in_review"])
        .select(reviewSelect)
        .single();
      return mapNutritionSafetyReviewRow(readDataOrThrow(response, "nutrition_safety_reviews.acknowledgeNutritionSafetyReview"));
    },

    async supersedeNutritionSafetyReviews(userId: string, reviewType: NutritionSafetyReviewType, asOfDate?: string | undefined): Promise<{ ids: readonly string[] }> {
      const safeUserId = assertUserId(userId, "nutrition_safety_reviews.supersedeNutritionSafetyReviews");
      const safeReviewType = parseWithSchema(NutritionSafetyReviewTypeSchema, reviewType, "nutrition_safety_reviews.review_type");
      const update: TableUpdate<"nutrition_safety_reviews"> = { status: "superseded" };
      let query = client
        .from("nutrition_safety_reviews")
        .update(update)
        .eq("user_id", safeUserId)
        .eq("review_type", safeReviewType)
        .eq("hard_stop", false)
        .in("status", ["requested", "acknowledged", "in_review"]);
      if (asOfDate) {
        query = query.lte("as_of_date", asOfDate);
      }
      const response = await query.select("id");
      const rows = readDataOrThrow(response, "nutrition_safety_reviews.supersedeNutritionSafetyReviews");
      return { ids: rows.map((row) => row.id) };
    }
  };
}
