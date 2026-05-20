import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ApprovalRequest = {
  relationshipId?: unknown;
  permissions?: unknown;
};

const allowedPermissionKeys = new Set(["view_training_plan", "view_readiness_context", "comment_on_plan", "suggest_adjustments"]);

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function bearerToken(authorization: string | null): string | null {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function validatePayload(payload: ApprovalRequest): { relationshipId: string; permissions: Record<string, boolean> } | { error: string } {
  if (typeof payload.relationshipId !== "string" || payload.relationshipId.trim().length === 0) {
    return { error: "relationshipId is required." };
  }
  const sourcePermissions = payload.permissions === undefined ? {} : objectRecord(payload.permissions);
  if (!sourcePermissions) {
    return { error: "permissions must be an object when provided." };
  }
  const permissions: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(sourcePermissions)) {
    if (!allowedPermissionKeys.has(key)) {
      return { error: `Unsupported permission: ${key}` };
    }
    if (typeof value !== "boolean") {
      return { error: `Permission ${key} must be boolean.` };
    }
    permissions[key] = value;
  }
  return { relationshipId: payload.relationshipId, permissions };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "POST required" }, 405);
  }

  const token = bearerToken(request.headers.get("authorization"));
  if (!token) {
    return jsonResponse({ error: "Authorization Bearer token is required." }, 401);
  }

  const payload = (await request.json().catch(() => ({}))) as ApprovalRequest;
  const parsed = validatePayload(payload);
  if ("error" in parsed) {
    return jsonResponse({ error: parsed.error }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Function environment is missing trusted Supabase credentials." }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const userResult = await admin.auth.getUser(token);
  if (userResult.error || !userResult.data.user) {
    return jsonResponse({ error: "Invalid or expired Authorization token." }, 401);
  }

  const callerUserId = userResult.data.user.id;
  const relationshipResponse = await admin
    .from("athlete_coach_relationships")
    .select("id, athlete_user_id, coach_user_id, status")
    .eq("id", parsed.relationshipId)
    .eq("status", "pending")
    .maybeSingle();
  if (relationshipResponse.error) {
    return jsonResponse({ error: "Unable to load pending relationship." }, 400);
  }
  if (!relationshipResponse.data) {
    return jsonResponse({ error: "Pending relationship was not found." }, 404);
  }
  if (relationshipResponse.data.athlete_user_id !== callerUserId) {
    return jsonResponse({ error: "Only the athlete can approve this pending relationship." }, 403);
  }

  // Future admin approval must be asserted by trusted server-side policy, not
  // by a client-provided request flag.
  const { data, error } = await admin
    .from("athlete_coach_relationships")
    .update({
      status: "active",
      permissions: parsed.permissions
    })
    .eq("id", parsed.relationshipId)
    .eq("athlete_user_id", callerUserId)
    .eq("status", "pending")
    .select("id, status")
    .single();

  if (error) {
    return jsonResponse({ error: "Unable to approve relationship." }, 400);
  }

  return jsonResponse({ status: data.status, relationshipId: data.id });
});
