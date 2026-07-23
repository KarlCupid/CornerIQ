import { TournamentDetailsSchema } from "../../engine/core/schemas";
import type { TournamentDetails } from "../../engine/core/types";
import type { CornerSupabaseClient } from "./client";
import type { TableInsert, TableRow, TableUpdate } from "./repositoryTypes";
import { assertUserId, isoDateTimeValue, parseWithSchema, payloadObject, readDataOrThrow, toJson } from "./repositoryTypes";

export type TournamentPlanRow = Pick<TableRow<"tournament_plans">, "created_at" | "id" | "tournament_start_date" | "tournament_end_date" | "plan_payload">;

export function mapTournamentPlanRow(row: TournamentPlanRow): TournamentDetails {
  const payload = payloadObject(row.plan_payload, "tournament_plans.plan_payload");
  return parseWithSchema(
    TournamentDetailsSchema,
    {
      ...payload,
      id: row.id,
      tournamentStartDate: row.tournament_start_date,
      tournamentEndDate: row.tournament_end_date,
      recordedAt: isoDateTimeValue(row.created_at, "tournament_plans.created_at")
    },
    "tournament_plans"
  );
}

function metadataFromPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const metadata = payload.metadata;
  return metadata !== null && typeof metadata === "object" && !Array.isArray(metadata) ? (metadata as Record<string, unknown>) : {};
}

function isSupersededTournamentRow(row: TournamentPlanRow): boolean {
  const payload = payloadObject(row.plan_payload, "tournament_plans.plan_payload");
  const metadata = metadataFromPayload(payload);
  return typeof metadata.supersededAt === "string";
}

function tournamentPayload(validated: TournamentDetails, metadata: Record<string, unknown> = {}) {
  return toJson({
    possibleBoutDates: validated.possibleBoutDates,
    dailyWeighIns: validated.dailyWeighIns,
    weighInTimeEachDay: validated.weighInTimeEachDay,
    sameDayBoutLikely: validated.sameDayBoutLikely,
    numberOfPotentialBouts: validated.numberOfPotentialBouts,
    rehydrationWindowHoursByDay: validated.rehydrationWindowHoursByDay,
    strategyMode: validated.strategyMode,
    metadata
  });
}

export function createTournamentRepository(client: CornerSupabaseClient) {
  return {
    async listTournamentPlans(userId: string, options: { includeSuperseded?: boolean } = {}): Promise<TournamentDetails[]> {
      const safeUserId = assertUserId(userId, "tournament_plans.listTournamentPlans");
      const response = await client
        .from("tournament_plans")
        .select("created_at, id, tournament_start_date, tournament_end_date, plan_payload")
        .eq("user_id", safeUserId)
        .order("tournament_start_date", { ascending: true });
      const rows = readDataOrThrow(response, "tournament_plans.listTournamentPlans");
      return rows.filter((row) => options.includeSuperseded || !isSupersededTournamentRow(row)).map(mapTournamentPlanRow);
    },

    async insertTournamentPlan(userId: string, tournament: TournamentDetails, metadata: Record<string, unknown> = {}): Promise<{ id: string }> {
      const safeUserId = assertUserId(userId, "tournament_plans.insertTournamentPlan");
      const validated = parseWithSchema(TournamentDetailsSchema, tournament, "tournament_plans.insertTournamentPlan");
      const insert: TableInsert<"tournament_plans"> = {
        user_id: safeUserId,
        tournament_start_date: validated.tournamentStartDate,
        tournament_end_date: validated.tournamentEndDate,
        plan_payload: tournamentPayload(validated, metadata)
      };
      const response = await client.from("tournament_plans").insert(insert).select("id").single();
      return readDataOrThrow(response, "tournament_plans.insertTournamentPlan");
    },

    async updateTournamentPlan(userId: string, tournamentId: string, tournament: TournamentDetails, metadata: Record<string, unknown> = {}): Promise<{ id: string }> {
      const safeUserId = assertUserId(userId, "tournament_plans.updateTournamentPlan");
      const validated = parseWithSchema(TournamentDetailsSchema, tournament, "tournament_plans.updateTournamentPlan");
      const update: TableUpdate<"tournament_plans"> = {
        tournament_start_date: validated.tournamentStartDate,
        tournament_end_date: validated.tournamentEndDate,
        plan_payload: tournamentPayload(validated, metadata)
      };
      const response = await client.from("tournament_plans").update(update).eq("user_id", safeUserId).eq("id", tournamentId).select("id").single();
      return readDataOrThrow(response, "tournament_plans.updateTournamentPlan");
    }
  };
}
