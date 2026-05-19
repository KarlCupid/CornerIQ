import { AthleteProfileSchema } from "../../engine/core/schemas";
import type { AthleteProfile } from "../../engine/core/types";
import type { CornerSupabaseClient } from "./client";
import type { TableInsert, TableRow } from "./repositoryTypes";
import { RepositoryError, assertUserId, parseWithSchema, payloadObject, readDataOrThrow, readMaybeDataOrThrow, toJson } from "./repositoryTypes";

export type AthleteProfileRow = Pick<TableRow<"athlete_profiles">, "profile">;

export function mapAthleteProfileRow(row: AthleteProfileRow): AthleteProfile {
  return parseWithSchema(AthleteProfileSchema, payloadObject(row.profile, "athlete_profiles.profile"), "athlete_profiles.profile");
}

export function createAthleteRepository(client: CornerSupabaseClient) {
  return {
    async getProfile(userId: string): Promise<AthleteProfile | null> {
      const safeUserId = assertUserId(userId, "athlete_profiles.getProfile");
      const response = await client.from("athlete_profiles").select("profile").eq("user_id", safeUserId).limit(1).maybeSingle();
      const row = readMaybeDataOrThrow(response, "athlete_profiles.getProfile");
      return row ? mapAthleteProfileRow(row) : null;
    },

    async upsertProfile(userId: string, profile: AthleteProfile): Promise<{ id: string }> {
      const safeUserId = assertUserId(userId, "athlete_profiles.upsertProfile");
      const validated = parseWithSchema(AthleteProfileSchema, profile, "athlete_profiles.upsertProfile");
      const existingResponse = await client.from("athlete_profiles").select("id").eq("user_id", safeUserId).limit(1).maybeSingle();
      if (existingResponse.error) {
        throw new RepositoryError("remote_error", "athlete_profiles.upsertProfile.findExisting", existingResponse.error.message);
      }
      const existing = existingResponse.data as { id: string } | null;
      const profileJson = toJson(validated);
      const insert: TableInsert<"athlete_profiles"> = {
        user_id: safeUserId,
        profile: profileJson,
        sensitive_medical: toJson({}),
        sensitive_cycle: toJson({})
      };
      const response = existing
        ? await client.from("athlete_profiles").update({ profile: profileJson }).eq("id", existing.id).select("id").single()
        : await client.from("athlete_profiles").insert(insert).select("id").single();
      return readDataOrThrow(response, "athlete_profiles.upsertProfile");
    }
  };
}
