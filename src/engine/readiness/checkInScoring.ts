import { clamp } from "../core/math";
import type { ReadinessCheckIn } from "../core/types";

export function scoreCheckIn(checkIn: ReadinessCheckIn): number {
  const sleep = checkIn.sleepQuality1To5 ?? 3;
  const energy = checkIn.energy1To5 ?? 3;
  const soreness = 6 - (checkIn.soreness1To5 ?? 3);
  const stress = 6 - (checkIn.stress1To5 ?? 3);
  const mood = checkIn.mood1To5 ?? 3;
  const base = ((sleep + energy + soreness + stress + mood) / 25) * 100;
  const illnessPenalty = checkIn.illnessSymptoms.length > 0 ? 25 : 0;
  const painPenalty = checkIn.painNotes.length > 0 ? 10 : 0;
  const hardPenalty = checkIn.dizziness || checkIn.fainting ? 40 : 0;
  return Math.round(clamp(base - illnessPenalty - painPenalty - hardPenalty, 0, 100));
}
