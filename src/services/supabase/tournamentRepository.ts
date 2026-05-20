import { TournamentDetailsSchema } from "../../engine/core/schemas";
import type { TournamentDetails } from "../../engine/core/types";
import type { CornerSupabaseClient } from "./client";
import type { TableInsert, TableRow } from "./repositoryTypes";
import { assertUserId, parseWithSchema, payloadObject, readDataOrThrow, toJson } from "./repositoryTypes";

export type TournamentPlanRow = Pick<TableRow<"tournament_plans">, "tournament_start_date" | "tournament_end_date" | "plan_payload">;

export function mapTournamentPlanRow(row: TournamentPlanRow): TournamentDetails {
  const payload = payloadObject(row.plan_payload, "tournament_plans.plan_payload");
  return parseWithSchema(
    TournamentDetailsSchema,
    {
      ...payload,
      tournamentStartDate: row.tournament_start_date,
      tournamentEndDate: row.tournament_end_date
    },
    "tournament_plans"
  );
}

export function createTournamentRepository(client: CornerSupabaseClient) {
  return {
    async listTournamentPlans(userId: string): Promise<TournamentDetails[]> {
      const safeUserId = assertUserId(userId, "tournament_plans.listTournamentPlans");
      const response = await client
        .from("tournament_plans")
        .select("tournament_start_date, tournament_end_date, plan_payload")
        .eq("user_id", safeUserId)
        .order("tournament_start_date", { ascending: true });
      return readDataOrThrow(response, "tournament_plans.listTournamentPlans").map(mapTournamentPlanRow);
    },

    async insertTournamentPlan(userId: string, tournament: TournamentDetails): Promise<{ id: string }> {
      const safeUserId = assertUserId(userId, "tournament_plans.insertTournamentPlan");
      const validated = parseWithSchema(TournamentDetailsSchema, tournament, "tournament_plans.insertTournamentPlan");
      const insert: TableInsert<"tournament_plans"> = {
        user_id: safeUserId,
        tournament_start_date: validated.tournamentStartDate,
        tournament_end_date: validated.tournamentEndDate,
        plan_payload: toJson({
          possibleBoutDates: validated.possibleBoutDates,
          dailyWeighIns: validated.dailyWeighIns,
          weighInTimeEachDay: validated.weighInTimeEachDay,
          sameDayBoutLikely: validated.sameDayBoutLikely,
          numberOfPotentialBouts: validated.numberOfPotentialBouts,
          rehydrationWindowHoursByDay: validated.rehydrationWindowHoursByDay,
          strategyMode: validated.strategyMode
        })
      };
      const response = await client.from("tournament_plans").insert(insert).select("id").single();
      return readDataOrThrow(response, "tournament_plans.insertTournamentPlan");
    }
  };
}
