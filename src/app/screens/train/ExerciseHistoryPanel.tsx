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
  const [selectedExercise, setSelectedExercise] = React.useState(history.groupedExercises[0]?.exerciseName ?? null);
  const counts = `Done/partial/not logged/skipped: ${history.statusCounts.completed}/${history.statusCounts.partial}/${history.statusCounts.prescribedOnly}/${history.statusCounts.skipped}`;
  const selected = history.groupedExercises.find((exercise) => exercise.exerciseName === selectedExercise) ?? history.groupedExercises[0] ?? null;
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
      <Text style={screenStyles.subtle}>{history.structuredLoadSummary}</Text>
      <Text style={screenStyles.subtle}>No numeric progression is inferred from free-text load notes.</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ selected: detailsOpen }} onPress={() => setDetailsOpen((value) => !value)} style={screenStyles.quietButton}>
        <Text style={screenStyles.quietButtonText}>{detailsOpen ? "Hide details" : "Show details"}</Text>
      </Pressable>
      {detailsOpen ? (
        <View style={{ gap: spacing.sm }} testID="exercise-history-details">
          <Text style={screenStyles.callout}>Not logged rows</Text>
          <Text style={screenStyles.body}>{counts}</Text>
          <Text style={screenStyles.subtle}>Pain flags stop automatic progression.</Text>
          <Text style={screenStyles.subtle}>{history.loadProgressionNote}</Text>
          <Text style={screenStyles.subtle}>Extra detail status: {history.structuredLoadStatus.replaceAll("_", " ")}.</Text>
          <Text style={screenStyles.callout}>Strength notes</Text>
          {history.latestStrengthExerciseSummary ? <Text style={screenStyles.subtle}>Latest strength: {history.latestStrengthExerciseSummary}</Text> : null}
          {history.mostRepeatedExercise ? <Text style={screenStyles.subtle}>Most repeated: {history.mostRepeatedExercise}</Text> : null}
          <Text style={screenStyles.callout}>Grouped exercises</Text>
          {history.groupedExercises.length > 0 ? (
            history.groupedExercises.map((exercise, index) => (
              <Pressable accessibilityRole="button" accessibilityState={{ selected: selected?.exerciseName === exercise.exerciseName }} key={`grouped-exercise:${index}`} onPress={() => setSelectedExercise(exercise.exerciseName)} style={screenStyles.quietButton}>
                <Text style={screenStyles.quietButtonText}>{exercise.exerciseName}</Text>
              </Pressable>
            ))
          ) : (
            <Text style={screenStyles.subtle}>No grouped exercise rows yet.</Text>
          )}
          {selected ? (
            <View style={{ gap: spacing.xs }} testID="exercise-history-selected-detail">
              <Text style={screenStyles.callout}>Exercise detail</Text>
              <Text style={screenStyles.body}>{selected.exerciseName}</Text>
                <Text style={screenStyles.subtle}>
                  Done/partial/not logged/pain flags: {selected.completedCount}/{selected.partialCount}/{selected.prescribedOnlyCount}/{selected.painFlagCount}
                </Text>
              {selected.recentRpe ? <Text style={screenStyles.subtle}>Recent {selected.recentRpe}</Text> : null}
              {selected.structuredActualSummary ? <Text style={screenStyles.subtle}>Extra details: {selected.structuredActualSummary}</Text> : <Text style={screenStyles.subtle}>No extra details for this exercise yet.</Text>}
              <Text style={screenStyles.subtle}>Load note: {selected.latestLoadTextNote}</Text>
              <Text style={screenStyles.subtle}>{selected.noNumericProgressionCopy}</Text>
            </View>
          ) : null}
          <Text style={screenStyles.callout}>Top repeated</Text>
          {history.topRepeatedExercises.length > 0 ? history.topRepeatedExercises.map((exercise, index) => <Text key={`top-repeated:${index}`} style={screenStyles.subtle}>{exercise}</Text>) : <Text style={screenStyles.subtle}>No repeated exercise rows yet.</Text>}
          <Text style={screenStyles.callout}>Top pain-flagged</Text>
          {history.topPainFlaggedExercises.length > 0 ? history.topPainFlaggedExercises.map((exercise, index) => <Text key={`top-pain:${index}`} style={screenStyles.subtle}>{exercise}</Text>) : <Text style={screenStyles.subtle}>No pain-flagged exercise list yet.</Text>}
          <Text style={screenStyles.callout}>RPE</Text>
          {history.recentRpeValues.length > 0 ? history.recentRpeValues.map((rpe, index) => <Text key={`recent-rpe:${index}`} style={screenStyles.subtle}>{rpe}</Text>) : <Text style={screenStyles.subtle}>No recent exercise RPE values.</Text>}
          <Text style={screenStyles.callout}>Pain flags</Text>
          {history.painFlagsByExercise.length > 0 ? history.painFlagsByExercise.map((exercise, index) => <Text key={`pain-flag:${index}`} style={screenStyles.subtle}>{`Pain flag: ${exercise}`}</Text>) : <Text style={screenStyles.subtle}>No exercise pain flags.</Text>}
          <Text style={screenStyles.callout}>Recent results</Text>
          {history.recentExerciseResults.length > 0 ? history.recentExerciseResults.map((result, index) => <Text key={`recent-actual:${index}`} style={screenStyles.subtle}>{result}</Text>) : <Text style={screenStyles.subtle}>No exercise result history yet.</Text>}
        </View>
      ) : null}
    </View>
  );
}
