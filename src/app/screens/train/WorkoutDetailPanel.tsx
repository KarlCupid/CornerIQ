import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { DetailedTrainingSession, ExerciseResultDraft } from "../../../engine/core/types";
import type { WorkoutCompletionActions } from "../../../hooks/useWorkoutCompletion";
import { EngineCard } from "../../../design/components/EngineCard";
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

function hasActualExerciseInput(input: ExerciseResultInputs): boolean {
  return Boolean(input.completedSets.trim() || input.loadText.trim() || input.rpe.trim() || input.notes.trim() || input.painFlag);
}

function resultStatus(exerciseSetCount: number, input: ExerciseResultInputs, completedSets: number | undefined): ExerciseResultDraft["resultStatus"] {
  // CornerIQ stores prescribed_only rows intentionally so history can distinguish a prescribed exercise from a logged result.
  if (!hasActualExerciseInput(input)) {
    return "prescribed_only";
  }
  if (completedSets === 0) {
    return "skipped";
  }
  if (completedSets !== undefined && completedSets >= exerciseSetCount && !input.painFlag) {
    return "completed";
  }
  return "partial";
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
        resultStatus: resultStatus(exercise.sets.length, input, completedSets),
        ...(completedSets === undefined ? {} : { completedSets }),
        ...(input.loadText.trim() ? { loadText: input.loadText.trim() } : {}),
        ...(rpe === undefined ? {} : { rpe }),
        ...(input.notes.trim() ? { notes: input.notes.trim() } : {}),
        ...(input.painFlag ? { painFlag: true } : {})
      };
    })
  );
}

function exercisePrescriptionParts(exercise: DetailedTrainingSession["sections"][number]["exercises"][number]): readonly string[] {
  const firstSet = exercise.sets[0];
  const setCount = exercise.sets.length > 1 ? `${exercise.sets.length} sets` : undefined;
  const dose = exercise.repsText ?? exercise.durationText ?? firstSet?.repsText ?? firstSet?.durationText;
  const rpe = exercise.rpeTarget ?? firstSet?.rpeTarget;
  return [setCount, dose, rpe ? `RPE ${rpe}` : null, `rest ${exercise.restText}`].filter(Boolean) as string[];
}

function SessionMeta({ label }: { label: string }) {
  return (
    <View
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        borderColor: colors.line,
        borderRadius: 16,
        borderWidth: 1,
        minHeight: 34,
        justifyContent: "center",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs
      }}
    >
      <Text style={screenStyles.chipText}>{label}</Text>
    </View>
  );
}

