import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { DetailedTrainingSession, ExerciseResultDraft, ExerciseResultLoadUnit, ExerciseResultSide, ExerciseResultTechnicalQuality } from "../../../engine/core/types";
import type { WorkoutCompletionActions } from "../../../hooks/useWorkoutCompletion";
import { PostActionNextStep } from "../../../design/components/FastTask";
import { DashboardCard } from "../../../design/components/PerformanceVisuals";
import { glassStyles } from "../../../design/glass";
import { spacing } from "../../../design/theme";
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
import { trainColorForTone, trainPalette, trainTextStyles, trainTint } from "./trainPalette";

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
  const accentTone = open ? "gold" : "blue";
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
          backgroundColor: disabled ? trainPalette.controlFill : open ? trainTint("blue", "12") : trainPalette.controlFill,
          borderColor: disabled ? "rgba(218, 208, 242, 0.12)" : open ? trainTint("blue", "42") : trainPalette.controlLine,
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
        <Text numberOfLines={1} style={{ color: trainPalette.textPrimary, fontSize: 14, fontWeight: "900", lineHeight: 19 }}>
          {label}
        </Text>
        {meta ? <Text numberOfLines={1} style={trainTextStyles.subtle}>{meta}</Text> : null}
      </View>
      <Text style={{ color: disabled ? trainPalette.textMuted : trainColorForTone(accentTone), fontSize: 12, fontWeight: "900", lineHeight: 16 }}>{open ? "Hide" : "Show"}</Text>
    </Pressable>
  );
}

function TrainInput({
  keyboardType,
  onChangeText,
  placeholder,
  value,
  autoCapitalize
}: {
  autoCapitalize?: "none" | "sentences" | "words" | "characters" | undefined;
  keyboardType?: React.ComponentProps<typeof TextInput>["keyboardType"];
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <TextInput
      autoCapitalize={autoCapitalize}
      keyboardType={keyboardType}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={trainPalette.textMuted}
      style={[screenStyles.input, { backgroundColor: trainPalette.controlFill, borderColor: trainPalette.controlLine, color: trainPalette.textPrimary }]}
      value={value}
    />
  );
}

function TrainPanelPrimaryButton({
  accessibilityLabel,
  children,
  disabled,
  onPress
}: React.PropsWithChildren<{
  accessibilityLabel?: string | undefined;
  disabled?: boolean | undefined;
  onPress: () => void;
}>) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        screenStyles.button,
        {
          backgroundColor: disabled ? "rgba(255, 255, 255, 0.1)" : pressed ? trainPalette.actionFillPressed : trainPalette.actionFill,
          borderColor: disabled ? "rgba(255, 255, 255, 0.16)" : trainPalette.actionBorder,
          boxShadow: disabled ? "none" : `0 12px 28px ${trainPalette.actionShadow}`
        }
      ]}
    >
      <Text style={{ color: disabled ? trainPalette.textMuted : trainPalette.textPrimary, fontSize: 15, fontWeight: "800", lineHeight: 20, textAlign: "center" }}>
        {children}
      </Text>
    </Pressable>
  );
}

