import type { FightOpportunity } from "../core/types";

export function isActiveFight(fight: FightOpportunity | null): boolean {
  return Boolean(fight && !["canceled", "completed"].includes(fight.status));
}
