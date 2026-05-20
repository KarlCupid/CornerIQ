import React from "react";
import { Text, View } from "react-native";
import type { ExerciseHistoryViewModel } from "../../../engine/core/types";
import { spacing } from "../../../design/theme";
import { screenStyles } from "../screenStyles";

export interface ExerciseHistoryPanelProps {
  history: ExerciseHistoryViewModel;
}

export function ExerciseHistoryPanel({ history }: ExerciseHistoryPanelProps) {
  const counts = `Completed/partial/prescribed-only/skipped: ${history.statusCounts.completed}/${history.statusCounts.partial}/${history.statusCounts.prescribedOnly}/${history.statusCounts.skipped}`;
  const hasNoHistory = history.recentExerciseResults.length === 0 && history.painFlagsByExercise.length === 0 && history.recentRpeValues.length === 0 && !history.latestStrengthExerciseSummary && !history.mostRepeatedExercise;
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={screenStyles.sectionTitle}>{history.title}</Text>
      {hasNoHistory ? <Text style={screenStyles.body}>No exercise history yet. Prescribed-only rows are still useful; missing load is unknown, not safe.</Text> : null}
      <Text style={screenStyles.callout}>Prescribed-only rows</Text>
      <Text style={screenStyles.body}>{counts}</Text>
      <Text style={screenStyles.subtle}>Free-text load is not used for numeric progression yet.</Text>
      <Text style={screenStyles.subtle}>Pain flags stop automatic progression.</Text>
      <Text style={screenStyles.subtle}>{history.loadProgressionNote}</Text>
      <Text style={screenStyles.callout}>Strength notes</Text>
      {history.latestStrengthExerciseSummary ? <Text style={screenStyles.subtle}>Latest strength: {history.latestStrengthExerciseSummary}</Text> : null}
      {history.mostRepeatedExercise ? <Text style={screenStyles.subtle}>Most repeated: {history.mostRepeatedExercise}</Text> : null}
      <Text style={screenStyles.callout}>RPE</Text>
      {history.recentRpeValues.length > 0 ? history.recentRpeValues.map((rpe) => <Text key={rpe} style={screenStyles.subtle}>{rpe}</Text>) : <Text style={screenStyles.subtle}>No recent exercise RPE values.</Text>}
      <Text style={screenStyles.callout}>Pain flags</Text>
      {history.painFlagsByExercise.length > 0 ? history.painFlagsByExercise.map((exercise) => <Text key={exercise} style={screenStyles.subtle}>{`Pain flag: ${exercise}`}</Text>) : <Text style={screenStyles.subtle}>No exercise pain flags.</Text>}
      <Text style={screenStyles.callout}>Recent actuals</Text>
      {history.recentExerciseResults.length > 0 ? history.recentExerciseResults.map((result) => <Text key={result} style={screenStyles.subtle}>{result}</Text>) : <Text style={screenStyles.subtle}>No exercise result history yet.</Text>}
    </View>
  );
}
