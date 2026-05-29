import { ProtectedWorkoutSchema } from "../../engine/core/schemas";
import type { ProtectedWorkout } from "../../engine/core/types";
import type { CornerSupabaseClient } from "./client";
import type { TableInsert, TableRow } from "./repositoryTypes";
import { assertUserId, parseWithSchema, payloadObject, readDataOrThrow, toJson } from "./repositoryTypes";

export type ProtectedWorkoutRow = Pick<TableRow<"protected_workouts">, "id" | "workout_type" | "workout_date" | "workout_payload">;

export interface InsertProtectedWorkoutOptions {
  metadata?: Record<string, unknown>;
}

export function mapProtectedWorkoutRow(row: ProtectedWorkoutRow): ProtectedWorkout {
  const payload = payloadObject(row.workout_payload, "protected_workouts.workout_payload");
  return parseWithSchema(
    ProtectedWorkoutSchema,
    {
      ...payload,
      id: row.id,
      type: row.workout_type,
      date: row.workout_date,
      protected: true
    },
    "protected_workouts"
  );
}

export function createProtectedWorkoutRepository(client: CornerSupabaseClient) {
  return {
    async listProtectedWorkouts(userId: string): Promise<ProtectedWorkout[]> {
      const safeUserId = assertUserId(userId, "protected_workouts.listProtectedWorkouts");
      const response = await client
        .from("protected_workouts")
        .select("id, workout_type, workout_date, workout_payload")
        .eq("user_id", safeUserId)
        .order("workout_date", { ascending: true });
      return readDataOrThrow(response, "protected_workouts.listProtectedWorkouts").map(mapProtectedWorkoutRow);
    },

    async insertProtectedWorkout(userId: string, workout: ProtectedWorkout, options: InsertProtectedWorkoutOptions = {}): Promise<{ id: string }> {
      const safeUserId = assertUserId(userId, "protected_workouts.insertProtectedWorkout");
      const validated = parseWithSchema(ProtectedWorkoutSchema, workout, "protected_workouts.insertProtectedWorkout");
      const insert: TableInsert<"protected_workouts"> = {
        user_id: safeUserId,
        workout_type: validated.type,
        workout_date: validated.date,
        workout_payload: toJson({
          startTime: validated.startTime,
          localStartTime: validated.localStartTime,
          durationMinutes: validated.durationMinutes,
          intensity: validated.intensity,
          rounds: validated.rounds,
          note: validated.note,
          metadata: options.metadata
        })
      };
      const response = await client.from("protected_workouts").insert(insert).select("id").single();
      return readDataOrThrow(response, "protected_workouts.insertProtectedWorkout");
    },

    async updateProtectedWorkout(userId: string, workoutId: string, workout: ProtectedWorkout, options: InsertProtectedWorkoutOptions = {}): Promise<{ id: string }> {
      const safeUserId = assertUserId(userId, "protected_workouts.updateProtectedWorkout");
      const validated = parseWithSchema(ProtectedWorkoutSchema, workout, "protected_workouts.updateProtectedWorkout");
      const response = await client
        .from("protected_workouts")
        .update({
          workout_type: validated.type,
          workout_date: validated.date,
          workout_payload: toJson({
            startTime: validated.startTime,
            localStartTime: validated.localStartTime,
            durationMinutes: validated.durationMinutes,
            intensity: validated.intensity,
            rounds: validated.rounds,
            note: validated.note,
            metadata: options.metadata
          })
        })
        .eq("user_id", safeUserId)
        .eq("id", workoutId)
        .select("id")
        .single();
      return readDataOrThrow(response, "protected_workouts.updateProtectedWorkout");
    },

    async deleteProtectedWorkout(userId: string, workoutId: string): Promise<{ id: string }> {
      const safeUserId = assertUserId(userId, "protected_workouts.deleteProtectedWorkout");
      const response = await client
        .from("protected_workouts")
        .delete()
        .eq("user_id", safeUserId)
        .eq("id", workoutId)
        .select("id")
        .single();
      return readDataOrThrow(response, "protected_workouts.deleteProtectedWorkout");
    },

    async insertProtectedWorkouts(userId: string, workouts: readonly ProtectedWorkout[], options: InsertProtectedWorkoutOptions = {}): Promise<{ ids: string[] }> {
      const ids: string[] = [];
      for (const workout of workouts) {
        const result = await this.insertProtectedWorkout(userId, workout, options);
        ids.push(result.id);
      }
      return { ids };
    }
  };
}
