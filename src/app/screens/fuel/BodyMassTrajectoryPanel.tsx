import React from "react";
import { Text, View } from "react-native";
import type { BodyMassTrajectoryViewModel } from "../../../engine/core/types";
import { EngineCard } from "../../../design/components/EngineCard";
import { spacing } from "../../../design/theme";
import { plainFuelCopy } from "../../../engine/presentation/fuelCopy";
import { screenStyles } from "../screenStyles";

export function BodyMassTrajectoryPanel({ trajectory }: { trajectory: BodyMassTrajectoryViewModel }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Body weight trend</Text>
        <Text style={screenStyles.callout}>{plainFuelCopy(trajectory.status)}</Text>
        <Text style={screenStyles.body}>{plainFuelCopy(trajectory.latestWeight)}</Text>
        <Text style={screenStyles.body}>{plainFuelCopy(trajectory.targetGapKg)}</Text>
        <Text style={screenStyles.subtle}>{plainFuelCopy(trajectory.weighInCountdown)}</Text>
        <Text style={screenStyles.subtle}>{plainFuelCopy(trajectory.trend)}</Text>
        <Text style={screenStyles.subtle}>{plainFuelCopy(trajectory.trendConfidence)}</Text>
        <Text style={screenStyles.subtle}>{plainFuelCopy(trajectory.cycleNoiseWindow)}</Text>
        <Text style={screenStyles.subtle}>{plainFuelCopy(trajectory.riskExplanation)}</Text>
        <Text style={screenStyles.callout}>Next safe actions</Text>
        {trajectory.nextSafeActions.slice(0, 4).map((action, index) => <Text key={`body-mass-next-action:${index}`} style={screenStyles.subtle}>{plainFuelCopy(action)}</Text>)}
        {trajectory.reviewActionVisible ? <Text style={screenStyles.body}>Review is needed because safety blocks weight pressure.</Text> : null}
        <Text style={screenStyles.callout}>Last 14 days</Text>
        {trajectory.last14Days.length > 0 ? (
          trajectory.last14Days.map((log, index) => (
            <Text key={`body-mass-log:${index}`} style={screenStyles.subtle}>
              {log.date}: {log.kg.toFixed(1)} kg ({log.source}){log.note ? ` - ${log.note}` : ""}
            </Text>
          ))
        ) : (
          <Text style={screenStyles.subtle}>No body weight history yet. Missing data stays unknown.</Text>
        )}
        <Text style={screenStyles.subtle}>{plainFuelCopy(trajectory.missingDataCopy)}</Text>
      </View>
    </EngineCard>
  );
}
