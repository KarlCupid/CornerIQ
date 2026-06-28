import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ACCOUNT_DELETION_CORS_HEADERS,
  bearerToken,
  PARTICIPANT_OWNED_TABLES,
  validatePayload,
  USER_ID_OWNED_TABLES,
  type AccountDeletionPayload,
  type UserOwnedTable
} from "./policy.ts";

type UserOwnedDeleteResult = {
  [TTable in UserOwnedTable]: {
    count: number | null;
    status: "deleted";
  };
};

type FailureCode = "method_not_allowed" | "missing_bearer" | "bad_payload" | "missing_trusted_env" | "invalid_token" | "app_data_delete_failed" | "auth_delete_failed";

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...ACCOUNT_DELETION_CORS_HEADERS, "content-type": "application/json" }
  });
}

function failure(status: number, code: FailureCode, message: string): Response {
  return jsonResponse({ status: "failed", code, message }, status);
}

async function deleteUserOwnedRows(admin: ReturnType<typeof createClient>, userId: string): Promise<UserOwnedDeleteResult> {
  const result: Partial<UserOwnedDeleteResult> = {};

  for (const table of USER_ID_OWNED_TABLES) {
    const response = await admin.from(table).delete({ count: "exact" }).eq("user_id", userId);
    if (response.error) {
      throw new Error(`Unable to delete ${table}.`);
    }
    result[table] = {
      count: response.count ?? null,
      status: "deleted"
    };
  }
  for (const table of PARTICIPANT_OWNED_TABLES) {
    const response = await admin
      .from(table)
      .delete({ count: "exact" })
      .or(`athlete_user_id.eq.${userId},coach_user_id.eq.${userId}`);
    if (response.error) {
      throw new Error(`Unable to delete ${table}.`);
    }
    result[table] = {
      count: response.count ?? null,
      status: "deleted"
    };
  }

  return result as UserOwnedDeleteResult;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: ACCOUNT_DELETION_CORS_HEADERS, status: 204 });
  }

  if (request.method !== "POST") {
    return failure(405, "method_not_allowed", "POST required.");
  }

  const token = bearerToken(request.headers.get("authorization"));
  if (!token) {
    return failure(401, "missing_bearer", "Authorization Bearer token is required.");
  }

  const payload = (await request.json().catch(() => ({}))) as AccountDeletionPayload;
  const parsed = validatePayload(payload);
  if ("error" in parsed) {
    return failure(400, "bad_payload", parsed.error);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const trustedKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !trustedKey) {
    return failure(500, "missing_trusted_env", "Function environment is missing trusted Supabase credentials.");
  }

  const admin = createClient(supabaseUrl, trustedKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const userResult = await admin.auth.getUser(token);
  if (userResult.error || !userResult.data.user) {
    return failure(401, "invalid_token", "Invalid or expired Authorization token.");
  }

  const callerUserId = userResult.data.user.id;
  let appDataDeletion: UserOwnedDeleteResult;
  try {
    appDataDeletion = await deleteUserOwnedRows(admin, callerUserId);
  } catch {
    return failure(500, "app_data_delete_failed", "Unable to delete user-owned app rows. Account deletion was not completed.");
  }

  const deleteResult = await admin.auth.admin.deleteUser(callerUserId);
  if (deleteResult.error) {
    return failure(500, "auth_delete_failed", "App data was deleted, but the sign-in identity could not be deleted. Retry account deletion from Profile.");
  }

  return jsonResponse({
    appDataDeletion,
    deletedAt: new Date().toISOString(),
    signOutRequired: true,
    status: "deleted",
    userId: callerUserId
  });
});
