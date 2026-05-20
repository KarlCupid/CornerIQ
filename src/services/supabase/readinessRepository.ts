import { ReadinessCheckInSchema } from "../../engine/core/schemas";
import type { ISODateString, ReadinessCheckIn } from "../../engine/core/types";
import type { CornerSupabaseClient } from "./client";
import type { TableInsert, TableRow } from "./repositoryTypes";
import { assertUserId, parseWithSchema, payloadObject, readDataOrThrow, toJson } from "./repositoryTypes";

export type ReadinessCheckInRow = Pick<TableRow<"readiness_checkins">, "checkin_date" | "checkin_payload">;

export interface CreateReadinessCheckInInput {
  userId: string;
  date: ISODateString;
  sleepHours?: number;
  sleepQuality1To5?: number;
  energy1To5?: number;
  soreness1To5?: number;
  stress1To5?: number;
  mood1To5?: number;
  painNotes?: readonly string[];
  illnessSymptoms?: readonly string[];
  dizziness?: boolean;
  fainting?: boolean;
  metadata?: Record<string, unknown>;
  urineColor?: ReadinessCheckIn["urineColor"];
}

export function mapReadinessCheckInRow(row: ReadinessCheckInRow): ReadinessCheckIn {
  return parseWithSchema(
    ReadinessCheckInSchema,
    {
      ...payloadObject(row.checkin_payload, "readiness_checkins.checkin_payload"),
      date: row.checkin_date
    },
    "readiness_checkins"
  );
}

export function createReadinessRepository(client: CornerSupabaseClient) {
  return {
    async listCheckIns(userId: string): Promise<ReadinessCheckIn[]> {
      const safeUserId = assertUserId(userId, "readiness_checkins.listCheckIns");
      const response = await client
        .from("readiness_checkins")
        .select("checkin_date, checkin_payload")
        .eq("user_id", safeUserId)
        .order("checkin_date", { ascending: true });
      return readDataOrThrow(response, "readiness_checkins.listCheckIns").map(mapReadinessCheckInRow);
    },

    async insertCheckIn(input: CreateReadinessCheckInInput): Promise<{ id: string }> {
      const safeUserId = assertUserId(input.userId, "readiness_checkins.insertCheckIn");
      const checkIn = parseWithSchema(
        ReadinessCheckInSchema,
        {
          date: input.date,
          sleepHours: input.sleepHours,
          sleepQuality1To5: input.sleepQuality1To5,
          energy1To5: input.energy1To5,
          soreness1To5: input.soreness1To5,
          stress1To5: input.stress1To5,
          mood1To5: input.mood1To5,
          painNotes: input.painNotes ?? [],
          illnessSymptoms: input.illnessSymptoms ?? [],
          dizziness: input.dizziness ?? false,
          fainting: input.fainting ?? false,
          urineColor: input.urineColor,
          metadata: input.metadata
        },
        "readiness_checkins.insertCheckIn"
      );
      const insert: TableInsert<"readiness_checkins"> = {
        user_id: safeUserId,
        checkin_date: input.date,
        checkin_payload: toJson({
          ...checkIn,
          metadata: input.metadata
        })
      };
      const response = await client.from("readiness_checkins").insert(insert).select("id").single();
      return readDataOrThrow(response, "readiness_checkins.insertCheckIn");
    }
  };
}
