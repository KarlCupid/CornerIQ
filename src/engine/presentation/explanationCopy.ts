import type { RiskFlag } from "../core/types";

export function riskSummary(flags: readonly RiskFlag[]): readonly string[] {
  return flags.filter((flag) => flag.status === "active").map((flag) => flag.message);
}
