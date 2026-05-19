import type { ProtectedWorkout } from "../core/types";

export function anchorsForDate(anchors: readonly ProtectedWorkout[], date: string): readonly ProtectedWorkout[] {
  return anchors.filter((anchor) => anchor.date === date);
}

export function hasProtectedSparring(anchors: readonly ProtectedWorkout[], date: string): boolean {
  return anchors.some((anchor) => anchor.date === date && anchor.type === "sparring");
}

export function hasProtectedCompetition(anchors: readonly ProtectedWorkout[], date: string): boolean {
  return anchors.some((anchor) => anchor.date === date && anchor.type === "competition");
}
