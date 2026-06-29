import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ImageBackground, Platform, Pressable, ScrollView, Text, TextInput, View, type ImageSourcePropType, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { DetailedTrainingSession, ExercisePrescription, ExerciseSubstitution } from "../../../engine/core/types";
import type { WorkoutPlayerMode } from "../../../engine/presentation/workoutPlayerMode";
import { resolveExercisePlayerMode, resolveWorkoutPlayerMode } from "../../../engine/presentation/workoutPlayerMode";
import { buildWorkoutPlayerTimeline, parseWorkoutTimerSeconds } from "../../../engine/presentation/workoutPlayerTimeline";
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
import { LuminousProgressBar } from "../../../design/components/LuminousScreen";
import { accentColor, accentWash, LuminousScreenThemeContext, luminousScreenThemes, type LuminousAccent } from "../../../design/luminousTheme";
import { glassStyles } from "../../../design/glass";
import { colors, radii, spacing } from "../../../design/theme";
import type { WorkoutCompletionActions } from "../../../hooks/useWorkoutCompletion";
import { clearWorkoutPlayerState, loadWorkoutPlayerState, saveWorkoutPlayerState, type PersistedWorkoutPlayerState, type PersistedWorkoutPlayerStatus } from "../../../services/workout/workoutPlayerPersistence";
import { screenStyles } from "../screenStyles";
import { trainColorForTone, trainPalette, trainTextStyles, trainTint } from "./trainPalette";
import { WorkoutExerciseDetails } from "./WorkoutExerciseDetails";

export type WorkoutPlayerStatus = "not_started" | "active" | "paused" | "finishing" | "completed" | "skipped";
type PlayerVisualTheme = "player" | "train";
type PreviewPillTone = Parameters<typeof trainColorForTone>[0] | "quiet";
type WorkoutTimelineStep = ReturnType<typeof buildWorkoutPlayerTimeline>["steps"][number];

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

function playerModeLabel(mode: WorkoutPlayerMode): string {
  switch (mode) {
    case "round_timer":
      return "Round workout";
    case "strength_sets":
      return "Strength workout";
    case "movement_flow":
      return "Movement flow";
    case "hybrid":
      return "Hybrid workout";
  }
}

function liveStepPlayerMode(
  sessionMode: WorkoutPlayerMode,
  exercise: ExercisePrescription,
  step: ReturnType<typeof buildWorkoutPlayerTimeline>["steps"][number]
): Exclude<WorkoutPlayerMode, "hybrid"> {
  const exerciseMode = resolveExercisePlayerMode(exercise);
  if (sessionMode === "round_timer") {
    return "round_timer";
  }
  if (exerciseMode === "movement_flow" || step.kind === "cooldown") {
    return "movement_flow";
  }
  return exerciseMode;
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

function restGuidanceText(exercise: ExercisePrescription, setIndex: number, step: ReturnType<typeof buildWorkoutPlayerTimeline>["steps"][number]): string {
  const set = exercise.sets[setIndex] ?? exercise.sets[0];
  if (step.restAfterSeconds && step.restAfterSeconds > 0) {
    return `Rest ${formatWorkoutLength(step.restAfterSeconds)} after this set`;
  }
  return plainTrainingCopy(set?.restText ?? exercise.restText);
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
  accent = "blue",
  disabled = false,
  icon,
  label,
  layout = "auto",
  onPress,
  tone = "quiet",
  visualTheme = "player"
}: {
  accent?: LuminousAccent | undefined;
  disabled?: boolean | undefined;
  icon?: keyof typeof Ionicons.glyphMap | undefined;
  label: string;
  layout?: "auto" | "full" | "half" | "compact" | undefined;
  onPress: () => void;
  tone?: "primary" | "quiet" | "warning" | undefined;
  visualTheme?: PlayerVisualTheme | undefined;
}) {
  const primary = tone === "primary";
  const warning = tone === "warning";
  const trainTheme = visualTheme === "train";
  const compact = layout === "compact";
  const buttonAccent = accentColor[accent];
  const buttonTheme = luminousScreenThemes[accent];
  const labelVerticalOffset = Platform.OS === "web" ? -11 : -2;
  const layoutStyle: ViewStyle =
    layout === "full"
      ? { alignSelf: "stretch", width: "100%" }
      : layout === "half"
        ? { flexBasis: "47%", flexGrow: 1, minWidth: 0 }
        : layout === "compact"
          ? { flexBasis: "47%", flexGrow: 0, minWidth: 0 }
          : { alignSelf: "stretch" };
  const backgroundColor = trainTheme
    ? disabled
      ? "rgba(255, 255, 255, 0.1)"
      : primary
        ? trainPalette.actionFill
        : warning
          ? trainTint("orange", "16")
          : trainPalette.controlFill
    : primary
      ? buttonAccent
      : warning
        ? "rgba(255, 82, 101, 0.045)"
        : "rgba(255, 255, 255, 0.035)";
  const borderColor = trainTheme
    ? disabled
      ? "rgba(255, 255, 255, 0.16)"
      : primary
        ? trainPalette.actionBorder
        : warning
          ? trainTint("orange", "44")
          : trainPalette.controlLine
    : primary
      ? buttonAccent
      : warning
        ? "rgba(255, 82, 101, 0.34)"
        : buttonTheme.controlBorder;
  const textColor = trainTheme
    ? disabled
      ? trainPalette.textMuted
      : primary
        ? trainPalette.textPrimary
        : warning
          ? trainColorForTone("orange")
          : trainPalette.textBody
    : primary && accent !== "red" && accent !== "purple"
      ? colors.cornerBlack
      : warning
        ? colors.redCorner
        : colors.canvas;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        borderWidth: 1,
        ...layoutStyle,
        alignItems: "center",
        backgroundColor,
        borderColor,
        borderRadius: compact ? 10 : 12,
        boxShadow: trainTheme && primary ? `0 10px 22px ${trainPalette.actionShadow}` : "none",
        justifyContent: "center",
        minHeight: compact ? 44 : primary ? 54 : 48,
        minWidth: layout === "auto" ? primary ? 168 : 112 : 0,
        opacity: disabled ? 0.55 : 1,
        paddingHorizontal: compact ? spacing.sm : spacing.md,
        paddingVertical: 0,
        position: "relative"
      }}
    >
      <View
        style={{
          alignItems: "center",
          alignSelf: "stretch",
          justifyContent: "center",
          minHeight: compact ? 42 : primary ? 52 : 46,
          paddingHorizontal: 0,
          position: "relative"
        }}
      >
        {icon ? <Ionicons color={textColor} name={icon} size={compact ? 16 : 18} style={{ left: 0, position: "absolute" }} /> : null}
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          numberOfLines={1}
          style={{
            color: textColor,
            fontSize: compact ? 13 : 15,
            fontWeight: primary ? "900" : "800",
            includeFontPadding: false,
            lineHeight: compact ? 16 : 18,
            textAlign: "center",
            textAlignVertical: "center",
            transform: [{ translateX: icon ? -5 : -3 }, { translateY: labelVerticalOffset }],
            width: "100%"
          }}
        >
          {label}
        </Text>
      </View>
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

function MovementMetaLine({
  accent,
  items
}: {
  accent: LuminousAccent;
  items: readonly (string | null | undefined)[];
}) {
  const visibleItems = items.filter((item): item is string => Boolean(item));
  const color = accentColor[accent];
  if (visibleItems.length === 0) {
    return null;
  }
  return (
    <View
      style={{
        alignItems: "center",
        alignSelf: "stretch",
        borderBottomColor: `${color}2F`,
        borderBottomWidth: 1,
        borderTopColor: `${color}2F`,
        borderTopWidth: 1,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing.xs,
        justifyContent: "center",
        paddingVertical: spacing.sm
      }}
      testID="workout-player-movement-meta"
    >
      {visibleItems.map((item, index) => (
        <React.Fragment key={`movement-meta:${item}:${index}`}>
          {index > 0 ? <Text style={{ color: `${color}88`, fontSize: 12, fontWeight: "800", lineHeight: 16 }}>|</Text> : null}
          <Text style={{ color: index === 0 ? color : colors.wrap, fontSize: 12, fontWeight: "900", lineHeight: 16, textAlign: "center" }}>{item}</Text>
        </React.Fragment>
      ))}
    </View>
  );
}

