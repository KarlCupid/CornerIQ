import { FoodLogSchema } from "../../engine/core/schemas";
import type { FoodLog, ISODateString } from "../../engine/core/types";
import type { CornerSupabaseClient } from "./client";
import type { TableInsert, TableRow } from "./repositoryTypes";
import { assertUserId, parseWithSchema, payloadObject, readDataOrThrow, toJson } from "./repositoryTypes";

export type FoodLogRow = Pick<TableRow<"food_logs">, "log_date" | "meal_payload">;

export interface CreateFoodLogInput {
  userId: string;
  date: ISODateString;
  calories: number;
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
  fiberGrams?: number;
  sodiumMg?: number;
  confidence?: FoodLog["confidence"];
}

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
    },

    async insertFoodLog(input: CreateFoodLogInput): Promise<{ id: string }> {
      const safeUserId = assertUserId(input.userId, "food_logs.insertFoodLog");
      const log = parseWithSchema(
        FoodLogSchema,
        {
          date: input.date,
          calories: input.calories,
          proteinGrams: input.proteinGrams,
          carbohydrateGrams: input.carbohydrateGrams,
          fatGrams: input.fatGrams,
          fiberGrams: input.fiberGrams,
          sodiumMg: input.sodiumMg,
          confidence: input.confidence ?? "low"
        },
        "food_logs.insertFoodLog"
      );
      const insert: TableInsert<"food_logs"> = {
        user_id: safeUserId,
        log_date: log.date,
        meal_payload: toJson({
          calories: log.calories,
          proteinGrams: log.proteinGrams,
          carbohydrateGrams: log.carbohydrateGrams,
          fatGrams: log.fatGrams,
          fiberGrams: log.fiberGrams,
          sodiumMg: log.sodiumMg,
          confidence: log.confidence
        })
      };
      const response = await client.from("food_logs").insert(insert).select("id").single();
      return readDataOrThrow(response, "food_logs.insertFoodLog");
    }
  };
}
