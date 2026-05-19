import type { GeneratedTrainingSession, PhaseState, ReadinessState } from "../core/types";

export function generateSupportSession(input: {
  date: string;
  phase: PhaseState;
  readiness: ReadinessState;
  hasSparring: boolean;
  highCycleSymptoms: boolean;
  index: number;
}): GeneratedTrainingSession {
  if (input.readiness.color === "red") {
    return {
      id: `generated:${input.date}:recovery`,
      date: input.date,
      family: "recovery_reset",
      title: "Recovery reset",
      durationMinutes: 20,
      intensity: "recovery",
      prescription: ["Easy breathing reset", "Hip and thoracic mobility", "Light walk if symptoms allow"],
      rationale: "Red readiness blocks hard generated work.",
      protects: ["health", "tomorrow’s boxing"],
      modifications: ["Hard work removed"],
      fuelDemand: "low"
    };
  }

  if (input.hasSparring) {
    return {
      id: `generated:${input.date}:sparring-support`,
      date: input.date,
      family: "shoulder_scap_durability",
      title: "Sparring support microdose",
      durationMinutes: input.highCycleSymptoms ? 15 : 25,
      intensity: "easy",
      prescription: ["Scap push-up 2 x 8", "Band external rotation 2 x 12", "Dead bug 2 x 6/side", "Easy mobility"],
      rationale: "Sparring owns today’s hard stress, so support work stays short.",
      protects: ["sparring quality", "shoulders", "trunk stiffness"],
      modifications: input.highCycleSymptoms ? ["Trimmed for high cycle symptoms"] : [],
      fuelDemand: "high"
    };
  }

  if (input.phase.phase === "fight_week") {
    return {
      id: `generated:${input.date}:taper`,
      date: input.date,
      family: "taper_maintenance",
      title: "Speed maintenance taper",
      durationMinutes: 25,
      intensity: "easy",
      prescription: ["Dynamic warm-up", "Low-volume med ball throws", "Fast relaxed shadowboxing quality", "Mobility cooldown"],
      rationale: "Fight week preserves speed and drops volume.",
      protects: ["speed", "freshness"],
      modifications: input.highCycleSymptoms ? ["Optional volume trimmed for symptoms"] : [],
      fuelDemand: "moderate"
    };
  }

  if (input.index % 3 === 0) {
    return {
      id: `generated:${input.date}:strength`,
      date: input.date,
      family: "strength_full_body",
      title: "Boxing strength support",
      durationMinutes: input.highCycleSymptoms ? 30 : 45,
      intensity: input.highCycleSymptoms ? "moderate" : "hard",
      prescription: ["Movement prep", "Trap bar deadlift RPE 7", "Split squat", "Row variation", "Anti-rotation press", "Cooldown"],
      rationale: "Builds force and trunk control without replacing boxing practice.",
      protects: ["punch transfer", "stance durability"],
      modifications: input.highCycleSymptoms ? ["Main lift kept, accessory volume trimmed"] : [],
      fuelDemand: "high"
    };
  }

  if (input.index % 3 === 1) {
    return {
      id: `generated:${input.date}:roadwork`,
      date: input.date,
      family: "roadwork_zone2",
      title: "Zone 2 roadwork",
      durationMinutes: 35,
      intensity: "easy",
      prescription: ["RPE 3-4", "Talk-test pace", "Nasal breathing if comfortable", "Stop if pain changes gait"],
      rationale: "Builds aerobic base and recovery capacity for boxing rounds.",
      protects: ["recovery between rounds", "camp durability"],
      modifications: [],
      fuelDemand: "moderate"
    };
  }

  return {
    id: `generated:${input.date}:power`,
    date: input.date,
    family: "power_rotational",
    title: "Rotational power",
    durationMinutes: 30,
    intensity: "moderate",
    prescription: ["Dynamic warm-up", "Med ball rotational throw", "Low-volume jumps", "Full recovery between efforts", "Stop when speed drops"],
    rationale: "Power work stays crisp and low-volume so boxing quality is protected.",
    protects: ["punch transfer", "speed"],
    modifications: [],
    fuelDemand: "moderate"
  };
}