function GlassPanel({
  children,
  testID,
  visualTheme = "player"
}: {
  children: React.ReactNode;
  testID?: string | undefined;
  visualTheme?: PlayerVisualTheme | undefined;
}) {
  const trainTheme = visualTheme === "train";
  return (
    <View
      style={{
        ...glassStyles.card,
        backgroundColor: trainTheme ? luminousScreenThemes.purple.cardDeep : glassStyles.card.backgroundColor,
        borderColor: trainTheme ? luminousScreenThemes.purple.cardBorder : glassStyles.card.borderColor,
        borderRadius: trainTheme ? radii.card : 28,
        boxShadow: trainTheme ? `0 18px 42px rgba(0, 0, 0, 0.34), 0 0 22px ${luminousScreenThemes.purple.strongGlow}` : glassStyles.card.boxShadow,
        gap: spacing.md,
        padding: spacing.lg
      }}
      testID={testID}
    >
      {children}
    </View>
  );
}

function HeaderBackButton({
  accessibilityLabel,
  onPress
}: {
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const theme = React.useContext(LuminousScreenThemeContext);
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={{
        alignItems: "center",
        backgroundColor: "transparent",
        borderColor: theme.controlBorder,
        borderRadius: 12,
        borderWidth: 1,
        height: 40,
        justifyContent: "center",
        minWidth: 64,
        paddingHorizontal: spacing.sm
      }}
    >
      <Text style={{ color: colors.canvas, fontSize: 13, fontWeight: "900", lineHeight: 18, textAlign: "center" }}>Back</Text>
    </Pressable>
  );
}

function WorkoutScreenFrame({
  accent = "blue",
  backgroundImage,
  children,
  footer,
  mode,
  onClose,
  scrollResetKey,
  testID = "workout-player-screen"
}: {
  accent?: LuminousAccent | undefined;
  backgroundImage?: ImageSourcePropType | undefined;
  children: React.ReactNode;
  footer?: React.ReactNode | undefined;
  mode: string;
  onClose: () => void;
  scrollResetKey?: string | number | undefined;
  testID?: string | undefined;
}) {
  const insets = useSafeAreaInsets();
  const scrollRef = React.useRef<ScrollView>(null);
  const theme = luminousScreenThemes[accent];
  const showBackdrop = Boolean(backgroundImage) || accent !== "blue";
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ animated: false, y: 0 });
  }, [scrollResetKey]);

  return (
    <LuminousScreenThemeContext.Provider value={theme}>
      <View style={{ backgroundColor: showBackdrop ? theme.background : colors.cornerBlack, flex: 1 }} testID={testID}>
        {backgroundImage ? (
          <View pointerEvents="none" style={{ bottom: 0, left: 0, position: "absolute", right: 0, top: 0 }}>
            <ImageBackground importantForAccessibility="no-hide-descendants" resizeMode="cover" source={backgroundImage} style={{ flex: 1 }}>
              <View style={{ backgroundColor: "rgba(1, 4, 10, 0.36)", bottom: 0, left: 0, position: "absolute", right: 0, top: 0 }} />
              <View style={{ backgroundColor: "rgba(0, 0, 0, 0.24)", bottom: 0, height: "64%", left: 0, position: "absolute", right: 0 }} />
            </ImageBackground>
          </View>
        ) : null}
        {showBackdrop ? (
          <View pointerEvents="none" style={{ bottom: 0, left: 0, overflow: "hidden", position: "absolute", right: 0, top: 0 }}>
            <View style={{ backgroundColor: theme.topWash, height: 330, left: 0, opacity: backgroundImage ? 0.24 : 0.82, position: "absolute", right: 0, top: 0 }} />
            <View style={{ backgroundColor: theme.midWash, height: 420, left: 0, opacity: backgroundImage ? 0.18 : 0.58, position: "absolute", right: 0, top: 258 }} />
            <View style={{ backgroundColor: theme.bottomWash, bottom: 0, height: "55%", left: 0, opacity: backgroundImage ? 0.24 : 1, position: "absolute", right: 0 }} />
          </View>
        ) : null}
        <ScrollView
          contentContainerStyle={{
            alignSelf: "center",
            gap: spacing.md,
            maxWidth: 1120,
            paddingBottom: footer ? spacing.lg : Math.max(insets.bottom, spacing.xl) + spacing.xl,
            paddingHorizontal: spacing.lg,
            paddingTop: Math.max(insets.top, spacing.md) + spacing.md,
            width: "100%"
          }}
          ref={scrollRef}
          style={{ flex: 1, overflow: "hidden" }}
        >
          <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
            <HeaderBackButton accessibilityLabel="Close workout player" onPress={onClose} />
            <Text style={{ color: theme.accentColor, fontSize: 13, fontWeight: "900", letterSpacing: 1.4, lineHeight: 18 }}>{mode}</Text>
            <View style={{ width: 64 }} />
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
    </LuminousScreenThemeContext.Provider>
  );
}

function PreviewPill({ label, tone = "purple" }: { label: string; tone?: PreviewPillTone | undefined }) {
  const quiet = tone === "quiet";
  const accentTone = quiet ? "muted" : tone;
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
      <Text numberOfLines={1} style={{ color: quiet ? trainPalette.textBody : trainColorForTone(accentTone), fontSize: 12, fontWeight: "900", letterSpacing: 0, lineHeight: 17 }}>{label}</Text>
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

function TrainPreviewInfoPanel({
  children,
  label,
  tone
}: React.PropsWithChildren<{
  label: string;
  tone: Parameters<typeof trainColorForTone>[0];
}>) {
  return (
    <View
      style={{
        backgroundColor: trainTint(tone, "10"),
        borderColor: trainTint(tone, "34"),
        borderRadius: radii.card,
        borderWidth: 1,
        gap: spacing.sm,
        padding: spacing.md
      }}
    >
      <Text style={{ color: trainColorForTone(tone), fontSize: 13, fontWeight: "900", lineHeight: 17 }}>{label}</Text>
      {children}
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

function categoryLabel(exercise: ExercisePrescription): string {
  switch (exercise.category) {
    case "main_strength":
      return "Main lift";
    case "secondary_strength":
      return "Support lift";
    case "durability":
      return "Durability";
    case "power":
      return "Power";
    case "warm_up":
      return "Warm-up";
    case "mobility":
      return "Mobility";
    case "recovery":
      return "Recovery";
    case "conditioning":
      return "Conditioning";
    case "roadwork":
      return "Roadwork";
    case "boxing_skill":
    case "technical":
      return "Boxing";
    case "agility":
      return "Agility";
  }
}

function setTargetText(exercise: ExercisePrescription, setIndex: number): string {
  const set = exercise.sets[setIndex] ?? exercise.sets[0];
  return plainTrainingCopy(set?.repsText ?? exercise.repsText ?? set?.durationText ?? exercise.durationText ?? "Work");
}

function setLoadText(exercise: ExercisePrescription, setIndex: number): string {
  const set = exercise.sets[setIndex] ?? exercise.sets[0];
  return plainTrainingCopy(set?.loadGuidance ?? exercise.loadGuidance);
}

function setRpeText(exercise: ExercisePrescription, setIndex: number): string {
  const set = exercise.sets[setIndex] ?? exercise.sets[0];
  const target = set?.rpeTarget ?? exercise.rpeTarget;
  return target ? String(target) : "-";
}

function setSummaryText(exercise: ExercisePrescription): string {
  const firstTarget = setTargetText(exercise, 0);
  const setCount = Math.max(1, exercise.sets.length);
  return `${setCount} set${setCount === 1 ? "" : "s"} x ${firstTarget}`;
}

function restSecondsForExercise(exercise: ExercisePrescription, setIndex: number, step?: WorkoutTimelineStep | undefined): number {
  if (step?.kind === "rest") {
    return step.durationSeconds;
  }
  if (step?.restAfterSeconds && step.restAfterSeconds > 0) {
    return step.restAfterSeconds;
  }
  const set = exercise.sets[setIndex] ?? exercise.sets[0];
  return parseWorkoutTimerSeconds(set?.restText ?? exercise.restText) ?? 0;
}

function CompactSegmentTimer({
  accent,
  label,
  progress,
  seconds,
  sublabel
}: {
  accent: LuminousAccent;
  label: string;
  progress: number;
  seconds: number;
  sublabel: string;
}) {
  const color = accentColor[accent];
  const size = 174;
  return (
    <View style={{ alignItems: "center", height: size, justifyContent: "center", position: "relative", width: size }}>
      <View
        style={{
          backgroundColor: `${color}16`,
          borderRadius: size / 2,
          boxShadow: `0 0 28px ${color}3D`,
          height: size - 28,
          position: "absolute",
          width: size - 28
        }}
      />
      <SegmentedTimerRing accent={accent} progress={progress} size={size} />
      <View style={{ alignItems: "center", gap: spacing.xs }}>
        <Text style={{ color, fontSize: 11, fontWeight: "900", letterSpacing: 1.4, lineHeight: 15 }}>{label}</Text>
        <Text style={{ color: colors.canvas, fontSize: 42, fontVariant: ["tabular-nums"], fontWeight: "900", lineHeight: 48 }}>{formatTimer(seconds)}</Text>
        <View
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.32)",
            borderColor: `${color}66`,
            borderRadius: radii.pill,
            borderWidth: 1,
            paddingHorizontal: spacing.md,
            paddingVertical: 3
          }}
        >
          <Text style={{ color, fontSize: 11, fontWeight: "900", lineHeight: 15 }}>{sublabel}</Text>
        </View>
      </View>
    </View>
  );
}

