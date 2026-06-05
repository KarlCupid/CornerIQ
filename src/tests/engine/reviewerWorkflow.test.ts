import { describe, expect, it } from "vitest";
import { canTransitionNutritionSafetyReview, reviewerWorkflowScope } from "../../engine/nutrition/reviewerWorkflow";

describe("nutrition reviewer workflow policy", () => {
  it("allows athlete acknowledgement but not athlete clear", () => {
    expect(
      canTransitionNutritionSafetyReview({
        currentStatus: "requested",
        targetStatus: "acknowledged_by_athlete",
        actor: { actorType: "athlete", actorUserId: "user_1", reviewerRole: null, trustedServerSide: false }
      })
    ).toMatchObject({ allowed: true, auditEventType: "acknowledged_by_athlete" });

    expect(
      canTransitionNutritionSafetyReview({
        currentStatus: "reviewer_reviewing",
        targetStatus: "cleared_by_reviewer",
        actor: { actorType: "athlete", actorUserId: "user_1", reviewerRole: null, trustedServerSide: false }
      })
    ).toMatchObject({ allowed: false, auditEventType: null, reason: expect.stringContaining("Athlete clients cannot clear") });
  });

  it("requires trusted server-side reviewer identity for reviewer clear or not-cleared decisions", () => {
    expect(
      canTransitionNutritionSafetyReview({
        currentStatus: "reviewer_reviewing",
        targetStatus: "cleared_by_reviewer",
        actor: { actorType: "dietitian", actorUserId: "reviewer_1", reviewerRole: "dietitian", trustedServerSide: true }
      })
    ).toMatchObject({ allowed: true, auditEventType: "cleared_by_reviewer", reason: expect.stringContaining("audit event") });

    expect(
      canTransitionNutritionSafetyReview({
        currentStatus: "reviewer_reviewing",
        targetStatus: "not_cleared",
        actor: { actorType: "coach", actorUserId: "coach_1", reviewerRole: "coach", trustedServerSide: false }
      })
    ).toMatchObject({ allowed: false, reason: expect.stringContaining("trusted server-side") });
  });

  it("exposes policy scope for evidence traceability", () => {
    expect(reviewerWorkflowScope()).toContain("audited");
  });
});
