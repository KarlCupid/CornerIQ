export type ApprovalRequest = {
  relationshipId?: unknown;
  permissions?: unknown;
};

export type CoachApprovalPermissionKey =
  | "view_training_plan"
  | "view_readiness_context"
  | "comment_on_plan"
  | "suggest_adjustments";

export type PendingCoachRelationshipRow = {
  id: string;
  athlete_user_id: string;
  coach_user_id: string;
  status: string;
};

export const allowedPermissionKeys: readonly CoachApprovalPermissionKey[] = [
  "view_training_plan",
  "view_readiness_context",
  "comment_on_plan",
  "suggest_adjustments"
];

const allowedPermissionKeySet = new Set<string>(allowedPermissionKeys);

export function bearerToken(authorization: string | null): string | null {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function validatePayload(payload: ApprovalRequest): { relationshipId: string; permissions: Record<string, boolean> } | { error: string } {
  if (typeof payload.relationshipId !== "string" || payload.relationshipId.trim().length === 0) {
    return { error: "relationshipId is required." };
  }
  const sourcePermissions = payload.permissions === undefined ? {} : objectRecord(payload.permissions);
  if (!sourcePermissions) {
    return { error: "permissions must be an object when provided." };
  }
  const permissions: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(sourcePermissions)) {
    if (!allowedPermissionKeySet.has(key)) {
      return { error: `Unsupported permission: ${key}` };
    }
    if (typeof value !== "boolean") {
      return { error: `Permission ${key} must be boolean.` };
    }
    permissions[key] = value;
  }
  return { relationshipId: payload.relationshipId.trim(), permissions };
}

export function approvalEligibility(input: {
  callerUserId: string;
  relationship: PendingCoachRelationshipRow;
}): { allowed: true } | { allowed: false; status: number; error: string } {
  if (input.relationship.status !== "pending") {
    return { allowed: false, status: 404, error: "Pending relationship was not found." };
  }
  if (input.relationship.athlete_user_id !== input.callerUserId) {
    return { allowed: false, status: 403, error: "Only the athlete can approve this pending relationship." };
  }
  return { allowed: true };
}
