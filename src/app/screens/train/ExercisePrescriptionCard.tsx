import React from "react";
import { Text, View } from "react-native";
import type { ExercisePrescription } from "../../../engine/core/types";
import { spacing } from "../../../design/theme";
import { screenStyles } from "../screenStyles";

export function ExercisePrescriptionCard({ exercise, sectionName }: { exercise: ExercisePrescription; sectionName: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={screenStyles.callout}>{exercise.name}</Text>
      <Text style={screenStyles.subtle}>{sectionName} - {exercise.category.replace(/_/g, " ")}</Text>
      {exercise.repsText ? <Text style={screenStyles.body}>Reps: {exercise.repsText}</Text> : null}
      {exercise.durationText ? <Text style={screenStyles.body}>Duration: {exercise.durationText}</Text> : null}
      <Text style={screenStyles.body}>Load: {exercise.loadGuidance}</Text>
      <Text style={screenStyles.body}>Rest: {exercise.restText}</Text>
      {exercise.rpeTarget ? <Text style={screenStyles.subtle}>RPE target: {exercise.rpeTarget}</Text> : null}
      {exercise.rirTarget ? <Text style={screenStyles.subtle}>RIR target: {exercise.rirTarget}</Text> : null}
      {exercise.tempo ? <Text style={screenStyles.subtle}>Tempo: {exercise.tempo}</Text> : null}
      <Text style={screenStyles.body}>Boxing transfer: {exercise.boxingTransfer}</Text>
      {exercise.coachingNotes.map((note) => <Text key={note} style={screenStyles.subtle}>Coach: {note}</Text>)}
      {exercise.substitutions.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.subtle}>Substitutions</Text>
          {exercise.substitutions.map((substitution) => (
            <Text key={substitution.exerciseId} style={screenStyles.subtle}>{substitution.name}: {substitution.reason}</Text>
          ))}
        </View>
      ) : null}
      {exercise.stopConditions.map((condition) => <Text key={condition} style={screenStyles.subtle}>Stop: {condition}</Text>)}
      {exercise.safetyNotes.map((note) => <Text key={note} style={screenStyles.subtle}>Safety: {note}</Text>)}
    </View>
  );
}
