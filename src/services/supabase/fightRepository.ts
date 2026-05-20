import { FightOpportunitySchema } from "../../engine/core/schemas";
import type { FightOpportunity } from "../../engine/core/types";
import type { CornerSupabaseClient } from "./client";
import type { TableInsert, TableRow, TableUpdate } from "./repositoryTypes";
import { assertUserId, parseWithSchema, payloadObject, readDataOrThrow, toJson } from "./repositoryTypes";

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

function fightPayload(validated: FightOpportunity, metadata: Record<string, unknown> = {}) {
  return toJson({
    opponent: validated.opponent,
    boutTime: validated.boutTime,
    sanctioningBody: validated.sanctioningBody,
    amateurOrPro: validated.amateurOrPro,
    rounds: validated.rounds,
    roundMinutes: validated.roundMinutes,
    restSeconds: validated.restSeconds,
    targetWeightClass: validated.targetWeightClass,
    contractedWeightKg: validated.contractedWeightKg,
    allowanceKg: validated.allowanceKg,
    travelWindow: validated.travelWindow,
    timezone: validated.timezone,
    hydrationTestingRequired: validated.hydrationTestingRequired,
    postWeighInWeightCapKg: validated.postWeighInWeightCapKg,
    tournamentDetails: validated.tournamentDetails,
    metadata
  });
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
    },

    async insertFightOpportunity(userId: string, fight: FightOpportunity): Promise<{ id: string }> {
      const safeUserId = assertUserId(userId, "fight_opportunities.insertFightOpportunity");
      const validated = parseWithSchema(FightOpportunitySchema, fight, "fight_opportunities.insertFightOpportunity");
      const insert: TableInsert<"fight_opportunities"> = {
        user_id: safeUserId,
        status: validated.status,
        bout_date: validated.boutDate,
        weigh_in_datetime: validated.weighInDateTime ?? null,
        weigh_in_type: validated.weighInType,
        fight_payload: fightPayload(validated)
      };
      const response = await client.from("fight_opportunities").insert(insert).select("id").single();
      return readDataOrThrow(response, "fight_opportunities.insertFightOpportunity");
    },

    async updateFightOpportunity(userId: string, fight: FightOpportunity, metadata: Record<string, unknown> = {}): Promise<{ id: string }> {
      const safeUserId = assertUserId(userId, "fight_opportunities.updateFightOpportunity");
      const validated = parseWithSchema(FightOpportunitySchema, fight, "fight_opportunities.updateFightOpportunity");
      const update: TableUpdate<"fight_opportunities"> = {
        status: validated.status,
        bout_date: validated.boutDate,
        weigh_in_datetime: validated.weighInDateTime ?? null,
        weigh_in_type: validated.weighInType,
        fight_payload: fightPayload(validated, metadata)
      };
      const response = await client.from("fight_opportunities").update(update).eq("user_id", safeUserId).eq("id", validated.id).select("id").single();
      return readDataOrThrow(response, "fight_opportunities.updateFightOpportunity");
    }
  };
}
