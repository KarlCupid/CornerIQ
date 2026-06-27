import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  NUTRITION_SAFETY_REVIEW_EVENT_TYPES,
  NUTRITION_SAFETY_REVIEW_STATUSES
} from "../../engine/nutrition/nutritionSafetyReviewTypes";
import { evaluateReviewNutritionSafetyPolicy } from "../../../supabase/functions/review-nutrition-safety/policy";

function quotedValuesInBlock(source: string, marker: string): readonly string[] {
  const start = source.indexOf(marker);
  expect(start, marker).toBeGreaterThanOrEqual(0);
  const block = source.slice(start, source.indexOf(");", start));
  return [...block.matchAll(/'([^']+)'/g)].flatMap((match) => (match[1] ? [match[1]] : [])).sort();
}

describe("nutrition safety review schema contract", () => {
  it("matches canonical TS statuses/events to the DB check constraint migration", () => {
    const source = readFileSync("supabase/migrations/20260627090000_nutrition_safety_review_canonical_statuses.sql", "utf8");

    expect(quotedValuesInBlock(source, "nutrition_safety_reviews_status_known")).toEqual([...NUTRITION_SAFETY_REVIEW_STATUSES].sort());
    expect(quotedValuesInBlock(source, "nutrition_safety_review_events_type_known")).toEqual([...NUTRITION_SAFETY_REVIEW_EVENT_TYPES].sort());
  });

  it("requires trusted server-side reviewer identity for reviewer decisions", () => {
    expect(
      evaluateReviewNutritionSafetyPolicy({
        callerUserId: "reviewer_1",
        reviewerRole: "dietitian",
        relationshipActive: true,
        requestedStatus: "cleared_by_reviewer"
      })
    ).toMatchObject({ allowed: true });

    expect(
      evaluateReviewNutritionSafetyPolicy({
        callerUserId: "athlete_1",
        reviewerRole: "athlete",
        relationshipActive: true,
        requestedStatus: "cleared_by_reviewer"
      })
    ).toMatchObject({ allowed: false });
  });
});
