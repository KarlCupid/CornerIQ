import { z } from "zod";

export const massSchema = z.object({
  value: z.number().positive(),
  unit: z.enum(["kg", "lb"])
});

export const heightSchema = z.object({
  value: z.number().positive(),
  unit: z.enum(["cm", "in"])
});

export const athleteProfileSchema = z.object({
  athleteId: z.string().min(1),
  preferredName: z.string().trim().min(1).optional(),
  dateOfBirth: z.string().optional(),
  ageYears: z.number().int().positive().optional(),
  sexAtBirth: z.enum(["female", "male", "intersex", "prefer_not_to_say"]).optional(),
  gender: z.string().optional(),
  pronouns: z.string().optional(),
  height: heightSchema,
  currentBodyMass: massSchema.nullable(),
  preferredUnits: z.enum(["metric", "imperial"]),
  boxingLevel: z.enum([
    "aspiring_boxer",
    "amateur_novice",
    "amateur_open",
    "amateur_elite",
    "pro_development",
    "pro_4_6_round",
    "pro_8_10_round",
    "pro_12_round"
  ]),
  amateurOrPro: z.enum(["amateur", "pro"]),
  stance: z.enum(["orthodox", "southpaw", "switch", "unknown"]).optional(),
  trainingAgeYears: z.number().min(0),
  typicalWalkAroundWeightKg: z.number().positive().nullable(),
  lowestRecentFightingWeightKg: z.number().positive().nullable(),
  coachInvolved: z.boolean(),
  dietitianInvolved: z.boolean(),
  equipmentAccess: z.array(z.string()),
  scheduleAvailability: z.array(z.string()),
  protectedBoxingSchedule: z.array(z.unknown()),
  cycleTrackingPreference: z.enum(["enabled", "disabled", "undecided"]),
  wearablePreference: z.enum(["manual_only", "wearable_connected", "undecided"])
});