function StrengthStatusPill({ status }: { status: "active" | "done" | "skipped" | "up_next" }) {
  const done = status === "done";
  const active = status === "active";
  const skipped = status === "skipped";
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: done ? "rgba(56, 226, 138, 0.12)" : active ? "rgba(255, 82, 101, 0.12)" : skipped ? "rgba(255, 179, 71, 0.12)" : "rgba(255, 255, 255, 0.055)",
        borderColor: done ? "rgba(56, 226, 138, 0.56)" : active ? "rgba(255, 82, 101, 0.66)" : skipped ? "rgba(255, 179, 71, 0.48)" : "rgba(255, 255, 255, 0.2)",
        borderRadius: 8,
        borderWidth: 1,
        justifyContent: "center",
        minHeight: 30,
        minWidth: 64,
        paddingHorizontal: spacing.xs
      }}
    >
      <Text style={{ color: done ? colors.readyGreen : active ? colors.redCorner : skipped ? colors.amberCaution : colors.wrap, fontSize: 11, fontWeight: "900", lineHeight: 15 }}>
        {done ? "DONE" : active ? "ACTIVE" : skipped ? "SKIP" : "UP NEXT"}
      </Text>
    </View>
  );
}

function StrengthSetLogTable({
  activeSetIndex,
  completedSetIndices,
  exercise,
  skippedSetIndices
}: {
  activeSetIndex: number;
  completedSetIndices: readonly number[];
  exercise: ExercisePrescription;
  skippedSetIndices: readonly number[];
}) {
  const completed = new Set(completedSetIndices);
  const skipped = new Set(skippedSetIndices);
  const setCount = Math.max(1, exercise.sets.length);
  const headerStyle = { color: colors.wrap, fontSize: 10, fontWeight: "900" as const, letterSpacing: 0.4, lineHeight: 14 };
  return (
    <View style={{ gap: spacing.xs }} testID="workout-player-strength-log-table">
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.xs, paddingHorizontal: spacing.xs }}>
        <Text style={[headerStyle, { flex: 0.65 }]}>SET</Text>
        <Text style={[headerStyle, { flex: 1.1, textAlign: "center" }]}>TARGET</Text>
        <Text style={[headerStyle, { flex: 1.25, textAlign: "center" }]}>LOAD</Text>
        <Text style={[headerStyle, { flex: 1.05, textAlign: "center" }]}>DONE</Text>
        <Text style={[headerStyle, { flex: 0.72, textAlign: "center" }]}>RPE</Text>
        <Text style={[headerStyle, { flex: 1.12, textAlign: "right" }]}>STATUS</Text>
      </View>
      {Array.from({ length: setCount }).map((_, index) => {
        const isCompleted = completed.has(index);
        const isSkipped = skipped.has(index);
        const isActive = index === activeSetIndex && !isCompleted && !isSkipped;
        const rowColor = isCompleted ? "rgba(56, 226, 138, 0.05)" : isActive ? "rgba(255, 82, 101, 0.09)" : isSkipped ? "rgba(255, 179, 71, 0.06)" : "rgba(255, 255, 255, 0.035)";
        const borderColor = isCompleted ? "rgba(56, 226, 138, 0.28)" : isActive ? "rgba(255, 82, 101, 0.62)" : isSkipped ? "rgba(255, 179, 71, 0.32)" : "rgba(255, 255, 255, 0.09)";
        const textColor = isActive ? colors.redCorner : colors.canvas;
        return (
          <View
            key={`strength-set-row:${exercise.exerciseId}:${index}`}
            style={{
              alignItems: "center",
              backgroundColor: rowColor,
              borderColor,
              borderRadius: 10,
              borderWidth: 1,
              flexDirection: "row",
              gap: spacing.xs,
              minHeight: 44,
              paddingHorizontal: spacing.xs,
              paddingVertical: spacing.xs
            }}
          >
            <View
              style={{
                alignItems: "center",
                backgroundColor: isActive ? "rgba(255, 82, 101, 0.12)" : "rgba(255, 255, 255, 0.04)",
                borderColor,
                borderRadius: 8,
                borderWidth: 1,
                flex: 0.65,
                height: 32,
                justifyContent: "center"
              }}
            >
              <Text style={{ color: textColor, fontSize: 15, fontWeight: "900", lineHeight: 20 }}>{index + 1}</Text>
            </View>
            <Text numberOfLines={1} style={{ color: textColor, flex: 1.1, fontSize: 13, fontWeight: "800", lineHeight: 18, textAlign: "center" }}>{setTargetText(exercise, index)}</Text>
            <Text numberOfLines={1} style={{ color: textColor, flex: 1.25, fontSize: 12, fontWeight: "800", lineHeight: 17, textAlign: "center" }}>{setLoadText(exercise, index)}</Text>
            <Text numberOfLines={1} style={{ color: colors.wrap, flex: 1.05, fontSize: 13, fontWeight: "800", lineHeight: 18, textAlign: "center" }}>{isCompleted ? setTargetText(exercise, index) : "-"}</Text>
            <Text style={{ color: colors.wrap, flex: 0.72, fontSize: 13, fontWeight: "800", lineHeight: 18, textAlign: "center" }}>{isCompleted ? setRpeText(exercise, index) : "-"}</Text>
            <View style={{ alignItems: "flex-end", flex: 1.12 }}>
              <StrengthStatusPill status={isCompleted ? "done" : isSkipped ? "skipped" : isActive ? "active" : "up_next"} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function StrengthAccordionRow({
  completedSetIndices,
  exercise,
  index,
  isActive,
  onPress,
  skipped,
  skippedSetIndices
}: {
  completedSetIndices: readonly number[];
  exercise: ExercisePrescription;
  index: number;
  isActive: boolean;
  onPress: () => void;
  skipped: boolean;
  skippedSetIndices: readonly number[];
}) {
  const setCount = Math.max(1, exercise.sets.length);
  const doneCount = completedSetIndices.length;
  const skippedCount = skippedSetIndices.length;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: isActive }}
      onPress={onPress}
      style={{
        alignItems: "center",
        backgroundColor: isActive ? "rgba(255, 82, 101, 0.12)" : "rgba(255, 255, 255, 0.046)",
        borderColor: isActive ? "rgba(255, 82, 101, 0.58)" : "rgba(255, 255, 255, 0.12)",
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: "row",
        gap: spacing.md,
        minHeight: 72,
        padding: spacing.md
      }}
      testID={isActive ? "workout-player-strength-active-accordion" : undefined}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: isActive ? "rgba(255, 82, 101, 0.12)" : "rgba(255, 255, 255, 0.05)",
          borderColor: isActive ? "rgba(255, 82, 101, 0.7)" : "rgba(255, 255, 255, 0.2)",
          borderRadius: 9,
          borderWidth: 1,
          height: 44,
          justifyContent: "center",
          width: 44
        }}
      >
        <Text style={{ color: isActive ? colors.redCorner : colors.canvas, fontSize: 18, fontWeight: "900", lineHeight: 23 }}>{index + 1}</Text>
      </View>
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: colors.canvas, fontSize: 22, fontWeight: "900", lineHeight: 28 }}>{plainWorkoutTitle(exercise.name)}</Text>
        <Text numberOfLines={1} style={{ color: colors.wrap, fontSize: 14, fontWeight: "700", lineHeight: 19 }}>
          {skipped ? "Skipped" : `${categoryLabel(exercise)} - ${setSummaryText(exercise)}${doneCount > 0 || skippedCount > 0 ? ` - ${doneCount}/${setCount} logged` : ""}`}
        </Text>
      </View>
      <Ionicons color={colors.wrap} name={isActive ? "chevron-up" : "chevron-down"} size={24} />
    </Pressable>
  );
}

