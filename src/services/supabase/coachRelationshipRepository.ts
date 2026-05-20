import type { CornerSupabaseClient } from "./client";
import type { TableInsert, TableRow } from "./repositoryTypes";
import { assertUserId, payloadObject, readDataOrThrow, readMaybeDataOrThrow, toJson } from "./repositoryTypes";

export type AthleteCoachRelationshipStatus = "pending" | "active" | "revoked";

export interface AthleteCoachRelationship {
  id: string;
  athleteUserId: string;
  coachUserId: string;
  status: AthleteCoachRelationshipStatus;
  permissions: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface RequestCoachRelationshipInput {
  athleteUserId: string;
  coachUserId: string;
  permissions?: Record<string, unknown> | undefined;
}

export interface RevokeCoachRelationshipInput {
  requestingUserId: string;
  relationshipId: string;
}

type AthleteCoachRelationshipRow = Pick<TableRow<"athlete_coach_relationships">, "id" | "athlete_user_id" | "coach_user_id" | "status" | "permissions" | "created_at" | "updated_at">;

function relationshipStatus(value: string, context: string): AthleteCoachRelationshipStatus {
  if (value === "pending" || value === "active" || value === "revoked") {
    return value;
  }
  throw new Error(`${context}: unknown athlete-coach relationship status ${value}`);
}

export function mapAthleteCoachRelationshipRow(row: AthleteCoachRelationshipRow): AthleteCoachRelationship {
  return {
    id: row.id,
    athleteUserId: row.athlete_user_id,
    coachUserId: row.coach_user_id,
    status: relationshipStatus(row.status, "athlete_coach_relationships.status"),
    permissions: payloadObject(row.permissions, "athlete_coach_relationships.permissions"),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createCoachRelationshipRepository(client: CornerSupabaseClient) {
  return {
    async listCoachRelationshipsForAthlete(athleteUserId: string): Promise<AthleteCoachRelationship[]> {
      const safeAthleteUserId = assertUserId(athleteUserId, "athlete_coach_relationships.listCoachRelationshipsForAthlete");
      const response = await client
        .from("athlete_coach_relationships")
        .select("id, athlete_user_id, coach_user_id, status, permissions, created_at, updated_at")
        .eq("athlete_user_id", safeAthleteUserId)
        .order("created_at", { ascending: false });
      return readDataOrThrow(response, "athlete_coach_relationships.listCoachRelationshipsForAthlete").map(mapAthleteCoachRelationshipRow);
    },

    async listAthletesForCoach(coachUserId: string): Promise<AthleteCoachRelationship[]> {
      const safeCoachUserId = assertUserId(coachUserId, "athlete_coach_relationships.listAthletesForCoach");
      const response = await client
        .from("athlete_coach_relationships")
        .select("id, athlete_user_id, coach_user_id, status, permissions, created_at, updated_at")
        .eq("coach_user_id", safeCoachUserId)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      return readDataOrThrow(response, "athlete_coach_relationships.listAthletesForCoach").map(mapAthleteCoachRelationshipRow);
    },

    async requestCoachRelationship(input: RequestCoachRelationshipInput): Promise<{ id: string }> {
      const athleteUserId = assertUserId(input.athleteUserId, "athlete_coach_relationships.requestCoachRelationship.athlete");
      const coachUserId = assertUserId(input.coachUserId, "athlete_coach_relationships.requestCoachRelationship.coach");
      const record: TableInsert<"athlete_coach_relationships"> = {
        athlete_user_id: athleteUserId,
        coach_user_id: coachUserId,
        status: "pending",
        permissions: toJson(input.permissions ?? {})
      };
      const response = await client.from("athlete_coach_relationships").insert(record).select("id").single();
      return readDataOrThrow(response, "athlete_coach_relationships.requestCoachRelationship");
    },

    async revokeCoachRelationship(input: RevokeCoachRelationshipInput): Promise<{ id: string }> {
      const requestingUserId = assertUserId(input.requestingUserId, "athlete_coach_relationships.revokeCoachRelationship");
      const response = await client
        .from("athlete_coach_relationships")
        .update({ status: "revoked" })
        .eq("id", input.relationshipId)
        .or(`athlete_user_id.eq.${requestingUserId},coach_user_id.eq.${requestingUserId}`)
        .select("id")
        .single();
      return readDataOrThrow(response, "athlete_coach_relationships.revokeCoachRelationship");
    },

    async hasActiveCoachRelationship(athleteUserId: string, coachUserId: string): Promise<boolean> {
      const safeAthleteUserId = assertUserId(athleteUserId, "athlete_coach_relationships.hasActiveCoachRelationship.athlete");
      const safeCoachUserId = assertUserId(coachUserId, "athlete_coach_relationships.hasActiveCoachRelationship.coach");
      const response = await client
        .from("athlete_coach_relationships")
        .select("id")
        .eq("athlete_user_id", safeAthleteUserId)
        .eq("coach_user_id", safeCoachUserId)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      return readMaybeDataOrThrow(response, "athlete_coach_relationships.hasActiveCoachRelationship") !== null;
    }
  };
}
