import type { SupabaseClient } from "@supabase/supabase-js";
import type { JourneyEvent, JourneyEventType } from "../../engine/core/types";

export interface JourneyEventRow {
  id: string;
  event_type: JourneyEventType;
  event_payload: Record<string, unknown>;
  occurred_at: string;
}

export function mapJourneyEventRow(row: JourneyEventRow): JourneyEvent {
  return {
    id: row.id,
    type: row.event_type,
    occurredAt: row.occurred_at,
    payload: row.event_payload
  };
}

export function createJourneyRepository(client: SupabaseClient) {
  return {
    listEvents: (userId: string) => client.from("athlete_journey_events").select("*").eq("user_id", userId).order("occurred_at")
  };
}
