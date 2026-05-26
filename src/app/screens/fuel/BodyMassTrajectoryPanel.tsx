import React from "react";
import { Text, View } from "react-native";
import type { BodyMassTrajectoryViewModel } from "../../../engine/core/types";
import { EngineCard } from "../../../design/components/EngineCard";
import { spacing } from "../../../design/theme";
import { screenStyles } from "../screenStyles";

export function BodyMassTrajectoryPanel({ trajectory }: { trajectory: BodyMassTrajectoryViewModel }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Body-mass trajectory detail</Text>
        <Text style={screenStyles.callout}>{trajectory.status}</Text>
        <Text style={screenStyles.body}>{trajectory.latestWeight}</Text>
        <Text style={screenStyles.body}>{trajectory.targetGapKg}</Text>
        <Text style={screenStyles.subtle}>{trajectory.weighInCountdown}</Text>
        <Text style={screenStyles.subtle}>{trajectory.trend}</Text>
        <Text style={screenStyles.subtle}>{trajectory.trendConfidence}</Text>
        <Text style={screenStyles.subtle}>{trajectory.cycleNoiseWindow}</Text>
        <Text style={screenStyles.subtle}>{trajectory.riskExplanation}</Text>
        <Text style={screenStyles.callout}>Next safe actions</Text>
        {trajectory.nextSafeActions.map((action, index) => <Text key={`body-mass-next-action:${index}`} style={screenStyles.subtle}>{action}</Text>)}
        {trajectory.reviewActionVisible ? <Text style={screenStyles.body}>Review action is visible because safety blocks weight-class pressure.</Text> : null}
        <Text style={screenStyles.callout}>Last 14 days</Text>
        {trajectory.last14Days.length > 0 ? (
          trajectory.last14Days.map((log, index) => (
            <Text key={`body-mass-log:${index}`} style={screenStyles.subtle}>
              {log.date}: {log.kg.toFixed(1)} kg ({log.source}){log.note ? ` - ${log.note}` : ""}
            </Text>
          ))
        ) : (
          <Text style={screenStyles.subtle}>No body-mass history yet. Missing data stays unknown.</Text>
        )}
        <Text style={screenStyles.subtle}>{trajectory.missingDataCopy}</Text>
      </View>
    </EngineCard>
  );
}
