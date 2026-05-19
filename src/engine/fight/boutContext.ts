import type { FightOpportunity } from "../core/types";

export function describeBout(fight: FightOpportunity | null): string {
  if (!fight) {
    return "No active bout.";
  }
  return `${fight.rounds} rounds x ${fight.roundMinutes} minutes at ${fight.targetWeightClass.label}`;
}
