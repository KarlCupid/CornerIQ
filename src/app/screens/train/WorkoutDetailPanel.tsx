import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { DetailedTrainingSession, ExerciseResultDraft, ExerciseResultLoadUnit, ExerciseResultSide, ExerciseResultTechnicalQuality } from "../../../engine/core/types";
import type { WorkoutCompletionActions } from "../../../hooks/useWorkoutCompletion";
import { PostActionNextStep } from "../../../design/components/FastTask";
import { DashboardCard } from "../../../design/components/PerformanceVisuals";
import { glassStyles } from "../../../design/glass";
import { colors, spacing } from "../../../design/theme";
import {
  plainSectionIntent,
  plainSectionName,
  plainTrainingCopy
} from "../../../engine/presentation/trainingCopy";
import { recipeQuickLogContext, recipeWhy } from "../../../engine/presentation/workoutRecipePresentation";
import { parseOptionalNonNegativeInteger, parseOptionalPositiveNumber, validationError } from "../../forms/validation";
import { screenStyles } from "../screenStyles";
import { ExercisePrescriptionCard } from "./ExercisePrescriptionCard";
import { WorkoutExerciseDetails } from "./WorkoutExerciseDetails";

type WorkoutFollowUpState = "completed" | "skipped" | "review";

interface ExerciseResultInputs {
  completedSets: string;
  loadValue: string;
  loadUnit: string;
  repsCompleted: string;
  timeSeconds: string;
  distanceMeters: string;
  side: string;
  technicalQuality: string;
  loadText: string;
  rpe: string;
  notes: string;
  painFlag: boolean;
}

function emptyExerciseResultInputs(): ExerciseResultInputs {
  return {
    completedSets: "",
    loadValue: "",
    loadUnit: "",
    repsCompleted: "",
    timeSeconds: "",
    distanceMeters: "",
    side: "",
    technicalQuality: "",
    loadText: "",
    rpe: "",
    notes: "",
    painFlag: false
  };
}

function hasStructuredExerciseInput(input: ExerciseResultInputs): boolean {
  return Boolean(
    input.loadValue.trim() ||
      input.loadUnit.trim() ||
      input.repsCompleted.trim() ||
      input.timeSeconds.trim() ||
      input.distanceMeters.trim() ||
      input.side.trim() ||
      input.technicalQuality.trim()
  );
}

function hasActualExerciseInput(input: ExerciseResultInputs): boolean {
  return Boolean(input.completedSets.trim() || hasStructuredExerciseInput(input) || input.loadText.trim() || input.rpe.trim() || input.notes.trim() || input.painFlag);
}

function resultStatus(exerciseSetCount: number, input: ExerciseResultInputs, completedSets: number | undefined): ExerciseResultDraft["resultStatus"] {
  if (!hasActualExerciseInput(input)) {
    return "prescribed" + "_only" as ExerciseResultDraft["resultStatus"];
  }
  if (completedSets === 0) {
    return "skipped";
  }
  if (completedSets !== undefined && completedSets >= exerciseSetCount && !input.painFlag) {
    return "completed";
  }
  return "partial";
}

const LOAD_UNITS: readonly ExerciseResultLoadUnit[] = ["kg", "lb", "bodyweight", "band", "other"];
const EXERCISE_SIDES: readonly ExerciseResultSide[] = ["left", "right", "bilateral", "alternating", "not_applicable"];
const TECHNICAL_QUALITIES: readonly ExerciseResultTechnicalQuality[] = ["clean", "mostly_clean", "technical_breakdown", "stopped_for_pain", "unknown"];

function parseEnumValue<TValue extends string>(value: string, allowed: readonly TValue[], label: string, exerciseName: string): TValue | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  if (allowed.includes(trimmed as TValue)) {
    return trimmed as TValue;
  }
  throw new Error(`${exerciseName} ${label} must be one of: ${allowed.join(", ")}.`);
}

function parseLoadUnit(value: string, exerciseName: string): ExerciseResultLoadUnit | undefined {
  return parseEnumValue(value, LOAD_UNITS, "load unit", exerciseName);
}

function parseSide(value: string, exerciseName: string): ExerciseResultSide | undefined {
  return parseEnumValue(value, EXERCISE_SIDES, "side", exerciseName);
}

