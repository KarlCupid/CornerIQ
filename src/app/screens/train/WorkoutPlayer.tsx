import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { DetailedTrainingSession, ExercisePrescription, ExerciseSubstitution } from "../../../engine/core/types";
import { buildWorkoutPlayerExerciseResults } from "../../../engine/presentation/workoutPlayerResults";
import {
  plainFuelDemandLabel,
  plainIntensityLabel,
  plainMovementWhy,
  plainSectionIntent,
  plainSectionName,
  plainTrainingCopy,
  plainWorkoutTitle
} from "../../../engine/presentation/trainingCopy";
import { CollapsedDetailDisclosure, PostActionNextStep } from "../../../design/components/FastTask";
import { LuminousProgressBar } from "../../../design/components/LuminousScreen";
import { glassStyles } from "../../../design/glass";
import { colors, radii, spacing } from "../../../design/theme";
import type { WorkoutCompletionActions } from "../../../hooks/useWorkoutCompletion";
import { screenStyles } from "../screenStyles";

export type WorkoutPlayerStatus = "not_started" | "active" | "paused" | "finishing" | "completed" | "skipped";

interface WorkoutPlayerProps {
  busy: boolean;
  completionActions?: WorkoutCompletionActions | undefined;
  completionMessage?: string | null | undefined;
  onClose: () => void;
  onDiscard: () => void;
  onOpenFuel?: (() => void) | undefined;
  onStatusChange?: ((status: WorkoutPlayerStatus) => void) | undefined;
  session: DetailedTrainingSession;
}

type TimerKind = "rest" | "work";

interface TimerState {
  durationSeconds: number;
  kind: TimerKind | null;
  label: string;
  remainingSeconds: number;
  running: boolean;
  sourceText: string;
}

const emptyTimer: TimerState = {
  durationSeconds: 0,
  kind: null,
  label: "",
  remainingSeconds: 0,
  running: false,
  sourceText: ""
};

function parseSecondsFromText(text: string | undefined): number | null {
  if (!text) {
    return null;
  }
  const lower = text.toLowerCase();
  const clock = lower.match(/\b(\d{1,2}):([0-5]\d)\b/);
  if (clock?.[1] && clock[2]) {
    return Number(clock[1]) * 60 + Number(clock[2]);
  }
  const range = lower.match(/\b(\d+(?:\.\d+)?)\s*-\s*\d+(?:\.\d+)?\s*(seconds?|secs?|s|minutes?|mins?|m)\b/);
  const single = lower.match(/\b(\d+(?:\.\d+)?)\s*(seconds?|secs?|s|minutes?|mins?|m)\b/);
  const match = range ?? single;
  if (!match?.[1] || !match[2]) {
    return null;
  }
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  const unit = match[2];
  return Math.round(unit.startsWith("m") ? amount * 60 : amount);
}

function formatTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function prescribedSetCount(exercise: ExercisePrescription): number {
  return Math.max(1, exercise.sets.length);
}

function exerciseDoseText(exercise: ExercisePrescription, setIndex: number): string {
  const set = exercise.sets[setIndex] ?? exercise.sets[0];
  const dose = [exercise.repsText ?? set?.repsText, exercise.durationText ?? set?.durationText].filter(Boolean);
  return dose.length > 0 ? dose.join(" / ") : "Follow the prescription";
}

function exerciseTargetText(exercise: ExercisePrescription, setIndex: number): readonly string[] {
  const set = exercise.sets[setIndex] ?? exercise.sets[0];
  return [
    exercise.rpeTarget ?? set?.rpeTarget ? `RPE ${exercise.rpeTarget ?? set?.rpeTarget}` : null,
    exercise.rirTarget ?? set?.rirTarget ? `RIR ${exercise.rirTarget ?? set?.rirTarget}` : null,
    exercise.tempo ?? set?.tempo ? `Tempo ${plainTrainingCopy(exercise.tempo ?? set?.tempo ?? "")}` : null,
    exercise.restText ? `Rest ${plainTrainingCopy(exercise.restText)}` : null
  ].filter((item): item is string => item !== null);
}

function clampIndex(value: number, max: number): number {
  return Math.max(0, Math.min(value, Math.max(0, max)));
}

function parseSessionRpe(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 10) {
    throw new Error("Session RPE must be between 1 and 10.");
  }
  return parsed;
}

