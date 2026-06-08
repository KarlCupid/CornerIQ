import React from "react";
import { Text, View } from "react-native";
import type { ExercisePrescription } from "../../../engine/core/types";
import { plainExerciseCategoryLabel, plainMovementWhy, plainTrainingCopy, plainWorkoutTitle } from "../../../engine/presentation/trainingCopy";
import { spacing } from "../../../design/theme";
import { screenStyles } from "../screenStyles";

export function ExercisePrescriptionCard({ exercise, sectionName }: { exercise: ExercisePrescription; sectionName: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={screenStyles.callout}>{plainWorkoutTitle(exercise.name)}</Text>
      <Text style={screenStyles.subtle}>{sectionName} - {plainExerciseCategoryLabel(exercise.category)}</Text>
      {exercise.repsText ? <Text style={screenStyles.body}>Reps: {exercise.repsText}</Text> : null}
      {exercise.durationText ? <Text style={screenStyles.body}>Duration: {exercise.durationText}</Text> : null}
      <Text style={screenStyles.body}>Load: {plainTrainingCopy(exercise.loadGuidance)}</Text>
      <Text style={screenStyles.body}>Rest: {plainTrainingCopy(exercise.restText)}</Text>
      {exercise.rpeTarget ? <Text style={screenStyles.subtle}>RPE target: {exercise.rpeTarget}</Text> : null}
      {exercise.rirTarget ? <Text style={screenStyles.subtle}>RIR target: {exercise.rirTarget}</Text> : null}
      {exercise.tempo ? <Text style={screenStyles.subtle}>Tempo: {plainTrainingCopy(exercise.tempo)}</Text> : null}
      <Text style={screenStyles.body}>Why: {plainMovementWhy(exercise.boxingTransfer)}</Text>
      {exercise.coachingNotes.slice(0, 2).map((note, index) => <Text key={`cue-note:${index}`} style={screenStyles.subtle}>Cue: {plainTrainingCopy(note)}</Text>)}
      {exercise.substitutions.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.subtle}>Swaps if needed</Text>
          {exercise.substitutions.slice(0, 2).map((substitution) => (
            <Text key={substitution.exerciseId} style={screenStyles.subtle}>{plainWorkoutTitle(substitution.name)}: {plainTrainingCopy(substitution.reason)}</Text>
          ))}
        </View>
      ) : null}
      {exercise.stopConditions.slice(0, 2).map((condition, index) => <Text key={`stop-condition:${index}`} style={screenStyles.subtle}>Stop: {plainTrainingCopy(condition)}</Text>)}
      {exercise.safetyNotes.slice(0, 1).map((note, index) => <Text key={`safety-note:${index}`} style={screenStyles.subtle}>Safety: {plainTrainingCopy(note)}</Text>)}
    </View>
  );
}
