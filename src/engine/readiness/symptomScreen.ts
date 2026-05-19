import type { ReadinessCheckIn } from "../core/types";

export function hasHardStopSymptom(checkIn: ReadinessCheckIn): boolean {
  return checkIn.dizziness || checkIn.fainting || checkIn.illnessSymptoms.length > 0;
}
