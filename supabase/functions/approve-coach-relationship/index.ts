import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ApprovalRequest = {
  relationshipId?: unknown;
  permissions?: unknown;
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function permissionsObject(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "POST required" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Function environment is missing trusted Supabase credentials." }, 500);
  }

  const payload = (await request.json().catch(() => ({}))) as ApprovalRequest;
  if (typeof payload.relationshipId !== "string" || payload.relationshipId.length === 0) {
    return jsonResponse({ error: "relationshipId is required." }, 400);
  }

  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return jsonResponse({ error: "Authorization header is required." }, 401);
  }

  // Production gate: verify the caller is the athlete, an approved admin, or a
  // trusted consent workflow before activating coach authority.
  const authorizationVerified = false;
  if (!authorizationVerified) {
    return jsonResponse({ error: "Coach approval authorization is not implemented yet." }, 403);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await admin
    .from("athlete_coach_relationships")
    .update({
      status: "active",
      permissions: permissionsObject(payload.permissions)
    })
    .eq("id", payload.relationshipId)
    .eq("status", "pending")
    .select("id, athlete_user_id, coach_user_id, status, permissions")
    .single();

  if (error) {
    return jsonResponse({ error: error.message }, 400);
  }

  return jsonResponse({ relationship: data });
});
