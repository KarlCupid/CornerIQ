import React, { useState } from "react";
import { Pressable, Text as NativeText, TextInput, View, type TextProps, type TextStyle } from "react-native";
import type { DetailedTrainingSession, ExerciseResultDraft, ExerciseResultLoadUnit, ExerciseResultSide, ExerciseResultTechnicalQuality } from "../../../engine/core/types";
import type { WorkoutCompletionActions } from "../../../hooks/useWorkoutCompletion";
import { PostActionNextStep } from "../../../design/components/FastTask";
import { colors, spacing } from "../../../design/theme";
import { fontFamilies } from "../../../design/typography";
import {
  plainSectionIntent,
  plainSectionName
} from "../../../engine/presentation/trainingCopy";
import {
  recipeAdjustGuidance,
  recipeEquipmentLabel,
  recipePlanSummaryBlocks,
  recipeQuickLogContext,
  recipeQuickLogImpactRows,
  recipeWhyHighlights
} from "../../../engine/presentation/workoutRecipePresentation";
import { parseOptionalNonNegativeInteger, parseOptionalPositiveNumber, validationError } from "../../forms/validation";
import { screenStyles } from "../screenStyles";
import { ExercisePrescriptionCard } from "./ExercisePrescriptionCard";
import { WorkoutExerciseDetails } from "./WorkoutExerciseDetails";
import { trainColorForTone, trainPalette, trainTextStyles } from "./trainPalette";

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

function flattenEditorialStyle(style: unknown): TextStyle {
  if (Array.isArray(style)) return Object.assign({}, ...style.map((item) => flattenEditorialStyle(item)));
  return style && typeof style === "object" ? style as TextStyle : {};
}

