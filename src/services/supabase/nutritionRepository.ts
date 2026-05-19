import { FoodLogSchema } from "../../engine/core/schemas";
import type { FoodLog } from "../../engine/core/types";
import type { CornerSupabaseClient } from "./client";
import type { TableRow } from "./repositoryTypes";
import { assertUserId, parseWithSchema, payloadObject, readDataOrThrow } from "./repositoryTypes";

export type FoodLogRow = Pick<TableRow<"food_logs">, "log_date" | "meal_payload">;

export function mapFoodLogRow(row: FoodLogRow): FoodLog {
  return parseWithSchema(
    FoodLogSchema,
    {
      ...payloadObject(row.meal_payload, "food_logs.meal_payload"),
      date: row.log_date
    },
    "food_logs"
  );
}

export function createNutritionRepository(client: CornerSupabaseClient) {
  return {
    async listFoodLogs(userId: string): Promise<FoodLog[]> {
      const safeUserId = assertUserId(userId, "food_logs.listFoodLogs");
      const response = await client
        .from("food_logs")
        .select("log_date, meal_payload")
        .eq("user_id", safeUserId)
        .order("log_date", { ascending: true });
      return readDataOrThrow(response, "food_logs.listFoodLogs").map(mapFoodLogRow);
    }
  };
}
