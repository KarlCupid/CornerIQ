import type { RiskFlag } from "../core/types";

export function riskSummary(flags: readonly RiskFlag[]): readonly string[] {
  const messages: string[] = [];
  const seen = new Set<string>();
  for (const flag of flags) {
    if (flag.status !== "active" || seen.has(flag.message)) {
      continue;
    }
    seen.add(flag.message);
    messages.push(flag.message);
  }
  return messages;
}
