import { FightOpportunitySchema } from "../../engine/core/schemas";
import type { FightOpportunity } from "../../engine/core/types";
import type { CornerSupabaseClient } from "./client";
import type { TableRow } from "./repositoryTypes";
import { assertUserId, parseWithSchema, payloadObject, readDataOrThrow } from "./repositoryTypes";

export type FightOpportunityRow = Pick<TableRow<"fight_opportunities">, "id" | "status" | "bout_date" | "weigh_in_datetime" | "weigh_in_type" | "fight_payload">;

export function mapFightOpportunityRow(row: FightOpportunityRow): FightOpportunity {
  const payload = payloadObject(row.fight_payload, "fight_opportunities.fight_payload");
  const candidate = {
    ...payload,
    id: row.id,
    status: row.status,
    boutDate: row.bout_date,
    weighInType: row.weigh_in_type,
    ...(row.weigh_in_datetime ? { weighInDateTime: row.weigh_in_datetime } : {})
  };
  return parseWithSchema(FightOpportunitySchema, candidate, "fight_opportunities");
}

export function createFightRepository(client: CornerSupabaseClient) {
  return {
    async listFightOpportunities(userId: string): Promise<FightOpportunity[]> {
      const safeUserId = assertUserId(userId, "fight_opportunities.listFightOpportunities");
      const response = await client
        .from("fight_opportunities")
        .select("id, status, bout_date, weigh_in_datetime, weigh_in_type, fight_payload")
        .eq("user_id", safeUserId)
        .order("bout_date", { ascending: true });
      return readDataOrThrow(response, "fight_opportunities.listFightOpportunities").map(mapFightOpportunityRow);
    }
  };
}
