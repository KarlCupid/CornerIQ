import type {
  NutritionSafetyReviewActorType,
  NutritionSafetyReviewEventType,
  NutritionSafetyReviewerRole,
  NutritionSafetyReviewStatus
} from "./nutritionSafetyReviewTypes";

export interface NutritionSafetyReviewerActor {
  actorType: NutritionSafetyReviewActorType;
  actorUserId: string | null;
  reviewerRole: NutritionSafetyReviewerRole | null;
  trustedServerSide: boolean;
}

export interface NutritionSafetyReviewTransitionInput {
  currentStatus: NutritionSafetyReviewStatus;
  targetStatus: NutritionSafetyReviewStatus;
  actor: NutritionSafetyReviewerActor;
}

export interface NutritionSafetyReviewTransitionDecision {
  allowed: boolean;
  auditEventType: NutritionSafetyReviewEventType | null;
  reason: string;
}

const REVIEWER_ACTORS: readonly NutritionSafetyReviewActorType[] = ["coach", "clinician", "dietitian", "admin"];

function isReviewerActor(actor: NutritionSafetyReviewerActor): boolean {
  return REVIEWER_ACTORS.includes(actor.actorType) && actor.reviewerRole !== null && Boolean(actor.actorUserId);
}

export function canTransitionNutritionSafetyReview(input: NutritionSafetyReviewTransitionInput): NutritionSafetyReviewTransitionDecision {
  if (input.targetStatus === "acknowledged_by_athlete") {
    const canAcknowledge = input.currentStatus === "requested" || input.currentStatus === "not_cleared";
    return input.actor.actorType === "athlete" && canAcknowledge
      ? {
          allowed: true,
          auditEventType: "acknowledged_by_athlete",
          reason: "Athlete may acknowledge an active review state, but this never resolves a safety stop."
        }
      : {
          allowed: false,
          auditEventType: null,
          reason: "Athlete acknowledgement is only valid from requested or not-cleared status."
        };
  }

  if (input.targetStatus === "reviewer_reviewing") {
    return isReviewerActor(input.actor) && input.actor.trustedServerSide
      ? {
          allowed: true,
          auditEventType: "reviewer_reviewing",
          reason: "Permissioned reviewer can mark a review in progress through the trusted server path."
        }
      : {
          allowed: false,
          auditEventType: null,
          reason: "Reviewer review status requires trusted server-side reviewer identity."
        };
  }

  if (input.targetStatus === "cleared_by_reviewer" || input.targetStatus === "not_cleared") {
    if (isReviewerActor(input.actor) && input.actor.trustedServerSide) {
      return {
        allowed: true,
        auditEventType: input.targetStatus,
        reason: "Reviewer decision requires trusted server-side identity and must create an audit event."
      };
    }

    return isReviewerActor(input.actor)
      ? {
          allowed: false,
          auditEventType: null,
          reason: "Reviewer decision requires trusted server-side identity and audit."
        }
      : {
          allowed: false,
          auditEventType: null,
          reason: "Athlete clients cannot resolve or mark nutrition safety reviews not cleared."
        };
  }

  if (input.targetStatus === "superseded") {
    return input.actor.actorType === "engine" || (isReviewerActor(input.actor) && input.actor.trustedServerSide)
      ? {
          allowed: true,
          auditEventType: "superseded",
          reason: "Engine or trusted reviewer may supersede stale non-hard-stop review state."
        }
      : {
          allowed: false,
          auditEventType: null,
          reason: "Supersede requires engine or trusted reviewer authority."
        };
  }

  return {
    allowed: false,
    auditEventType: null,
    reason: "Unsupported review transition."
  };
}

export function reviewerWorkflowScope(): string {
  return "Nutrition reviewer decisions are centralized, audited, and unavailable to athlete in-app resolution paths.";
}