function Text({ style, ...props }: TextProps) {
  const flattened = flattenEditorialStyle(style);
  const weight = Number.parseInt(String(flattened.fontWeight ?? "400"), 10);
  const fontFamily = weight >= 900 ? fontFamilies.black : weight >= 800 ? fontFamilies.extraBold : weight >= 700 ? fontFamilies.bold : weight >= 600 ? fontFamilies.semibold : weight >= 500 ? fontFamilies.medium : fontFamilies.regular;
  return <NativeText {...props} style={[style, { fontFamily }]} />;
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

function canonicalResultMetadata(exercise: DetailedTrainingSession["sections"][number]["exercises"][number]) {
  return {
    ...(exercise.templateId === undefined ? {} : { templateId: exercise.templateId }),
    ...(exercise.templateBlockId === undefined ? {} : { templateBlockId: exercise.templateBlockId }),
    ...(exercise.templateSlotId === undefined ? {} : { templateSlotId: exercise.templateSlotId }),
    ...(exercise.movementPattern === undefined ? {} : { movementPattern: exercise.movementPattern }),
    ...(exercise.adaptation === undefined ? {} : { adaptation: exercise.adaptation }),
    ...(exercise.canonicalSessionId === undefined ? {} : { canonicalSessionId: exercise.canonicalSessionId }),
    ...(exercise.prescribedSets === undefined ? {} : { prescribedSets: exercise.prescribedSets }),
    ...(exercise.prescribedReps === undefined ? {} : { prescribedReps: exercise.prescribedReps }),
    ...(exercise.prescribedDurationSeconds === undefined ? {} : { prescribedDurationSeconds: exercise.prescribedDurationSeconds }),
    ...(exercise.prescribedLoadTarget === undefined ? {} : { prescribedLoadTarget: exercise.prescribedLoadTarget }),
    ...(exercise.prescribedRpe === undefined ? {} : { prescribedRpe: exercise.prescribedRpe }),
    ...(exercise.prescribedRir === undefined ? {} : { prescribedRir: exercise.prescribedRir }),
    ...(exercise.prescribedRestSeconds === undefined ? {} : { prescribedRestSeconds: exercise.prescribedRestSeconds })
  };
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
        ...canonicalResultMetadata(exercise),
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

function GuidanceTile({
  body,
  detail,
  label,
  tone = "muted"
}: {
  body: string;
  detail?: string | undefined;
  label: string;
  tone?: Parameters<typeof trainColorForTone>[0] | undefined;
}) {
  return (
    <View
      style={{
        backgroundColor: "transparent",
        borderBottomColor: trainPalette.cardLine,
        borderBottomWidth: 1,
        gap: spacing.xs,
        paddingVertical: spacing.md
      }}
    >
      <Text style={{ color: tone === "red" ? trainPalette.textPrimary : trainPalette.toneBlue, fontSize: 11, fontWeight: "900", letterSpacing: 0.5, lineHeight: 15, textTransform: "uppercase" }}>{label}</Text>
      <Text style={{ color: trainPalette.textPrimary, fontSize: 14, fontWeight: "800", lineHeight: 19 }}>{body}</Text>
      {detail ? <Text style={trainTextStyles.subtle}>{detail}</Text> : null}
    </View>
  );
}

function CompactMetric({ label, value, tone = "muted" }: { label: string; value: string; tone?: Parameters<typeof trainColorForTone>[0] | undefined }) {
  return (
    <View
      style={{
        backgroundColor: "transparent",
        borderColor: trainPalette.cardLine,
        borderRadius: 4,
        borderWidth: 1,
        flexBasis: 104,
        flexGrow: 1,
        gap: 2,
        minHeight: 58,
        padding: spacing.sm
      }}
    >
      <Text numberOfLines={1} style={{ color: trainPalette.textMuted, fontSize: 11, fontWeight: "800", lineHeight: 15 }}>{label}</Text>
      <Text adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={1} style={{ color: trainColorForTone(tone), fontSize: 15, fontWeight: "900", lineHeight: 20 }}>{value}</Text>
    </View>
  );
}

function WorkoutPlanDetails({ session }: { session: DetailedTrainingSession }) {
  const [fullRowsOpen, setFullRowsOpen] = useState(false);
  const summaryBlocks = recipePlanSummaryBlocks(session);
  const totalMoves = session.sections.reduce((count, section) => count + section.exercises.length, 0);
  const equipment = recipeEquipmentLabel(session.recipe);
  return (
    <View style={{ gap: spacing.md }} testID="workout-plan-detail-section">
      <View style={{ gap: spacing.xs }}>
        <Text style={trainTextStyles.sectionTitle}>{session.recipe ? "Workout recipe" : "Exercise details"}</Text>
        <Text style={trainTextStyles.body}>Short recipe view. Open full rows only when you need every set, load, swap, and stop note.</Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        <CompactMetric label="Duration" tone="blue" value={`${session.durationMinutes} min`} />
        <CompactMetric label="Blocks" tone="gold" value={`${summaryBlocks.length}`} />
        <CompactMetric label="Moves" tone="green" value={`${totalMoves}`} />
        <CompactMetric label="Equipment" tone="purple" value={equipment} />
      </View>
      <View style={{ gap: spacing.sm }}>
        {summaryBlocks.map((block) => (
          <View
            key={`plan-summary:${block.label}:${block.title}`}
            style={{
              backgroundColor: "transparent",
              borderBottomColor: trainPalette.cardLine,
              borderBottomWidth: 1,
              gap: spacing.sm,
              paddingVertical: spacing.md
            }}
          >
            <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
              <Text style={{ color: trainColorForTone(block.tone), fontSize: 12, fontWeight: "900", lineHeight: 16 }}>{block.label}</Text>
              <Text style={{ color: trainPalette.textPrimary, flex: 1, fontSize: 15, fontWeight: "900", lineHeight: 20 }}>{block.title}</Text>
              <Text style={{ color: trainPalette.textMuted, fontSize: 12, fontWeight: "800", lineHeight: 16 }}>{block.durationLabel}</Text>
            </View>
            <Text style={trainTextStyles.subtle}>{block.detail}</Text>
            {block.steps.length ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
                {block.steps.map((step) => (
                  <View key={`plan-step:${block.label}:${step}`} style={{ backgroundColor: trainPalette.controlFill, borderColor: trainPalette.controlLine, borderRadius: 4, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 4 }}>
                    <Text numberOfLines={1} style={{ color: trainPalette.textBody, fontSize: 11, fontWeight: "800", lineHeight: 15 }}>{step}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ))}
      </View>
      <TrainPanelQuietButton accessibilityLabel={fullRowsOpen ? "Hide full exercise rows" : "Show full exercise rows"} onPress={() => setFullRowsOpen((value) => !value)} selected={fullRowsOpen}>
        {fullRowsOpen ? "Hide full exercise rows" : "Show full exercise rows"}
      </TrainPanelQuietButton>
      {fullRowsOpen ? <WorkoutExerciseDetails session={session} title={null} /> : null}
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
      style={{
        alignItems: "center",
        backgroundColor: open ? trainPalette.controlFillPressed : "transparent",
        borderBottomColor: open ? trainPalette.actionBorder : trainPalette.cardLine,
        borderBottomWidth: 1,
        flexDirection: "row",
        gap: spacing.md,
        justifyContent: "space-between",
        minHeight: 58,
        opacity: disabled ? 0.58 : 1,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm
      }}
    >
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: trainPalette.textPrimary, fontSize: 14, fontWeight: "900", lineHeight: 19 }}>
          {label}
        </Text>
        {meta ? <Text numberOfLines={1} style={trainTextStyles.subtle}>{meta}</Text> : null}
      </View>
      <Text style={{ color: disabled ? trainPalette.textMuted : trainPalette.toneBlue, fontSize: 12, fontWeight: "900", lineHeight: 16 }}>{open ? "Hide" : "Show"}</Text>
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
      style={[screenStyles.input, { backgroundColor: trainPalette.controlFill, borderColor: trainPalette.controlLine, borderRadius: 5, color: trainPalette.textPrimary, fontFamily: fontFamilies.medium }]}
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
          borderColor: disabled ? trainPalette.controlLine : trainPalette.actionBorder,
          borderRadius: 5,
          boxShadow: "none",
          minHeight: 52
        }
      ]}
    >
      <Text style={{ color: disabled ? trainPalette.textMuted : colors.cornerBlack, fontSize: 14, fontWeight: "900", lineHeight: 18, textAlign: "center" }}>
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
          backgroundColor: pressed || selected ? trainPalette.controlFillPressed : "transparent",
          borderColor: selected ? trainPalette.actionBorder : trainPalette.controlLine,
          borderRadius: 5,
          boxShadow: "none",
          minHeight: 44
        }
      ]}
    >
      <Text style={{ color: selected ? trainPalette.toneBlue : trainPalette.textPrimary, fontSize: 14, fontWeight: "800", lineHeight: 18, textAlign: "center" }}>
        {children}
      </Text>
    </Pressable>
  );
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
  const [submitting, setSubmitting] = useState(false);

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
    if (submitting) {
      return;
    }
    if (!completionActions) {
      setLocalError("Workout completion is unavailable until the app is connected.");
      return;
    }
    try {
      setSubmitting(true);
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
    } finally {
      setSubmitting(false);
    }
  };

  const skip = async () => {
    if (submitting) {
      return;
    }
    if (!completionActions) {
      setLocalError("Workout completion is unavailable until the app is connected.");
      return;
    }
    try {
      setSubmitting(true);
      setLocalError(null);
      await completionActions.skip(session, notes.trim());
      setFollowUpState("skipped");
      setResultOpen(false);
    } catch (error) {
      setLocalError(validationError(error, "Workout skip failed."));
    } finally {
      setSubmitting(false);
    }
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
    <View style={{ gap: 0 }}>
      <View style={{ borderBottomColor: trainPalette.cardLine, borderBottomWidth: 1, gap: spacing.md, paddingBottom: spacing.xl, paddingTop: spacing.xl }} testID="train-workout-preview-card">
        <Text style={{ color: trainPalette.textPrimary, fontSize: 18, fontWeight: "900", lineHeight: 23 }}>Workout Details</Text>
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
          <DetailToggleRow label="Exercise Details" meta="Recipe summary with optional full rows" onPress={() => setPlanOpen((value) => !value)} open={planOpen} />
          {planOpen ? <WorkoutPlanDetails session={session} /> : null}
          <DetailToggleRow label="Why This Session" meta="Aim, quality cue, and decision signal" onPress={() => setWhyOpen((value) => !value)} open={whyOpen} />
          {whyOpen ? (
            <View style={{ gap: spacing.sm }}>
              {recipeWhyHighlights(session).map((item) => (
                <GuidanceTile body={item.body} detail={item.detail} key={`why:${item.label}`} label={item.label} tone={item.tone} />
              ))}
            </View>
          ) : null}
          <DetailToggleRow label="Adjust Today" meta="Concrete downshift and stop rules" onPress={() => setAdjustOpen((value) => !value)} open={adjustOpen} />
          {adjustOpen ? (
            <View style={{ gap: spacing.sm }}>
              {recipeAdjustGuidance(session).map((item) => (
                <GuidanceTile body={item.body} detail={item.detail} key={`adjust:${item.label}`} label={item.label} tone={item.tone} />
              ))}
            </View>
          ) : null}
          <DetailToggleRow disabled={quickLogBlocked} label="Quick Log" meta={quickLogBlocked ? "Available on the planned day" : "RPE, pain, actuals, done, or skipped"} onPress={() => setResultOpen((value) => !value)} open={resultOpen} />
        </View>
      </View>
      {resultOpen && !previewOnlyReason ? (
        <View style={{ gap: spacing.md }}>
          <View style={{ gap: spacing.xs }}>
            <Text style={trainTextStyles.sectionTitle}>Quick Log</Text>
            <Text style={trainTextStyles.body}>Capture the signals the engine can actually use. RPE alone is fine when time is tight; pain and actuals add more confidence.</Text>
            <Text style={trainTextStyles.subtle}>Workout: {quickLogContext.whatToDo}</Text>
            <Text style={trainTextStyles.subtle}>Coach's Note: {quickLogMainJob(session)}</Text>
          </View>
          <View style={{ gap: spacing.sm }}>
            <Text style={{ color: trainColorForTone("gold"), fontSize: 12, fontWeight: "900", lineHeight: 16, textTransform: "uppercase" }}>What affects the engine</Text>
            {recipeQuickLogImpactRows(session).map((item) => (
              <GuidanceTile body={item.body} detail={item.detail} key={`quick-log-impact:${item.label}`} label={item.label} tone={item.tone} />
            ))}
          </View>
          <TrainInput keyboardType="decimal-pad" onChangeText={setSessionRpe} placeholder="Session RPE 1-10 optional" value={sessionRpe} />
          <TrainInput onChangeText={setPainNotes} placeholder="Pain area, timing, or movement change optional" value={painNotes} />
          <TrainInput onChangeText={setNotes} placeholder="Quality, missed work, reason skipped, or extra context optional" value={notes} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <View style={{ flexBasis: 170, flexGrow: 1 }}>
              <TrainPanelPrimaryButton accessibilityLabel="Mark workout done" disabled={busy || submitting} onPress={() => void complete()}>{busy || submitting ? "Saving workout..." : "Mark workout done"}</TrainPanelPrimaryButton>
            </View>
            <View style={{ flexBasis: 132, flexGrow: 1 }}>
              <TrainPanelQuietButton accessibilityLabel="Skip session" disabled={busy || submitting} onPress={() => void skip()}>{busy || submitting ? "Saving skip..." : "Skip session"}</TrainPanelQuietButton>
            </View>
          </View>
          <View style={{ gap: spacing.sm }}>
            <TrainPanelQuietButton accessibilityLabel={exerciseDetailsOpen ? "Hide exercise details" : "Add exercise details"} onPress={() => setExerciseDetailsOpen((value) => !value)} selected={exerciseDetailsOpen}>{exerciseDetailsOpen ? "Hide exercise details" : "Add exercise details"}</TrainPanelQuietButton>
            <Text style={trainTextStyles.subtle}>Exercise rows are optional. Completed sets, load, reps, quality, RPE, and pain flags become structured actuals. Blank rows save as not logged.</Text>
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
