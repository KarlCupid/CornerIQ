import React from "react";
import { Text, View } from "react-native";
import type { ExercisePrescription } from "../../../engine/core/types";
import { plainExerciseCategoryLabel, plainMovementWhy, plainTrainingCopy, plainWorkoutTitle } from "../../../engine/presentation/trainingCopy";
import { colors, spacing } from "../../../design/theme";
import { screenStyles } from "../screenStyles";

function setCountLabel(count: number): string {
  return `${count} set${count === 1 ? "" : "s"}`;
}

function doseText(exercise: ExercisePrescription): string {
  const pieces = [
    exercise.sets.length > 0 ? setCountLabel(exercise.sets.length) : null,
    exercise.repsText,
    exercise.durationText,
    exercise.rpeTarget ? `RPE ${exercise.rpeTarget}` : null,
    exercise.rirTarget ? `RIR ${exercise.rirTarget}` : null
  ].filter((item): item is string => Boolean(item));
  return pieces.length > 0 ? pieces.join(" - ") : "Follow the listed work.";
}

function PrescriptionLine({ label, text }: { label: string; text: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={{ color: colors.wrap, fontSize: 11, fontWeight: "900", lineHeight: 15 }}>{label}</Text>
      <Text style={screenStyles.body}>{text}</Text>
    </View>
  );
}

export function ExercisePrescriptionCard({ exercise, sectionName }: { exercise: ExercisePrescription; sectionName: string }) {
  const primaryCue = exercise.coachingNotes[0];
  const extraCues = exercise.coachingNotes.slice(1, 3);
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={screenStyles.callout}>{plainWorkoutTitle(exercise.name)}</Text>
      <Text style={screenStyles.subtle}>{sectionName} - {plainExerciseCategoryLabel(exercise.category)}</Text>
      <PrescriptionLine label="DO" text={doseText(exercise)} />
      <PrescriptionLine label="HOW" text={plainTrainingCopy(exercise.loadGuidance)} />
      <PrescriptionLine label="REST" text={plainTrainingCopy(exercise.restText)} />
      {exercise.tempo ? <PrescriptionLine label="TEMPO" text={plainTrainingCopy(exercise.tempo)} /> : null}
      {primaryCue ? (
        <View style={{ backgroundColor: "rgba(56, 226, 138, 0.1)", borderColor: "rgba(56, 226, 138, 0.3)", borderRadius: 14, borderWidth: 1, padding: spacing.sm }}>
          <Text style={{ color: colors.readyGreen, fontSize: 11, fontWeight: "900", lineHeight: 15 }}>MAIN CUE</Text>
          <Text style={screenStyles.subtle}>{plainTrainingCopy(primaryCue)}</Text>
        </View>
      ) : null}
      <PrescriptionLine label="BOXING TRANSFER" text={plainMovementWhy(exercise.boxingTransfer)} />
      {extraCues.map((note, index) => <Text key={`cue-note:${index}`} style={screenStyles.subtle}>Cue: {plainTrainingCopy(note)}</Text>)}
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