function MovementUpNextList({
  currentIndex,
  steps
}: {
  currentIndex: number;
  steps: readonly WorkoutTimelineStep[];
}) {
  const upcoming = steps.slice(currentIndex + 1, currentIndex + 4);
  if (upcoming.length === 0) {
    return null;
  }
  return (
    <View style={{ gap: spacing.xs }} testID="workout-player-movement-up-next">
      <Text style={{ color: colors.wrap, fontSize: 12, fontWeight: "900", letterSpacing: 2, lineHeight: 16 }}>UP NEXT</Text>
      <View
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.035)",
          borderColor: "rgba(255, 255, 255, 0.12)",
          borderRadius: 14,
          borderWidth: 1,
          overflow: "hidden"
        }}
      >
        {upcoming.map((step, index) => (
          <View
            key={`movement-up-next:${step.id}`}
            style={{
              alignItems: "center",
              borderBottomColor: "rgba(255, 255, 255, 0.09)",
              borderBottomWidth: index === upcoming.length - 1 ? 0 : 1,
              flexDirection: "row",
              gap: spacing.sm,
              minHeight: 48,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm
            }}
          >
            <View
              style={{
                alignItems: "center",
                borderColor: "rgba(255, 255, 255, 0.22)",
                borderRadius: radii.pill,
                borderWidth: 1,
                height: 30,
                justifyContent: "center",
                width: 30
              }}
            >
              <Text style={{ color: colors.canvas, fontSize: 13, fontWeight: "900", lineHeight: 17 }}>{currentIndex + index + 2}</Text>
            </View>
            <Text numberOfLines={1} style={{ color: colors.canvas, flex: 1, fontSize: 14, fontWeight: "800", lineHeight: 19 }}>{step.title}</Text>
            <DetailPill label={step.durationLabel} />
          </View>
        ))}
      </View>
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
  const playerMode = React.useMemo(() => resolveWorkoutPlayerMode(session), [session]);
  const exerciseById = React.useMemo(
    () => new Map(session.sections.flatMap((section) => section.exercises.map((exercise) => [exercise.exerciseId, exercise] as const))),
    [session.sections]
  );
  const initialStepIndex = React.useMemo(() => {
    if (playerMode !== "strength_sets") {
      return 0;
    }
    const firstStep = timeline.steps[0];
    const firstExercise = firstStep ? exerciseById.get(firstStep.exerciseId) : undefined;
    if (firstStep && firstExercise && liveStepPlayerMode(playerMode, firstExercise, firstStep) === "movement_flow") {
      return 0;
    }
    const firstStrengthWork = timeline.steps.findIndex((step) => {
      const exercise = exerciseById.get(step.exerciseId);
      return Boolean(exercise && step.tracksCompletion && liveStepPlayerMode(playerMode, exercise, step) === "strength_sets");
    });
    return firstStrengthWork >= 0 ? firstStrengthWork : 0;
  }, [exerciseById, playerMode, timeline.steps]);
  const firstStepSeconds = timeline.steps[initialStepIndex]?.durationSeconds ?? 0;
  const [status, setStatus] = React.useState<WorkoutPlayerStatus>("not_started");
  const [activeStepIndex, setActiveStepIndex] = React.useState(initialStepIndex);
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
  const restoredStepTimerIndexRef = React.useRef<number | null>(null);
  const activeStepIndexRef = React.useRef(activeStepIndex);
  activeStepIndexRef.current = activeStepIndex;

  React.useEffect(() => {
    setStatus("not_started");
    setActiveStepIndex(initialStepIndex);
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
  }, [firstStepSeconds, initialStepIndex, session.generatedSessionId]);

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
    if (restoredStepTimerIndexRef.current === activeStepIndex) {
      restoredStepTimerIndexRef.current = null;
      return;
    }
    restoredStepTimerIndexRef.current = null;
    setStepRemainingSeconds(timeline.steps[activeStepIndex]?.durationSeconds ?? 0);
  }, [activeStepIndex, timeline.steps]);

  React.useEffect(() => {
    if (status !== "active") {
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
      <WorkoutScreenFrame accent="purple" mode="WORKOUT PREVIEW" onClose={onClose}>
        <GlassPanel visualTheme="train">
          <Text style={trainTextStyles.sectionTitle}>Workout player unavailable</Text>
          <Text style={trainTextStyles.body}>No exercise steps are available for this support workout.</Text>
          <PlayerButton label="Close" onPress={onClose} visualTheme="train" />
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
  const exerciseNameById = new Map([...exerciseById.entries()].map(([exerciseId, exercise]) => [exerciseId, exercise.name] as const));
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
  const strengthExerciseIds = Array.from(
    new Set(
      steps
        .filter((step) => {
          const exercise = exerciseById.get(step.exerciseId);
          return Boolean(exercise && step.tracksCompletion && liveStepPlayerMode(playerMode, exercise, step) === "strength_sets");
        })
        .map((step) => step.exerciseId)
    )
  );
  const strengthExercises = strengthExerciseIds.map((exerciseId) => exerciseById.get(exerciseId)).filter((exercise): exercise is ExercisePrescription => Boolean(exercise));
  const totalStrengthSets = strengthExercises.reduce((sum, exercise) => {
    const firstStepForExercise = steps.find((step) => step.exerciseId === exercise.exerciseId && step.tracksCompletion);
    return sum + Math.max(1, firstStepForExercise?.totalExerciseSets ?? exercise.sets.length);
  }, 0);
  const firstStrengthExercise = strengthExercises[0];
  const previewMovementLines = steps
    .filter((step) => {
      const exercise = exerciseById.get(step.exerciseId);
      return Boolean(exercise && step.kind !== "rest" && liveStepPlayerMode(playerMode, exercise, step) === "movement_flow");
    })
    .slice(0, 3)
    .map((step, index) => `Movement ${index + 1}: ${step.title}`);
  const previewStartLine =
    playerMode === "strength_sets" && firstStrengthExercise
      ? `Start with ${plainWorkoutTitle(firstStrengthExercise.name)}.`
      : playerMode === "movement_flow" && previewMovementLines.length > 0
        ? `Start with ${previewMovementLines[0]?.replace(/^Movement\s+\d+:\s*/, "")}.`
        : firstRecipeBlock && firstRecipeStep
      ? `Start with ${firstRecipeBlock.title}: ${firstRecipeStep.title}.`
      : firstPreviewSection && firstPreviewExercise
      ? `Start with ${plainSectionName(firstPreviewSection.name)}: ${plainWorkoutTitle(firstPreviewExercise.name)}.`
      : session.walkthrough.beforeYouStart[0] ?? "Start when you are ready.";
  const guidedDurationLabel = formatWorkoutLength(timeline.totalSeconds || session.durationMinutes * 60);
  const previewFlowLines =
    playerMode === "strength_sets"
      ? [
          `Exercises: ${strengthExercises.length}`,
          `Prescribed sets: ${totalStrengthSets}`,
          firstStrengthExercise ? `First lift: ${plainWorkoutTitle(firstStrengthExercise.name)}` : "First lift: ready when you are"
        ]
      : playerMode === "movement_flow" && previewMovementLines.length > 0
        ? previewMovementLines
        : recipeFlowLines(session);
  const previewWhy = recipeWhy(session);

  const restoreWorkoutState = (persisted: PersistedWorkoutPlayerState) => {
    const nextIndex = clampIndex(persisted.activeStepIndex, steps.length - 1);
    if (nextIndex !== activeStepIndex) {
      restoredStepTimerIndexRef.current = nextIndex;
    }
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
    setActiveStepIndex(initialStepIndex);
    setStepRemainingSeconds(steps[initialStepIndex]?.durationSeconds ?? currentTimelineStep.durationSeconds);
    setStatus("active");
  };

  const discardCurrentWorkout = () => {
    void clearWorkoutPlayerState(session.generatedSessionId);
    onDiscard();
  };

  if (status === "not_started") {
    return (
      <WorkoutScreenFrame accent="purple" mode="WORKOUT PREVIEW" onClose={onClose}>
        <GlassPanel testID="workout-player-preview" visualTheme="train">
          {resumeState ? (
            <View
              style={{
                backgroundColor: trainTint("purple", "12"),
                borderColor: trainTint("purple", "3D"),
                borderRadius: radii.card,
                borderWidth: 1,
                gap: spacing.sm,
                padding: spacing.md
              }}
              testID="workout-player-resume-card"
            >
              <Text style={trainTextStyles.sectionTitle}>Saved workout found</Text>
              <Text style={trainTextStyles.body}>Resume from {formatElapsed(resumeState.elapsedSeconds)} elapsed, or start this workout from the top.</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                <PlayerButton label="Resume workout" onPress={() => restoreWorkoutState(resumeState)} tone="primary" visualTheme="train" />
                <PlayerButton label="Start over" onPress={startWorkoutFresh} visualTheme="train" />
                <PlayerButton label="Discard saved progress" onPress={() => {
                  void clearWorkoutPlayerState(session.generatedSessionId);
                  setResumeState(null);
                }} tone="warning" visualTheme="train" />
              </View>
            </View>
          ) : null}
          <View style={{ alignItems: "center", gap: spacing.md }}>
            <Text style={{ color: trainColorForTone("purple"), fontSize: 12, fontWeight: "900", letterSpacing: 0, lineHeight: 16 }}>WORKOUT PREVIEW</Text>
            <Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={2} style={{ color: trainPalette.textPrimary, fontSize: 34, fontWeight: "900", letterSpacing: 0, lineHeight: 38, textAlign: "center" }}>{recipeTitle(session)}</Text>
            <Text style={{ color: trainPalette.textBody, fontSize: 16, fontWeight: "800", lineHeight: 22, textAlign: "center" }}>{plainTrainingCopy(previewStartLine)}</Text>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center" }}>
            <PreviewPill label={playerModeLabel(playerMode)} tone={playerMode === "strength_sets" ? "orange" : playerMode === "movement_flow" ? "green" : playerMode === "hybrid" ? "gold" : "purple"} />
            <PreviewPill label={guidedDurationLabel} />
            <PreviewPill label={`${timeline.blockCount} block${timeline.blockCount === 1 ? "" : "s"}`} tone="quiet" />
            <PreviewPill label={recipeEquipmentLabel(session.recipe)} tone="quiet" />
            <PreviewPill label={plainIntensityLabel(session.intensity)} tone="green" />
            <PreviewPill label={fuelLabel} tone={session.fuelDemand === "high" ? "orange" : "green"} />
          </View>

          <TrainPreviewInfoPanel label="WHY" tone="green">
            <Text style={{ color: trainPalette.textBody, fontSize: 15, fontWeight: "800", lineHeight: 21 }}>{previewWhy}</Text>
          </TrainPreviewInfoPanel>

          <TrainPreviewInfoPanel label="FLOW" tone="blue">
            {previewFlowLines.map((line) => <Text key={`preview-flow:${line}`} style={{ color: trainPalette.textBody, fontSize: 14, fontWeight: "800", lineHeight: 20 }}>{line}</Text>)}
            {playerMode === "strength_sets" ? <Text style={{ color: trainPalette.textBody, fontSize: 14, fontWeight: "800", lineHeight: 20 }}>You'll move set by set. Rest starts after each completed set.</Text> : null}
            {playerMode === "movement_flow" ? <Text style={{ color: trainPalette.textBody, fontSize: 14, fontWeight: "800", lineHeight: 20 }}>You'll move one movement at a time.</Text> : null}
          </TrainPreviewInfoPanel>

          <TrainPreviewInfoPanel label="DO THIS" tone="gold">
            <Text style={{ color: trainPalette.textBody, fontSize: 15, fontWeight: "800", lineHeight: 21 }}>{plainTrainingCopy(coachNote)}</Text>
          </TrainPreviewInfoPanel>

          <PlayerButton
            disabled={busy}
            label="Start workout"
            onPress={startWorkoutFresh}
            tone="primary"
            visualTheme="train"
          />
          <PlayerButton label="Back to Train" onPress={onClose} visualTheme="train" />
          <Text style={trainTextStyles.subtle}>After starting, this device can offer to resume the workout if the same session is still available. Discard clears saved progress.</Text>
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

  const stepModeAtIndex = (stepIndex: number): Exclude<WorkoutPlayerMode, "hybrid"> | null => {
    const step = steps[stepIndex];
    const exercise = step ? exerciseById.get(step.exerciseId) : undefined;
    return step && exercise ? liveStepPlayerMode(playerMode, exercise, step) : null;
  };

  const findNextStrengthWorkIndex = (fromIndex: number, input?: { differentExerciseFrom?: string | undefined }): number =>
    steps.findIndex((step, index) => {
      if (index <= fromIndex || !step.tracksCompletion) {
        return false;
      }
      if (input?.differentExerciseFrom && step.exerciseId === input.differentExerciseFrom) {
        return false;
      }
      return stepModeAtIndex(index) === "strength_sets";
    });

  const findNextPresentedStepIndex = (fromIndex: number): number =>
    steps.findIndex((step, index) => index > fromIndex && step.kind !== "rest");

  const moveToNextStrengthWork = (fromIndex = currentStepIndex) => {
    const nextStrengthIndex = findNextStrengthWorkIndex(fromIndex);
    if (nextStrengthIndex >= 0) {
      moveToStep(nextStrengthIndex);
      return;
    }
    const nextPresentedStepIndex = findNextPresentedStepIndex(fromIndex);
    if (nextPresentedStepIndex >= 0) {
      moveToStep(nextPresentedStepIndex);
      return;
    }
    setStatus("finishing");
  };

  const completeStrengthSet = () => {
    touchExercise();
    setSkippedExerciseMap((current) => {
      const next = { ...current };
      delete next[activeExerciseId];
      return next;
    });
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
    const nextStepIndex = currentStepIndex + 1;
    const nextStepCandidate = steps[nextStepIndex];
    if (nextStepCandidate?.kind === "rest" && nextStepCandidate.exerciseId === activeExerciseId) {
      moveToStep(nextStepIndex);
      return;
    }
    moveToNextStrengthWork();
  };

  const skipStrengthSet = () => {
    touchExercise();
    setCompletedSetMap((current) => {
      const currentSets = current[activeExerciseId] ?? [];
      return {
        ...current,
        [activeExerciseId]: currentSets.filter((index) => index !== activeSetIndex)
      };
    });
    setSkippedWorkStepMap((current) => {
      const currentSets = current[activeExerciseId] ?? [];
      return currentSets.includes(activeSetIndex)
        ? current
        : {
            ...current,
            [activeExerciseId]: [...currentSets, activeSetIndex].sort((left, right) => left - right)
          };
    });
    moveToNextStrengthWork();
  };

  const skipStrengthExercise = () => {
    touchExercise(activeExerciseId);
    setSkippedExerciseMap((current) => ({ ...current, [activeExerciseId]: true }));
    const nextStrengthIndex = findNextStrengthWorkIndex(currentStepIndex, { differentExerciseFrom: activeExerciseId });
    if (nextStrengthIndex >= 0) {
      moveToStep(nextStrengthIndex);
      return;
    }
    setStatus("finishing");
  };

  const completeMovementStep = () => {
    if (currentTimelineStep.tracksCompletion) {
      touchExercise();
      setSkippedExerciseMap((current) => {
        const next = { ...current };
        delete next[activeExerciseId];
        return next;
      });
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
      if (stepModeAtIndex(currentStepIndex + 1) === "strength_sets") {
        moveToNextStrengthWork();
        return;
      }
      moveNext();
      return;
    }
    if (stepModeAtIndex(currentStepIndex + 1) === "strength_sets") {
      moveToNextStrengthWork();
      return;
    }
    moveNext();
  };

  const skipMovementStep = () => {
    if (currentTimelineStep.tracksCompletion) {
      skipSet();
      return;
    }
    moveNext();
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

  const currentLiveMode = liveStepPlayerMode(playerMode, currentExercise, currentTimelineStep);
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

  if (currentLiveMode === "strength_sets") {
    const strengthExerciseNumber = Math.max(0, strengthExerciseIds.indexOf(activeExerciseId)) + 1;
    const currentSet = currentExercise.sets[activeSetIndex] ?? currentExercise.sets[0];
    const isStrengthResting = currentTimelineStep.kind === "rest";
    const displaySetIndex = isStrengthResting ? Math.min(activeSetIndex + 1, Math.max(0, setCount - 1)) : activeSetIndex;
    const skippedSets = skippedWorkStepMap[activeExerciseId] ?? [];
    const restSeconds = restSecondsForExercise(currentExercise, activeSetIndex, currentTimelineStep);
    const restTimerSeconds = isStrengthResting ? stepRemainingSeconds : restSeconds;
    const restTimerProgress = isStrengthResting && currentTimelineStep.durationSeconds > 0 ? stepRemainingSeconds / currentTimelineStep.durationSeconds : restSeconds > 0 ? 1 : 0;
    const nextStrengthWorkIndex = findNextStrengthWorkIndex(currentStepIndex);
    const nextStrengthStep = nextStrengthWorkIndex >= 0 ? steps[nextStrengthWorkIndex] : undefined;
    const nextStrengthExercise = nextStrengthStep ? exerciseById.get(nextStrengthStep.exerciseId) : undefined;
    const nextStrengthLabel = nextStrengthStep && nextStrengthExercise
      ? `Next: ${plainWorkoutTitle(nextStrengthExercise.name)} - Set ${nextStrengthStep.setIndex + 1}`
      : "Next: finish workout";
    const strengthExerciseRows = strengthExerciseIds
      .map((exerciseId) => exerciseById.get(exerciseId))
      .filter((exercise): exercise is ExercisePrescription => Boolean(exercise));
    const moveToStrengthExercise = (exerciseId: string) => {
      const openSetIndex = steps.findIndex((step, index) => {
        if (step.exerciseId !== exerciseId || !step.tracksCompletion || stepModeAtIndex(index) !== "strength_sets") {
          return false;
        }
        const completedForExercise = completedSetMap[exerciseId] ?? [];
        const skippedForExercise = skippedWorkStepMap[exerciseId] ?? [];
        return !completedForExercise.includes(step.setIndex) && !skippedForExercise.includes(step.setIndex);
      });
      if (openSetIndex >= 0) {
        moveToStep(openSetIndex);
        return;
      }
      const firstSetIndex = steps.findIndex((step, index) => step.exerciseId === exerciseId && step.tracksCompletion && stepModeAtIndex(index) === "strength_sets");
      if (firstSetIndex >= 0) {
        moveToStep(firstSetIndex);
      }
    };
    const strengthPrimaryMeta = [
      setTargetText(currentExercise, activeSetIndex),
      plainTrainingCopy(selectedSubstitution?.loadGuidance ?? setLoadText(currentExercise, activeSetIndex)),
      currentExercise.rpeTarget ?? currentSet?.rpeTarget ? `RPE ${currentExercise.rpeTarget ?? currentSet?.rpeTarget}` : null,
      currentExercise.rirTarget ?? currentSet?.rirTarget ? `RIR ${currentExercise.rirTarget ?? currentSet?.rirTarget}` : null
    ].filter((item): item is string => Boolean(item));
    const strengthSecondaryMeta = [
      currentExercise.tempo ?? currentSet?.tempo ? `Tempo ${plainTrainingCopy(currentExercise.tempo ?? currentSet?.tempo ?? "")}` : null,
      isStrengthResting ? "Rest running" : restGuidanceText(currentExercise, activeSetIndex, currentTimelineStep)
    ].filter((item): item is string => Boolean(item));
    const strengthControlDock = (
      <View
        style={{
          ...glassStyles.control,
          borderColor: "rgba(255, 82, 101, 0.18)",
          borderRadius: 24,
          flexDirection: "row",
          overflow: "hidden"
        }}
        testID="workout-player-strength-control-dock"
      >
        <LiveDockButton disabled={currentStepIndex <= 0} icon="play-back" label="Back" onPress={moveBack} />
        <View style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", width: 1 }} />
        <LiveDockButton icon={status === "paused" ? "play" : "pause"} label={status === "paused" ? "Resume" : "Pause"} onPress={() => setStatus(status === "paused" ? "active" : "paused")} />
        <View style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", width: 1 }} />
        <LiveDockButton icon="flag-outline" label="Finish workout" onPress={() => setStatus("finishing")} tone="danger" />
      </View>
    );

    if (currentTimelineStep.kind !== "work" && !isStrengthResting) {
      return (
        <WorkoutScreenFrame accent="orange" footer={strengthControlDock} mode="STRENGTH WORKOUT" onClose={onClose} scrollResetKey={`${status}:${currentTimelineStep.id}:${currentStepIndex}`} testID="workout-player">
          <View style={{ alignItems: "center", gap: spacing.xs }}>
            <Text style={{ color: colors.canvas, fontSize: 31, fontWeight: "900", lineHeight: 37, textAlign: "center" }}>{recipeTitle(session)}</Text>
            <Text style={{ color: colors.wrap, fontSize: 15, fontWeight: "800", lineHeight: 20, textAlign: "center" }}>Exercise {strengthExerciseNumber} of {strengthExerciseIds.length}</Text>
          </View>
          <GlassPanel testID="workout-player-strength-set">
            <View style={{ gap: spacing.xs }}>
              <Text style={screenStyles.fieldLabel}>{currentTimelineStep.sectionName}</Text>
              <Text style={screenStyles.heroTitle}>{currentTimelineStep.title}</Text>
              <Text style={screenStyles.body}>{currentTimelineStep.instruction}</Text>
              <Text style={screenStyles.callout}>{primaryCue}</Text>
            </View>
            <View style={{ gap: spacing.sm }}>
              <PlayerButton accent="red" icon="play" label="Start set" layout="full" onPress={() => moveToNextStrengthWork()} tone="primary" />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                <PlayerButton accent="red" disabled={busy} icon="play-skip-forward" label="Skip exercise" layout="full" onPress={skipStrengthExercise} tone="warning" />
              </View>
            </View>
          </GlassPanel>
        </WorkoutScreenFrame>
      );
    }

    return (
      <WorkoutScreenFrame accent="orange" footer={strengthControlDock} mode="STRENGTH WORKOUT" onClose={onClose} scrollResetKey={`${status}:${currentTimelineStep.id}:${currentStepIndex}`} testID="workout-player">
        <View style={{ alignItems: "center", gap: spacing.xs }}>
          <Text style={{ color: colors.canvas, fontSize: 31, fontWeight: "900", lineHeight: 37, textAlign: "center" }}>{recipeTitle(session)}</Text>
          {selectedSubstitution ? <Text style={screenStyles.subtle}>Swapped from {plainWorkoutTitle(currentExercise.name)}</Text> : null}
          <Text style={{ color: colors.wrap, fontSize: 15, fontWeight: "800", lineHeight: 20, textAlign: "center" }}>Block {currentTimelineStep.sectionIndex + 1} of {timeline.blockCount} - {currentTimelineStep.sectionName}</Text>
        </View>

        <View style={{ gap: spacing.md }} testID="workout-player-progress">
          <LuminousProgressBar accent="orange" progress={liveProgress} />
          <BlockDots accent="orange" activeIndex={currentTimelineStep.sectionIndex} count={timeline.blockCount} />
        </View>

        <GlassPanel testID="workout-player-strength-set">
          {isStrengthResting ? <View testID="workout-player-strength-rest" /> : null}
          <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md }}>
            <View
              style={{
                alignItems: "center",
                backgroundColor: "rgba(255, 82, 101, 0.12)",
                borderColor: "rgba(255, 82, 101, 0.7)",
                borderRadius: 10,
                borderWidth: 1,
                height: 48,
                justifyContent: "center",
                width: 48
              }}
            >
              <Text style={{ color: colors.redCorner, fontSize: 20, fontWeight: "900", lineHeight: 25 }}>{strengthExerciseNumber}</Text>
            </View>
            <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
              <Text style={{ color: colors.redCorner, fontSize: 12, fontWeight: "900", letterSpacing: 1.2, lineHeight: 16 }}>Exercise {strengthExerciseNumber} of {strengthExerciseIds.length}</Text>
              <Text numberOfLines={2} style={{ color: colors.canvas, fontSize: 29, fontWeight: "900", lineHeight: 34 }}>{plainWorkoutTitle(selectedSubstitution?.name ?? currentExercise.name)}</Text>
              <Text style={{ color: colors.wrap, fontSize: 14, fontWeight: "700", lineHeight: 19 }}>{categoryLabel(currentExercise)} - {setSummaryText(currentExercise)}</Text>
            </View>
            <Ionicons color={colors.redCorner} name="chevron-up" size={24} />
          </View>

          <View style={{ alignItems: "center", gap: spacing.xs }}>
            <CompactSegmentTimer
              accent="orange"
              label="REST"
              progress={restTimerProgress}
              seconds={restTimerSeconds}
              sublabel={isStrengthResting ? "Between sets" : "After log"}
            />
            <View style={{ gap: 2, paddingHorizontal: spacing.sm }} testID="workout-player-strength-meta">
              {strengthPrimaryMeta.length > 0 ? (
                <Text style={{ color: colors.wrap, fontSize: 12, fontWeight: "800", lineHeight: 17, textAlign: "center" }}>{strengthPrimaryMeta.join(" | ")}</Text>
              ) : null}
              {strengthSecondaryMeta.length > 0 ? (
                <Text style={{ color: colors.mutedText, fontSize: 12, fontWeight: "700", lineHeight: 17, textAlign: "center" }}>{strengthSecondaryMeta.join(" | ")}</Text>
              ) : null}
            </View>
          </View>

          <StrengthSetLogTable
            activeSetIndex={displaySetIndex}
            completedSetIndices={completedSets}
            exercise={currentExercise}
            skippedSetIndices={skippedSets}
          />
          <Text style={{ color: painFlagMap[activeExerciseId] ? colors.amberCaution : colors.wrap, fontSize: 13, fontWeight: "800", lineHeight: 18, textAlign: "center" }}>{liveSafetyLine}</Text>
          <View style={{ gap: spacing.sm }} testID="workout-player-strength-actions">
            {isStrengthResting ? (
              <>
                <PlayerButton accent="red" icon="play" label="Start next set" layout="full" onPress={() => {
                  setStatus("active");
                  moveToNextStrengthWork();
                }} tone="primary" />
              </>
            ) : (
              <PlayerButton accent="red" disabled={busy || status === "paused"} icon="checkmark" label="Log set" layout="full" onPress={completeStrengthSet} tone="primary" />
            )}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {isStrengthResting ? (
                <PlayerButton accent="red" icon="play-skip-forward" label="Skip rest" layout="half" onPress={() => {
                  setStatus("active");
                  moveToNextStrengthWork();
                }} />
              ) : (
                <PlayerButton accent="red" disabled={busy} icon="play-skip-forward" label="Skip set" layout="half" onPress={skipStrengthSet} tone="warning" />
              )}
              {currentExercise.substitutions.length > 0 ? (
                <PlayerButton accent="red" icon="swap-horizontal" label="Swap exercise" layout="half" onPress={() => setDetailMode((value) => value === "swap" ? null : "swap")} />
              ) : (
                <PlayerButton accent="red" icon="alert-circle-outline" label={painFlagMap[activeExerciseId] ? "Pain flagged" : "Pain flag"} layout="half" onPress={togglePainFlag} tone={painFlagMap[activeExerciseId] ? "warning" : "quiet"} />
              )}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              <PlayerButton accent="red" disabled={busy} icon="play-skip-forward" label="Skip exercise" layout={currentExercise.substitutions.length > 0 ? "half" : "full"} onPress={skipStrengthExercise} tone="warning" />
              {currentExercise.substitutions.length > 0 ? <PlayerButton accent="red" icon="alert-circle-outline" label={painFlagMap[activeExerciseId] ? "Pain flagged" : "Pain flag"} layout="half" onPress={togglePainFlag} tone={painFlagMap[activeExerciseId] ? "warning" : "quiet"} /> : null}
            </View>
          </View>
        </GlassPanel>

        <GlassPanel testID="workout-player-strength-guidance">
          <LiveInfoCard body={liveDoThis} icon="locate-outline" label="DO THIS" />
          <LiveInfoCard accent="orange" body={primaryCue} icon="headset-outline" label="COACH CUE" tone="hot" />
          <LiveInfoCard body={nextStrengthLabel} icon="chevron-forward" label="NEXT" />
        </GlassPanel>

        <View style={{ gap: spacing.sm }}>
          {strengthExerciseRows.map((exercise, index) => {
            if (exercise.exerciseId === activeExerciseId) {
              return null;
            }
            return (
              <StrengthAccordionRow
                completedSetIndices={completedSetMap[exercise.exerciseId] ?? []}
                exercise={exercise}
                index={index}
                isActive={false}
                key={`strength-accordion:${exercise.exerciseId}`}
                onPress={() => moveToStrengthExercise(exercise.exerciseId)}
                skipped={Boolean(skippedExerciseMap[exercise.exerciseId])}
                skippedSetIndices={skippedWorkStepMap[exercise.exerciseId] ?? []}
              />
            );
          })}
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center" }}>
          <PlayerButton label="How to do it" onPress={() => setDetailMode((value) => value === "how" ? null : "how")} />
          <PlayerButton label="Need help?" onPress={() => setDetailMode((value) => value === "help" ? null : "help")} />
        </View>

        {detailMode ? (
          <GlassPanel testID="workout-player-more-detail">
            {detailMode === "how" ? (
              <View style={{ gap: spacing.sm }} testID="workout-player-how-to">
                <Text style={screenStyles.fieldLabel}>How to do it</Text>
                {teaching.setupSteps.map((item, index) => <Text key={`setup:${index}`} style={screenStyles.body}>Setup {index + 1}: {plainTrainingCopy(item)}</Text>)}
                {teaching.executionSteps.map((item, index) => <Text key={`execution:${index}`} style={screenStyles.body}>Step {index + 1}: {plainTrainingCopy(item)}</Text>)}
                {teaching.breathing ? <Text style={screenStyles.subtle}>Breathing: {plainTrainingCopy(teaching.breathing)}</Text> : null}
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
                <Text style={screenStyles.fieldLabel}>Swap exercise</Text>
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
          </GlassPanel>
        ) : null}

        <Text style={{ color: colors.wrap, fontSize: 12, fontWeight: "700", lineHeight: 17, textAlign: "center" }}>Progress is saved on this device. Reopen this workout to resume. Discard removes saved progress.</Text>
      </WorkoutScreenFrame>
    );
  }

  if (currentLiveMode === "movement_flow") {
    const movementSteps = steps.filter((step, index) => step.sectionIndex === currentTimelineStep.sectionIndex && step.kind !== "rest" && stepModeAtIndex(index) === "movement_flow");
    const movementIndex = Math.max(0, movementSteps.findIndex((step) => step.id === currentTimelineStep.id));
    const nextMode = stepModeAtIndex(currentStepIndex + 1);
    const movementTimerProgress = currentTimelineStep.durationSeconds > 0 ? stepRemainingSeconds / currentTimelineStep.durationSeconds : 0;
    const movementNextStep = movementSteps[movementIndex + 1];
    const movementBreathCue = teaching.breathing ? plainTrainingCopy(teaching.breathing) : activeMicroCue && activeMicroCue !== primaryCue ? activeMicroCue : undefined;
    const movementPrimaryLabel = nextStep
      ? nextMode && nextMode !== "movement_flow"
        ? "Continue to main work"
        : currentTimelineStep.tracksCompletion
          ? "Done"
          : "Next movement"
      : "Finish workout";

    return (
      <WorkoutScreenFrame accent={blockAccent} mode="MOVEMENT FLOW" onClose={onClose} scrollResetKey={`${status}:${currentTimelineStep.id}:${currentStepIndex}`} testID="workout-player">
        <View style={{ alignItems: "center", gap: spacing.xs }}>
          <Text style={{ color: colors.canvas, fontSize: 31, fontWeight: "900", lineHeight: 37, textAlign: "center" }}>{recipeTitle(session)}</Text>
          <Text style={{ color: colors.wrap, fontSize: 15, fontWeight: "800", lineHeight: 20, textAlign: "center" }}>Block {currentTimelineStep.sectionIndex + 1} of {timeline.blockCount} - {currentTimelineStep.sectionName}</Text>
        </View>
        <View style={{ gap: spacing.md }} testID="workout-player-progress">
          <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: colors.wrap, flex: 1, fontSize: 18, fontWeight: "800", lineHeight: 24 }}>Movement {movementIndex + 1} of {Math.max(1, movementSteps.length)}</Text>
            <Text style={{ color: colors.wrap, fontSize: 18, fontVariant: ["tabular-nums"], fontWeight: "800", lineHeight: 24 }}>{formatTimer(remainingSessionSeconds)} left</Text>
          </View>
          <LuminousProgressBar accent={blockAccent} progress={liveProgress} />
        </View>
        <GlassPanel testID="workout-player-movement-flow">
          <View style={{ alignItems: "center", gap: spacing.md }}>
            <LiveTimerOrb accent={blockAccent} label="Move" progress={movementTimerProgress} seconds={stepRemainingSeconds} />
            <View style={{ alignItems: "center", gap: spacing.xs }}>
              <Text style={{ color: colors.canvas, fontSize: 31, fontWeight: "900", lineHeight: 37, textAlign: "center" }}>{currentTimelineStep.title}</Text>
              <Text style={{ color: blockColor, fontSize: 12, fontWeight: "900", lineHeight: 16 }}>{currentTimelineStep.dose}</Text>
            </View>
          </View>
          <MovementMetaLine
            accent={blockAccent}
            items={[
              currentTimelineStep.durationSeconds > 0 ? `Timer ${formatTimer(stepRemainingSeconds)}` : "Self paced",
              currentTimelineStep.repsText,
              currentTimelineStep.durationLabel
            ]}
          />
          <LiveInfoCard accent={blockAccent} body={liveDoThis} icon="locate-outline" label="DO THIS" />
          <LiveInfoCard accent={blockAccent} body={primaryCue} icon="headset-outline" label="CUE" tone="hot" />
          {movementBreathCue ? <LiveInfoCard accent={blockAccent} body={movementBreathCue} icon="radio-outline" label="BREATH" /> : null}
          {movementNextStep ? <LiveInfoCard body={`${movementNextStep.title} - ${movementNextStep.durationLabel}`} icon="chevron-forward" label="NEXT" /> : null}
          <MovementUpNextList currentIndex={movementIndex} steps={movementSteps} />
          {teaching.shouldFeel ? <Text style={screenStyles.subtle}>Should feel: {plainTrainingCopy(teaching.shouldFeel)}</Text> : null}
          {teaching.shouldNotFeel ? <Text style={screenStyles.subtle}>Should not feel: {plainTrainingCopy(teaching.shouldNotFeel)}</Text> : null}
          <Text style={{ color: colors.amberCaution, fontSize: 13, fontWeight: "800", lineHeight: 18 }}>{plainTrainingCopy(currentTimelineStep.safetyStop ?? teaching.safetyStop ?? liveSafetyLine)}</Text>
          <View style={{ gap: spacing.sm }}>
            <PlayerButton
              accent={blockAccent}
              disabled={busy || status === "paused"}
              icon={movementPrimaryLabel === "Finish workout" ? "flag-outline" : "checkmark"}
              label={movementPrimaryLabel}
              layout="full"
              onPress={movementPrimaryLabel === "Finish workout" ? () => setStatus("finishing") : completeMovementStep}
              tone="primary"
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              <PlayerButton accent={blockAccent} disabled={currentStepIndex <= 0} icon="arrow-back" label="Back" layout="half" onPress={moveBack} />
              <PlayerButton accent={blockAccent} icon={status === "paused" ? "play" : "pause"} label={status === "paused" ? "Resume" : "Pause"} layout="half" onPress={() => setStatus(status === "paused" ? "active" : "paused")} />
              <PlayerButton accent={blockAccent} disabled={busy} icon="play-skip-forward" label="Skip movement" layout="half" onPress={skipMovementStep} tone="warning" />
              <PlayerButton accent={blockAccent} icon="flag-outline" label="Finish workout" layout="half" onPress={() => setStatus("finishing")} />
            </View>
          </View>
        </GlassPanel>
      </WorkoutScreenFrame>
    );
  }

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
