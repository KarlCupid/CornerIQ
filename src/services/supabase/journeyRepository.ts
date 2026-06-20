import { JourneyEventSchema } from "../../engine/core/schemas";
import type { JourneyEvent, JourneyEventType } from "../../engine/core/types";
import type { CornerSupabaseClient } from "./client";
import type { TableInsert, TableRow } from "./repositoryTypes";
import { assertUserId, isoDateTimeValue, parseWithSchema, payloadObject, readDataOrThrow, toJson } from "./repositoryTypes";

export type JourneyEventRow = Pick<TableRow<"athlete_journey_events">, "id" | "event_key" | "event_type" | "event_payload" | "occurred_at">;

export function mapJourneyEventRow(row: JourneyEventRow): JourneyEvent {
  return parseWithSchema(
    JourneyEventSchema,
    {
      id: row.id,
      type: row.event_type,
      occurredAt: isoDateTimeValue(row.occurred_at, "athlete_journey_events.occurred_at"),
      payload: payloadObject(row.event_payload, "athlete_journey_events.event_payload")
    },
    "athlete_journey_events"
  );
}

export function createJourneyRepository(client: CornerSupabaseClient) {
  return {
    async listEvents(userId: string): Promise<JourneyEvent[]> {
      const safeUserId = assertUserId(userId, "athlete_journey_events.listEvents");
      const response = await client
        .from("athlete_journey_events")
        .select("id, event_key, event_type, event_payload, occurred_at")
        .eq("user_id", safeUserId)
        .order("occurred_at", { ascending: true });
      return readDataOrThrow(response, "athlete_journey_events.listEvents").map(mapJourneyEventRow);
    },

    async appendEvent(userId: string, type: JourneyEventType, payload: Record<string, unknown>, occurredAt = new Date().toISOString(), eventKey?: string | undefined): Promise<{ id: string }> {
      const safeUserId = assertUserId(userId, "athlete_journey_events.appendEvent");
      const insert: TableInsert<"athlete_journey_events"> = {
        user_id: safeUserId,
        event_key: eventKey ?? null,
        event_type: type,
        event_payload: toJson(payload),
        occurred_at: occurredAt
      };
      const response = eventKey
        ? await client.from("athlete_journey_events").upsert(insert, { onConflict: "user_id,event_key" }).select("id").single()
        : await client.from("athlete_journey_events").insert(insert).select("id").single();
      return readDataOrThrow(response, "athlete_journey_events.appendEvent");
    }
  };
}
