import { makeConfidence } from "../core/confidence";
import type { RiskDomain, RiskFlag, RiskSeverity, SafetyRiskCode, SafetyState } from "../core/types";

export function createRiskFlag(
  domain: RiskDomain,
  code: SafetyRiskCode,
  severity: RiskSeverity,
  message: string,
  evidence: Record<string, unknown>,
  blocksPlan: boolean,
  overrides: Partial<Pick<RiskFlag, "hardStop" | "requiresProfessionalReview">> = {}
): RiskFlag {
  const hardStop = overrides.hardStop ?? severity === "critical";
  const requiresProfessionalReview = overrides.requiresProfessionalReview ?? (severity === "high" || severity === "critical");
  return {
    id: `${domain}:${code}`,
    domain,
    code,
    severity,
    status: "active",
    message,
    evidence,
    blocksPlan,
    hardStop,
    requiresProfessionalReview,
    confidence: makeConfidence(0.86, ["risk evidence present"]),
    explanation: message
  };
}

export function createHardStopFlag(domain: RiskDomain, code: SafetyRiskCode, message: string, evidence: Record<string, unknown>): RiskFlag {
  return createRiskFlag(domain, code, "critical", message, evidence, true, { hardStop: true, requiresProfessionalReview: true });
}

export function createReviewFlag(domain: RiskDomain, code: SafetyRiskCode, message: string, evidence: Record<string, unknown>, blocksPlan = true): RiskFlag {
  return createRiskFlag(domain, code, "high", message, evidence, blocksPlan, { hardStop: false, requiresProfessionalReview: true });
}

export function createCautionFlag(domain: RiskDomain, code: SafetyRiskCode, message: string, evidence: Record<string, unknown>): RiskFlag {
  return createRiskFlag(domain, code, "caution", message, evidence, false, { hardStop: false, requiresProfessionalReview: false });
}

const severityRank: Record<RiskSeverity, number> = {
  critical: 0,
  high: 1,
  caution: 2,
  info: 3
};

export function sortRiskFlagsBySeverity(flags: readonly RiskFlag[]): readonly RiskFlag[] {
  return [...flags].sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || a.id.localeCompare(b.id));
}

export function dedupeRiskFlags(flags: readonly RiskFlag[]): readonly RiskFlag[] {
  const byId = new Map<string, RiskFlag>();
  for (const flag of sortRiskFlagsBySeverity(flags)) {
    if (!byId.has(flag.id)) {
      byId.set(flag.id, flag);
    }
  }
  return Array.from(byId.values());
}

export function resolveSafety(flags: readonly RiskFlag[]): SafetyState {
  const active = sortRiskFlagsBySeverity(dedupeRiskFlags(flags).filter((flag) => flag.status === "active"));
  const hardStops = active.filter((flag) => flag.hardStop);
  const blocksPlan = active.some((flag) => flag.blocksPlan || flag.hardStop);
  return {
    riskFlags: active,
    hardStops,
    blocksPlan,
    explanation:
      hardStops.length > 0
        ? "Automatic planning is stopped until safety concerns are resolved."
        : active.length > 0
          ? "Plan continues with safety restrictions."
          : "No active safety blocks."
  };
}