function PlayerButton({
  disabled = false,
  label,
  onPress,
  tone = "quiet"
}: {
  disabled?: boolean | undefined;
  label: string;
  onPress: () => void;
  tone?: "primary" | "quiet" | "warning" | undefined;
}) {
  const primary = tone === "primary";
  const warning = tone === "warning";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        ...(primary ? glassStyles.primaryControl : glassStyles.control),
        alignItems: "center",
        alignSelf: "stretch",
        backgroundColor: primary ? "rgba(39, 206, 241, 0.86)" : warning ? "rgba(255, 148, 72, 0.14)" : "rgba(255, 255, 255, 0.095)",
        borderColor: primary ? colors.blueIQ : warning ? "rgba(255, 148, 72, 0.42)" : colors.line,
        borderRadius: 20,
        justifyContent: "center",
        minHeight: primary ? 56 : 48,
        minWidth: primary ? 180 : 128,
        opacity: disabled ? 0.55 : 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm
      }}
    >
      <Text style={{ color: primary ? colors.cornerBlack : colors.canvas, fontSize: 15, fontWeight: "800", lineHeight: 20, textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

function DetailPill({ label }: { label: string }) {
  return (
    <View style={[screenStyles.chip, { minHeight: 34, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }]}>
      <Text style={{ color: colors.wrap, fontSize: 12, fontWeight: "800", lineHeight: 16 }}>{label}</Text>
    </View>
  );
}

function GlassPanel({ children, testID }: { children: React.ReactNode; testID?: string | undefined }) {
  return (
    <View
      style={{
        ...glassStyles.card,
        borderRadius: 28,
        gap: spacing.md,
        padding: spacing.lg
      }}
      testID={testID}
    >
      {children}
    </View>
  );
}

function ScreenIconButton({
  accessibilityLabel,
  icon,
  onPress
}: {
  accessibilityLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={{
        ...glassStyles.control,
        alignItems: "center",
        borderRadius: 16,
        height: 40,
        justifyContent: "center",
        width: 40
      }}
    >
      <Ionicons color={colors.canvas} name={icon} size={20} />
    </Pressable>
  );
}

function WorkoutScreenFrame({
  children,
  mode,
  onClose,
  testID = "workout-player-screen"
}: {
  children: React.ReactNode;
  mode: string;
  onClose: () => void;
  testID?: string | undefined;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: colors.cornerBlack, flex: 1 }} testID={testID}>
      <ScrollView
        contentContainerStyle={{
          gap: spacing.lg,
          paddingBottom: Math.max(insets.bottom, spacing.xl) + spacing.xl,
          paddingHorizontal: spacing.lg,
          paddingTop: Math.max(insets.top, spacing.lg) + spacing.lg
        }}
        style={{ flex: 1 }}
      >
        <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
          <ScreenIconButton accessibilityLabel="Close workout player" icon="chevron-back" onPress={onClose} />
          <Text style={{ color: colors.wrap, fontSize: 13, fontWeight: "900", letterSpacing: 1.4, lineHeight: 18 }}>{mode}</Text>
          <ScreenIconButton accessibilityLabel="Workout options" icon="ellipsis-horizontal" onPress={() => undefined} />
        </View>
        {children}
      </ScrollView>
    </View>
  );
}

function PreviewPill({ label, tone = "blue" }: { label: string; tone?: "blue" | "green" | "orange" | "quiet" | undefined }) {
  const toneColor = tone === "green" ? colors.readyGreen : tone === "orange" ? colors.amberCaution : tone === "quiet" ? colors.wrap : colors.blueIQ;
  return (
    <View
      style={{
        ...(tone === "quiet" ? glassStyles.control : {}),
        backgroundColor: tone === "quiet" ? "rgba(255, 255, 255, 0.095)" : `${toneColor}1F`,
        borderColor: tone === "quiet" ? colors.line : `${toneColor}73`,
        borderRadius: radii.pill,
        minHeight: 34,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs
      }}
    >
      <Text style={{ color: tone === "orange" ? colors.canvas : toneColor, fontSize: 12, fontWeight: "900", lineHeight: 17 }}>{label}</Text>
    </View>
  );
}

function sectionPreviewSubtitle(section: DetailedTrainingSession["sections"][number]): string {
  const firstExercise = section.exercises[0];
  if (!firstExercise) {
    return plainSectionIntent(section.intent);
  }
  return `${exerciseDoseText(firstExercise, 0)} - ${plainWorkoutTitle(firstExercise.name)}`;
}

function SessionFlowRow({
  index,
  onPress,
  section
}: {
  index: number;
  onPress: () => void;
  section: DetailedTrainingSession["sections"][number];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.065)",
        borderColor: colors.line,
        borderRadius: 18,
        borderWidth: 1,
        flexDirection: "row",
        gap: spacing.md,
        minHeight: 64,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm
      }}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: "rgba(39, 206, 241, 0.13)",
          borderColor: "rgba(39, 206, 241, 0.52)",
          borderRadius: 16,
          borderWidth: 1,
          height: 42,
          justifyContent: "center",
          width: 42
        }}
      >
        <Text style={{ color: colors.blueIQ, fontSize: 14, fontWeight: "900", lineHeight: 18 }}>{String(index + 1).padStart(2, "0")}</Text>
      </View>
      <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
        <Text style={{ color: colors.canvas, fontSize: 16, fontWeight: "900", lineHeight: 21 }}>{plainSectionName(section.name)}</Text>
        <Text style={{ color: colors.mutedText, fontSize: 13, fontWeight: "700", lineHeight: 18 }}>{sectionPreviewSubtitle(section)}</Text>
      </View>
      <Ionicons color={colors.mutedText} name="chevron-forward" size={18} />
    </Pressable>
  );
}

function TimerOrb({ label, seconds }: { label: string; seconds: number }) {
  return (
    <View
      style={{
        alignItems: "center",
        alignSelf: "center",
        backgroundColor: colors.cornerBlack,
        borderColor: colors.blueIQ,
        borderRadius: 128,
        borderWidth: 14,
        height: 256,
        justifyContent: "center",
        width: 256
      }}
      testID="workout-player-big-timer"
    >
      <Text style={{ color: colors.canvas, fontSize: 50, fontVariant: ["tabular-nums"], fontWeight: "900", lineHeight: 58 }}>{formatTimer(seconds)}</Text>
      <Text style={{ color: colors.wrap, fontSize: 12, fontWeight: "900", letterSpacing: 1.6, lineHeight: 16 }}>{label}</Text>
    </View>
  );
}