function TrainPanelQuietButton({
  accessibilityLabel,
  children,
  disabled,
  onPress,
  selected = false
}: React.PropsWithChildren<{
  accessibilityLabel?: string | undefined;
  disabled?: boolean | undefined;
  onPress: () => void;
  selected?: boolean | undefined;
}>) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        screenStyles.quietButton,
        {
          backgroundColor: pressed || selected ? trainPalette.controlFillPressed : trainPalette.controlFill,
          borderColor: selected ? trainTint("gold", "66") : trainPalette.controlLine,
          boxShadow: "0 8px 22px rgba(0, 0, 0, 0.18)"
        }
      ]}
    >
      <Text style={{ color: selected ? trainColorForTone("gold") : trainPalette.textBody, fontSize: 15, fontWeight: "700", lineHeight: 20, textAlign: "center" }}>
        {children}
      </Text>
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
          {startWorkoutDisabledReason ? <Text style={[trainTextStyles.subtle, { color: trainColorForTone("orange") }]}>{startWorkoutDisabledReason}</Text> : null}
          {previewOnlyReason ? <Text style={trainTextStyles.subtle}>{previewOnlyReason}</Text> : null}
          {localError ? <Text style={[trainTextStyles.subtle, { color: trainColorForTone("red") }]}>{localError}</Text> : null}
          {completionMessage ? <Text style={[trainTextStyles.subtle, { color: trainColorForTone("orange") }]}>{completionMessage}</Text> : null}
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
              <Text style={trainTextStyles.body}>{recipeWhy(session)}</Text>
              {(session.athleteQualityCues ?? []).slice(0, 2).map((item, index) => <Text key={`quality-cue:${index}`} style={trainTextStyles.subtle}>Coach's Note: {plainTrainingCopy(item)}</Text>)}
              {(session.selfCheckCues ?? []).slice(0, 2).map((item, index) => <Text key={`self-check:${index}`} style={trainTextStyles.subtle}>Readiness: {plainTrainingCopy(item)}</Text>)}
              {session.nextSessionNote ? <Text style={trainTextStyles.subtle}>Next: {plainTrainingCopy(session.nextSessionNote)}</Text> : null}
              {session.stopConditions.slice(0, 2).map((item, index) => <Text key={`stop-condition:${index}`} style={trainTextStyles.subtle}>Stop: {plainTrainingCopy(item)}</Text>)}
              {session.safetyNotes.slice(0, 2).map((item, index) => <Text key={`safety-note:${index}`} style={trainTextStyles.subtle}>Before you start: {plainTrainingCopy(item)}</Text>)}
              <Text style={trainTextStyles.subtle}>Pain notes keep future training conservative.</Text>
            </View>
          ) : null}
          <DetailToggleRow label="Adjust Today" meta="Simple changes if the session feels off" onPress={() => setAdjustOpen((value) => !value)} open={adjustOpen} />
          {adjustOpen ? (
            <View style={{ gap: spacing.xs }}>
              {adjustTodayOptions(session).map((item) => (
                <Text key={`adjust:${item}`} style={trainTextStyles.subtle}>{item}</Text>
              ))}
            </View>
          ) : null}
          <DetailToggleRow disabled={quickLogBlocked} label="Quick Log" meta={quickLogBlocked ? "Available on the planned day" : "RPE, notes, done, or skipped"} onPress={() => setResultOpen((value) => !value)} open={resultOpen} />
        </View>
      </DashboardCard>
      {resultOpen && !previewOnlyReason ? (
        <View style={{ gap: spacing.md }}>
          <View style={{ gap: spacing.xs }}>
            <Text style={trainTextStyles.sectionTitle}>Quick Log</Text>
            <Text style={trainTextStyles.body}>Mark workout done without follow-along when time is tight.</Text>
            <Text style={trainTextStyles.subtle}>Session RPE is enough if you are short on time.</Text>
            <Text style={trainTextStyles.subtle}>Workout: {quickLogContext.whatToDo}</Text>
            <Text style={trainTextStyles.subtle}>Coach's Note: {quickLogMainJob(session)}</Text>
            <Text style={trainTextStyles.subtle}>Log only what matters: {quickLogContext.logPrompt}</Text>
          </View>
          <TrainInput keyboardType="decimal-pad" onChangeText={setSessionRpe} placeholder="Session RPE 1-10 optional" value={sessionRpe} />
          <TrainInput onChangeText={setPainNotes} placeholder="Pain note optional" value={painNotes} />
          <TrainInput onChangeText={setNotes} placeholder="Session notes / skip reason optional" value={notes} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <View style={{ flexBasis: 170, flexGrow: 1 }}>
              <TrainPanelPrimaryButton accessibilityLabel="Mark workout done" disabled={busy} onPress={() => void complete()}>{busy ? "Saving workout..." : "Mark workout done"}</TrainPanelPrimaryButton>
            </View>
            <View style={{ flexBasis: 132, flexGrow: 1 }}>
              <TrainPanelQuietButton accessibilityLabel="Skip session" disabled={busy} onPress={() => void skip()}>{busy ? "Saving skip..." : "Skip session"}</TrainPanelQuietButton>
            </View>
          </View>
          <View style={{ gap: spacing.sm }}>
            <TrainPanelQuietButton accessibilityLabel={exerciseDetailsOpen ? "Hide exercise details" : "Add exercise details"} onPress={() => setExerciseDetailsOpen((value) => !value)} selected={exerciseDetailsOpen}>{exerciseDetailsOpen ? "Hide exercise details" : "Add exercise details"}</TrainPanelQuietButton>
            <Text style={trainTextStyles.subtle}>Exercise rows are optional. Blank rows save as not logged when the workout is marked done; skipped sessions do not save exercise rows.</Text>
            {exerciseDetailsOpen ? (
              <TrainPanelQuietButton accessibilityLabel={structuredActualsOpen ? "Hide extra fields" : "Extra fields"} onPress={() => setStructuredActualsOpen((value) => !value)} selected={structuredActualsOpen}>{structuredActualsOpen ? "Hide extra fields" : "Extra fields"}</TrainPanelQuietButton>
            ) : null}
            {exerciseDetailsOpen ? session.sections.map((section, sectionIndex) => (
              <View key={`detail-section:${sectionIndex}`} style={{ gap: spacing.sm }}>
                <Text style={trainTextStyles.sectionTitle}>{plainSectionName(section.name)}</Text>
                <Text style={trainTextStyles.subtle}>{plainSectionIntent(section.intent)}</Text>
                {section.exercises.map((exercise) => {
                  const input = exerciseInputs[exercise.exerciseId] ?? emptyExerciseResultInputs();
                  return (
                    <View key={exercise.exerciseId} style={{ gap: spacing.sm }}>
                      <ExercisePrescriptionCard exercise={exercise} sectionName={plainSectionName(section.name)} />
                      <TrainInput keyboardType="number-pad" onChangeText={(value) => updateExercise(exercise.exerciseId, (current) => ({ ...current, completedSets: value }))} placeholder="Completed sets optional" value={input.completedSets} />
                      <TrainInput onChangeText={(value) => updateExercise(exercise.exerciseId, (current) => ({ ...current, loadText: value }))} placeholder="Load text optional" value={input.loadText} />
                      {structuredActualsOpen ? (
                        <View style={{ gap: spacing.sm }}>
                          <Text style={trainTextStyles.subtle}>Extra fields are optional and are never inferred from load notes.</Text>
                          <TrainInput keyboardType="decimal-pad" onChangeText={(value) => updateExercise(exercise.exerciseId, (current) => ({ ...current, loadValue: value }))} placeholder="Structured load value optional" value={input.loadValue} />
                          <TrainInput autoCapitalize="none" onChangeText={(value) => updateExercise(exercise.exerciseId, (current) => ({ ...current, loadUnit: value }))} placeholder="Load unit: kg, lb, bodyweight, band, other" value={input.loadUnit} />
                          <TrainInput keyboardType="number-pad" onChangeText={(value) => updateExercise(exercise.exerciseId, (current) => ({ ...current, repsCompleted: value }))} placeholder="Reps completed optional" value={input.repsCompleted} />
                          <TrainInput keyboardType="decimal-pad" onChangeText={(value) => updateExercise(exercise.exerciseId, (current) => ({ ...current, timeSeconds: value }))} placeholder="Time seconds optional" value={input.timeSeconds} />
                          <TrainInput keyboardType="decimal-pad" onChangeText={(value) => updateExercise(exercise.exerciseId, (current) => ({ ...current, distanceMeters: value }))} placeholder="Distance meters optional" value={input.distanceMeters} />
                          <TrainInput autoCapitalize="none" onChangeText={(value) => updateExercise(exercise.exerciseId, (current) => ({ ...current, side: value }))} placeholder="Side: bilateral, left, right, alternating, not_applicable" value={input.side} />
                          <TrainInput autoCapitalize="none" onChangeText={(value) => updateExercise(exercise.exerciseId, (current) => ({ ...current, technicalQuality: value }))} placeholder="Quality: clean, mostly_clean, technical_breakdown, stopped_for_pain, unknown" value={input.technicalQuality} />
                        </View>
                      ) : null}
                      <TrainInput keyboardType="decimal-pad" onChangeText={(value) => updateExercise(exercise.exerciseId, (current) => ({ ...current, rpe: value }))} placeholder="Exercise RPE optional" value={input.rpe} />
                      <TrainInput onChangeText={(value) => updateExercise(exercise.exerciseId, (current) => ({ ...current, notes: value }))} placeholder="Exercise notes optional" value={input.notes} />
                      <TrainPanelQuietButton accessibilityLabel={`${input.painFlag ? "Remove" : "Add"} pain flag for ${exercise.name}`} disabled={busy} onPress={() => updateExercise(exercise.exerciseId, (current) => ({ ...current, painFlag: !current.painFlag }))} selected={input.painFlag}>
                        {input.painFlag ? "Pain flag on" : "Pain flag optional"}
                      </TrainPanelQuietButton>
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