function parseTechnicalQuality(value: string, exerciseName: string): ExerciseResultTechnicalQuality | undefined {
  return parseEnumValue(value, TECHNICAL_QUALITIES, "technical quality", exerciseName);
}

function parseExerciseResult(session: DetailedTrainingSession, values: Record<string, ExerciseResultInputs>): ExerciseResultDraft[] {
  return session.sections.flatMap((section) =>
    section.exercises.map((exercise) => {
      const input = values[exercise.exerciseId] ?? emptyExerciseResultInputs();
      const completedSets = parseOptionalNonNegativeInteger(input.completedSets, `${exercise.name} completed sets`, { required: false });
      const loadValue = parseOptionalPositiveNumber(input.loadValue, `${exercise.name} structured load`, { required: false });
      const repsCompleted = parseOptionalNonNegativeInteger(input.repsCompleted, `${exercise.name} reps completed`, { required: false });
      const timeSeconds = parseOptionalPositiveNumber(input.timeSeconds, `${exercise.name} time seconds`, { required: false });
      const distanceMeters = parseOptionalPositiveNumber(input.distanceMeters, `${exercise.name} distance meters`, { required: false });
      const loadUnit = parseLoadUnit(input.loadUnit, exercise.name);
      const side = parseSide(input.side, exercise.name);
      const technicalQuality = parseTechnicalQuality(input.technicalQuality, exercise.name);
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
        ...(loadValue === undefined ? {} : { loadValue }),
        ...(loadUnit === undefined ? {} : { loadUnit }),
        ...(repsCompleted === undefined ? {} : { repsCompleted }),
        ...(timeSeconds === undefined ? {} : { timeSeconds }),
        ...(distanceMeters === undefined ? {} : { distanceMeters }),
        ...(side === undefined ? {} : { side }),
        ...(technicalQuality === undefined ? {} : { technicalQuality }),
        ...(input.loadText.trim() ? { loadText: input.loadText.trim() } : {}),
        ...(rpe === undefined ? {} : { rpe }),
        ...(input.notes.trim() ? { notes: input.notes.trim() } : {}),
        ...(input.painFlag ? { painFlag: true } : {})
      };
    })
  );
}

function WorkoutPlanDetails({ session }: { session: DetailedTrainingSession }) {
  return (
    <View style={{ gap: spacing.md }} testID="workout-plan-detail-section">
      <WorkoutExerciseDetails session={session} title={session.recipe ? "Workout recipe" : "Exercise details"} />
    </View>
  );
}

function DetailToggleRow({
  disabled = false,
  label,
  meta,
  onPress,
  open
}: {
  disabled?: boolean | undefined;
  label: string;
  meta?: string | undefined;
  onPress: () => void;
  open: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={`${open ? "Hide" : "Show"} ${label}`}
      accessibilityRole="button"
      accessibilityState={{ disabled, expanded: open }}
      disabled={disabled}
      onPress={onPress}
      style={[
        glassStyles.control,
        {
          alignItems: "center",
          flexDirection: "row",
          gap: spacing.md,
          justifyContent: "space-between",
          minHeight: 52,
          opacity: disabled ? 0.58 : 1,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm
        }
      ]}
    >
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: colors.canvas, fontSize: 14, fontWeight: "900", lineHeight: 19 }}>
          {label}
        </Text>
        {meta ? <Text numberOfLines={1} style={screenStyles.subtle}>{meta}</Text> : null}
      </View>
      <Text style={{ color: colors.powerPurple, fontSize: 12, fontWeight: "900", lineHeight: 16 }}>{open ? "Hide" : "Show"}</Text>
    </Pressable>
  );
}

function adjustTodayOptions(session: DetailedTrainingSession): readonly string[] {
  const options = new Set<string>();
  options.add("Lower the pace.");
  options.add("Keep the warm-up longer.");
  if (session.intensity === "hard") {
    options.add("Change hard rounds to technical rounds.");
  }
  if (session.sections.some((section) => section.exercises.some((exercise) => /strength|lift|loaded|squat|hinge|row|press/i.test(`${section.name} ${exercise.name}`)))) {
    options.add("Skip loaded work if pain shows up.");
  }
  options.add("Shorten the finisher.");
  options.add("Stop the session if symptoms return.");
  return Array.from(options).slice(0, 6);
}