function LiveControlButton({
  disabled = false,
  icon,
  label,
  onPress,
  primary = false
}: {
  disabled?: boolean | undefined;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  primary?: boolean | undefined;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        ...(primary ? glassStyles.primaryControl : glassStyles.control),
        alignItems: "center",
        backgroundColor: primary ? "rgba(39, 206, 241, 0.86)" : "rgba(255, 255, 255, 0.095)",
        borderColor: primary ? colors.blueIQ : colors.line,
        borderRadius: 20,
        gap: spacing.xs,
        justifyContent: "center",
        minHeight: 58,
        minWidth: primary ? 78 : 62,
        opacity: disabled ? 0.55 : 1,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm
      }}
    >
      <Ionicons color={primary ? colors.cornerBlack : colors.canvas} name={icon} size={primary ? 24 : 21} />
      <Text style={{ color: primary ? colors.cornerBlack : colors.wrap, fontSize: 11, fontWeight: "900", lineHeight: 14 }}>{label}</Text>
    </Pressable>
  );
}

function SetTracker({
  activeSetIndex,
  completedSetIndices,
  setCount
}: {
  activeSetIndex: number;
  completedSetIndices: readonly number[];
  setCount: number;
}) {
  const completed = new Set(completedSetIndices);
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }} testID="workout-player-set-tracker">
      {Array.from({ length: setCount }).map((_, index) => {
        const isCompleted = completed.has(index);
        const isActive = index === activeSetIndex;
        return (
          <View
            key={`set-tracker:${index}`}
            style={{
              alignItems: "center",
              backgroundColor: isCompleted ? "rgba(56, 226, 138, 0.18)" : isActive ? "rgba(39, 206, 241, 0.14)" : "rgba(255, 255, 255, 0.055)",
              borderColor: isCompleted ? "rgba(56, 226, 138, 0.62)" : isActive ? "rgba(39, 206, 241, 0.58)" : colors.line,
              borderRadius: radii.pill,
              borderWidth: 1,
              height: 38,
              justifyContent: "center",
              minWidth: 38,
              paddingHorizontal: spacing.sm
            }}
          >
            <Text style={{ color: colors.canvas, fontSize: 13, fontWeight: "800", lineHeight: 17 }}>{index + 1}</Text>
          </View>
        );
      })}
    </View>
  );
}

function SafetyStack({ exercise, session }: { exercise: ExercisePrescription; session: DetailedTrainingSession }) {
  const stopConditions = [...session.stopConditions.slice(0, 2), ...exercise.stopConditions];
  const safetyNotes = [...session.safetyNotes.slice(0, 2), ...exercise.safetyNotes];
  if (stopConditions.length === 0 && safetyNotes.length === 0) {
    return null;
  }
  return (
    <View
      style={{
        backgroundColor: "rgba(255, 82, 101, 0.1)",
        borderColor: "rgba(255, 82, 101, 0.34)",
        borderRadius: 18,
        borderWidth: 1,
        gap: spacing.xs,
        padding: spacing.md
      }}
      testID="workout-player-safety-notes"
    >
      <Text style={screenStyles.fieldLabel}>Stop / safety</Text>
      {stopConditions.slice(0, 3).map((condition, index) => <Text key={`player-stop:${index}`} style={screenStyles.subtle}>Stop: {plainTrainingCopy(condition)}</Text>)}
      {safetyNotes.slice(0, 2).map((note, index) => <Text key={`player-safety:${index}`} style={screenStyles.subtle}>Safety: {plainTrainingCopy(note)}</Text>)}
    </View>
  );
}

function TimerCard({
  durationSeconds,
  onPause,
  onReset,
  onStart,
  timer,
  title
}: {
  durationSeconds: number | null;
  onPause: () => void;
  onReset: () => void;
  onStart: () => void;
  timer: TimerState;
  title: string;
}) {
  if (durationSeconds === null) {
    return null;
  }
  const active = timer.durationSeconds === durationSeconds && timer.kind !== null;
  return (
    <View
      style={{
        backgroundColor: "rgba(39, 206, 241, 0.11)",
        borderColor: "rgba(39, 206, 241, 0.38)",
        borderRadius: 18,
        borderWidth: 1,
        gap: spacing.sm,
        padding: spacing.md
      }}
      testID="workout-player-timer-card"
    >
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={screenStyles.fieldLabel}>{title}</Text>
          <Text style={{ color: colors.canvas, fontSize: 30, fontVariant: ["tabular-nums"], fontWeight: "900", lineHeight: 36 }}>
            {formatTimer(active ? timer.remainingSeconds : durationSeconds)}
          </Text>
          <Text style={screenStyles.subtle}>{active ? timer.sourceText : "Timer is optional; guidance still works as text."}</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        <PlayerButton label={active && timer.running ? "Pause timer" : "Start timer"} onPress={active && timer.running ? onPause : onStart} />
        <PlayerButton label="Reset timer" onPress={onReset} />
      </View>
    </View>
  );
}

