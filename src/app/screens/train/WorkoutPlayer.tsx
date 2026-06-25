import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { DetailedTrainingSession, ExercisePrescription, ExerciseSubstitution } from "../../../engine/core/types";
import { buildWorkoutPlayerTimeline } from "../../../engine/presentation/workoutPlayerTimeline";
import { buildWorkoutPlayerExerciseResults } from "../../../engine/presentation/workoutPlayerResults";
import { movementTeachingForExercise } from "../../../engine/presentation/workoutMovementTeaching";
import {
  plainFuelDemandLabel,
  plainIntensityLabel,
  plainSectionIntent,
  plainSectionName,
  plainTrainingCopy,
  plainWorkoutTitle
} from "../../../engine/presentation/trainingCopy";
import { recipeEquipmentLabel, recipeFlowLines, recipeQuickLogContext, recipeTitle, recipeWhy } from "../../../engine/presentation/workoutRecipePresentation";
import { CollapsedDetailDisclosure, PostActionNextStep } from "../../../design/components/FastTask";
import { accentColor, accentWash, LuminousProgressBar, type LuminousAccent } from "../../../design/components/LuminousScreen";
import { glassStyles } from "../../../design/glass";
import { colors, radii, spacing } from "../../../design/theme";
import type { WorkoutCompletionActions } from "../../../hooks/useWorkoutCompletion";
import { clearWorkoutPlayerState, loadWorkoutPlayerState, saveWorkoutPlayerState, type PersistedWorkoutPlayerState, type PersistedWorkoutPlayerStatus } from "../../../services/workout/workoutPlayerPersistence";
import { screenStyles } from "../screenStyles";
import { WorkoutExerciseDetails } from "./WorkoutExerciseDetails";

export type WorkoutPlayerStatus = "not_started" | "active" | "paused" | "finishing" | "completed" | "skipped";

function isPersistableWorkoutStatus(status: WorkoutPlayerStatus): status is PersistedWorkoutPlayerStatus {
  return status === "active" || status === "paused" || status === "finishing";
}

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

