import React from "react";
import { Pressable, Text, View } from "react-native";
import type { ExerciseHistoryViewModel } from "../../../engine/core/types";
import { spacing } from "../../../design/theme";
import { screenStyles } from "../screenStyles";

export interface ExerciseHistoryPanelProps {
  history: ExerciseHistoryViewModel;
}

export function ExerciseHistoryPanel({ history }: ExerciseHistoryPanelProps) {
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const counts = `Completed/partial/prescribed-only/skipped: ${history.statusCounts.completed}/${history.statusCounts.partial}/${history.statusCounts.prescribedOnly}/${history.statusCounts.skipped}`;
  const hasNoHistory =
    history.recentExerciseResults.length === 0 &&
    history.painFlagsByExercise.length === 0 &&
    history.recentRpeValues.length === 0 &&
    history.groupedExercises.length === 0 &&
    !history.latestStrengthExerciseSummary &&
    !history.mostRepeatedExercise;
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={screenStyles.sectionTitle}>{history.title}</Text>
      {hasNoHistory ? <Text style={screenStyles.body}>No exercise history yet. Missing load stays unknown until it is logged.</Text> : null}
      <Text style={screenStyles.callout}>Latest workout</Text>
      <Text style={screenStyles.body}>{history.recentExerciseResults[0] ?? "No completed exercise result logged yet."}</Text>
      <Text style={screenStyles.callout}>Key change</Text>
      <Text style={screenStyles.body}>{history.latestStrengthExerciseSummary ?? history.loadProgressionNote}</Text>
      <Text style={screenStyles.subtle}>No numeric progression is inferred from free-text load notes.</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ selected: detailsOpen }} onPress={() => setDetailsOpen((value) => !value)} style={screenStyles.quietButton}>
        <Text style={screenStyles.quietButtonText}>{detailsOpen ? "Hide details" : "Show details"}</Text>
      </Pressable>
      {detailsOpen ? (
        <View style={{ gap: spacing.sm }} testID="exercise-history-details">
          <Text style={screenStyles.callout}>Prescribed-only rows</Text>
          <Text style={screenStyles.body}>{counts}</Text>
          <Text style={screenStyles.subtle}>Pain flags stop automatic progression.</Text>
          <Text style={screenStyles.subtle}>{history.loadProgressionNote}</Text>
          <Text style={screenStyles.callout}>Strength notes</Text>
          {history.latestStrengthExerciseSummary ? <Text style={screenStyles.subtle}>Latest strength: {history.latestStrengthExerciseSummary}</Text> : null}
          {history.mostRepeatedExercise ? <Text style={screenStyles.subtle}>Most repeated: {history.mostRepeatedExercise}</Text> : null}
          <Text style={screenStyles.callout}>Grouped exercises</Text>
          {history.groupedExercises.length > 0 ? (
            history.groupedExercises.map((exercise, index) => (
              <View key={`grouped-exercise:${exercise.exerciseName}:${index}`} style={{ gap: spacing.xs }}>
                <Text style={screenStyles.body}>{exercise.exerciseName}</Text>
                <Text style={screenStyles.subtle}>
                  Completed/partial/prescribed-only/pain flags: {exercise.completedCount}/{exercise.partialCount}/{exercise.prescribedOnlyCount}/{exercise.painFlagCount}
                </Text>
                {exercise.recentRpe ? <Text style={screenStyles.subtle}>Recent {exercise.recentRpe}</Text> : null}
                <Text style={screenStyles.subtle}>Load note: {exercise.latestLoadTextNote}</Text>
                <Text style={screenStyles.subtle}>{exercise.noNumericProgressionCopy}</Text>
              </View>
            ))
          ) : (
            <Text style={screenStyles.subtle}>No grouped exercise rows yet.</Text>
          )}
          <Text style={screenStyles.callout}>Top repeated</Text>
          {history.topRepeatedExercises.length > 0 ? history.topRepeatedExercises.map((exercise, index) => <Text key={`top-repeated:${index}`} style={screenStyles.subtle}>{exercise}</Text>) : <Text style={screenStyles.subtle}>No repeated exercise rows yet.</Text>}
          <Text style={screenStyles.callout}>Top pain-flagged</Text>
          {history.topPainFlaggedExercises.length > 0 ? history.topPainFlaggedExercises.map((exercise, index) => <Text key={`top-pain:${index}`} style={screenStyles.subtle}>{exercise}</Text>) : <Text style={screenStyles.subtle}>No pain-flagged exercise list yet.</Text>}
          <Text style={screenStyles.callout}>RPE</Text>
          {history.recentRpeValues.length > 0 ? history.recentRpeValues.map((rpe, index) => <Text key={`recent-rpe:${index}`} style={screenStyles.subtle}>{rpe}</Text>) : <Text style={screenStyles.subtle}>No recent exercise RPE values.</Text>}
          <Text style={screenStyles.callout}>Pain flags</Text>
          {history.painFlagsByExercise.length > 0 ? history.painFlagsByExercise.map((exercise, index) => <Text key={`pain-flag:${index}`} style={screenStyles.subtle}>{`Pain flag: ${exercise}`}</Text>) : <Text style={screenStyles.subtle}>No exercise pain flags.</Text>}
          <Text style={screenStyles.callout}>Recent actuals</Text>
          {history.recentExerciseResults.length > 0 ? history.recentExerciseResults.map((result, index) => <Text key={`recent-actual:${index}`} style={screenStyles.subtle}>{result}</Text>) : <Text style={screenStyles.subtle}>No exercise result history yet.</Text>}
        </View>
      ) : null}
    </View>
  );
}
