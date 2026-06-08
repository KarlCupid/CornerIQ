import { describe, expect, it, vi } from "vitest";
import { createNutritionRepository, mapFoodLogRow } from "../../services/supabase/nutritionRepository";
import type { CornerSupabaseClient } from "../../services/supabase/client";
import { RepositoryError } from "../../services/supabase/repositoryTypes";
import { fixtureAsOfDate } from "../fixtures/engineFixtures";

describe("nutrition repository food-log validation", () => {
  it("rejects impossible calorie and macro payloads before Supabase writes", async () => {
    const client = { from: vi.fn() } as unknown as CornerSupabaseClient;

    await expect(
      createNutritionRepository(client).insertFoodLog({
        userId: "user_1",
        date: fixtureAsOfDate,
        calories: 5,
        proteinGrams: 500,
        carbohydrateGrams: 0,
        fatGrams: 0
      })
    ).rejects.toThrow(/protein\/carbs\/fat estimate 2000 kcal/);

    expect(client.from).not.toHaveBeenCalled();
  });

  it("treats persisted impossible food logs as malformed payloads", () => {
    expect(() =>
      mapFoodLogRow({
        log_date: fixtureAsOfDate,
        meal_payload: {
          calories: 5,
          proteinGrams: 500,
          carbohydrateGrams: 0,
          fatGrams: 0,
          confidence: "high"
        }
      })
    ).toThrow(RepositoryError);
  });
});
