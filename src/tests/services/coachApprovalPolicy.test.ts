import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { approvalEligibility, bearerToken, validatePayload } from "../../../supabase/functions/approve-coach-relationship/policy";

describe("coach approval Edge Function policy helpers", () => {
  it("rejects missing auth before trusted work", () => {
    expect(bearerToken(null)).toBeNull();
    expect(bearerToken("Basic abc")).toBeNull();
    expect(bearerToken("Bearer jwt_123")).toBe("jwt_123");
  });

  it("rejects invalid payloads and unsupported permission keys", () => {
    expect(validatePayload({ permissions: {} })).toEqual({ error: "relationshipId is required." });
    expect(validatePayload({ relationshipId: "relationship_1", permissions: [] })).toEqual({ error: "permissions must be an object when provided." });
    expect(validatePayload({ relationshipId: "relationship_1", permissions: { delete_plan: true } })).toEqual({ error: "Unsupported permission: delete_plan" });
    expect(validatePayload({ relationshipId: "relationship_1", permissions: { view_training_plan: "yes" } })).toEqual({ error: "Permission view_training_plan must be boolean." });
    expect(validatePayload({ relationshipId: " relationship_1 ", permissions: { view_training_plan: true, suggest_adjustments: false } })).toEqual({
      relationshipId: "relationship_1",
      permissions: {
        view_training_plan: true,
        suggest_adjustments: false
      }
    });
  });

  it("allows only the athlete caller to approve a pending row", () => {
    const relationship = {
      id: "relationship_1",
      athlete_user_id: "athlete_1",
      coach_user_id: "coach_1",
      status: "pending"
    };

    expect(approvalEligibility({ callerUserId: "athlete_1", relationship })).toEqual({ allowed: true });
    expect(approvalEligibility({ callerUserId: "coach_1", relationship })).toEqual({
      allowed: false,
      status: 403,
      error: "Only the athlete can approve this pending relationship."
    });
    expect(approvalEligibility({ callerUserId: "athlete_1", relationship: { ...relationship, status: "active" } })).toEqual({
      allowed: false,
      status: 404,
      error: "Pending relationship was not found."
    });
  });

  it("keeps service role out of Expo/client code and coach UI hidden", () => {
    const clientFiles = [
      "src/services/supabase/client.ts",
      "src/services/supabase/coachRelationshipRepository.ts",
      "src/hooks/useTrainingPlanAdjustments.ts",
      "src/app/screens/PlanScreen.tsx",
      "src/app/screens/plan/PlanAdjustmentControls.tsx"
    ];

    for (const file of clientFiles) {
      const source = readFileSync(file, "utf8");
      expect(source.toLowerCase()).not.toContain("service_role");
      expect(source).not.toContain("approve-coach-relationship");
    }
    expect(readFileSync("src/app/screens/plan/PlanAdjustmentControls.tsx", "utf8")).not.toContain("coach_note");
  });
});