function SubstitutionChooser({
  exercise,
  onChoose,
  selected
}: {
  exercise: ExercisePrescription;
  onChoose: (substitution: ExerciseSubstitution | undefined) => void;
  selected: ExerciseSubstitution | undefined;
}) {
  if (exercise.substitutions.length === 0) {
    return null;
  }
  return (
    <CollapsedDetailDisclosure framed={false} title="Swap exercise" summary={selected ? `Using ${plainWorkoutTitle(selected.name)}.` : "Use a listed swap if equipment or pain requires it."} testID="workout-player-substitutions">
      <View style={{ gap: spacing.sm }}>
        {selected ? <PlayerButton label={`Use original ${plainWorkoutTitle(exercise.name)}`} onPress={() => onChoose(undefined)} /> : null}
        {exercise.substitutions.map((substitution) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: selected?.exerciseId === substitution.exerciseId }}
            key={substitution.exerciseId}
            onPress={() => onChoose(substitution)}
            style={{
              backgroundColor: selected?.exerciseId === substitution.exerciseId ? "rgba(56, 226, 138, 0.13)" : "rgba(255, 255, 255, 0.055)",
              borderColor: selected?.exerciseId === substitution.exerciseId ? "rgba(56, 226, 138, 0.44)" : colors.line,
              borderRadius: 18,
              borderWidth: 1,
              gap: spacing.xs,
              padding: spacing.md
            }}
          >
            <Text style={screenStyles.callout}>{plainWorkoutTitle(substitution.name)}</Text>
            <Text style={screenStyles.subtle}>Reason: {plainTrainingCopy(substitution.reason)}</Text>
            <Text style={screenStyles.subtle}>Equipment: {substitution.equipmentNeeded.length > 0 ? substitution.equipmentNeeded.join(", ") : "none"}</Text>
            <Text style={screenStyles.subtle}>Load: {plainTrainingCopy(substitution.loadGuidance)}</Text>
            {substitution.coachingNotes.slice(0, 2).map((note, index) => <Text key={`sub-note:${substitution.exerciseId}:${index}`} style={screenStyles.subtle}>Cue: {plainTrainingCopy(note)}</Text>)}
          </Pressable>
        ))}
      </View>
    </CollapsedDetailDisclosure>
  );
}

