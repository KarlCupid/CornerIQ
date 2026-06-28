import { describe, expect, it } from "vitest";
import {
  ACCOUNT_DELETION_CONFIRMATION,
  ACCOUNT_DELETION_CORS_HEADERS,
  bearerToken,
  PARTICIPANT_OWNED_TABLES,
  validatePayload,
  USER_ID_OWNED_TABLES,
  USER_OWNED_TABLES
} from "../../../supabase/functions/delete-account/policy";

describe("account deletion Edge Function policy", () => {
  it("requires a Bearer token and exact DELETE ACCOUNT confirmation", () => {
    expect(bearerToken(null)).toBeNull();
    expect(bearerToken("Basic abc")).toBeNull();
    expect(bearerToken("Bearer user.jwt.token")).toBe("user.jwt.token");
    expect(validatePayload({ confirmation: ACCOUNT_DELETION_CONFIRMATION })).toEqual({ confirmation: ACCOUNT_DELETION_CONFIRMATION });
    expect(validatePayload({ confirmation: "DELETE" })).toEqual({ error: "Type DELETE ACCOUNT to confirm account deletion." });
  });

  it("keeps dependency-sensitive app data tables before parent profile rows", () => {
    const index = (table: (typeof USER_ID_OWNED_TABLES)[number]) => USER_ID_OWNED_TABLES.indexOf(table);

    expect(USER_ID_OWNED_TABLES).toContain("training_plan_intents");
    expect(PARTICIPANT_OWNED_TABLES).toEqual(["athlete_coach_relationships"]);
    expect(USER_OWNED_TABLES).toContain("athlete_coach_relationships");
    expect(index("exercise_results")).toBeLessThan(index("completed_training_sessions"));
    expect(index("workout_completion_operations")).toBeLessThan(index("completed_training_sessions"));
    expect(index("nutrition_safety_review_events")).toBeLessThan(index("nutrition_safety_reviews"));
    expect(index("training_day_plans")).toBeLessThan(index("training_microcycles"));
    expect(index("training_microcycles")).toBeLessThan(index("training_blocks"));
    expect(index("training_plan_intents")).toBeLessThan(index("training_blocks"));
    expect(index("athlete_profiles")).toBeLessThan(index("users_public"));
  });

  it("allows browser and webview clients to preflight the account deletion request", () => {
    expect(ACCOUNT_DELETION_CORS_HEADERS["access-control-allow-origin"]).toBe("*");
    expect(ACCOUNT_DELETION_CORS_HEADERS["access-control-allow-methods"]).toContain("OPTIONS");
    expect(ACCOUNT_DELETION_CORS_HEADERS["access-control-allow-methods"]).toContain("POST");
    expect(ACCOUNT_DELETION_CORS_HEADERS["access-control-allow-headers"]).toContain("authorization");
    expect(ACCOUNT_DELETION_CORS_HEADERS["access-control-allow-headers"]).toContain("apikey");
    expect(ACCOUNT_DELETION_CORS_HEADERS["access-control-allow-headers"]).toContain("content-type");
  });
});
