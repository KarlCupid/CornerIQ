import { makeConfidence } from "../core/confidence";
import type { RiskDomain, RiskFlag, RiskSeverity, SafetyState } from "../core/types";

export function createRiskFlag(
  domain: RiskDomain,
  code: string,
  severity: RiskSeverity,
  message: string,
  evidence: Record<string, unknown>,
  blocksPlan: boolean
): RiskFlag {
  return {
    id: `${domain}:${code}`,
    domain,
    code,
    severity,
    status: "active",
    message,
    evidence,
    blocksPlan,
    hardStop: severity === "critical",
    requiresProfessionalReview: severity === "high" || severity === "critical",
    confidence: makeConfidence(0.86, ["risk evidence present"]),
    explanation: message
  };
}

export function resolveSafety(flags: readonly RiskFlag[]): SafetyState {
  const active = flags.filter((flag) => flag.status === "active");
  const hardStops = active.filter((flag) => flag.hardStop);
  const blocksPlan = active.some((flag) => flag.blocksPlan || flag.hardStop);
  return {
    riskFlags: active,
    hardStops,
    blocksPlan,
    explanation:
      hardStops.length > 0
        ? "Automatic planning is stopped until safety concerns are cleared."
        : active.length > 0
          ? "Plan continues with safety restrictions."
          : "No active safety blocks."
  };
}