function WorkoutSectionCard({
  index,
  section
}: {
  index: number;
  section: DetailedTrainingSession["sections"][number];
}) {
  return (
    <View
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.055)",
        borderColor: colors.line,
        borderRadius: 20,
        borderWidth: 1,
        gap: spacing.md,
        padding: spacing.md
      }}
    >
      <View style={{ alignItems: "flex-start", flexDirection: "row", gap: spacing.md }}>
        <View
          style={{
            alignItems: "center",
            backgroundColor: "rgba(39, 206, 241, 0.12)",
            borderColor: "rgba(39, 206, 241, 0.36)",
            borderRadius: 14,
            borderWidth: 1,
            height: 40,
            justifyContent: "center",
            width: 40
          }}
        >
          <Text style={{ color: colors.canvas, fontSize: 14, fontWeight: "800", lineHeight: 18 }}>{String(index + 1).padStart(2, "0")}</Text>
        </View>
        <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
          <Text style={{ color: colors.canvas, fontSize: 18, fontWeight: "800", lineHeight: 24 }}>{section.name}</Text>
          <Text style={screenStyles.subtle}>{section.intent}</Text>
        </View>
      </View>
      <View style={{ gap: spacing.sm }}>
        {section.exercises.map((exercise) => {
          const parts = exercisePrescriptionParts(exercise);
          return (
            <View
              key={exercise.exerciseId}
              style={{
                borderTopColor: colors.line,
                borderTopWidth: 1,
                gap: spacing.xs,
                paddingTop: spacing.sm
              }}
            >
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: colors.canvas, fontSize: 16, fontWeight: "700", lineHeight: 22 }}>{exercise.name}</Text>
                  <Text style={screenStyles.subtle}>{exercise.category.replace(/_/g, " ")}</Text>
                </View>
              </View>
              {parts.length > 0 ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
                  {parts.map((part, partIndex) => (
                    <View key={`exercise-part:${partIndex}`} style={[screenStyles.chip, { minHeight: 32, paddingHorizontal: spacing.sm, paddingVertical: 4 }]}>
                      <Text style={{ color: colors.wrap, fontSize: 12, fontWeight: "700", lineHeight: 16 }}>{part}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <Text style={screenStyles.subtle}>Load: {exercise.loadGuidance}</Text>
            </View>
          );
        })}
      </View>
    </View>
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
  const [resultOpen, setResultOpen] = useState(false);
  const [exerciseDetailsOpen, setExerciseDetailsOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
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
      setResultOpen(false);
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
    setResultOpen(false);
  };

  return (
    <EngineCard>
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.fieldLabel}>Generated workout</Text>
        <Text style={screenStyles.heroTitle}>{session.title}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
          <SessionMeta label={`${session.durationMinutes} min`} />
          <SessionMeta label={session.intensity.replace(/_/g, " ")} />
          <SessionMeta label={`${session.sections.length} section${session.sections.length === 1 ? "" : "s"}`} />
        </View>
        <Text style={screenStyles.body}>{session.whyThisMattersForBoxing}</Text>
        {session.boxingSkillTheme ? <Text style={screenStyles.subtle}>Skill: {session.boxingSkillTheme}</Text> : null}
        {session.tacticalTheme ? <Text style={screenStyles.subtle}>Tactical theme: {session.tacticalTheme}</Text> : null}
        {session.roundStructure ? <Text style={screenStyles.subtle}>Rounds: {session.roundStructure}</Text> : null}
        {localError ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{localError}</Text> : null}
        {completionMessage ? <Text style={[screenStyles.subtle, { color: colors.amberCaution }]}>{completionMessage}</Text> : null}
        <Pressable accessibilityLabel={resultOpen ? "Hide workout result logger" : "Log result"} accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => setResultOpen((value) => !value)} style={screenStyles.button}>
          <Text style={screenStyles.buttonText}>{resultOpen ? "Hide result logger" : "Log result"}</Text>
        </Pressable>
      </View>
      <View style={{ gap: spacing.md }}>
        <Text style={screenStyles.sectionTitle}>Session plan</Text>
        {session.sessionQualityCheckpoints && session.sessionQualityCheckpoints.length > 0 ? (
          <View style={{ gap: spacing.xs }}>
            <Text style={screenStyles.fieldLabel}>Quality checkpoints</Text>
            {session.sessionQualityCheckpoints.map((item, index) => <Text key={`quality-checkpoint:${index}`} style={screenStyles.subtle}>{item}</Text>)}
          </View>
        ) : null}
        {session.sections.map((section, index) => (
          <WorkoutSectionCard index={index} key={`workout-section:${index}`} section={section} />
        ))}
        {session.addOnBlocks && session.addOnBlocks.length > 0 ? (
          <View style={{ gap: spacing.xs }}>
            <Text style={screenStyles.fieldLabel}>Add-ons</Text>
            {session.addOnBlocks.map((block) => (
              <Text key={block.id} style={screenStyles.subtle}>
                {block.priority}: {block.label} ({block.durationMinutes} min) - {block.athleteFacingPurpose}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
      {resultOpen ? (
        <View style={{ gap: spacing.md }}>
          <View style={{ gap: spacing.xs }}>
            <Text style={screenStyles.sectionTitle}>Log result</Text>
            <Text style={screenStyles.body}>Complete without exercise details when time is tight.</Text>
            <Text style={screenStyles.subtle}>Session RPE is enough if you are short on time.</Text>
          </View>
          <TextInput keyboardType="decimal-pad" onChangeText={setSessionRpe} placeholder="Session RPE 1-10 optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={sessionRpe} />
          <TextInput onChangeText={setPainNotes} placeholder="Pain note optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={painNotes} />
          <TextInput onChangeText={setNotes} placeholder="Session notes / skip reason optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={notes} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <Pressable accessibilityLabel="Complete without exercise details" accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => void complete()} style={screenStyles.button}>
              <Text style={screenStyles.buttonText}>{busy ? "Saving completion..." : "Complete without exercise details"}</Text>
            </Pressable>
            <Pressable accessibilityLabel="Skip session with optional reason" accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => void skip()} style={screenStyles.quietButton}>
              <Text style={screenStyles.quietButtonText}>{busy ? "Saving skip..." : "Skip session"}</Text>
            </Pressable>
          </View>
          <View style={{ gap: spacing.sm }}>
            <Pressable accessibilityLabel={exerciseDetailsOpen ? "Hide optional exercise details" : "Show optional exercise details"} accessibilityRole="button" accessibilityState={{ selected: exerciseDetailsOpen }} onPress={() => setExerciseDetailsOpen((value) => !value)} style={screenStyles.quietButton}>
              <Text style={screenStyles.quietButtonText}>{exerciseDetailsOpen ? "Hide optional exercise details" : "Show optional exercise details"}</Text>
            </Pressable>
            <Text style={screenStyles.subtle}>Exercise rows are optional. Blank rows save as prescribed_only; skipped sessions do not save exercise rows.</Text>
            {exerciseDetailsOpen ? session.sections.map((section, sectionIndex) => (
              <View key={`detail-section:${sectionIndex}`} style={{ gap: spacing.sm }}>
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
                      <Pressable accessibilityLabel={`${input.painFlag ? "Remove" : "Add"} pain flag for ${exercise.name}`} accessibilityRole="button" accessibilityState={{ disabled: busy, selected: input.painFlag }} disabled={busy} onPress={() => updateExercise(exercise.exerciseId, (current) => ({ ...current, painFlag: !current.painFlag }))} style={[screenStyles.quietButton, input.painFlag ? { borderColor: colors.amberCaution } : null]}>
                        <Text style={screenStyles.quietButtonText}>{input.painFlag ? "Pain flag on" : "Pain flag optional"}</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )) : null}
          </View>
        </View>
      ) : null}
      <View style={{ gap: spacing.sm }}>
        <Pressable accessibilityLabel={whyOpen ? "Hide why and safety" : "Show why and safety"} accessibilityRole="button" accessibilityState={{ selected: whyOpen }} onPress={() => setWhyOpen((value) => !value)} style={screenStyles.quietButton}>
          <Text style={screenStyles.quietButtonText}>{whyOpen ? "Hide why / safety" : "Show why / safety"}</Text>
        </Pressable>
        {whyOpen ? (
          <View style={{ gap: spacing.xs }}>
            <Text style={screenStyles.body}>{session.whyThisMattersForBoxing}</Text>
            {session.readinessModifications.map((item, index) => <Text key={`readiness-mod:${index}`} style={screenStyles.subtle}>Readiness: {item}</Text>)}
            {session.cycleModifications.map((item, index) => <Text key={`cycle-mod:${index}`} style={screenStyles.subtle}>Cycle: {item}</Text>)}
            {(session.athleteQualityCues ?? []).map((item, index) => <Text key={`quality-cue:${index}`} style={screenStyles.subtle}>Cue: {item}</Text>)}
            {(session.selfCheckCues ?? []).map((item, index) => <Text key={`self-check:${index}`} style={screenStyles.subtle}>Self-check: {item}</Text>)}
            {session.filmCue ? <Text style={screenStyles.subtle}>Optional film cue: {session.filmCue}</Text> : null}
            {session.nextSessionNote ? <Text style={screenStyles.subtle}>Next-session note: {session.nextSessionNote}</Text> : null}
            {session.stopConditions.slice(0, 3).map((item, index) => <Text key={`stop-condition:${index}`} style={screenStyles.subtle}>Stop: {item}</Text>)}
            {session.safetyNotes.slice(0, 3).map((item, index) => <Text key={`safety-note:${index}`} style={screenStyles.subtle}>Safety: {item}</Text>)}
            <Text style={screenStyles.subtle}>Pain notes help the engine avoid automatic progression. Result statuses: completed, partial, prescribed_only, or skipped.</Text>
          </View>
        ) : null}
      </View>
    </View>
    </EngineCard>
  );
}