function formatWorkoutLength(totalSeconds: number): string {
  if (totalSeconds < 60) {
    return `${totalSeconds} sec`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds === 0 ? `${minutes} min` : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function sentenceCase(value: string): string {
  return value.length === 0 ? value : `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function firstSentence(value: string): string {
  const trimmed = value.trim();
  const first = trimmed.match(/^(.+?[.!?])(?:\s|$)/)?.[1];
  return first ?? trimmed;
}

function splitStepTitle(title: string): { heading: string; subheading?: string | undefined } {
  const match = title.match(/^((?:Round|Segment|Set|Rest|Movement)\s+\d+):\s+(.+)$/i);
  if (!match) {
    return { heading: title };
  }
  return {
    heading: match[1] ?? title,
    subheading: match[2]
  };
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

function stepKindTitle(kind: string): string {
  switch (kind) {
    case "setup":
      return "Setup";
    case "work":
      return "Work";
    case "rest":
      return "Rest";
    case "transition":
      return "Transition";
    case "checkpoint":
      return "Check";
    case "cooldown":
      return "Cooldown";
    default:
      return "Step";
  }
}

function doneButtonLabel(step: ReturnType<typeof buildWorkoutPlayerTimeline>["steps"][number]): string {
  switch (step.kind) {
    case "setup":
      return "Ready";
    case "work":
      return `Done ${step.actionLabel}`;
    case "rest":
      return "Skip rest";
    case "transition":
      return "Continue";
    case "checkpoint":
      return "Check done";
    case "cooldown":
      return "Finish step";
  }
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
  footer,
  mode,
  onClose,
  scrollResetKey,
  testID = "workout-player-screen"
}: {
  children: React.ReactNode;
  footer?: React.ReactNode | undefined;
  mode: string;
  onClose: () => void;
  scrollResetKey?: string | number | undefined;
  testID?: string | undefined;
}) {
  const insets = useSafeAreaInsets();
  const scrollRef = React.useRef<ScrollView>(null);
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ animated: false, y: 0 });
  }, [scrollResetKey]);

  return (
    <View style={{ backgroundColor: colors.cornerBlack, flex: 1 }} testID={testID}>
      <ScrollView
        contentContainerStyle={{
          gap: spacing.md,
          paddingBottom: footer ? spacing.lg : Math.max(insets.bottom, spacing.xl) + spacing.xl,
          paddingHorizontal: spacing.lg,
          paddingTop: Math.max(insets.top, spacing.md) + spacing.md
        }}
        ref={scrollRef}
        style={{ flex: 1, overflow: "hidden" }}
      >
        <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
          <ScreenIconButton accessibilityLabel="Close workout player" icon="chevron-back" onPress={onClose} />
          <Text style={{ color: colors.wrap, fontSize: 13, fontWeight: "900", letterSpacing: 1.4, lineHeight: 18 }}>{mode}</Text>
          <View style={{ width: 40 }} />
        </View>
        {children}
      </ScrollView>
      {footer ? (
        <View
          style={{
            paddingBottom: Math.max(insets.bottom, spacing.md),
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm
          }}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}

function PreviewPill({ label, tone: _tone = "blue" }: { label: string; tone?: "blue" | "green" | "orange" | "quiet" | undefined }) {
  return (
    <View
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.075)",
        borderColor: "rgba(255, 255, 255, 0.16)",
        borderRadius: radii.pill,
        borderWidth: 1,
        minHeight: 34,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs
      }}
    >
      <Text numberOfLines={1} style={{ color: colors.wrap, fontSize: 12, fontWeight: "900", letterSpacing: 0, lineHeight: 17 }}>{label}</Text>
    </View>
  );
}

function SegmentedTimerRing({
  accent,
  progress,
  size
}: {
  accent: LuminousAccent;
  progress: number;
  size: number;
}) {
  const color = accentColor[accent];
  const segmentCount = 74;
  const activeSegments = Math.max(1, Math.round(Math.max(0, Math.min(1, progress)) * segmentCount));
  const radius = size / 2 - 9;
  return (
    <View pointerEvents="none" style={{ height: size, left: 0, position: "absolute", top: 0, width: size }}>
      {Array.from({ length: segmentCount }).map((_, index) => {
        const angle = -88 + (index * 348) / Math.max(1, segmentCount - 1);
        const radians = (angle * Math.PI) / 180;
        const active = index < activeSegments;
        return (
          <View
            key={`timer-ring:${index}`}
            style={{
              backgroundColor: active ? color : "rgba(255, 255, 255, 0.13)",
              borderRadius: radii.pill,
              height: 16,
              left: size / 2 + Math.cos(radians) * radius - 2.5,
              opacity: active ? 1 : 0.5,
              position: "absolute",
              top: size / 2 + Math.sin(radians) * radius - 8,
              transform: [{ rotate: `${angle + 90}deg` }],
              width: 5
            }}
          />
        );
      })}
    </View>
  );
}

function LiveTimerOrb({
  accent,
  label,
  progress,
  seconds
}: {
  accent: LuminousAccent;
  label: string;
  progress: number;
  seconds: number;
}) {
  const color = accentColor[accent];
  const wash = accentWash[accent];
  const size = 258;
  return (
    <View
      style={{
        alignItems: "center",
        alignSelf: "center",
        height: size,
        justifyContent: "center",
        position: "relative",
        width: size
      }}
      testID="workout-player-big-timer"
    >
      <View
        style={{
          backgroundColor: wash,
          borderRadius: size / 2,
          boxShadow: `0 0 38px ${color}55`,
          height: size - 40,
          position: "absolute",
          width: size - 40
        }}
      />
      <SegmentedTimerRing accent={accent} progress={progress} size={size} />
      <View style={{ alignItems: "center", gap: spacing.sm }}>
        <Text style={{ color: colors.canvas, fontSize: 70, fontVariant: ["tabular-nums"], fontWeight: "900", lineHeight: 78 }}>
          {formatTimer(seconds)}
        </Text>
        <View
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.36)",
            borderColor: `${color}77`,
            borderRadius: radii.pill,
            borderWidth: 1,
            minHeight: 34,
            justifyContent: "center",
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.xs
          }}
        >
          <Text style={{ color, fontSize: 16, fontWeight: "900", lineHeight: 21 }}>{label}</Text>
        </View>
      </View>
    </View>
  );
}

function BlockDots({ accent, activeIndex, count }: { accent: LuminousAccent; activeIndex: number; count: number }) {
  const color = accentColor[accent];
  return (
    <View accessibilityLabel={`Block ${activeIndex + 1} of ${count}`} style={{ alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "center" }}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={`block-dot:${index}`}
          style={{
            backgroundColor: index === activeIndex ? color : "rgba(255, 255, 255, 0.38)",
            borderRadius: radii.pill,
            height: index === activeIndex ? 11 : 10,
            opacity: index === activeIndex ? 1 : 0.7,
            width: index === activeIndex ? 11 : 10
          }}
        />
      ))}
    </View>
  );
}

function LiveInfoCard({
  accent = "blue",
  body,
  icon,
  label,
  testID,
  tone = "neutral"
}: {
  accent?: LuminousAccent | undefined;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  testID?: string | undefined;
  tone?: "neutral" | "accent" | "hot" | undefined;
}) {
  const color = accentColor[accent];
  return (
    <View
      style={{
        backgroundColor: tone === "hot" ? `${color}1F` : "rgba(255, 255, 255, 0.046)",
        borderColor: tone === "neutral" ? "rgba(255, 255, 255, 0.16)" : `${color}7A`,
        borderRadius: 16,
        borderWidth: 1,
        flexDirection: "row",
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md
      }}
      testID={testID}
    >
      <View
        style={{
          alignItems: "center",
          borderColor: tone === "neutral" ? "rgba(255, 255, 255, 0.38)" : `${color}88`,
          borderRadius: radii.pill,
          borderWidth: 1,
          height: 38,
          justifyContent: "center",
          width: 38
        }}
      >
        <Ionicons color={tone === "neutral" ? colors.wrap : color} name={icon} size={22} />
      </View>
      <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
        <Text style={{ color: tone === "neutral" ? colors.wrap : color, fontSize: 12, fontWeight: "900", letterSpacing: 2.2, lineHeight: 16 }}>
          {label}
        </Text>
        <Text style={{ color: colors.canvas, fontSize: 19, fontWeight: "800", lineHeight: 25 }}>
          {body}
        </Text>
      </View>
    </View>
  );
}

function LiveDockButton({
  disabled = false,
  icon,
  label,
  onPress,
  tone = "neutral"
}: {
  disabled?: boolean | undefined;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone?: "neutral" | "danger" | undefined;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: "center",
        flex: 1,
        gap: spacing.xs,
        justifyContent: "center",
        minHeight: 78,
        opacity: disabled ? 0.42 : 1,
        paddingHorizontal: spacing.xs,
        paddingVertical: spacing.md
      }}
    >
      <Ionicons color={tone === "danger" ? colors.redCorner : colors.canvas} name={icon} size={28} />
      <Text style={{ color: colors.canvas, fontSize: 13, fontWeight: "800", lineHeight: 17 }}>{label}</Text>
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
  const timeline = React.useMemo(() => buildWorkoutPlayerTimeline(session), [session]);
  const firstStepSeconds = timeline.steps[0]?.durationSeconds ?? 0;
  const [status, setStatus] = React.useState<WorkoutPlayerStatus>("not_started");
  const [activeStepIndex, setActiveStepIndex] = React.useState(0);
  const [stepRemainingSeconds, setStepRemainingSeconds] = React.useState(firstStepSeconds);
  const [completedSetMap, setCompletedSetMap] = React.useState<Record<string, readonly number[]>>({});
  const [skippedWorkStepMap, setSkippedWorkStepMap] = React.useState<Record<string, readonly number[]>>({});
  const [skippedExerciseMap, setSkippedExerciseMap] = React.useState<Record<string, true>>({});
  const [painFlagMap, setPainFlagMap] = React.useState<Record<string, true>>({});
  const [touchedExerciseMap, setTouchedExerciseMap] = React.useState<Record<string, true>>({});
  const [substitutionMap, setSubstitutionMap] = React.useState<Record<string, ExerciseSubstitution | undefined>>({});
  const [sessionRpe, setSessionRpe] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [detailMode, setDetailMode] = React.useState<"how" | "help" | "swap" | null>(null);
  const [discardConfirm, setDiscardConfirm] = React.useState(false);
  const [skipConfirm, setSkipConfirm] = React.useState(false);
  const [resumeState, setResumeState] = React.useState<PersistedWorkoutPlayerState | null>(null);
  const activeStepIndexRef = React.useRef(activeStepIndex);
  activeStepIndexRef.current = activeStepIndex;

  React.useEffect(() => {
    setStatus("not_started");
    setActiveStepIndex(0);
    setStepRemainingSeconds(firstStepSeconds);
    setCompletedSetMap({});
    setSkippedWorkStepMap({});
    setSkippedExerciseMap({});
    setPainFlagMap({});
    setTouchedExerciseMap({});
    setSubstitutionMap({});
    setSessionRpe("");
    setNotes("");
    setElapsedSeconds(0);
    setLocalError(null);
    setSubmitting(false);
    setDetailMode(null);
    setDiscardConfirm(false);
    setSkipConfirm(false);
    setResumeState(null);
  }, [firstStepSeconds, session.generatedSessionId]);

  React.useEffect(() => {
    let active = true;
    setResumeState(null);
    void loadWorkoutPlayerState(session.generatedSessionId)
      .then((persisted) => {
        if (active) {
          setResumeState(persisted);
        }
      })
      .catch(() => {
        if (active) {
          setResumeState(null);
        }
      });
    return () => {
      active = false;
    };
  }, [session.generatedSessionId]);

  React.useEffect(() => {
    onStatusChange?.(status);
  }, [onStatusChange, status]);

  React.useEffect(() => {
    setStepRemainingSeconds(timeline.steps[activeStepIndex]?.durationSeconds ?? 0);
  }, [activeStepIndex, timeline.steps]);

  React.useEffect(() => {
    if (status !== "active" || stepRemainingSeconds <= 0) {
      return undefined;
    }
    const interval = setInterval(() => {
      setElapsedSeconds((value) => value + 1);
      setStepRemainingSeconds((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [status, stepRemainingSeconds]);

  React.useEffect(() => {
    const activeStep = timeline.steps[activeStepIndex];
    if (status !== "active" || stepRemainingSeconds > 0 || !activeStep?.autoAdvance) {
      return;
    }
    if (activeStepIndex < timeline.steps.length - 1) {
      setActiveStepIndex(activeStepIndex + 1);
      return;
    }
    setStatus("finishing");
  }, [activeStepIndex, status, stepRemainingSeconds, timeline.steps]);

  React.useEffect(() => {
    if (!isPersistableWorkoutStatus(status)) {
      return;
    }
    void saveWorkoutPlayerState({
      activeStepIndex,
      completedSetMap,
      elapsedSeconds,
      painFlagMap,
      sessionId: session.generatedSessionId,
      sessionRpe,
      skippedExerciseMap,
      skippedWorkStepMap,
      status,
      stepRemainingSeconds,
      substitutionMap,
      touchedExerciseMap,
      updatedAt: new Date().toISOString(),
      notes
    });
  }, [
    activeStepIndex,
    completedSetMap,
    elapsedSeconds,
    notes,
    painFlagMap,
    session.generatedSessionId,
    sessionRpe,
    skippedExerciseMap,
    skippedWorkStepMap,
    status,
    stepRemainingSeconds,
    substitutionMap,
    touchedExerciseMap
  ]);

  React.useEffect(() => {
    if (status === "completed" || status === "skipped") {
      void clearWorkoutPlayerState(session.generatedSessionId);
    }
  }, [session.generatedSessionId, status]);

  const steps = timeline.steps;
  const currentTimelineStep = steps[clampIndex(activeStepIndex, steps.length - 1)];
  const currentSection = currentTimelineStep ? session.sections[currentTimelineStep.sectionIndex] ?? session.sections[0] : undefined;
  const currentExercise =
    currentSection?.exercises.find((exercise) => exercise.exerciseId === currentTimelineStep?.exerciseId) ??
    currentSection?.exercises[currentTimelineStep?.exerciseIndex ?? 0];

  React.useEffect(() => {
    setDetailMode(null);
    setSkipConfirm(false);
  }, [currentTimelineStep?.id]);

  if (!currentTimelineStep || !currentSection || !currentExercise || steps.length === 0) {
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

  const currentStepIndex = activeStepIndex;
  const activeSetIndex = currentTimelineStep.setIndex;
  const activeExerciseId = currentTimelineStep.exerciseId;
  const setCount = currentTimelineStep.totalExerciseSets;
  const completedSets = completedSetMap[activeExerciseId] ?? [];
  const selectedSubstitution = substitutionMap[activeExerciseId];
  const exerciseNameById = new Map(session.sections.flatMap((section) => section.exercises.map((exercise) => [exercise.exerciseId, exercise.name] as const)));
  const displayLoad = plainTrainingCopy(selectedSubstitution?.loadGuidance ?? currentTimelineStep.loadGuidance ?? currentTimelineStep.instruction ?? currentExercise.loadGuidance);
  const displayNotes = (selectedSubstitution?.coachingNotes ?? currentExercise.coachingNotes).map(plainTrainingCopy);
  const progress = steps.length > 0 ? Math.max(0, currentStepIndex) / steps.length : 0;
  const nextStep = currentStepIndex >= 0 ? steps[currentStepIndex + 1] : undefined;
  const completedCountByExerciseId = Object.fromEntries(Object.entries(completedSetMap).map(([exerciseId, sets]) => [exerciseId, sets.length]));
  const skippedCountByExerciseId = Object.fromEntries(Object.entries(skippedWorkStepMap).map(([exerciseId, sets]) => [exerciseId, sets.length]));
  const prescribedSetsByExerciseId = Object.fromEntries(steps.map((step) => [step.exerciseId, step.totalExerciseSets]));
  const playerResults = buildWorkoutPlayerExerciseResults(session, {
    completedSetsByExerciseId: completedCountByExerciseId,
    painFlagExerciseIds: Object.keys(painFlagMap),
    prescribedSetsByExerciseId,
    skippedSetsByExerciseId: skippedCountByExerciseId,
    skippedExerciseIds: Object.keys(skippedExerciseMap),
    substitutionByExerciseId: substitutionMap,
    touchedExerciseIds: Object.keys(touchedExerciseMap)
  });
  const completedExerciseCount = playerResults.filter((result) => result.resultStatus === "completed").length;
  const partialExerciseCount = playerResults.filter((result) => result.resultStatus === "partial").length;
  const skippedExerciseCount = playerResults.filter((result) => result.resultStatus === "skipped").length;
  const painFlagCount = playerResults.filter((result) => result.painFlag).length;
  const fuelLabel = session.fuelingGate ? "Fuel check" : plainFuelDemandLabel(session.fuelDemand);
  const recipeContext = recipeQuickLogContext(session);
  const coachNote =
    recipeContext.mainJob ||
    session.walkthrough.roundPlan?.instructions[0] ||
    session.walkthrough.steps[0]?.checkpoint ||
    session.sessionQualityCheckpoints?.[0] ||
    "Keep this smooth. Finish feeling sharper, not cooked.";
  const firstRecipeBlock = session.recipe?.blocks[0];
  const firstRecipeStep = firstRecipeBlock?.steps[0];
  const firstPreviewSection = session.sections[0];
  const firstPreviewExercise = firstPreviewSection?.exercises[0];
  const previewStartLine =
    firstRecipeBlock && firstRecipeStep
      ? `Start with ${firstRecipeBlock.title}: ${firstRecipeStep.title}.`
      : firstPreviewSection && firstPreviewExercise
      ? `Start with ${plainSectionName(firstPreviewSection.name)}: ${plainWorkoutTitle(firstPreviewExercise.name)}.`
      : session.walkthrough.beforeYouStart[0] ?? "Start when you are ready.";
  const guidedDurationLabel = formatWorkoutLength(timeline.totalSeconds || session.durationMinutes * 60);
  const previewFlowLines = recipeFlowLines(session);
  const previewWhy = recipeWhy(session);

  const restoreWorkoutState = (persisted: PersistedWorkoutPlayerState) => {
    const nextIndex = clampIndex(persisted.activeStepIndex, steps.length - 1);
    setActiveStepIndex(nextIndex);
    setStepRemainingSeconds(Math.max(0, Math.min(persisted.stepRemainingSeconds, steps[nextIndex]?.durationSeconds ?? persisted.stepRemainingSeconds)));
    setElapsedSeconds(persisted.elapsedSeconds);
    setCompletedSetMap(persisted.completedSetMap);
    setSkippedWorkStepMap(persisted.skippedWorkStepMap);
    setSkippedExerciseMap(persisted.skippedExerciseMap);
    setPainFlagMap(persisted.painFlagMap);
    setTouchedExerciseMap(persisted.touchedExerciseMap);
    setSubstitutionMap(persisted.substitutionMap);
    setSessionRpe(persisted.sessionRpe);
    setNotes(persisted.notes);
    setLocalError(null);
    setDetailMode(null);
    setDiscardConfirm(false);
    setSkipConfirm(false);
    setResumeState(null);
    setStatus(persisted.status);
  };

  const startWorkoutFresh = () => {
    void clearWorkoutPlayerState(session.generatedSessionId);
    setResumeState(null);
    setStepRemainingSeconds(currentTimelineStep.durationSeconds);
    setStatus("active");
  };

  const discardCurrentWorkout = () => {
    void clearWorkoutPlayerState(session.generatedSessionId);
    onDiscard();
  };

  if (status === "not_started") {
    return (
      <WorkoutScreenFrame mode="WORKOUT PREVIEW" onClose={onClose}>
        <GlassPanel testID="workout-player-preview">
          {resumeState ? (
            <View
              style={{
                backgroundColor: "rgba(39, 206, 241, 0.1)",
                borderColor: "rgba(39, 206, 241, 0.32)",
                borderRadius: 18,
                borderWidth: 1,
                gap: spacing.sm,
                padding: spacing.md
              }}
              testID="workout-player-resume-card"
            >
              <Text style={screenStyles.sectionTitle}>Saved workout found</Text>
              <Text style={screenStyles.body}>Resume from {formatElapsed(resumeState.elapsedSeconds)} elapsed, or start this workout from the top.</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                <PlayerButton label="Resume workout" onPress={() => restoreWorkoutState(resumeState)} tone="primary" />
                <PlayerButton label="Start over" onPress={startWorkoutFresh} />
                <PlayerButton label="Discard saved progress" onPress={() => {
                  void clearWorkoutPlayerState(session.generatedSessionId);
                  setResumeState(null);
                }} tone="warning" />
              </View>
            </View>
          ) : null}
          <View style={{ alignItems: "center", gap: spacing.md }}>
            <Text style={{ color: colors.blueIQ, fontSize: 12, fontWeight: "900", letterSpacing: 1.2, lineHeight: 16 }}>WORKOUT PREVIEW</Text>
            <Text style={{ color: colors.canvas, fontSize: 34, fontWeight: "900", lineHeight: 38, textAlign: "center" }}>{recipeTitle(session)}</Text>
            <Text style={{ color: colors.wrap, fontSize: 16, fontWeight: "800", lineHeight: 22, textAlign: "center" }}>{plainTrainingCopy(previewStartLine)}</Text>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center" }}>
            <PreviewPill label={guidedDurationLabel} />
            <PreviewPill label={`${timeline.blockCount} block${timeline.blockCount === 1 ? "" : "s"}`} tone="quiet" />
            <PreviewPill label={recipeEquipmentLabel(session.recipe)} tone="quiet" />
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
            <Text style={{ color: colors.readyGreen, fontSize: 13, fontWeight: "900", lineHeight: 17 }}>WHY</Text>
            <Text style={{ color: colors.wrap, fontSize: 15, fontWeight: "800", lineHeight: 21 }}>{previewWhy}</Text>
          </View>

          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.055)",
              borderColor: colors.line,
              borderRadius: 18,
              borderWidth: 1,
              gap: spacing.xs,
              padding: spacing.md
            }}
          >
            <Text style={{ color: colors.blueIQ, fontSize: 13, fontWeight: "900", lineHeight: 17 }}>FLOW</Text>
            {previewFlowLines.map((line) => <Text key={`preview-flow:${line}`} style={{ color: colors.wrap, fontSize: 14, fontWeight: "800", lineHeight: 20 }}>{line}</Text>)}
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
            <Text style={{ color: colors.readyGreen, fontSize: 13, fontWeight: "900", lineHeight: 17 }}>DO THIS</Text>
            <Text style={{ color: colors.wrap, fontSize: 15, fontWeight: "800", lineHeight: 21 }}>{plainTrainingCopy(coachNote)}</Text>
          </View>

          <PlayerButton
            disabled={busy}
            label="Start workout"
            onPress={startWorkoutFresh}
            tone="primary"
          />
          <PlayerButton label="Back to Train" onPress={onClose} />
          <Text style={screenStyles.subtle}>After starting, this device can offer to resume the workout if the same session is still available. Discard clears saved progress.</Text>
        </GlassPanel>

        <CollapsedDetailDisclosure title="Exercise details" summary="Exact movements, dose, cues, and help stay available before you start." testID="workout-player-preview-detail">
          <WorkoutExerciseDetails session={session} title={null} />
        </CollapsedDetailDisclosure>
      </WorkoutScreenFrame>
    );
  }

  const touchExercise = (exerciseId = activeExerciseId) => {
    setTouchedExerciseMap((current) => ({ ...current, [exerciseId]: true }));
  };

  const moveToStep = (stepIndex: number) => {
    const step = steps[clampIndex(stepIndex, steps.length - 1)];
    if (!step) {
      return;
    }
    setActiveStepIndex(clampIndex(stepIndex, steps.length - 1));
    setStepRemainingSeconds(step.durationSeconds);
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
      delete next[activeExerciseId];
      return next;
    });
    if (currentTimelineStep.tracksCompletion) {
      setSkippedWorkStepMap((current) => {
        const currentSets = current[activeExerciseId] ?? [];
        return {
          ...current,
          [activeExerciseId]: currentSets.filter((index) => index !== activeSetIndex)
        };
      });
      setCompletedSetMap((current) => {
        const currentSets = current[activeExerciseId] ?? [];
        return currentSets.includes(activeSetIndex)
          ? current
          : {
              ...current,
              [activeExerciseId]: [...currentSets, activeSetIndex].sort((left, right) => left - right)
            };
      });
    }
    moveNext();
  };

  const skipSet = () => {
    touchExercise();
    if (currentTimelineStep.tracksCompletion) {
      setSkippedWorkStepMap((current) => {
        const currentSets = current[activeExerciseId] ?? [];
        return currentSets.includes(activeSetIndex)
          ? current
          : {
              ...current,
              [activeExerciseId]: [...currentSets, activeSetIndex].sort((left, right) => left - right)
            };
      });
    }
    moveNext();
  };

  const skipExercise = () => {
    const liveStepIndex = activeStepIndexRef.current;
    const liveExerciseId = steps[liveStepIndex]?.exerciseId ?? activeExerciseId;
    touchExercise(liveExerciseId);
    setSkippedExerciseMap((current) => ({ ...current, [liveExerciseId]: true }));
    const next = steps.findIndex((step, index) => index > liveStepIndex && step.exerciseId !== liveExerciseId);
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
      if (next[activeExerciseId]) {
        delete next[activeExerciseId];
      } else {
        next[activeExerciseId] = true;
      }
      return next;
    });
  };

  const saveWorkout = async () => {
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
      const parsedRpe = parseSessionRpe(sessionRpe);
      const painNames = playerResults.filter((result) => result.painFlag).map((result) => result.exerciseName);
      await completionActions.complete(session, {
        ...(parsedRpe === undefined ? {} : { sessionRpe: parsedRpe }),
        painNotes: painNames.length > 0 ? [`Pain flagged: ${painNames.join(", ")}. Review before progressing.`] : [],
        notes: notes.trim(),
        exerciseResults: playerResults
      });
      await clearWorkoutPlayerState(session.generatedSessionId);
      setStatus("completed");
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Workout completion failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const skipWorkout = async () => {
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
      await clearWorkoutPlayerState(session.generatedSessionId);
      setStatus("skipped");
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Workout skip failed.");
    } finally {
      setSubmitting(false);
    }
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
            <Text style={screenStyles.heroTitle}>{recipeTitle(session)}</Text>
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
            <PlayerButton disabled={busy || submitting} label={busy || submitting ? "Saving workout..." : "Save workout"} onPress={() => void saveWorkout()} tone="primary" />
            <PlayerButton label="Go back" onPress={moveBack} />
            <PlayerButton label="Close player" onPress={onClose} />
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {skipConfirm ? <PlayerButton disabled={busy || submitting} label="Confirm skip workout" onPress={() => void skipWorkout()} tone="warning" /> : <PlayerButton disabled={submitting} label="Skip workout" onPress={() => setSkipConfirm(true)} tone="warning" />}
            {discardConfirm ? <PlayerButton label="Confirm discard" onPress={discardCurrentWorkout} tone="warning" /> : <PlayerButton label="Discard workout" onPress={() => setDiscardConfirm(true)} tone="warning" />}
          </View>
        </GlassPanel>
      </WorkoutScreenFrame>
    );
  }

  const futureStepSeconds = steps.slice(currentStepIndex + 1).reduce((sum, step) => sum + step.durationSeconds, 0);
  const remainingSessionSeconds = Math.max(0, stepRemainingSeconds + futureStepSeconds);
  const bigTimerSeconds = stepRemainingSeconds;
  const liveProgress = timeline.totalSeconds > 0 ? Math.min(1, Math.max(0, (timeline.totalSeconds - remainingSessionSeconds) / timeline.totalSeconds)) : progress;
  const liveCues = [currentTimelineStep.cue, ...displayNotes, ...(session.selfCheckCues ?? []).map(plainTrainingCopy)];
  const blockAccent = currentTimelineStep.blockAccent as LuminousAccent;
  const blockColor = accentColor[blockAccent];
  const activeMicroCue =
    currentTimelineStep.microCues && currentTimelineStep.microCues.length > 0
      ? currentTimelineStep.microCues[Math.floor((currentTimelineStep.durationSeconds - stepRemainingSeconds) / 30) % currentTimelineStep.microCues.length]
      : undefined;
  const teaching = movementTeachingForExercise(currentExercise);
  const primaryCue = activeMicroCue ?? teaching.liveCue ?? currentTimelineStep.cue ?? liveCues[0] ?? "Keep shoulders loose and breathe calmly.";
  const stepKind = stepKindTitle(currentTimelineStep.kind);
  const nextStepLabel = nextStep ? `${nextStep.title} - ${nextStep.durationLabel}` : "Finish summary";
  const liveDoThis = firstSentence(teaching.actionSentence || currentTimelineStep.instruction);
  const liveSafetyLine = painFlagMap[activeExerciseId] && currentTimelineStep.safetyStop
    ? currentTimelineStep.safetyStop
    : "Stop if pain, dizziness, or balance keeps breaking.";
  const shouldShowPrimaryDone = !currentTimelineStep.autoAdvance;
  const skipNextLabel = currentTimelineStep.tracksCompletion ? "Skip" : "Next";
  const skipNextPress = currentTimelineStep.tracksCompletion ? skipSet : moveNext;
  const stepTitle = splitStepTitle(currentTimelineStep.title);
  const timerProgress = currentTimelineStep.durationSeconds > 0 ? stepRemainingSeconds / currentTimelineStep.durationSeconds : 0;
  const timerPillLabel = currentTimelineStep.actionLabel === "round" ? "Round" : currentTimelineStep.kind === "rest" ? "Rest" : stepKind;
  const dockNextIcon: keyof typeof Ionicons.glyphMap = currentTimelineStep.tracksCompletion ? "play-skip-forward" : "play-forward";
  const liveControlDock = (
    <View
      style={{
        ...glassStyles.control,
        borderColor: "rgba(255, 255, 255, 0.17)",
        borderRadius: 30,
        flexDirection: "row",
        overflow: "hidden"
      }}
      testID="workout-player-control-dock"
    >
      <LiveDockButton disabled={currentStepIndex <= 0} icon="play-back" label="Back" onPress={moveBack} />
      <View style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", width: 1 }} />
      <LiveDockButton icon={status === "paused" ? "play" : "pause"} label={status === "paused" ? "Resume" : "Pause"} onPress={() => setStatus(status === "paused" ? "active" : "paused")} />
      <View style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", width: 1 }} />
      <LiveDockButton disabled={busy} icon={dockNextIcon} label={skipNextLabel} onPress={skipNextPress} />
      <View style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", width: 1 }} />
      <LiveDockButton disabled={busy} icon={painFlagMap[activeExerciseId] ? "heart" : "heart-outline"} label="Pain" onPress={togglePainFlag} tone={painFlagMap[activeExerciseId] ? "danger" : "neutral"} />
    </View>
  );

  return (
    <WorkoutScreenFrame footer={liveControlDock} mode="LIVE WORKOUT" onClose={onClose} scrollResetKey={`${status}:${currentTimelineStep.id}:${currentStepIndex}`} testID="workout-player">
      <View style={{ alignItems: "center", gap: spacing.xs }}>
        <Text style={{ color: colors.canvas, fontSize: 31, fontWeight: "900", lineHeight: 37, textAlign: "center" }}>{recipeTitle(session)}</Text>
        {selectedSubstitution ? <Text style={screenStyles.subtle}>Swapped from {plainWorkoutTitle(currentExercise.name)}</Text> : null}
      </View>

      <View style={{ gap: spacing.md }} testID="workout-player-progress">
        <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: colors.wrap, fontSize: 18, fontWeight: "800", lineHeight: 24 }}>Block {currentTimelineStep.sectionIndex + 1} of {timeline.blockCount} - {currentTimelineStep.sectionName}</Text>
          <Text style={{ color: colors.wrap, fontSize: 18, fontVariant: ["tabular-nums"], fontWeight: "800", lineHeight: 24 }} testID="workout-player-time-left">{formatTimer(remainingSessionSeconds)} left</Text>
        </View>
        <LuminousProgressBar accent={blockAccent} progress={liveProgress} />
        <BlockDots accent={blockAccent} activeIndex={currentTimelineStep.sectionIndex} count={timeline.blockCount} />
      </View>

      <View style={{ alignItems: "center", gap: spacing.md }} testID="workout-player-current-block">
        <View testID="workout-player-current-step" />
        <LiveTimerOrb accent={blockAccent} label={timerPillLabel} progress={timerProgress} seconds={bigTimerSeconds} />
        <View style={{ alignItems: "center", gap: spacing.xs }}>
          <Text style={{ color: colors.canvas, fontSize: 30, fontWeight: "900", lineHeight: 36, textAlign: "center" }}>{stepTitle.heading}</Text>
          {stepTitle.subheading ? <Text style={{ color: colors.wrap, fontSize: 21, fontWeight: "800", lineHeight: 27, textAlign: "center" }}>{stepTitle.subheading}</Text> : null}
          <Text style={{ color: blockColor, fontSize: 12, fontWeight: "900", lineHeight: 16 }}>{currentTimelineStep.dose}</Text>
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <LiveInfoCard accent={blockAccent} body={liveDoThis} icon="locate-outline" label="DO THIS" testID="workout-player-do-this-card" />
        <LiveInfoCard accent={blockAccent} body={primaryCue} icon="headset-outline" label="COACH CUE" testID="workout-player-coach-cue" tone="hot" />
        <LiveInfoCard body={nextStepLabel} icon="chevron-forward" label="NEXT" testID="workout-player-next-card" />
      </View>

          <Text style={{ color: painFlagMap[activeExerciseId] ? colors.amberCaution : colors.wrap, fontSize: 13, fontWeight: "800", lineHeight: 18, textAlign: "center" }}>{liveSafetyLine}</Text>
      <Text style={{ color: colors.wrap, fontSize: 12, fontWeight: "700", lineHeight: 17, textAlign: "center" }}>Progress is saved on this device. Reopen this workout to resume. Discard removes saved progress.</Text>

      {shouldShowPrimaryDone ? <PlayerButton disabled={busy || status === "paused"} label={doneButtonLabel(currentTimelineStep)} onPress={markDone} tone="primary" /> : null}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center" }}>
        {teaching.demoAssetKey ? <PlayerButton label="Show demo" onPress={() => setDetailMode("how")} /> : null}
        <PlayerButton label="How to" onPress={() => setDetailMode((value) => value === "how" ? null : "how")} />
        <PlayerButton label="Need help?" onPress={() => setDetailMode((value) => value === "help" ? null : "help")} />
        {currentExercise.substitutions.length > 0 ? <PlayerButton label="Swap" onPress={() => setDetailMode((value) => value === "swap" ? null : "swap")} /> : null}
      </View>

      {detailMode ? (
        <GlassPanel testID="workout-player-more-detail">
          <View style={{ gap: spacing.sm }}>
            <SetTracker activeSetIndex={activeSetIndex} completedSetIndices={completedSets} setCount={setCount} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
              <DetailPill label={currentTimelineStep.actionLabel === "movement" ? "Movement" : `${sentenceCase(currentTimelineStep.actionLabel)} of ${setCount}`} />
              <DetailPill label={`Timer ${currentTimelineStep.durationLabel}`} />
              {exerciseTargetText(currentExercise, activeSetIndex).map((target) => <DetailPill key={`target:${target}`} label={target} />)}
            </View>
          </View>
          {detailMode === "how" ? (
            <View style={{ gap: spacing.sm }} testID="workout-player-how-to">
              <Text style={screenStyles.fieldLabel}>How to</Text>
              {teaching.setupSteps.map((item, index) => <Text key={`setup:${index}`} style={screenStyles.body}>Setup {index + 1}: {plainTrainingCopy(item)}</Text>)}
              {teaching.executionSteps.map((item, index) => <Text key={`execution:${index}`} style={screenStyles.body}>Step {index + 1}: {plainTrainingCopy(item)}</Text>)}
              {teaching.breathing ? <Text style={screenStyles.subtle}>Breathing: {plainTrainingCopy(teaching.breathing)}</Text> : null}
              {teaching.demoAssetKey ? <Text style={screenStyles.subtle}>Demo: {teaching.demoAssetKey}</Text> : null}
              <Text style={screenStyles.subtle}>Rest after: {currentTimelineStep.rest}</Text>
            </View>
          ) : null}
          {detailMode === "help" ? (
            <View style={{ gap: spacing.sm }} testID="workout-player-need-help">
              <Text style={screenStyles.fieldLabel}>Need help?</Text>
              <Text style={screenStyles.body}>Common mistake: {plainTrainingCopy(teaching.commonMistake.problem)}</Text>
              <Text style={screenStyles.body}>Fix: {plainTrainingCopy(teaching.commonMistake.fix)}</Text>
              <Text style={screenStyles.body}>Easier: {plainWorkoutTitle(teaching.easierOption.label)} - {plainTrainingCopy(teaching.easierOption.instruction)}</Text>
              {teaching.shouldFeel ? <Text style={screenStyles.subtle}>Should feel: {plainTrainingCopy(teaching.shouldFeel)}</Text> : null}
              {teaching.shouldNotFeel ? <Text style={screenStyles.subtle}>Should not feel: {plainTrainingCopy(teaching.shouldNotFeel)}</Text> : null}
              <Text style={[screenStyles.subtle, { color: colors.amberCaution }]}>Stop: {plainTrainingCopy(teaching.safetyStop)}</Text>
              <SafetyStack exercise={currentExercise} session={session} />
            </View>
          ) : null}
          {detailMode === "swap" ? (
            <View style={{ gap: spacing.sm }} testID="workout-player-swap-panel">
              <Text style={screenStyles.fieldLabel}>Swap</Text>
              <SubstitutionChooser
                exercise={currentExercise}
                onChoose={(substitution) => {
                  touchExercise();
                  setSubstitutionMap((current) => ({ ...current, [activeExerciseId]: substitution }));
                }}
                selected={selectedSubstitution}
              />
            </View>
          ) : null}
          <View style={{ gap: spacing.xs }}>
            <Text style={screenStyles.fieldLabel}>Load guidance</Text>
            <Text style={screenStyles.body}>{displayLoad}</Text>
          </View>
          <View style={{ gap: spacing.xs }}>
            <Text style={screenStyles.fieldLabel}>Section purpose</Text>
            <Text style={screenStyles.body}>{plainSectionIntent(currentSection.intent)}</Text>
          </View>
          {painFlagMap[activeExerciseId] ? <Text style={[screenStyles.subtle, { color: colors.amberCaution }]}>Pain flagged. Finish summary will keep progression conservative.</Text> : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <PlayerButton label="Back" onPress={moveBack} />
            <PlayerButton label="Next" onPress={moveNext} />
            <PlayerButton label="Skip exercise" onPress={skipExercise} tone="warning" />
            <PlayerButton label="Finish workout" onPress={() => setStatus("finishing")} tone="primary" />
          </View>
        </GlassPanel>
      ) : null}

      <CollapsedDetailDisclosure title="Session prep" summary="Checklist, self-check cues, quality checkpoints, and add-ons stay available while you train." testID="workout-player-session-prep">
        <View style={{ gap: spacing.xs }}>
          {(session.preSessionChecklist ?? []).slice(0, 3).map((item, index) => <Text key={`pre-session:${index}`} style={screenStyles.subtle}>Before: {plainTrainingCopy(item)}</Text>)}
          {(session.selfCheckCues ?? []).slice(0, 2).map((item, index) => <Text key={`self-check:${index}`} style={screenStyles.subtle}>Self-check: {plainTrainingCopy(item)}</Text>)}
          {(session.sessionQualityCheckpoints ?? []).slice(0, 3).map((item, index) => <Text key={`quality:${index}`} style={screenStyles.subtle}>Quality: {plainTrainingCopy(item)}</Text>)}
          {(session.addOnBlocks ?? []).slice(0, 3).map((block) => (
            <Text key={block.id} style={screenStyles.subtle}>
              Add-on: {plainWorkoutTitle(block.label)} ({block.durationMinutes} min) - {(block.exerciseIds ?? []).map((exerciseId) => plainWorkoutTitle(exerciseNameById.get(exerciseId) ?? exerciseId.replaceAll("_", " "))).join(", ")}
            </Text>
          ))}
          {session.fuelAfter ? <Text style={screenStyles.subtle}>After: {plainTrainingCopy(session.fuelAfter)}</Text> : null}
        </View>
      </CollapsedDetailDisclosure>
    </WorkoutScreenFrame>
  );
}