export function WorkoutPlayer({
  busy,
  completionActions,
  completionMessage,
  onClose,
  onDiscard,
  onOpenFuel,
  onStatusChange,
  session
}: WorkoutPlayerProps) {
  const [status, setStatus] = React.useState<WorkoutPlayerStatus>("not_started");
  const [activeSectionIndex, setActiveSectionIndex] = React.useState(0);
  const [activeExerciseIndex, setActiveExerciseIndex] = React.useState(0);
  const [activeSetIndex, setActiveSetIndex] = React.useState(0);
  const [completedSetMap, setCompletedSetMap] = React.useState<Record<string, readonly number[]>>({});
  const [skippedExerciseMap, setSkippedExerciseMap] = React.useState<Record<string, true>>({});
  const [painFlagMap, setPainFlagMap] = React.useState<Record<string, true>>({});
  const [touchedExerciseMap, setTouchedExerciseMap] = React.useState<Record<string, true>>({});
  const [substitutionMap, setSubstitutionMap] = React.useState<Record<string, ExerciseSubstitution | undefined>>({});
  const [sessionRpe, setSessionRpe] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [timer, setTimer] = React.useState<TimerState>(emptyTimer);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [discardConfirm, setDiscardConfirm] = React.useState(false);
  const [skipConfirm, setSkipConfirm] = React.useState(false);

  React.useEffect(() => {
    onStatusChange?.(status);
  }, [onStatusChange, status]);

  React.useEffect(() => {
    if (status !== "active") {
      return undefined;
    }
    const interval = setInterval(() => setElapsedSeconds((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  React.useEffect(() => {
    if (!timer.running || timer.remainingSeconds <= 0) {
      return undefined;
    }
    const interval = setInterval(() => {
      setTimer((current) => {
        if (!current.running) {
          return current;
        }
        const next = Math.max(0, current.remainingSeconds - 1);
        return { ...current, remainingSeconds: next, running: next > 0 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timer.remainingSeconds, timer.running]);

  const steps = React.useMemo(
    () =>
      session.sections.flatMap((section, sectionIndex) =>
        section.exercises.flatMap((exercise, exerciseIndex) =>
          Array.from({ length: prescribedSetCount(exercise) }).map((_, setIndex) => ({
            exercise,
            exerciseIndex,
            section,
            sectionIndex,
            setIndex
          }))
        )
      ),
    [session]
  );

  const currentSection = session.sections[clampIndex(activeSectionIndex, session.sections.length - 1)];
  const currentExercise = currentSection?.exercises[clampIndex(activeExerciseIndex, (currentSection?.exercises.length ?? 1) - 1)];

  if (!currentSection || !currentExercise || steps.length === 0) {
    return (
      <WorkoutScreenFrame mode="WORKOUT PREVIEW" onClose={onClose}>
        <GlassPanel>
          <Text style={screenStyles.sectionTitle}>Workout player unavailable</Text>
          <Text style={screenStyles.body}>No exercise steps are available for this support workout.</Text>
          <PlayerButton label="Close" onPress={onClose} />
        </GlassPanel>
      </WorkoutScreenFrame>
    );
  }

  const currentStepIndex = steps.findIndex((step) => step.sectionIndex === activeSectionIndex && step.exerciseIndex === activeExerciseIndex && step.setIndex === activeSetIndex);
  const setCount = prescribedSetCount(currentExercise);
  const completedSets = completedSetMap[currentExercise.exerciseId] ?? [];
  const selectedSubstitution = substitutionMap[currentExercise.exerciseId];
  const displayName = plainWorkoutTitle(selectedSubstitution?.name ?? currentExercise.name);
  const displayLoad = plainTrainingCopy(selectedSubstitution?.loadGuidance ?? currentExercise.loadGuidance);
  const displayNotes = (selectedSubstitution?.coachingNotes ?? currentExercise.coachingNotes).map(plainTrainingCopy);
  const progress = steps.length > 0 ? Math.max(0, currentStepIndex) / steps.length : 0;
  const nextStep = currentStepIndex >= 0 ? steps[currentStepIndex + 1] : undefined;
  const restSeconds = parseSecondsFromText(currentExercise.restText);
  const workSeconds = parseSecondsFromText(currentExercise.durationText ?? currentExercise.sets[activeSetIndex]?.durationText);
  const completedCountByExerciseId = Object.fromEntries(Object.entries(completedSetMap).map(([exerciseId, sets]) => [exerciseId, sets.length]));
  const playerResults = buildWorkoutPlayerExerciseResults(session, {
    completedSetsByExerciseId: completedCountByExerciseId,
    painFlagExerciseIds: Object.keys(painFlagMap),
    skippedExerciseIds: Object.keys(skippedExerciseMap),
    substitutionByExerciseId: substitutionMap,
    touchedExerciseIds: Object.keys(touchedExerciseMap)
  });
  const completedExerciseCount = playerResults.filter((result) => result.resultStatus === "completed").length;
  const partialExerciseCount = playerResults.filter((result) => result.resultStatus === "partial").length;
  const skippedExerciseCount = playerResults.filter((result) => result.resultStatus === "skipped").length;
  const painFlagCount = playerResults.filter((result) => result.painFlag).length;
  const fuelLabel = session.fuelingGate ? "Fuel check" : plainFuelDemandLabel(session.fuelDemand);
  const coachNote = session.sessionQualityCheckpoints?.[0] ?? session.athleteQualityCues?.[0] ?? session.selfCheckCues?.[0] ?? "Keep this smooth. Finish feeling sharper, not cooked.";
  const firstPreviewSection = session.sections[0];
  const firstPreviewExercise = firstPreviewSection?.exercises[0];
  const previewStartLine = firstPreviewExercise && firstPreviewSection ? `Start with ${firstPreviewSection.name}: ${firstPreviewExercise.name}.` : "Start when you are ready.";

  if (status === "not_started") {
    return (
      <WorkoutScreenFrame mode="WORKOUT PREVIEW" onClose={onClose}>
        <GlassPanel testID="workout-player-preview">
          <View style={{ alignItems: "center", gap: spacing.md }}>
            <Text style={{ color: colors.blueIQ, fontSize: 12, fontWeight: "900", letterSpacing: 1.2, lineHeight: 16 }}>DO THIS NOW</Text>
            <Text style={{ color: colors.canvas, fontSize: 34, fontWeight: "900", lineHeight: 38, textAlign: "center" }}>{plainWorkoutTitle(session.title, session.family)}</Text>
            <Text style={{ color: colors.wrap, fontSize: 16, fontWeight: "800", lineHeight: 22, textAlign: "center" }}>{previewStartLine}</Text>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center" }}>
            <PreviewPill label={`${session.durationMinutes} min`} />
            <PreviewPill label={plainIntensityLabel(session.intensity)} tone="green" />
            <PreviewPill label={fuelLabel} tone={session.fuelDemand === "high" ? "orange" : "green"} />
          </View>

          <View
            style={{
              backgroundColor: "rgba(56, 226, 138, 0.1)",
              borderColor: "rgba(56, 226, 138, 0.3)",
              borderRadius: 18,
              borderWidth: 1,
              gap: spacing.sm,
              padding: spacing.md
            }}
          >
            <Text style={{ color: colors.readyGreen, fontSize: 13, fontWeight: "900", lineHeight: 17 }}>Your job</Text>
            <Text style={{ color: colors.wrap, fontSize: 15, fontWeight: "800", lineHeight: 21 }}>Tap Start workout. Move smoothly. Stop if pain or a safety note shows up.</Text>
          </View>

          <PlayerButton disabled={busy} label="Start workout" onPress={() => setStatus("active")} tone="primary" />
          <PlayerButton label="Back to Train" onPress={onClose} />
        </GlassPanel>

        <CollapsedDetailDisclosure title="Plan details" summary={`${session.sections.length} section${session.sections.length === 1 ? "" : "s"}. Open only if you want the why, coach cue, or section order before starting.`} testID="workout-player-preview-detail">
          <View style={{ gap: spacing.sm }}>
            <Text style={{ color: colors.canvas, fontSize: 15, fontWeight: "900", lineHeight: 20 }}>Why today</Text>
            <Text style={screenStyles.subtle}>{plainTrainingCopy(session.whyThisMattersForBoxing)}</Text>
          </View>
          <View style={{ gap: spacing.sm }}>
            <Text style={{ color: colors.gold, fontSize: 13, fontWeight: "900", lineHeight: 17 }}>Coach note</Text>
            <Text style={screenStyles.subtle}>{coachNote}</Text>
          </View>
          <Text style={{ color: colors.canvas, fontSize: 18, fontWeight: "900", lineHeight: 24 }}>Session flow</Text>
          {session.sections.map((section, index) => (
            <SessionFlowRow
              index={index}
              key={`preview-section:${section.name}:${index}`}
              onPress={() => {
                setActiveSectionIndex(index);
                setActiveExerciseIndex(0);
                setActiveSetIndex(0);
              }}
              section={section}
            />
          ))}
        </CollapsedDetailDisclosure>
      </WorkoutScreenFrame>
    );
  }

  const touchExercise = (exerciseId = currentExercise.exerciseId) => {
    setTouchedExerciseMap((current) => ({ ...current, [exerciseId]: true }));
  };

  const startTimer = (kind: TimerKind, seconds: number, sourceText: string) => {
    setTimer({
      durationSeconds: seconds,
      kind,
      label: kind === "rest" ? "Rest timer" : "Timed block",
      remainingSeconds: seconds,
      running: true,
      sourceText
    });
  };

  const resetTimer = (kind: TimerKind, seconds: number, sourceText: string) => {
    setTimer({
      durationSeconds: seconds,
      kind,
      label: kind === "rest" ? "Rest timer" : "Timed block",
      remainingSeconds: seconds,
      running: false,
      sourceText
    });
  };

  const moveToStep = (stepIndex: number) => {
    const step = steps[clampIndex(stepIndex, steps.length - 1)];
    if (!step) {
      return;
    }
    setActiveSectionIndex(step.sectionIndex);
    setActiveExerciseIndex(step.exerciseIndex);
    setActiveSetIndex(step.setIndex);
  };

  const moveNext = () => {
    if (currentStepIndex < steps.length - 1) {
      moveToStep(currentStepIndex + 1);
      return;
    }
    setStatus("finishing");
  };

  const moveBack = () => {
    if (status === "finishing") {
      setStatus("active");
      return;
    }
    if (currentStepIndex > 0) {
      moveToStep(currentStepIndex - 1);
    }
  };

  const markDone = () => {
    touchExercise();
    setSkippedExerciseMap((current) => {
      const next = { ...current };
      delete next[currentExercise.exerciseId];
      return next;
    });
    setCompletedSetMap((current) => {
      const currentSets = current[currentExercise.exerciseId] ?? [];
      return currentSets.includes(activeSetIndex)
        ? current
        : {
            ...current,
            [currentExercise.exerciseId]: [...currentSets, activeSetIndex].sort((left, right) => left - right)
          };
    });
    if (activeSetIndex < setCount - 1 && restSeconds !== null) {
      startTimer("rest", restSeconds, currentExercise.restText);
    }
    moveNext();
  };

  const skipSet = () => {
    touchExercise();
    moveNext();
  };

  const skipExercise = () => {
    touchExercise();
    setSkippedExerciseMap((current) => ({ ...current, [currentExercise.exerciseId]: true }));
    const next = steps.findIndex((step) => step.sectionIndex > activeSectionIndex || (step.sectionIndex === activeSectionIndex && step.exerciseIndex > activeExerciseIndex));
    if (next >= 0) {
      moveToStep(next);
      return;
    }
    setStatus("finishing");
  };

  const togglePainFlag = () => {
    touchExercise();
    setPainFlagMap((current) => {
      const next = { ...current };
      if (next[currentExercise.exerciseId]) {
        delete next[currentExercise.exerciseId];
      } else {
        next[currentExercise.exerciseId] = true;
      }
      return next;
    });
  };

  const saveWorkout = async () => {
    if (!completionActions) {
      setLocalError("Workout completion is unavailable until the app is connected.");
      return;
    }
    try {
      setLocalError(null);
      const parsedRpe = parseSessionRpe(sessionRpe);
      const painNames = playerResults.filter((result) => result.painFlag).map((result) => result.exerciseName);
      await completionActions.complete(session, {
        ...(parsedRpe === undefined ? {} : { sessionRpe: parsedRpe }),
        painNotes: painNames.length > 0 ? [`Pain flagged: ${painNames.join(", ")}. Review before progressing.`] : [],
        notes: notes.trim(),
        exerciseResults: playerResults
      });
      setStatus("completed");
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Workout completion failed.");
    }
  };

  const skipWorkout = async () => {
    if (!completionActions) {
      setLocalError("Workout completion is unavailable until the app is connected.");
      return;
    }
    setLocalError(null);
    await completionActions.skip(session, notes.trim());
    setStatus("skipped");
  };

  if (status === "completed") {
    return (
      <WorkoutScreenFrame mode="WORKOUT SAVED" onClose={onClose}>
        <PostActionNextStep
          actions={onOpenFuel ? [{ disabled: busy, label: "Open Fuel", onPress: onOpenFuel }] : []}
          body={painFlagCount > 0 ? "Workout saved. Review pain flags before progressing." : "Workout saved. Fuel check optional."}
          testID="workout-player-completed-state"
          title="Workout saved"
        />
      </WorkoutScreenFrame>
    );
  }

  if (status === "skipped") {
    return (
      <WorkoutScreenFrame mode="WORKOUT SKIPPED" onClose={onClose}>
        <PostActionNextStep
          body="Workout skipped. Plan remains conservative."
          testID="workout-player-skipped-state"
          title="Workout skipped"
        />
      </WorkoutScreenFrame>
    );
  }

  if (status === "finishing") {
    return (
      <WorkoutScreenFrame mode="FINISH WORKOUT" onClose={onClose}>
        <GlassPanel testID="workout-player-finish-sheet">
          <View style={{ gap: spacing.xs }}>
            <Text style={screenStyles.fieldLabel}>Finish workout</Text>
            <Text style={screenStyles.heroTitle}>{plainWorkoutTitle(session.title, session.family)}</Text>
            <Text style={screenStyles.body}>Review what will be saved before this workout affects training history.</Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <DetailPill label={`Elapsed ${formatElapsed(elapsedSeconds)}`} />
            <DetailPill label={`${completedExerciseCount} completed`} />
            <DetailPill label={`${partialExerciseCount} partial`} />
            <DetailPill label={`${skippedExerciseCount} skipped`} />
            <DetailPill label={`${painFlagCount} pain flag${painFlagCount === 1 ? "" : "s"}`} />
          </View>
          <TextInput keyboardType="decimal-pad" onChangeText={setSessionRpe} placeholder="Session RPE 1-10 optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={sessionRpe} />
          <TextInput onChangeText={setNotes} placeholder="Workout notes optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={notes} />
          {localError ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{localError}</Text> : null}
          {completionMessage ? <Text style={[screenStyles.subtle, { color: colors.amberCaution }]}>{completionMessage}</Text> : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <PlayerButton disabled={busy} label={busy ? "Saving workout..." : "Save workout"} onPress={() => void saveWorkout()} tone="primary" />
            <PlayerButton label="Go back" onPress={moveBack} />
            <PlayerButton label="Close player" onPress={onClose} />
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {skipConfirm ? <PlayerButton disabled={busy} label="Confirm skip workout" onPress={() => void skipWorkout()} tone="warning" /> : <PlayerButton label="Skip workout" onPress={() => setSkipConfirm(true)} tone="warning" />}
            {discardConfirm ? <PlayerButton label="Confirm discard" onPress={onDiscard} tone="warning" /> : <PlayerButton label="Discard workout" onPress={() => setDiscardConfirm(true)} tone="warning" />}
          </View>
        </GlassPanel>
      </WorkoutScreenFrame>
    );
  }

  const remainingSessionSeconds = Math.max(0, session.durationMinutes * 60 - elapsedSeconds);
  const bigTimerSeconds = timer.kind !== null ? timer.remainingSeconds : workSeconds ?? remainingSessionSeconds;
  const bigTimerLabel = timer.kind !== null ? timer.label.toUpperCase() : workSeconds !== null ? "BLOCK TIMER" : "REMAINING";
  const liveProgress = steps.length > 0 ? Math.min(1, (Math.max(0, currentStepIndex) + 1) / steps.length) : progress;
  const liveCues = displayNotes.length > 0 ? displayNotes : (session.selfCheckCues ?? []).map(plainTrainingCopy);
  const primaryCue = liveCues[0] ?? "Keep the shoulders loose and the breath under control.";

  return (
    <WorkoutScreenFrame mode="LIVE PLAYER" onClose={onClose} testID="workout-player">
      <View style={{ gap: spacing.sm }} testID="workout-player-progress">
        <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: colors.wrap, fontSize: 13, fontWeight: "900", lineHeight: 18 }}>Block {activeSectionIndex + 1} of {session.sections.length}</Text>
          <Text style={{ color: colors.wrap, fontSize: 13, fontVariant: ["tabular-nums"], fontWeight: "900", lineHeight: 18 }}>{formatTimer(remainingSessionSeconds)} left</Text>
        </View>
        <LuminousProgressBar accent="blue" progress={liveProgress} />
      </View>

      <GlassPanel testID="workout-player-current-block">
        <View testID="workout-player-current-step" />
        <View style={{ alignItems: "center", gap: spacing.xs }}>
          <Text style={{ color: colors.blueIQ, fontSize: 12, fontWeight: "900", letterSpacing: 1.2, lineHeight: 16 }}>DO THIS NOW</Text>
          <Text style={{ color: colors.canvas, fontSize: 34, fontWeight: "900", lineHeight: 39, textAlign: "center" }}>{displayName}</Text>
          {selectedSubstitution ? <Text style={screenStyles.subtle}>Swapped from {plainWorkoutTitle(currentExercise.name)}</Text> : null}
          <Text style={{ color: colors.wrap, fontSize: 18, fontWeight: "900", lineHeight: 24, textAlign: "center" }}>{exerciseDoseText(currentExercise, activeSetIndex)}</Text>
        </View>

        <View
          style={{
            backgroundColor: "rgba(56, 226, 138, 0.1)",
            borderColor: "rgba(56, 226, 138, 0.3)",
            borderRadius: 18,
            borderWidth: 1,
            gap: spacing.xs,
            padding: spacing.md
          }}
        >
          <Text style={{ color: colors.readyGreen, fontSize: 12, fontWeight: "900", letterSpacing: 1, lineHeight: 16 }}>ONE CUE</Text>
          <Text style={{ color: colors.wrap, fontSize: 15, fontWeight: "800", lineHeight: 21 }}>{primaryCue}</Text>
        </View>

        <TimerOrb label={bigTimerLabel} seconds={bigTimerSeconds} />
      </GlassPanel>

      <PlayerButton disabled={busy || status === "paused"} label={`Done set ${activeSetIndex + 1}`} onPress={markDone} tone="primary" />

      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "center" }}>
        <LiveControlButton icon={status === "paused" ? "play" : "pause"} label={status === "paused" ? "Resume" : "Pause"} onPress={() => setStatus(status === "paused" ? "active" : "paused")} />
        <LiveControlButton disabled={busy} icon="alert-circle" label={painFlagMap[currentExercise.exerciseId] ? "Flagged" : "Pain"} onPress={togglePainFlag} />
        <LiveControlButton disabled={busy} icon="play-forward" label="Skip set" onPress={skipSet} />
      </View>

      <View style={{ backgroundColor: "rgba(255, 255, 255, 0.055)", borderColor: colors.line, borderRadius: 18, borderWidth: 1, gap: spacing.xs, padding: spacing.md }}>
        <Text style={{ color: colors.wrap, fontSize: 11, fontWeight: "900", letterSpacing: 1.2, lineHeight: 15 }}>NEXT</Text>
        <Text style={{ color: colors.canvas, fontSize: 15, fontWeight: "900", lineHeight: 20 }}>
          {nextStep ? `${plainWorkoutTitle(nextStep.exercise.name)}, set ${nextStep.setIndex + 1}` : "Finish summary"}
        </Text>
      </View>

      <CollapsedDetailDisclosure title="More workout detail" summary="Open only if you need load, safety, swaps, timers, or navigation." testID="workout-player-more-detail">
        <View style={{ gap: spacing.sm }}>
          <SetTracker activeSetIndex={activeSetIndex} completedSetIndices={completedSets} setCount={setCount} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
            <DetailPill label={`Set ${activeSetIndex + 1} of ${setCount}`} />
            {exerciseTargetText(currentExercise, activeSetIndex).map((target) => <DetailPill key={`target:${target}`} label={target} />)}
          </View>
        </View>
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.fieldLabel}>Load guidance</Text>
          <Text style={screenStyles.body}>{displayLoad}</Text>
        </View>
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.fieldLabel}>Section purpose</Text>
          <Text style={screenStyles.body}>{plainSectionIntent(currentSection.intent)}</Text>
        </View>
        <SafetyStack exercise={currentExercise} session={session} />
        <SubstitutionChooser
          exercise={currentExercise}
          onChoose={(substitution) => {
            touchExercise();
            setSubstitutionMap((current) => ({ ...current, [currentExercise.exerciseId]: substitution }));
          }}
          selected={selectedSubstitution}
        />
        <CollapsedDetailDisclosure framed={false} title="Coaching notes" summary={displayNotes[0] ?? "Cues are available when you need them."} testID="workout-player-coaching-notes">
          {displayNotes.map((note, index) => <Text key={`coach-note:${index}`} style={screenStyles.subtle}>Cue: {note}</Text>)}
        </CollapsedDetailDisclosure>
        <CollapsedDetailDisclosure framed={false} title="Boxing transfer" summary="How this support work carries into boxing." testID="workout-player-boxing-transfer">
          <Text style={screenStyles.body}>{plainMovementWhy(currentExercise.boxingTransfer)}</Text>
        </CollapsedDetailDisclosure>
        <TimerCard
          durationSeconds={restSeconds}
          onPause={() => setTimer((current) => ({ ...current, running: false }))}
          onReset={() => restSeconds === null ? setTimer(emptyTimer) : resetTimer("rest", restSeconds, currentExercise.restText)}
          onStart={() => restSeconds === null ? undefined : startTimer("rest", restSeconds, currentExercise.restText)}
          timer={timer}
          title="Rest timer"
        />
        {workSeconds !== null ? (
          <TimerCard
            durationSeconds={workSeconds}
            onPause={() => setTimer((current) => ({ ...current, running: false }))}
            onReset={() => resetTimer("work", workSeconds, currentExercise.durationText ?? currentExercise.sets[activeSetIndex]?.durationText ?? "Timed block")}
            onStart={() => startTimer("work", workSeconds, currentExercise.durationText ?? currentExercise.sets[activeSetIndex]?.durationText ?? "Timed block")}
            timer={timer}
            title="Timed block"
          />
        ) : null}
        <LiveControlButton
          icon="refresh"
          label="Reset timer"
          onPress={() => {
            if (timer.kind === "rest" && restSeconds !== null) {
              resetTimer("rest", restSeconds, currentExercise.restText);
              return;
            }
            if (timer.kind === "work" && workSeconds !== null) {
              resetTimer("work", workSeconds, currentExercise.durationText ?? currentExercise.sets[activeSetIndex]?.durationText ?? "Timed block");
            }
          }}
        />
        {painFlagMap[currentExercise.exerciseId] ? <Text style={[screenStyles.subtle, { color: colors.amberCaution }]}>Pain flagged. Finish summary will keep progression conservative.</Text> : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <PlayerButton label="Back" onPress={moveBack} />
          <PlayerButton label="Next" onPress={moveNext} />
          <PlayerButton label="Skip exercise" onPress={skipExercise} tone="warning" />
          <PlayerButton label="Finish workout" onPress={() => setStatus("finishing")} tone="primary" />
        </View>
      </CollapsedDetailDisclosure>

      <CollapsedDetailDisclosure title="Session prep" summary="Checklist, self-check cues, quality checkpoints, and add-ons stay available while you train." testID="workout-player-session-prep">
        <View style={{ gap: spacing.xs }}>
          {(session.preSessionChecklist ?? []).slice(0, 3).map((item, index) => <Text key={`pre-session:${index}`} style={screenStyles.subtle}>Before: {plainTrainingCopy(item)}</Text>)}
          {(session.selfCheckCues ?? []).slice(0, 2).map((item, index) => <Text key={`self-check:${index}`} style={screenStyles.subtle}>Self-check: {plainTrainingCopy(item)}</Text>)}
          {(session.sessionQualityCheckpoints ?? []).slice(0, 3).map((item, index) => <Text key={`quality:${index}`} style={screenStyles.subtle}>Quality: {plainTrainingCopy(item)}</Text>)}
          {(session.addOnBlocks ?? []).slice(0, 3).map((block) => (
            <Text key={block.id} style={screenStyles.subtle}>Add-on: {plainWorkoutTitle(block.label)} ({block.durationMinutes} min) - {plainTrainingCopy(block.athleteFacingPurpose)}</Text>
          ))}
          {session.fuelAfter ? <Text style={screenStyles.subtle}>After: {plainTrainingCopy(session.fuelAfter)}</Text> : null}
        </View>
      </CollapsedDetailDisclosure>
    </WorkoutScreenFrame>
  );
}
