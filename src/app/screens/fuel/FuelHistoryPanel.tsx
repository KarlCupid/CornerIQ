import React from "react";
import { Text, View } from "react-native";
import type { FuelHistoryViewModel } from "../../../engine/core/types";
import { EngineCard } from "../../../design/components/EngineCard";
import { spacing } from "../../../design/theme";
import { screenStyles } from "../screenStyles";

export function FuelHistoryPanel({ history }: { history: FuelHistoryViewModel }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Fuel history detail</Text>
        <Text style={screenStyles.callout}>{history.todaySummary}</Text>
        <Text style={screenStyles.subtle}>Confidence: {history.loggingConfidence}</Text>
        <Text style={screenStyles.subtle}>This does not change targets by itself.</Text>
        <Text style={screenStyles.body}>{history.missingDataNarrative}</Text>
        <Text style={screenStyles.body}>{history.hydrationConsistency}</Text>
        <Text style={screenStyles.callout}>Last 7 days</Text>
        {history.groupedDays.map((day) => (
          <View key={day.date} style={{ gap: spacing.xs }}>
            <Text style={screenStyles.body}>
              {day.date}: {day.calories} kcal, {day.protein}g protein, {day.carbs}g carbs, {day.fat}g fat.
            </Text>
            <Text style={screenStyles.subtle}>
              Fiber {day.fiber === null ? "unknown" : `${day.fiber}g`}; sodium {day.sodium === null ? "unknown" : `${day.sodium}mg`}; water {day.waterLiters.toFixed(1)}L; confidence {day.confidence}.
            </Text>
            <Text style={screenStyles.subtle}>{day.electrolyteSummary}</Text>
            {day.notes.map((note) => <Text key={`${day.date}:${note}`} style={screenStyles.subtle}>{note}</Text>)}
          </View>
        ))}
        <Text style={screenStyles.callout}>Session fuel link</Text>
        {history.sessionFuelLink.length > 0 ? (
          history.sessionFuelLink.map((item) => <Text key={item.date} style={screenStyles.subtle}>{item.summary}</Text>)
        ) : (
          <Text style={screenStyles.subtle}>No high fuel-demand generated session days in this 7-day fuel history.</Text>
        )}
        <Text style={screenStyles.callout}>Recent meals</Text>
        {history.recentMeals.map((meal) => <Text key={meal} style={screenStyles.subtle}>{meal}</Text>)}
        <Text style={screenStyles.callout}>Hydration and electrolytes</Text>
        {history.hydrationTrend7Day.map((item) => <Text key={item} style={screenStyles.subtle}>{item}</Text>)}
        <Text style={screenStyles.subtle}>{history.electrolyteSummary}</Text>
        <Text style={screenStyles.callout}>Fiber and sodium context</Text>
        <Text style={screenStyles.subtle}>{history.fiberSodiumSummary}</Text>
        {history.fightWeekMarkers.map((marker) => <Text key={marker.date} style={screenStyles.subtle}>{marker.summary}</Text>)}
        {history.warnings.map((warning) => <Text key={warning} style={screenStyles.subtle}>{warning}</Text>)}
      </View>
    </EngineCard>
  );
}
