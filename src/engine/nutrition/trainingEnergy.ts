import { round } from "../core/math";
import type { GeneratedTrainingSession, ProtectedWorkout } from "../core/types";
import { assertFuelEvidenceIds } from "./evidenceRegistry";

export const TRAINING_ENERGY_EVIDENCE_IDS = ["training_energy_met_context_by_demand"] as const;

function generatedSessionMet(session: GeneratedTrainingSession): number {
  if (session.fuelDemand === "high" || session.intensity === "hard") {
    return session.family === "roadwork_zone2" ? 7 : 9;
  }
  if (session.fuelDemand === "moderate" || session.intensity === "moderate") {
    return session.trainingStimulus === "strength" || session.trainingStimulus === "power" ? 6 : 5.5;
  }
  return session.trainingStimulus === "mobility" || session.trainingStimulus === "recovery" ? 2.5 : 4;
}

function protectedAnchorMet(anchor: ProtectedWorkout): number {
  if (anchor.type === "sparring" || anchor.type === "competition") {
    return anchor.intensity === "max" ? 10 : 9;
  }
  if (anchor.type === "roadwork") {
    return anchor.intensity === "hard" || anchor.intensity === "max" ? 8 : 6;
  }
  if (anchor.type === "coach_assigned_strength") {
    return anchor.intensity === "hard" || anchor.intensity === "max" ? 6.5 : 5;
  }
  if (anchor.intensity === "hard" || anchor.intensity === "max") {
    return 7;
  }
  return anchor.intensity === "moderate" ? 5 : 3;
}

function energyFromMet(input: { met: number; bodyMassKg: number; durationMinutes: number }): number {
  const netMet = Math.max(input.met - 1, 0);
  return (netMet * 3.5 * input.bodyMassKg * input.durationMinutes) / 200;
}

export function estimateGeneratedSessionEnergyKcal(session: GeneratedTrainingSession, bodyMassKg: number): number {
  assertFuelEvidenceIds(TRAINING_ENERGY_EVIDENCE_IDS, "estimateGeneratedSessionEnergyKcal");
  return round(energyFromMet({ met: generatedSessionMet(session), bodyMassKg, durationMinutes: session.durationMinutes }));
}

export function estimateProtectedAnchorEnergyKcal(anchor: ProtectedWorkout, bodyMassKg: number): number {
  assertFuelEvidenceIds(TRAINING_ENERGY_EVIDENCE_IDS, "estimateProtectedAnchorEnergyKcal");
  return round(energyFromMet({ met: protectedAnchorMet(anchor), bodyMassKg, durationMinutes: anchor.durationMinutes }));
}

export function estimatePlannedExerciseEnergyKcal(input: {
  generatedSessions: readonly GeneratedTrainingSession[];
  protectedAnchors: readonly ProtectedWorkout[];
  bodyMassKg: number;
  date?: string | undefined;
}): number {
  assertFuelEvidenceIds(TRAINING_ENERGY_EVIDENCE_IDS, "estimatePlannedExerciseEnergyKcal");
  const sessions = input.date ? input.generatedSessions.filter((session) => session.date === input.date) : input.generatedSessions;
  const anchors = input.date ? input.protectedAnchors.filter((anchor) => anchor.date === input.date) : input.protectedAnchors;
  const generated = sessions.reduce((sum, session) => sum + estimateGeneratedSessionEnergyKcal(session, input.bodyMassKg), 0);
  const protectedWork = anchors.reduce((sum, anchor) => sum + estimateProtectedAnchorEnergyKcal(anchor, input.bodyMassKg), 0);
  return Math.round(generated + protectedWork);
}
