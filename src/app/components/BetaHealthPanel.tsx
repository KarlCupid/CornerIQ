import React from "react";
import { Text, View } from "react-native";
import type { BetaHealthStatus, BetaHealthViewModel } from "../../engine/presentation/betaHealthViewModel";
import { EngineCard } from "../../design/components/EngineCard";
import { MetricRow } from "../../design/components/MetricRow";
import { RiskBanner } from "../../design/components/RiskBanner";
import { StatusBadge, type StatusBadgeTone } from "../../design/components/StatusBadge";
import { spacing } from "../../design/theme";
import { screenStyles } from "../screens/screenStyles";

function statusTone(status: BetaHealthStatus): StatusBadgeTone {
  if (status === "ready") {
    return "success";
  }
  if (status === "blocked") {
    return "critical";
  }
  return "caution";
}

function statusLabel(status: BetaHealthStatus): string {
  if (status === "ready") {
    return "Ready";
  }
  if (status === "blocked") {
    return "Blocked";
  }
  return "Warning";
}

export function BetaHealthPanel({ viewModel }: { viewModel: BetaHealthViewModel }) {
  const warningTone = viewModel.overallStatus === "blocked" ? "critical" : "caution";
  return (
    <View style={{ gap: spacing.md }}>
      <EngineCard>
        <View style={{ gap: spacing.md }}>
          <View style={{ gap: spacing.sm }}>
            <Text style={screenStyles.sectionTitle}>{viewModel.title}</Text>
            <StatusBadge label={statusLabel(viewModel.overallStatus)} tone={statusTone(viewModel.overallStatus)} />
            <Text style={screenStyles.body}>{viewModel.betaTesterCopy}</Text>
          </View>
          {viewModel.checks.map((item) => (
            <View key={item.key} style={{ gap: spacing.xs }}>
              <StatusBadge label={statusLabel(item.status)} tone={statusTone(item.status)} />
              <MetricRow label={item.label} value={item.summary} />
            </View>
          ))}
          <Text style={screenStyles.subtle}>{viewModel.supportCopy}</Text>
        </View>
      </EngineCard>
      {viewModel.warnings.length > 0 && viewModel.nextSafeAction ? (
        <RiskBanner title="Beta preflight needs attention" message={viewModel.nextSafeAction} tone={warningTone}>
          <Text style={screenStyles.body}>Next safe action: {viewModel.nextSafeAction}</Text>
          {viewModel.warnings.map((warning, index) => <Text key={`beta-health-warning:${index}`} style={screenStyles.subtle}>{warning}</Text>)}
        </RiskBanner>
      ) : null}
    </View>
  );
}
