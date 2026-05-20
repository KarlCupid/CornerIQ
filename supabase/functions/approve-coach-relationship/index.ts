import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { approvalEligibility, bearerToken, validatePayload, type ApprovalRequest } from "./policy.ts";

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
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
  const eligibility = approvalEligibility({ callerUserId, relationship: relationshipResponse.data });
  if (!eligibility.allowed) {
    return jsonResponse({ error: eligibility.error }, eligibility.status);
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
