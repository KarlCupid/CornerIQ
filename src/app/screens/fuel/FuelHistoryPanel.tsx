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
        {history.groupedDays.map((day, dayIndex) => (
          <View key={`fuel-day:${dayIndex}`} style={{ gap: spacing.xs }}>
            <Text style={screenStyles.body}>
              {day.date}: {day.calories} kcal, {day.protein}g protein, {day.carbs}g carbs, {day.fat}g fat.
            </Text>
            <Text style={screenStyles.subtle}>
              Fiber {day.fiber === null ? "unknown" : `${day.fiber}g`}; sodium {day.sodium === null ? "unknown" : `${day.sodium}mg`}; water {day.waterLiters.toFixed(1)}L; confidence {day.confidence}.
            </Text>
            <Text style={screenStyles.subtle}>{day.electrolyteSummary}</Text>
            {day.notes.map((note, index) => <Text key={`fuel-day-note:${dayIndex}:${index}`} style={screenStyles.subtle}>{note}</Text>)}
          </View>
        ))}
        <Text style={screenStyles.callout}>Session fuel link</Text>
        {history.sessionFuelLink.length > 0 ? (
          history.sessionFuelLink.map((item, index) => <Text key={`session-fuel:${index}`} style={screenStyles.subtle}>{item.summary}</Text>)
        ) : (
          <Text style={screenStyles.subtle}>No high fuel-demand generated session days in this 7-day fuel history.</Text>
        )}
        <Text style={screenStyles.callout}>Recent meals</Text>
        {history.recentMeals.map((meal, index) => <Text key={`recent-meal:${index}`} style={screenStyles.subtle}>{meal}</Text>)}
        <Text style={screenStyles.callout}>Hydration and electrolytes</Text>
        {history.hydrationTrend7Day.map((item, index) => <Text key={`hydration-trend:${index}`} style={screenStyles.subtle}>{item}</Text>)}
        <Text style={screenStyles.subtle}>{history.electrolyteSummary}</Text>
        <Text style={screenStyles.callout}>Fiber and sodium context</Text>
        <Text style={screenStyles.subtle}>{history.fiberSodiumSummary}</Text>
        {history.fightWeekMarkers.map((marker, index) => <Text key={`fight-week-marker:${index}`} style={screenStyles.subtle}>{marker.summary}</Text>)}
        {history.warnings.map((warning, index) => <Text key={`fuel-history-warning:${index}`} style={screenStyles.subtle}>{warning}</Text>)}
      </View>
    </EngineCard>
  );
}
