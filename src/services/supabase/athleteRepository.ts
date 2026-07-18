import { AthleteProfileSchema } from "../../engine/core/schemas";
import type { AthleteProfile } from "../../engine/core/types";
import { normalizeEquipmentAccess } from "../../engine/athlete/equipmentAccess";
import type { CornerSupabaseClient } from "./client";
import type { TableInsert, TableRow } from "./repositoryTypes";
import { RepositoryError, assertUserId, parseWithSchema, payloadObject, readDataOrThrow, readMaybeDataOrThrow, toJson } from "./repositoryTypes";

export type AthleteProfileRow = Pick<TableRow<"athlete_profiles">, "profile">;

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function booleanValue(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function normalizeLegacyAthleteProfilePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const profile: Record<string, unknown> = { ...payload };
  for (const obsoleteField of [
    "injuryHistory",
    "medicalFlags",
    "medications",
    "pregnancyStatus",
    "eatingDisorderRisk",
    "priorWeightCutHistory",
    "medicalProfessionalInvolved"
  ]) {
    delete profile[obsoleteField];
  }

  if (!("currentBodyMass" in profile)) {
    profile.currentBodyMass = null;
  }
  if (!("typicalWalkAroundWeightKg" in profile)) {
    profile.typicalWalkAroundWeightKg = null;
  }
  if (!("lowestRecentFightingWeightKg" in profile)) {
    profile.lowestRecentFightingWeightKg = null;
  }
  profile.coachInvolved = booleanValue(profile.coachInvolved);
  profile.dietitianInvolved = booleanValue(profile.dietitianInvolved);
  profile.equipmentAccess = normalizeEquipmentAccess(stringArray(profile.equipmentAccess));
  if (!Array.isArray(profile.scheduleAvailability)) {
    profile.scheduleAvailability = [];
  }
  if (!Array.isArray(profile.protectedBoxingSchedule)) {
    profile.protectedBoxingSchedule = [];
  }
  if (!Array.isArray(profile.recurringProtectedAnchors)) {
    profile.recurringProtectedAnchors = [];
  }
  if (profile.cycleTrackingPreference !== "enabled" && profile.cycleTrackingPreference !== "disabled" && profile.cycleTrackingPreference !== "undecided") {
    profile.cycleTrackingPreference = "undecided";
  }
  if (profile.wearablePreference !== "manual_only" && profile.wearablePreference !== "wearable_connected" && profile.wearablePreference !== "undecided") {
    profile.wearablePreference = "manual_only";
  }
  return profile;
}

export function mapAthleteProfileRow(row: AthleteProfileRow): AthleteProfile {
  return parseWithSchema(AthleteProfileSchema, normalizeLegacyAthleteProfilePayload(payloadObject(row.profile, "athlete_profiles.profile")), "athlete_profiles.profile");
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
      const validated = parseWithSchema(AthleteProfileSchema, { ...profile, equipmentAccess: normalizeEquipmentAccess(profile.equipmentAccess) }, "athlete_profiles.upsertProfile");
      const existingResponse = await client.from("athlete_profiles").select("id").eq("user_id", safeUserId).limit(1).maybeSingle();
      if (existingResponse.error) {
        throw new RepositoryError("remote_error", "athlete_profiles.upsertProfile.findExisting", existingResponse.error.message);
      }
      const existing = existingResponse.data as { id: string } | null;
      const profileJson = toJson(validated);
      const insert: TableInsert<"athlete_profiles"> = {
        user_id: safeUserId,
        profile: profileJson,
        sensitive_cycle: toJson({})
      };
      const response = existing
        ? await client.from("athlete_profiles").update({ profile: profileJson }).eq("id", existing.id).select("id").single()
        : await client.from("athlete_profiles").insert(insert).select("id").single();
      return readDataOrThrow(response, "athlete_profiles.upsertProfile");
    }
  };
}
