import { TournamentDetailsSchema } from "../../engine/core/schemas";
import type { TournamentDetails } from "../../engine/core/types";
import type { CornerSupabaseClient } from "./client";
import type { TableRow } from "./repositoryTypes";
import { assertUserId, parseWithSchema, payloadObject, readDataOrThrow } from "./repositoryTypes";

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
    }
  };
}
