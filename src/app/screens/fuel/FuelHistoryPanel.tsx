import React from "react";
import { Pressable, Text, View } from "react-native";
import type { FuelHistoryViewModel } from "../../../engine/core/types";
import { EngineCard } from "../../../design/components/EngineCard";
import { spacing } from "../../../design/theme";
import { plainFuelCopy } from "../../../engine/presentation/fuelCopy";
import { screenStyles } from "../screenStyles";

export function FuelHistoryPanel({ history }: { history: FuelHistoryViewModel }) {
  const [selectedDate, setSelectedDate] = React.useState(history.groupedDays[0]?.date ?? null);
  const selectedDay = history.groupedDays.find((day) => day.date === selectedDate) ?? history.groupedDays[0] ?? null;
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Fuel history</Text>
        <Text style={screenStyles.callout}>{plainFuelCopy(history.todaySummary)}</Text>
        <Text style={screenStyles.subtle}>Confidence: {history.loggingConfidence}</Text>
        <Text style={screenStyles.subtle}>This does not change targets by itself.</Text>
        <Text style={screenStyles.body}>{plainFuelCopy(history.missingDataNarrative)}</Text>
        <Text style={screenStyles.body}>{plainFuelCopy(history.hydrationConsistency)}</Text>
        <Text style={screenStyles.callout}>Last 7 days</Text>
        {history.groupedDays.map((day, dayIndex) => (
          <Pressable accessibilityRole="button" accessibilityState={{ selected: selectedDay?.date === day.date }} key={`fuel-day:${dayIndex}`} onPress={() => setSelectedDate(day.date)} style={screenStyles.quietButton}>
            <Text style={screenStyles.quietButtonText}>{day.date}: {day.calories} kcal, confidence {day.confidence}</Text>
          </Pressable>
        ))}
        {selectedDay ? (
          <View style={{ gap: spacing.xs }} testID="fuel-history-day-detail">
            <Text style={screenStyles.callout}>Day detail</Text>
            <Text style={screenStyles.body}>
              {selectedDay.date}: {selectedDay.calories} kcal, {selectedDay.protein}g protein, {selectedDay.carbs}g carbs, {selectedDay.fat}g fat.
            </Text>
            <Text style={screenStyles.subtle}>
              Fiber {selectedDay.fiber === null ? "unknown" : `${selectedDay.fiber}g`}; sodium {selectedDay.sodium === null ? "unknown" : `${selectedDay.sodium}mg`}; water {selectedDay.waterLiters.toFixed(1)}L; confidence {selectedDay.confidence}.
            </Text>
            <Text style={screenStyles.subtle}>{plainFuelCopy(selectedDay.electrolyteSummary)}</Text>
            <Text style={screenStyles.subtle}>Why it matters: fuel history is context only; missing data lowers confidence without changing targets by itself.</Text>
            {selectedDay.notes.slice(0, 3).map((note, index) => <Text key={`fuel-day-detail-note:${index}`} style={screenStyles.subtle}>{plainFuelCopy(note)}</Text>)}
          </View>
        ) : null}
        <Text style={screenStyles.callout}>Session fuel link</Text>
        {history.sessionFuelLink.length > 0 ? (
          history.sessionFuelLink.map((item, index) => <Text key={`session-fuel:${index}`} style={screenStyles.subtle}>{plainFuelCopy(item.summary)}</Text>)
        ) : (
          <Text style={screenStyles.subtle}>No high-fuel support workout days in this 7-day fuel history.</Text>
        )}
        <Text style={screenStyles.callout}>Recent meals</Text>
        {history.recentMeals.slice(0, 5).map((meal, index) => <Text key={`recent-meal:${index}`} style={screenStyles.subtle}>{plainFuelCopy(meal)}</Text>)}
        <Text style={screenStyles.callout}>Hydration and electrolytes</Text>
        {history.hydrationTrend7Day.slice(0, 5).map((item, index) => <Text key={`hydration-trend:${index}`} style={screenStyles.subtle}>{plainFuelCopy(item)}</Text>)}
        <Text style={screenStyles.subtle}>{plainFuelCopy(history.electrolyteSummary)}</Text>
        <Text style={screenStyles.callout}>Fiber and sodium context</Text>
        <Text style={screenStyles.subtle}>{plainFuelCopy(history.fiberSodiumSummary)}</Text>
        {history.fightWeekMarkers.slice(0, 3).map((marker, index) => <Text key={`fight-week-marker:${index}`} style={screenStyles.subtle}>{plainFuelCopy(marker.summary)}</Text>)}
        {history.warnings.slice(0, 3).map((warning, index) => <Text key={`fuel-history-warning:${index}`} style={screenStyles.subtle}>{plainFuelCopy(warning)}</Text>)}
      </View>
    </EngineCard>
  );
}
