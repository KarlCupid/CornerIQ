import { GeneratedTrainingSessionSchema } from "../../engine/core/schemas";
import type { GeneratedTrainingSession } from "../../engine/core/types";
import type { CornerSupabaseClient } from "./client";
import type { TableRow } from "./repositoryTypes";
import { assertUserId, parseWithSchema, payloadObject, readDataOrThrow } from "./repositoryTypes";

export type GeneratedTrainingSessionRow = Pick<TableRow<"generated_training_sessions">, "id" | "planned_date" | "session_payload">;

export function mapGeneratedTrainingSessionRow(row: GeneratedTrainingSessionRow): GeneratedTrainingSession {
  return parseWithSchema(
    GeneratedTrainingSessionSchema,
    {
      ...payloadObject(row.session_payload, "generated_training_sessions.session_payload"),
      id: row.id,
      date: row.planned_date
    },
    "generated_training_sessions"
  );
}

export function createTrainingRepository(client: CornerSupabaseClient) {
  return {
    async listGeneratedSessions(userId: string): Promise<GeneratedTrainingSession[]> {
      const safeUserId = assertUserId(userId, "generated_training_sessions.listGeneratedSessions");
      const response = await client
        .from("generated_training_sessions")
        .select("id, planned_date, session_payload")
        .eq("user_id", safeUserId)
        .order("planned_date", { ascending: true });
      return readDataOrThrow(response, "generated_training_sessions.listGeneratedSessions").map(mapGeneratedTrainingSessionRow);
    }
  };
}
