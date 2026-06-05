import { describe, expect, it } from "vitest";
import { BETA_FEEDBACK_CATEGORIES } from "../../services/supabase/betaFeedbackRepository";
import { canTransitionBetaFeedbackStatus, feedbackTriageScope } from "../../services/feedback/feedbackTriagePolicy";

describe("feedback triage policy", () => {
  it("normalizes incident categories used by the athlete app", () => {
    expect(BETA_FEEDBACK_CATEGORIES).toEqual(
      expect.arrayContaining(["safety_concern", "exposed_secret", "data_deletion_export_issue", "unsafe_generated_output", "app_crash", "confusing_flow"])
    );
  });

  it("denies normal athlete clients from marking reports reviewed, resolved, or dismissed", () => {
    for (const targetStatus of ["reviewed", "resolved", "dismissed"] as const) {
      const decision = canTransitionBetaFeedbackStatus({
        actor: { actorType: "athlete", actorUserId: "user_1", trustedServerSide: false },
        currentStatus: "received",
        targetStatus
      });

      expect(decision.allowed).toBe(false);
      expect(decision.auditRequired).toBe(false);
      expect(decision.reason).toContain("trusted server-side");
    }
  });

  it("allows trusted private triage only when an audit event is required", () => {
    const decision = canTransitionBetaFeedbackStatus({
      actor: { actorType: "reviewer", actorUserId: "reviewer_1", trustedServerSide: true },
      currentStatus: "received",
      targetStatus: "reviewed"
    });

    expect(decision.allowed).toBe(true);
    expect(decision.auditRequired).toBe(true);
    expect(feedbackTriageScope()).toContain("cannot mark reports reviewed");
  });
});
