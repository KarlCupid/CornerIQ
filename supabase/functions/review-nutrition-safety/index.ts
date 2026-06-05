import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { evaluateReviewNutritionSafetyPolicy } from "./policy.ts";

type RequestBody = {
  reviewId?: string;
  athleteUserId?: string;
  reviewerRole?: string;
  targetStatus?: string;
  note?: string;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status
  });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "POST is required." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!supabaseUrl || !serviceKey || !anonKey || !token) {
    return jsonResponse(401, { error: "Trusted Supabase credentials and reviewer JWT are required." });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const body = (await request.json().catch(() => ({}))) as RequestBody;
  const userResult = await admin.auth.getUser(token);
  const callerUserId = userResult.data.user?.id ?? "";
  const policy = evaluateReviewNutritionSafetyPolicy({
    callerUserId,
    reviewerRole: body.reviewerRole ?? "",
    relationshipActive: false,
    requestedStatus: body.targetStatus ?? ""
  });

  if (!policy.allowed) {
    return jsonResponse(403, { error: policy.reason });
  }

  return jsonResponse(501, {
    error: "Reviewer transition persistence is intentionally not enabled until relationship lookup is wired.",
    reviewId: body.reviewId ?? null,
    athleteUserId: body.athleteUserId ?? null
  });
});
