import type { BetaFeedbackStatus } from "../supabase/betaFeedbackRepository";

export type BetaFeedbackTriageActorType = "athlete" | "reviewer" | "admin" | "system";

export interface BetaFeedbackTriageActor {
  actorType: BetaFeedbackTriageActorType;
  actorUserId: string | null;
  trustedServerSide: boolean;
}

export interface BetaFeedbackStatusTransitionInput {
  actor: BetaFeedbackTriageActor;
  currentStatus: BetaFeedbackStatus;
  targetStatus: BetaFeedbackStatus;
}

export interface BetaFeedbackStatusTransitionDecision {
  allowed: boolean;
  auditRequired: boolean;
  reason: string;
}

const writableStatuses: readonly BetaFeedbackStatus[] = ["reviewed", "resolved", "dismissed"];

export function canTransitionBetaFeedbackStatus(input: BetaFeedbackStatusTransitionInput): BetaFeedbackStatusTransitionDecision {
  if (input.currentStatus === input.targetStatus) {
    return {
      allowed: false,
      auditRequired: false,
      reason: "No status change requested."
    };
  }

  if (!writableStatuses.includes(input.targetStatus)) {
    return {
      allowed: false,
      auditRequired: false,
      reason: "Athlete app clients can submit feedback as received, but cannot assign triage status."
    };
  }

  const trustedReviewer = (input.actor.actorType === "reviewer" || input.actor.actorType === "admin") && input.actor.trustedServerSide && Boolean(input.actor.actorUserId);
  if (!trustedReviewer) {
    return {
      allowed: false,
      auditRequired: false,
      reason: "Feedback triage status changes require trusted server-side reviewer/admin identity."
    };
  }

  return {
    allowed: true,
    auditRequired: true,
    reason: "Trusted private triage can update feedback status when an audit event is written."
  };
}

export function feedbackTriageScope(): string {
  return "Normal athlete app clients can submit feedback and read status history, but cannot mark reports reviewed, resolved, or dismissed.";
}
