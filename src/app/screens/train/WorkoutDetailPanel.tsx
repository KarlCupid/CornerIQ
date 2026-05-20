import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { DetailedTrainingSession, ExerciseResultDraft } from "../../../engine/core/types";
import type { WorkoutCompletionActions } from "../../../hooks/useWorkoutCompletion";
import { colors, spacing } from "../../../design/theme";
import { parseOptionalNonNegativeInteger, parseOptionalPositiveNumber, validationError } from "../../forms/validation";
import { screenStyles } from "../screenStyles";
import { ExercisePrescriptionCard } from "./ExercisePrescriptionCard";

interface ExerciseResultInputs {
  completedSets: string;
  loadText: string;
  rpe: string;
  notes: string;
  painFlag: boolean;
}

function emptyExerciseResultInputs(): ExerciseResultInputs {
  return {
    completedSets: "",
    loadText: "",
    rpe: "",
    notes: "",
    painFlag: false
  };
}

function parseExerciseResult(session: DetailedTrainingSession, values: Record<string, ExerciseResultInputs>): ExerciseResultDraft[] {
  return session.sections.flatMap((section) =>
    section.exercises.map((exercise) => {
      const input = values[exercise.exerciseId] ?? emptyExerciseResultInputs();
      const completedSets = parseOptionalNonNegativeInteger(input.completedSets, `${exercise.name} completed sets`, { required: false });
      const rpe = parseOptionalPositiveNumber(input.rpe, `${exercise.name} RPE`, { required: false });
      if (rpe !== undefined && rpe > 10) {
        throw new Error(`${exercise.name} RPE must be 10 or lower.`);
      }
      return {
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.name,
        section: section.name,
        prescribed: exercise,
        ...(completedSets === undefined ? {} : { completedSets }),
        ...(input.loadText.trim() ? { loadText: input.loadText.trim() } : {}),
        ...(rpe === undefined ? {} : { rpe }),
        ...(input.notes.trim() ? { notes: input.notes.trim() } : {}),
        ...(input.painFlag ? { painFlag: true } : {})
      };
    })
  );
}

export function WorkoutDetailPanel({
  busy,
  completionActions,
  completionMessage,
  session
}: {
  busy: boolean;
  completionActions?: WorkoutCompletionActions | undefined;
  completionMessage?: string | null | undefined;
  session: DetailedTrainingSession;
}) {
  const [open, setOpen] = useState(false);
  const [sessionRpe, setSessionRpe] = useState("");
  const [painNotes, setPainNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [exerciseInputs, setExerciseInputs] = useState<Record<string, ExerciseResultInputs>>({});
  const [localError, setLocalError] = useState<string | null>(null);

  const updateExercise = (exerciseId: string, updater: (current: ExerciseResultInputs) => ExerciseResultInputs) => {
    setExerciseInputs((current) => ({ ...current, [exerciseId]: updater(current[exerciseId] ?? emptyExerciseResultInputs()) }));
  };

  const complete = async () => {
    if (!completionActions) {
      setLocalError("Workout completion is unavailable until the app is connected.");
      return;
    }
    try {
      setLocalError(null);
      const parsedSessionRpe = parseOptionalPositiveNumber(sessionRpe, "Session RPE", { required: false });
      if (parsedSessionRpe !== undefined && parsedSessionRpe > 10) {
        throw new Error("Session RPE must be 10 or lower.");
      }
      await completionActions.complete(session, {
        ...(parsedSessionRpe === undefined ? {} : { sessionRpe: parsedSessionRpe }),
        painNotes: painNotes.trim() ? [painNotes.trim()] : [],
        notes: notes.trim(),
        exerciseResults: parseExerciseResult(session, exerciseInputs)
      });
      setOpen(false);
    } catch (error) {
      setLocalError(validationError(error, "Workout completion failed."));
    }
  };

  const skip = async () => {
    if (!completionActions) {
      setLocalError("Workout completion is unavailable until the app is connected.");
      return;
    }
    setLocalError(null);
    await completionActions.skip(session, notes.trim());
    setOpen(false);
  };

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>{session.title}</Text>
        <Text style={screenStyles.body}>{session.intensity} - {session.durationMinutes} min - {session.sections.length} sections</Text>
        <Text style={screenStyles.body}>{session.whyThisMattersForBoxing}</Text>
        {session.readinessModifications.map((item) => <Text key={item} style={screenStyles.subtle}>Readiness: {item}</Text>)}
        {session.cycleModifications.map((item) => <Text key={item} style={screenStyles.subtle}>Cycle: {item}</Text>)}
        {session.stopConditions.slice(0, 3).map((item) => <Text key={item} style={screenStyles.subtle}>Stop: {item}</Text>)}
        {session.safetyNotes.slice(0, 3).map((item) => <Text key={item} style={screenStyles.subtle}>Safety: {item}</Text>)}
        {localError ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{localError}</Text> : null}
        {completionMessage ? <Text style={[screenStyles.subtle, { color: colors.amberCaution }]}>{completionMessage}</Text> : null}
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => setOpen((value) => !value)} style={screenStyles.quietButton}>
          <Text style={screenStyles.quietButtonText}>{open ? "Hide workout detail" : "Open workout detail"}</Text>
        </Pressable>
      </View>
      {open ? (
        <View style={{ gap: spacing.md }}>
          {session.sections.map((section) => (
            <View key={section.name} style={{ gap: spacing.sm }}>
              <Text style={screenStyles.sectionTitle}>{section.name}</Text>
              <Text style={screenStyles.subtle}>{section.intent}</Text>
              {section.exercises.map((exercise) => {
                const input = exerciseInputs[exercise.exerciseId] ?? emptyExerciseResultInputs();
                return (
                  <View key={exercise.exerciseId} style={{ gap: spacing.sm }}>
                    <ExercisePrescriptionCard exercise={exercise} sectionName={section.name} />
                    <TextInput keyboardType="number-pad" onChangeText={(value) => updateExercise(exercise.exerciseId, (current) => ({ ...current, completedSets: value }))} placeholder="Completed sets optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={input.completedSets} />
                    <TextInput onChangeText={(value) => updateExercise(exercise.exerciseId, (current) => ({ ...current, loadText: value }))} placeholder="Load text optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={input.loadText} />
                    <TextInput keyboardType="decimal-pad" onChangeText={(value) => updateExercise(exercise.exerciseId, (current) => ({ ...current, rpe: value }))} placeholder="Exercise RPE optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={input.rpe} />
                    <TextInput onChangeText={(value) => updateExercise(exercise.exerciseId, (current) => ({ ...current, notes: value }))} placeholder="Exercise notes optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={input.notes} />
                    <Pressable accessibilityRole="button" disabled={busy} onPress={() => updateExercise(exercise.exerciseId, (current) => ({ ...current, painFlag: !current.painFlag }))} style={[screenStyles.quietButton, input.painFlag ? { borderColor: colors.amberCaution } : null]}>
                      <Text style={screenStyles.quietButtonText}>{input.painFlag ? "Pain flag on" : "Pain flag optional"}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ))}
          <TextInput keyboardType="decimal-pad" onChangeText={setSessionRpe} placeholder="Session RPE 1-10 optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={sessionRpe} />
          <TextInput onChangeText={setPainNotes} placeholder="Pain note optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={painNotes} />
          <TextInput onChangeText={setNotes} placeholder="Session notes optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={notes} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => void complete()} style={screenStyles.button}>
              <Text style={screenStyles.buttonText}>Mark completed</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => void skip()} style={screenStyles.quietButton}>
              <Text style={screenStyles.quietButtonText}>Skip session</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