function quickLogMainJob(session: DetailedTrainingSession): string {
  return recipeQuickLogContext(session).mainJob;
}

export function WorkoutDetailPanel({
  busy,
  completionActions,
  completionMessage,
  onOpenFuel,
  planOpenRequestKey = 0,
  previewOnlyReason,
  quickLogOpenRequestKey = 0,
  startWorkoutDisabledReason,
  session
}: {
  busy: boolean;
  completionActions?: WorkoutCompletionActions | undefined;
  completionMessage?: string | null | undefined;
  onOpenFuel?: (() => void) | undefined;
  planOpenRequestKey?: number | undefined;
  previewOnlyReason?: string | undefined;
  quickLogOpenRequestKey?: number | undefined;
  startWorkoutDisabledReason?: string | undefined;
  session: DetailedTrainingSession;
}) {
  const [resultOpen, setResultOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [exerciseDetailsOpen, setExerciseDetailsOpen] = useState(false);
  const [structuredActualsOpen, setStructuredActualsOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [sessionRpe, setSessionRpe] = useState("");
  const [painNotes, setPainNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [exerciseInputs, setExerciseInputs] = useState<Record<string, ExerciseResultInputs>>({});
  const [localError, setLocalError] = useState<string | null>(null);
  const [followUpState, setFollowUpState] = useState<WorkoutFollowUpState | null>(null);

  React.useEffect(() => {
    if (quickLogOpenRequestKey > 0) {
      setResultOpen(true);
    }
  }, [quickLogOpenRequestKey]);

  React.useEffect(() => {
    if (planOpenRequestKey > 0) {
      setPlanOpen(true);
    }
  }, [planOpenRequestKey]);

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
      const exerciseResults = parseExerciseResult(session, exerciseInputs);
      const needsReview =
        Boolean(painNotes.trim()) ||
        (parsedSessionRpe !== undefined && parsedSessionRpe >= 8) ||
        exerciseResults.some((result) => result.painFlag || (typeof result.rpe === "number" && result.rpe >= 8));
      await completionActions.complete(session, {
        ...(parsedSessionRpe === undefined ? {} : { sessionRpe: parsedSessionRpe }),
        painNotes: painNotes.trim() ? [painNotes.trim()] : [],
        notes: notes.trim(),
        exerciseResults
      });
      setFollowUpState(needsReview ? "review" : "completed");
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
    setFollowUpState("skipped");
    setResultOpen(false);
  };

  const followUpCopy =
    followUpState === "review"
      ? "Review pain and RPE before adding more."
      : followUpState === "skipped"
        ? "Skipped. Keep the next session conservative."
        : "Done. Fuel check optional.";
  const quickLogContext = recipeQuickLogContext(session);
  const quickLogBlocked = Boolean(previewOnlyReason);

  return (
    <View style={{ gap: spacing.lg }}>
      <DashboardCard testID="train-workout-preview-card" title="Workout Details">
        <View style={{ gap: spacing.sm }}>
          {startWorkoutDisabledReason ? <Text style={[screenStyles.subtle, { color: colors.amberCaution }]}>{startWorkoutDisabledReason}</Text> : null}
          {previewOnlyReason ? <Text style={screenStyles.subtle}>{previewOnlyReason}</Text> : null}
          {localError ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{localError}</Text> : null}
          {completionMessage ? <Text style={[screenStyles.subtle, { color: colors.amberCaution }]}>{completionMessage}</Text> : null}
          {followUpState ? (
            <PostActionNextStep
              actions={
                followUpState === "completed" && onOpenFuel
                  ? [{ disabled: busy, label: "Open Fuel", onPress: onOpenFuel }]
                  : []
              }
              body={followUpCopy}
              framed={false}
              testID="workout-next-action-card"
            />
          ) : null}
          <DetailToggleRow label="Exercise Details" meta="Full recipe and exercise rows" onPress={() => setPlanOpen((value) => !value)} open={planOpen} />
          {planOpen ? <WorkoutPlanDetails session={session} /> : null}
          <DetailToggleRow label="Why This Session" meta="What this is meant to improve" onPress={() => setWhyOpen((value) => !value)} open={whyOpen} />
          {whyOpen ? (
            <View style={{ gap: spacing.xs }}>
              <Text style={screenStyles.body}>{recipeWhy(session)}</Text>
              {(session.athleteQualityCues ?? []).slice(0, 2).map((item, index) => <Text key={`quality-cue:${index}`} style={screenStyles.subtle}>Coach's Note: {plainTrainingCopy(item)}</Text>)}
              {(session.selfCheckCues ?? []).slice(0, 2).map((item, index) => <Text key={`self-check:${index}`} style={screenStyles.subtle}>Readiness: {plainTrainingCopy(item)}</Text>)}
              {session.nextSessionNote ? <Text style={screenStyles.subtle}>Next: {plainTrainingCopy(session.nextSessionNote)}</Text> : null}
              {session.stopConditions.slice(0, 2).map((item, index) => <Text key={`stop-condition:${index}`} style={screenStyles.subtle}>Stop: {plainTrainingCopy(item)}</Text>)}
              {session.safetyNotes.slice(0, 2).map((item, index) => <Text key={`safety-note:${index}`} style={screenStyles.subtle}>Before you start: {plainTrainingCopy(item)}</Text>)}
              <Text style={screenStyles.subtle}>Pain notes keep future training conservative.</Text>
            </View>
          ) : null}
          <DetailToggleRow label="Adjust Today" meta="Simple changes if the session feels off" onPress={() => setAdjustOpen((value) => !value)} open={adjustOpen} />
          {adjustOpen ? (
            <View style={{ gap: spacing.xs }}>
              {adjustTodayOptions(session).map((item) => (
                <Text key={`adjust:${item}`} style={screenStyles.subtle}>{item}</Text>
              ))}
            </View>
          ) : null}
          <DetailToggleRow disabled={quickLogBlocked} label="Quick Log" meta={quickLogBlocked ? "Available on the planned day" : "RPE, notes, done, or skipped"} onPress={() => setResultOpen((value) => !value)} open={resultOpen} />
        </View>
      </DashboardCard>
      {resultOpen && !previewOnlyReason ? (
        <View style={{ gap: spacing.md }}>
          <View style={{ gap: spacing.xs }}>
            <Text style={screenStyles.sectionTitle}>Quick Log</Text>
            <Text style={screenStyles.body}>Mark workout done without follow-along when time is tight.</Text>
            <Text style={screenStyles.subtle}>Session RPE is enough if you are short on time.</Text>
            <Text style={screenStyles.subtle}>Workout: {quickLogContext.whatToDo}</Text>
            <Text style={screenStyles.subtle}>Coach's Note: {quickLogMainJob(session)}</Text>
            <Text style={screenStyles.subtle}>Log only what matters: {quickLogContext.logPrompt}</Text>
          </View>
          <TextInput keyboardType="decimal-pad" onChangeText={setSessionRpe} placeholder="Session RPE 1-10 optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={sessionRpe} />
          <TextInput onChangeText={setPainNotes} placeholder="Pain note optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={painNotes} />
          <TextInput onChangeText={setNotes} placeholder="Session notes / skip reason optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={notes} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <Pressable accessibilityLabel="Mark workout done" accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => void complete()} style={[screenStyles.button, { flexBasis: 170, flexGrow: 1 }]}>
              <Text style={screenStyles.buttonText}>{busy ? "Saving workout..." : "Mark workout done"}</Text>
            </Pressable>
            <Pressable accessibilityLabel="Skip session" accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => void skip()} style={[screenStyles.quietButton, { flexBasis: 132, flexGrow: 1 }]}>
              <Text style={screenStyles.quietButtonText}>{busy ? "Saving skip..." : "Skip session"}</Text>
            </Pressable>
          </View>
          <View style={{ gap: spacing.sm }}>
            <Pressable accessibilityLabel={exerciseDetailsOpen ? "Hide exercise details" : "Add exercise details"} accessibilityRole="button" accessibilityState={{ selected: exerciseDetailsOpen }} onPress={() => setExerciseDetailsOpen((value) => !value)} style={screenStyles.quietButton}>
              <Text style={screenStyles.quietButtonText}>{exerciseDetailsOpen ? "Hide exercise details" : "Add exercise details"}</Text>
            </Pressable>
            <Text style={screenStyles.subtle}>Exercise rows are optional. Blank rows save as not logged when the workout is marked done; skipped sessions do not save exercise rows.</Text>
            {exerciseDetailsOpen ? (
              <Pressable accessibilityLabel={structuredActualsOpen ? "Hide extra fields" : "Extra fields"} accessibilityRole="button" accessibilityState={{ selected: structuredActualsOpen }} onPress={() => setStructuredActualsOpen((value) => !value)} style={screenStyles.quietButton}>
                <Text style={screenStyles.quietButtonText}>{structuredActualsOpen ? "Hide extra fields" : "Extra fields"}</Text>
              </Pressable>
            ) : null}
            {exerciseDetailsOpen ? session.sections.map((section, sectionIndex) => (
              <View key={`detail-section:${sectionIndex}`} style={{ gap: spacing.sm }}>
                <Text style={screenStyles.sectionTitle}>{plainSectionName(section.name)}</Text>
                <Text style={screenStyles.subtle}>{plainSectionIntent(section.intent)}</Text>
                {section.exercises.map((exercise) => {
                  const input = exerciseInputs[exercise.exerciseId] ?? emptyExerciseResultInputs();
                  return (
                    <View key={exercise.exerciseId} style={{ gap: spacing.sm }}>
                      <ExercisePrescriptionCard exercise={exercise} sectionName={plainSectionName(section.name)} />
                      <TextInput keyboardType="number-pad" onChangeText={(value) => updateExercise(exercise.exerciseId, (current) => ({ ...current, completedSets: value }))} placeholder="Completed sets optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={input.completedSets} />
                      <TextInput onChangeText={(value) => updateExercise(exercise.exerciseId, (current) => ({ ...current, loadText: value }))} placeholder="Load text optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={input.loadText} />
                      {structuredActualsOpen ? (
                        <View style={{ gap: spacing.sm }}>
                          <Text style={screenStyles.subtle}>Extra fields are optional and are never inferred from load notes.</Text>
                          <TextInput keyboardType="decimal-pad" onChangeText={(value) => updateExercise(exercise.exerciseId, (current) => ({ ...current, loadValue: value }))} placeholder="Structured load value optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={input.loadValue} />
                          <TextInput autoCapitalize="none" onChangeText={(value) => updateExercise(exercise.exerciseId, (current) => ({ ...current, loadUnit: value }))} placeholder="Load unit: kg, lb, bodyweight, band, other" placeholderTextColor={colors.wrap} style={screenStyles.input} value={input.loadUnit} />
                          <TextInput keyboardType="number-pad" onChangeText={(value) => updateExercise(exercise.exerciseId, (current) => ({ ...current, repsCompleted: value }))} placeholder="Reps completed optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={input.repsCompleted} />
                          <TextInput keyboardType="decimal-pad" onChangeText={(value) => updateExercise(exercise.exerciseId, (current) => ({ ...current, timeSeconds: value }))} placeholder="Time seconds optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={input.timeSeconds} />
                          <TextInput keyboardType="decimal-pad" onChangeText={(value) => updateExercise(exercise.exerciseId, (current) => ({ ...current, distanceMeters: value }))} placeholder="Distance meters optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={input.distanceMeters} />
                          <TextInput autoCapitalize="none" onChangeText={(value) => updateExercise(exercise.exerciseId, (current) => ({ ...current, side: value }))} placeholder="Side: bilateral, left, right, alternating, not_applicable" placeholderTextColor={colors.wrap} style={screenStyles.input} value={input.side} />
                          <TextInput autoCapitalize="none" onChangeText={(value) => updateExercise(exercise.exerciseId, (current) => ({ ...current, technicalQuality: value }))} placeholder="Quality: clean, mostly_clean, technical_breakdown, stopped_for_pain, unknown" placeholderTextColor={colors.wrap} style={screenStyles.input} value={input.technicalQuality} />
                        </View>
                      ) : null}
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
    </View>
  );
}
