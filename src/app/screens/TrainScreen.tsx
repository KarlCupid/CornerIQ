import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { Pressable, Text as NativeText, View, type TextProps, type TextStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { DetailedTrainingSession, ISODateString, RecentLogsViewModel, TrainViewModel } from "../../engine/core/types";
import { EngineGeneratingCard, type EngineGenerationStatus } from "../components/EngineGeneratingCard";
import { EmptyState } from "../../design/components/EmptyState";
import { LuminousScreen, ScreenHeader } from "../../design/components/LuminousScreen";
import { RiskBanner } from "../../design/components/RiskBanner";
import { colors, spacing } from "../../design/theme";
import { fontFamilies } from "../../design/typography";
import type { BarVisual, VisualTone } from "../../engine/presentation/dashboardVisualData";
import { clamp01 } from "../../engine/presentation/dashboardVisualData";
import type { QuickLogActions } from "../../hooks/useQuickLogs";
import type { TrainingPlanAdjustmentActions } from "../../hooks/useTrainingPlanAdjustments";
import type { WorkoutCompletionActions } from "../../hooks/useWorkoutCompletion";
import { ProtectedWorkoutLogCard } from "./logging/LogCards";
import { screenStyles } from "./screenStyles";
import { tabHeroHeaders } from "./tabHeroConfig";
import { trainColorForTone, trainPalette, trainTextStyles } from "./train/trainPalette";
import { WorkoutDetailPanel } from "./train/WorkoutDetailPanel";
import type { WorkoutPlayerStatus } from "./train/WorkoutPlayer";
import {
  plainGeneratedSessionFamilyWhy,
  plainIntensityLabel,
  plainSectionName,
  plainTrainingCopy as plainTrainCopy,
  plainWorkoutTitle
} from "../../engine/presentation/trainingCopy";
import {
  trainCriticalTrainingRisk,
  trainCycleDecisionIsDefaultVisible,
  trainFuelStatLabel,
  trainPrepRows,
  trainReadinessTone,
  trainReadinessValue,
  trainStartWorkoutBlockedReason
} from "../../engine/presentation/trainViewModel";
import { recipeFlowLines, recipeTitle, recipeWhy } from "../../engine/presentation/workoutRecipePresentation";

export type TrainSection = "today" | "workout" | "progress";

export interface TrainScreenProps {
  activeWorkout?: TrainWorkoutPlayerSummary | null | undefined;
  adjustmentActions?: Pick<TrainingPlanAdjustmentActions, "moveGeneratedSession"> | undefined;
  asOfDate?: ISODateString | undefined;
  busy: boolean;
  completionActions?: WorkoutCompletionActions | undefined;
  completionMessage?: string | null | undefined;
  generationStatus?: EngineGenerationStatus | undefined;
  initialSection?: TrainSection | undefined;
  onInitialSectionApplied?: (() => void) | undefined;
  onDiscardWorkout?: (() => void) | undefined;
  onOpenFuelAfterWorkout?: (() => void) | undefined;
  onOpenReadinessLog?: (() => void) | undefined;
  onResumeWorkout?: (() => void) | undefined;
  onStartWorkout?: ((session: DetailedTrainingSession) => void) | undefined;
  quickLogs: QuickLogActions;
  recentLogs: RecentLogsViewModel;
  viewModel: TrainViewModel;
}

export interface TrainWorkoutPlayerSummary {
  sessionId: string;
  status: WorkoutPlayerStatus;
  title: string;
}

function flattenEditorialStyle(style: unknown): TextStyle {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map((item) => flattenEditorialStyle(item)));
  }
  return style && typeof style === "object" ? style as TextStyle : {};
}

function trainEditorialFont(style: TextStyle): string {
  const weight = Number.parseInt(String(style.fontWeight ?? "400"), 10);
  if (weight >= 900) return fontFamilies.black;
  if (weight >= 800) return fontFamilies.extraBold;
  if (weight >= 700) return fontFamilies.bold;
  if (weight >= 600) return fontFamilies.semibold;
  if (weight >= 500) return fontFamilies.medium;
  return fontFamilies.regular;
}

function Text({ style, ...props }: TextProps) {
  const flattened = flattenEditorialStyle(style);
  return <NativeText {...props} style={[style, { fontFamily: trainEditorialFont(flattened) }]} />;
}

function TrainEditorialSection({ children, testID, title }: React.PropsWithChildren<{ testID?: string | undefined; title?: string | undefined }>) {
  return (
    <View
      style={{ borderBottomColor: trainPalette.cardLine, borderBottomWidth: 1, gap: spacing.md, paddingBottom: spacing.xl, paddingTop: spacing.xl }}
      testID={testID}
    >
      {title ? <Text style={{ color: trainPalette.textPrimary, fontSize: 18, fontWeight: "900", lineHeight: 23 }}>{title}</Text> : null}
      {children}
    </View>
  );
}

function DecorativeIcon(props: React.ComponentProps<typeof Ionicons>) {
  return <Ionicons {...props} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
}

type TrainSessionCard = TrainViewModel["sessionCards"][number];
type CompactGeneratedSession = NonNullable<TrainViewModel["nextGeneratedSession"]>;

interface FlowRow {
  label: string;
  value: string;
}

interface TrainWeekDayVisual extends BarVisual {
  date: string;
  hasSession: boolean;
  subtitle: string;
  title: string;
}

function toneForIntensity(intensity: string): VisualTone {
  if (intensity === "hard") {
    return "orange";
  }
  if (intensity === "easy" || intensity === "recovery") {
    return "green";
  }
  return "blue";
}

function sentenceCase(value: string): string {
  const copy = plainTrainCopy(value).trim();
  return copy.length > 0 ? `${copy.slice(0, 1).toUpperCase()}${copy.slice(1)}` : "Unknown";
}

function firstSentence(value: string): string {
  const copy = plainTrainCopy(value).trim();
  const match = copy.match(/^.+?[.!?](?:\s|$)/);
  return (match?.[0] ?? copy).trim();
}

function parseIsoDate(date: string): Date | null {
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: string, count: number): string {
  const parsed = parseIsoDate(date);
  if (!parsed) {
    return date;
  }
  parsed.setDate(parsed.getDate() + count);
  return toIsoDate(parsed);
}

function startOfTrainingWeek(seedDate: string): string {
  const parsed = parseIsoDate(seedDate);
  if (!parsed) {
    return seedDate;
  }
  const mondayOffset = (parsed.getDay() + 6) % 7;
  parsed.setDate(parsed.getDate() - mondayOffset);
  return toIsoDate(parsed);
}

function compactDayLabel(date: string, fallback: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return parsed.toLocaleDateString("en-US", { weekday: "short" });
}

function planTitle(session: DetailedTrainingSession | null, card: TrainSessionCard | null, generated: CompactGeneratedSession | null): string {
  if (session) {
    return recipeTitle(session);
  }
  if (card) {
    return plainWorkoutTitle(card.title);
  }
  if (generated) {
    return plainWorkoutTitle(generated.title, generated.family);
  }
  return "No player workout today";
}

function trainingAim(session: DetailedTrainingSession | null, card: TrainSessionCard | null, generated: CompactGeneratedSession | null, viewModel: TrainViewModel): string {
  if (session) {
    return firstSentence(recipeWhy(session));
  }
  if (generated?.family) {
    return firstSentence(plainGeneratedSessionFamilyWhy(generated.family));
  }
  if (card?.why) {
    return firstSentence(card.why);
  }
  return firstSentence(viewModel.todaySummary || "Keep today simple and log the boxing work you actually do.");
}

function flowRows(session: DetailedTrainingSession | null, card: TrainSessionCard | null): readonly FlowRow[] {
  if (session?.sections.length) {
    return session.sections.slice(0, 5).map((section) => ({
      label: plainSectionName(section.name),
      value: section.durationMinutes > 0 ? `${section.durationMinutes} min` : `${section.exercises.length} move${section.exercises.length === 1 ? "" : "s"}`
    }));
  }
  if (session) {
    return recipeFlowLines(session).slice(0, 5).map((line) => {
      const clean = plainTrainCopy(line).replace(/^\d+\.\s*/, "");
      const [label, value] = clean.split(/\s+-\s+/, 2);
      return { label: label ?? clean, value: value ?? "" };
    });
  }
  if (card?.prescription.length) {
    return card.prescription.slice(0, 4).map((item, index) => ({
      label: index === 0 ? "Warm-up" : index === card.prescription.length - 1 ? "Finish" : `Block ${index}`,
      value: plainTrainCopy(item)
    }));
  }
  return [
    { label: "Warm-up", value: "Start controlled" },
    { label: "Main work", value: "Keep shape first" },
    { label: "Cooldown", value: "Breathe down" }
  ];
}

function playerStatusIsInProgress(status: WorkoutPlayerStatus): boolean {
  return status === "active" || status === "paused" || status === "finishing";
}

function currentWeekDays(viewModel: TrainViewModel, asOfDate?: ISODateString | undefined): readonly TrainWeekDayVisual[] {
  const seedDate =
    asOfDate ??
    viewModel.todayGeneratedSessions[0]?.date ??
    viewModel.weeklyWorkoutCards[0]?.date ??
    viewModel.upcomingGeneratedSessions[0]?.date ??
    "";
  if (!seedDate) {
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => ({
      date: "",
      faded: false,
      hasSession: false,
      label,
      ratio: 0.08,
      subtitle: "No support session",
      title: "Open",
      tone: "muted" as const,
      value: 0,
      valueLabel: "Open"
    }));
  }
  const weekStart = startOfTrainingWeek(seedDate);
  const sessionsByDate = new Map<string, TrainViewModel["weeklyWorkoutCards"]>();
  for (const session of viewModel.weeklyWorkoutCards) {
    sessionsByDate.set(session.date, [...(sessionsByDate.get(session.date) ?? []), session]);
  }
  const todayDate = asOfDate ?? viewModel.todayGeneratedSessions[0]?.date ?? seedDate;
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const sessions = sessionsByDate.get(date) ?? [];
    const totalMinutes = sessions.reduce((total, session) => total + session.durationMinutes, 0);
    const primary = sessions[0];
    const title = primary ? `${plainWorkoutTitle(primary.title, primary.family)}${sessions.length > 1 ? ` +${sessions.length - 1}` : ""}` : "Open";
    return {
      date,
      faded: date < todayDate,
      hasSession: Boolean(primary),
      label: compactDayLabel(date, date.slice(5)),
      ratio: totalMinutes > 0 ? clamp01(totalMinutes / 120) : 0.08,
      subtitle: primary ? `${totalMinutes} min - ${sentenceCase(plainIntensityLabel(primary.intensity))}` : "No support session",
      title,
      tone: primary ? toneForIntensity(primary.intensity) : "muted",
      value: totalMinutes,
      valueLabel: primary ? `${totalMinutes} min` : "Open"
    };
  });
}

function TrainTonePill({
  icon,
  label,
  tone = "muted"
}: {
  icon?: keyof typeof Ionicons.glyphMap | undefined;
  label: string;
  tone?: VisualTone | undefined;
}) {
  const color = trainColorForTone(tone);
  return (
    <View
      accessibilityLabel={`Status: ${label}`}
      style={{
        alignItems: "center",
        alignSelf: "flex-start",
        flexDirection: "row",
        gap: 5,
        justifyContent: "center",
        maxWidth: 180,
        minHeight: 22
      }}
    >
      {icon ? <DecorativeIcon color={color} name={icon} size={15} /> : null}
      <Text numberOfLines={1} style={{ color: colors.wrap, flexShrink: 1, fontSize: 12, fontWeight: "800", lineHeight: 16 }}>
        {label}
      </Text>
    </View>
  );
}

function TrainPrimaryButton({
  children,
  disabled,
  onPress,
  tone: _tone = "purple"
}: React.PropsWithChildren<{
  disabled?: boolean | undefined;
  onPress?: (() => Promise<void> | void) | undefined;
  tone?: VisualTone | undefined;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        screenStyles.button,
        {
          backgroundColor: disabled ? trainPalette.controlFill : pressed ? trainPalette.actionFillPressed : trainPalette.actionFill,
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

function TrainQuietButton({
  children,
  disabled,
  expanded,
  onPress
}: React.PropsWithChildren<{
  disabled?: boolean | undefined;
  expanded?: boolean | undefined;
  onPress?: (() => Promise<void> | void) | undefined;
}>) {
  const accessibilityState =
    expanded === undefined && disabled === undefined
      ? undefined
      : {
          ...(expanded === undefined ? {} : { expanded }),
          ...(disabled === undefined ? {} : { disabled })
        };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        screenStyles.quietButton,
        {
          backgroundColor: disabled ? trainPalette.controlFill : pressed ? trainPalette.controlFillPressed : "transparent",
          borderColor: disabled ? trainPalette.controlLine : trainPalette.actionBorder,
          borderRadius: 5,
          boxShadow: "none",
          minHeight: 44
        }
      ]}
    >
      <Text style={{ color: disabled ? trainPalette.textMuted : trainPalette.toneBlue, fontSize: 14, fontWeight: "800", lineHeight: 18, textAlign: "center" }}>
        {children}
      </Text>
    </Pressable>
  );
}

function TrainTextButton({
  children,
  disabled,
  onPress,
  tone: _tone = "purple"
}: React.PropsWithChildren<{
  disabled?: boolean | undefined;
  onPress?: (() => Promise<void> | void) | undefined;
  tone?: VisualTone | undefined;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        alignSelf: "center",
        flexDirection: "row",
        gap: spacing.xs,
        justifyContent: "center",
        minHeight: 38,
        opacity: disabled ? 0.54 : pressed ? 0.72 : 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs
      })}
    >
      <Text style={{ color: disabled ? trainPalette.textMuted : trainPalette.toneBlue, fontSize: 15, fontWeight: "900", lineHeight: 20, textAlign: "center" }}>
        {children}
      </Text>
      <DecorativeIcon color={disabled ? trainPalette.textMuted : trainPalette.toneBlue} name="chevron-forward" size={17} />
    </Pressable>
  );
}

function TrainMiniBarChart({
  bars,
  height = 84,
  referenceLabel
}: {
  bars: readonly TrainWeekDayVisual[];
  height?: number | undefined;
  referenceLabel?: string | undefined;
}) {
  const axisLabels = ["120", "90", "60", "30"];
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ alignItems: "stretch", flexDirection: "row", gap: spacing.sm }}>
        <View style={{ alignItems: "flex-end", height, justifyContent: "space-between", width: 30 }}>
          {axisLabels.map((value, index) => (
            <Text key={`train-axis:${index}`} numberOfLines={1} style={{ color: trainPalette.textMuted, fontSize: 10, fontWeight: "800", lineHeight: 12 }}>
              {value}
            </Text>
          ))}
        </View>
        <View style={{ alignItems: "flex-end", flex: 1, flexDirection: "row", gap: spacing.sm, height }}>
          {bars.map((bar, index) => {
            const color = trainColorForTone(bar.tone);
            return (
              <View key={`train-bar:${bar.label}:${index}`} style={{ alignItems: "center", flex: 1, height: "100%", justifyContent: "flex-end", minWidth: 22 }}>
                <View
                  style={{
                    backgroundColor: !bar.hasSession || bar.faded ? "transparent" : color,
                    borderColor: !bar.hasSession || bar.faded ? trainPalette.controlLine : `${color}77`,
                    borderRadius: 3,
                    borderStyle: !bar.hasSession || bar.faded ? "dashed" : "solid",
                    borderWidth: !bar.hasSession || bar.faded ? 1 : 0,
                    height: `${Math.max(8, clamp01(bar.ratio) * 100)}%`,
                    opacity: !bar.hasSession ? 0.34 : bar.faded ? 0.48 : 0.9,
                    width: "72%"
                  }}
                />
              </View>
            );
          })}
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: spacing.sm, paddingLeft: 30 + spacing.sm }}>
        {bars.map((bar, index) => (
          <Text key={`train-bar-label:${bar.label}:${index}`} numberOfLines={1} style={{ color: trainPalette.textMuted, flex: 1, fontSize: 10, fontWeight: "800", lineHeight: 14, textAlign: "center" }}>
            {bar.label}
          </Text>
        ))}
      </View>
      {referenceLabel ? <Text style={{ color: trainPalette.textMuted, fontSize: 11, fontWeight: "800", lineHeight: 15, textAlign: "right" }}>{referenceLabel}</Text> : null}
    </View>
  );
}

function WorkoutInProgressCard({
  onDiscard,
  onResume,
  sessionTitle,
  status
}: {
  onDiscard: () => void;
  onResume: () => void;
  sessionTitle: string;
  status: WorkoutPlayerStatus;
}) {
  return (
    <TrainEditorialSection testID="train-workout-in-progress-card" title="Workout in progress">
      <Text style={trainTextStyles.body}>{sessionTitle}</Text>
      <Text style={trainTextStyles.subtle}>Status: {status.replace(/_/g, " ")}.</Text>
      <Text style={trainTextStyles.subtle}>Progress is saved on this device. Reopen this workout to resume. Discard removes saved progress.</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        <View style={{ flexBasis: 160, flexGrow: 1 }}>
          <TrainPrimaryButton onPress={onResume}>Resume workout</TrainPrimaryButton>
        </View>
        <View style={{ flexBasis: 160, flexGrow: 1 }}>
          <TrainQuietButton onPress={onDiscard}>Discard progress</TrainQuietButton>
        </View>
      </View>
    </TrainEditorialSection>
  );
}

function WorkoutLooseEndsCard({
  adjustmentActions,
  asOfDate,
  busy,
  completionActions,
  detailsById,
  looseEnds,
  onActionFeedback,
  onLeaveUnknown
}: {
  adjustmentActions?: Pick<TrainingPlanAdjustmentActions, "moveGeneratedSession"> | undefined;
  asOfDate?: ISODateString | undefined;
  busy: boolean;
  completionActions?: WorkoutCompletionActions | undefined;
  detailsById: ReadonlyMap<string, DetailedTrainingSession>;
  looseEnds: TrainViewModel["workoutLooseEnds"];
  onActionFeedback?: ((message: string | null) => void) | undefined;
  onLeaveUnknown: (sessionId: string) => void;
}) {
  const [pendingAction, setPendingAction] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<{ message: string; tone: VisualTone } | null>(null);
  const looseEnd = looseEnds[0] ?? null;
  React.useEffect(() => {
    setFeedback(null);
    setPendingAction(null);
  }, [looseEnd?.generatedSessionId]);

  if (looseEnds.length === 0) {
    return null;
  }
  if (!looseEnd) {
    return null;
  }
  const detail = looseEnd.detail ?? detailsById.get(looseEnd.generatedSessionId) ?? null;
  const canResolve = Boolean(detail && completionActions);
  const canMove = Boolean(adjustmentActions && asOfDate);
  const actionBusy = busy || pendingAction !== null;
  const publishFeedback = (message: string, tone: VisualTone) => {
    setFeedback({ message, tone });
    onActionFeedback?.(message);
  };
  const runAction = async (actionName: string, action: () => Promise<string>): Promise<void> => {
    if (actionBusy) {
      return;
    }
    setPendingAction(actionName);
    setFeedback(null);
    onActionFeedback?.(null);
    try {
      publishFeedback(await action(), "green");
    } catch (error) {
      publishFeedback(error instanceof Error ? error.message : "That past workout update could not be saved.", "red");
    } finally {
      setPendingAction(null);
    }
  };
  return (
    <TrainEditorialSection testID="train-loose-end-card" title="Past workout to resolve">
      <View style={{ gap: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={{ color: trainPalette.textPrimary, fontSize: 18, fontWeight: "900", lineHeight: 23 }}>{looseEnd.title}</Text>
          <Text style={trainTextStyles.body}>This support workout was planned for {looseEnd.originalDate}. Resolve that planned day, move it to today, or leave it unknown.</Text>
          <Text style={trainTextStyles.subtle}>{looseEnd.sessionTypeLabel} - {looseEnd.duration} - {sentenceCase(plainIntensityLabel(looseEnd.intensity))}</Text>
          <Text style={trainTextStyles.subtle}>Today's workout and future previews stay separate below.</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <View style={{ flexBasis: 132, flexGrow: 1 }}>
            <TrainPrimaryButton
              disabled={actionBusy || !canResolve}
              onPress={() => runAction("did", async () => {
                if (!detail || !completionActions) {
                  throw new Error("Workout details are unavailable, so this cannot be marked complete here.");
                }
                await completionActions.complete(detail, {
                  plannedDate: looseEnd.originalDate,
                  performedDate: looseEnd.originalDate,
                  painNotes: [],
                  notes: "Completed from loose-end resolution.",
                  exerciseResults: []
                });
                return "Marked done for the planned day. The past workout card will refresh after the engine reloads.";
              })}
            >
              {pendingAction === "did" ? "Saving..." : "Did it"}
            </TrainPrimaryButton>
          </View>
          <View style={{ flexBasis: 132, flexGrow: 1 }}>
            <TrainQuietButton
              disabled={actionBusy || !canResolve}
              onPress={() => runAction("missed", async () => {
                if (!detail || !completionActions || busy) {
                  throw new Error("Workout details are unavailable, so this cannot be marked missed here.");
                }
                await completionActions.skip(detail, {
                  plannedDate: looseEnd.originalDate,
                  performedDate: looseEnd.originalDate,
                  notes: "Missed from loose-end resolution."
                });
                return "Marked missed for the planned day. The past workout card will refresh after the engine reloads.";
              })}
            >
              {pendingAction === "missed" ? "Saving..." : "Missed it"}
            </TrainQuietButton>
          </View>
          <View style={{ flexBasis: 132, flexGrow: 1 }}>
            <TrainQuietButton
              disabled={actionBusy || !canMove}
              onPress={() => runAction("move", async () => {
                if (!adjustmentActions || !asOfDate || busy) {
                  throw new Error("Move is available after the plan and date are loaded.");
                }
                const result = await adjustmentActions.moveGeneratedSession(looseEnd.generatedSessionId, looseEnd.originalDate, asOfDate);
                if (result.status === "rejected") {
                  throw new Error(result.explanation);
                }
                return result.status === "needs_review"
                  ? result.explanation || "Move needs review before today's plan changes."
                  : "Move requested. Today's plan will refresh with the latest engine decision.";
              })}
            >
              {pendingAction === "move" ? "Moving..." : "Do it today"}
            </TrainQuietButton>
          </View>
          <View style={{ flexBasis: 132, flexGrow: 1 }}>
            <TrainQuietButton
              disabled={actionBusy}
              onPress={() => {
                if (actionBusy) {
                  return;
                }
                const message = `${looseEnd.title} left unknown. Missing data stays unknown, not completed.`;
                publishFeedback(message, "orange");
                onLeaveUnknown(looseEnd.generatedSessionId);
              }}
            >
              Not sure
            </TrainQuietButton>
          </View>
        </View>
        {feedback ? <Text style={[trainTextStyles.subtle, { color: trainColorForTone(feedback.tone) }]}>{feedback.message}</Text> : null}
        {!canResolve ? <Text style={trainTextStyles.subtle}>Exercise details are unavailable for quick resolution. Move it to today or leave it unknown.</Text> : null}
        {!canMove ? <Text style={trainTextStyles.subtle}>Move is available after the plan and date are loaded.</Text> : null}
        {looseEnds.length > 1 ? <Text style={trainTextStyles.subtle}>{looseEnds.length - 1} more past workout{looseEnds.length === 2 ? "" : "s"} after this.</Text> : null}
      </View>
    </TrainEditorialSection>
  );
}

function ReadinessGateCard({
  acknowledged,
  gate,
  onLogReadiness,
  onStartControlled
}: {
  acknowledged: boolean;
  gate: TrainViewModel["preSessionReadinessGate"];
  onLogReadiness?: (() => void) | undefined;
  onStartControlled: () => void;
}) {
  if (gate.status !== "prompt" || acknowledged) {
    return null;
  }
  return (
    <TrainEditorialSection testID="train-readiness-gate-card" title={gate.title}>
      <View style={{ gap: spacing.md }}>
        <Text style={trainTextStyles.body}>{gate.body}</Text>
        <Text style={trainTextStyles.subtle}>{gate.guidance}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <View style={{ flexBasis: 150, flexGrow: 1 }}>
            <TrainPrimaryButton onPress={onLogReadiness} tone="blue">Log readiness</TrainPrimaryButton>
          </View>
          <View style={{ flexBasis: 150, flexGrow: 1 }}>
            <TrainQuietButton onPress={onStartControlled}>Start controlled</TrainQuietButton>
          </View>
        </View>
      </View>
    </TrainEditorialSection>
  );
}

function TrainingScheduleDebugCard({ viewModel }: { viewModel: TrainViewModel }) {
  const isDev = (globalThis as { __DEV__?: boolean }).__DEV__ === true;
  const [open, setOpen] = React.useState(false);
  if (!isDev) {
    return null;
  }
  const debug = viewModel.scheduleDebug;
  const ledgerSummary = (ledger: TrainViewModel["scheduleDebug"]["plannedLoadLedger"] | TrainViewModel["scheduleDebug"]["actualLoadLedger"]) =>
    `hardDays ${ledger.hardDayCount}/${ledger.hardDayCap}, strengthSets ${ledger.generatedStrengthSets}, roadworkMinutes ${ledger.roadworkMinutes}, intervals ${ledger.intervalCount}, recovery ${ledger.recoverySessions}`;
  const rows = [
    `asOfDate: ${debug.asOfDate}`,
    `planStartDate: ${debug.planStartDate}`,
    `weekEndDate: ${debug.weekEndDate}`,
    `planRevisionId: ${debug.planRevisionId}`,
    `targetGeneratedSupportCount: ${debug.targetGeneratedSupportCount}`,
    `originalTargetGeneratedSupportCount: ${debug.originalTargetGeneratedSupportCount}`,
    `pastGeneratedSupportCount: ${debug.pastGeneratedSupportCount}`,
    `pastPlacedGeneratedSupportCount: ${debug.pastPlacedGeneratedSupportCount}`,
    `completedPastGeneratedSupportCount: ${debug.completedPastGeneratedSupportCount}`,
    `skippedPastGeneratedSupportCount: ${debug.skippedPastGeneratedSupportCount}`,
    `unresolvedPastGeneratedSupportCount: ${debug.unresolvedPastGeneratedSupportCount}`,
    `futurePersistedGeneratedSupportCount: ${debug.futurePersistedGeneratedSupportCount}`,
    `remainingGeneratedSupportTarget: ${debug.remainingGeneratedSupportTarget}`,
    `remainingUnfilledPrescriptionSlots: ${debug.remainingUnfilledPrescriptionSlots}`,
    `generatedSessionDates: ${debug.generatedSessionDates.join(", ") || "none"}`,
    `generatedSessionResolutions: ${debug.generatedSessionResolutions.join("; ") || "none"}`,
    `persistedGeneratedSessionsConsidered: ${debug.persistedGeneratedSessionsConsidered.join("; ") || "none"}`,
    `persistedGeneratedSessionsIgnored: ${debug.persistedGeneratedSessionsIgnored.join("; ") || "none"}`,
    `plannedLoadLedger: ${ledgerSummary(debug.plannedLoadLedger)}`,
    `actualLoadLedger: ${ledgerSummary(debug.actualLoadLedger)}`,
    `acceptedPreviewStatus: ${debug.acceptedPreviewStatus ?? "none"}`,
    `weekSummaryLifecycle: ${debug.weekSummaryLifecycle}`,
    `selectedProgressionDecisionRevision: ${debug.selectedProgressionDecisionRevision ?? "none"}`,
    `autoRollForwardPrevented: ${debug.autoRollForwardPrevented ? "true" : "false"}`,
    `scheduleRevisionChanged: ${debug.scheduleRevisionChanged ? "true" : "false"}`,
    `scheduleChangeReasons: ${debug.scheduleChangeReasons.join("; ") || "none"}`,
    `looseEndSessionIds: ${debug.looseEndSessionIds.join(", ") || "none"}`
  ];
  return (
    <TrainEditorialSection testID="train-schedule-debug-card" title="Training Schedule Debug">
      <View style={{ gap: spacing.sm }}>
        <TrainQuietButton expanded={open} onPress={() => setOpen((value) => !value)}>{open ? "Hide debug" : "Show debug"}</TrainQuietButton>
        {open ? rows.map((row) => <Text key={`train-debug:${row}`} style={trainTextStyles.subtle}>{row}</Text>) : null}
      </View>
    </TrainEditorialSection>
  );
}

function TodayTrainingPlanCard({
  busy,
  card,
  generated,
  onOpenTrainingLog,
  onStart,
  onViewDetails,
  previewOnlyReason,
  session,
  startBlockedReason,
  viewModel
}: {
  busy: boolean;
  card: TrainSessionCard | null;
  generated: CompactGeneratedSession | null;
  onOpenTrainingLog: () => void;
  onStart: (() => void) | undefined;
  onViewDetails: (() => void) | undefined;
  previewOnlyReason: string | undefined;
  session: DetailedTrainingSession | null;
  startBlockedReason: string | undefined;
  viewModel: TrainViewModel;
}) {
  const intensity = session?.intensity ?? card?.intensity ?? generated?.intensity ?? "moderate";
  const durationMinutes = session?.durationMinutes ?? card?.durationMinutes ?? generated?.durationMinutes ?? 0;
  const primaryTone = toneForIntensity(intensity);
  const hasSessionSummary = Boolean(session || generated || card);
  const primaryAction =
    startBlockedReason
      ? { label: "View details", onPress: onViewDetails, tone: "orange" as const }
      : previewOnlyReason
          ? { label: "View session", onPress: onViewDetails, tone: primaryTone }
          : session && onStart
            ? { label: "Start session", onPress: onStart, tone: primaryTone }
            : session
              ? { label: "View details", onPress: onViewDetails, tone: primaryTone }
            : hasSessionSummary
              ? { label: "View details", onPress: onViewDetails, tone: primaryTone }
              : { label: "Log other training", onPress: onOpenTrainingLog, tone: "blue" as const };
  const disabled = busy || !primaryAction.onPress;
  const showDetailsAction = Boolean(onViewDetails && primaryAction.label !== "View details");
  const showTrainingLogAction = !session && hasSessionSummary;
  const dayNote = viewModel.todayRole.status === "support_day" ? null : firstSentence(viewModel.todayRole.summary);
  return (
    <View
      style={{
        borderBottomColor: trainPalette.cardLine,
        borderBottomWidth: 1,
        gap: spacing.lg,
        paddingBottom: spacing.xl,
        paddingTop: spacing.xl
      }}
      testID="train-today-plan-card"
    >
      <View style={{ gap: spacing.md }}>
        <View style={{ gap: spacing.sm }}>
          {hasSessionSummary ? <Text style={{ color: trainPalette.toneBlue, fontSize: 12, fontWeight: "900", letterSpacing: 0.7, lineHeight: 16, textTransform: "uppercase" }}>01 / Today&apos;s session</Text> : null}
          <Text adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={2} style={{ color: trainPalette.textPrimary, fontSize: 32, fontWeight: "900", letterSpacing: -0.6, lineHeight: 36 }}>
            {planTitle(session, card, generated)}
          </Text>
          <Text style={{ color: trainPalette.textBody, fontSize: 16, fontWeight: "500", lineHeight: 23 }}>
            {trainingAim(session, card, generated, viewModel)}
          </Text>
          {dayNote ? <Text style={trainTextStyles.subtle}>{dayNote}</Text> : null}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <TrainTonePill icon="time-outline" label={durationMinutes > 0 ? `${durationMinutes} min` : "Duration unknown"} />
          <TrainTonePill icon="stats-chart-outline" label={sentenceCase(plainIntensityLabel(intensity))} tone={primaryTone} />
          <TrainTonePill icon="hand-left-outline" label="Non-contact" tone="blue" />
        </View>
        <Pressable
          accessibilityLabel={primaryAction.label}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={primaryAction.onPress}
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
          <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "center" }}>
            <DecorativeIcon color={disabled ? trainPalette.textMuted : colors.cornerBlack} name={primaryAction.label.toLowerCase().includes("start") ? "play-outline" : "chevron-forward"} size={19} />
            <Text style={{ color: disabled ? trainPalette.textMuted : colors.cornerBlack, fontSize: 14, fontWeight: "900", lineHeight: 18, textAlign: "center" }}>{primaryAction.label}</Text>
          </View>
        </Pressable>
        {showDetailsAction || showTrainingLogAction ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {showDetailsAction ? <TrainTextButton onPress={onViewDetails}>View details</TrainTextButton> : null}
            {showTrainingLogAction ? (
              <View style={{ flexBasis: 150, flexGrow: 1 }}>
                <TrainQuietButton onPress={onOpenTrainingLog}>Log other training</TrainQuietButton>
              </View>
            ) : null}
          </View>
        ) : null}
        {startBlockedReason ? <Text style={[trainTextStyles.subtle, { color: trainColorForTone("orange") }]}>{startBlockedReason}</Text> : null}
        {previewOnlyReason ? <Text style={trainTextStyles.subtle}>{previewOnlyReason}</Text> : null}
        {!session && !generated && !card ? <Text style={trainTextStyles.subtle}>Log boxing class, roadwork, lifting, or anything you complete outside the player.</Text> : null}
      </View>
    </View>
  );
}

function QuickStatsRow({
  card,
  generated,
  session,
  viewModel
}: {
  card: TrainSessionCard | null;
  generated: CompactGeneratedSession | null;
  session: DetailedTrainingSession | null;
  viewModel: TrainViewModel;
}) {
  const intensity = session?.intensity ?? card?.intensity ?? generated?.intensity ?? "moderate";
  const durationMinutes = session?.durationMinutes ?? card?.durationMinutes ?? generated?.durationMinutes ?? 0;
  const fuelDemand = session?.fuelDemand ?? card?.fuelDemand ?? generated?.fuelDemand ?? "moderate";
  const readiness = trainReadinessValue(session, viewModel);
  const items = [
    { icon: "time-outline" as const, label: "Duration", tone: "muted" as const, value: durationMinutes > 0 ? `${durationMinutes} min` : "Unknown" },
    { icon: "stats-chart-outline" as const, label: "Intensity", tone: toneForIntensity(intensity), value: sentenceCase(plainIntensityLabel(intensity)) },
    { icon: "flame-outline" as const, label: "Fuel", tone: fuelDemand === "high" || intensity === "hard" ? "orange" as const : "gold" as const, value: trainFuelStatLabel(fuelDemand, intensity) },
    { icon: "shield-checkmark-outline" as const, label: "Readiness", tone: trainReadinessTone(readiness), value: readiness }
  ];
  return (
    <TrainEditorialSection testID="train-compact-stats" title="Session signals">
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {items.map((item) => (
          <View
            accessibilityLabel={`${item.label}: ${item.value}`}
            key={`train-stat:${item.label}`}
            style={{ backgroundColor: "transparent", borderColor: trainPalette.cardLine, borderRadius: 4, borderWidth: 1, flexBasis: 132, flexGrow: 1, gap: spacing.xs, minHeight: 74, padding: spacing.md }}
          >
            <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.xs }}>
              <DecorativeIcon color={trainPalette.toneBlue} name={item.icon} size={15} />
              <Text numberOfLines={1} style={{ color: trainPalette.textMuted, flex: 1, fontSize: 11, fontWeight: "800", lineHeight: 15 }}>{item.label}</Text>
            </View>
            <Text numberOfLines={1} style={{ color: item.tone === "muted" ? trainPalette.textPrimary : trainColorForTone(item.tone), fontSize: 18, fontWeight: "900", lineHeight: 23 }}>{item.value}</Text>
          </View>
        ))}
      </View>
    </TrainEditorialSection>
  );
}

function WorkoutFlowCard({ card, session }: { card: TrainSessionCard | null; session: DetailedTrainingSession | null }) {
  const rows = flowRows(session, card);
  return (
    <TrainEditorialSection testID="train-workout-flow-card" title="Session Plan">
      <View style={{ borderTopColor: trainPalette.cardLine, borderTopWidth: 1 }}>
        {rows.map((row, index) => (
          <View key={`flow:${index}:${row.label}`} style={{ alignItems: "center", borderBottomColor: trainPalette.cardLine, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 52, paddingVertical: spacing.sm }}>
            <Text style={{ color: trainPalette.toneBlue, fontSize: 11, fontWeight: "900", lineHeight: 15, width: 24 }}>{`${index + 1}`.padStart(2, "0")}</Text>
            <Text style={{ color: trainPalette.textPrimary, flex: 1, fontSize: 14, fontWeight: "800", lineHeight: 19 }}>{row.label}</Text>
            <Text numberOfLines={1} style={{ color: trainPalette.textMuted, fontSize: 12, fontWeight: "700", lineHeight: 16, maxWidth: "42%", textAlign: "right" }}>{row.value}</Text>
          </View>
        ))}
      </View>
    </TrainEditorialSection>
  );
}

function BeforeYouStartCard({
  card,
  session,
  viewModel
}: {
  card: TrainSessionCard | null;
  session: DetailedTrainingSession | null;
  viewModel: TrainViewModel;
}) {
  return (
    <TrainEditorialSection testID="train-before-start-card" title="Before You Start">
      <View style={{ gap: spacing.sm }}>
        {trainPrepRows(session, card, viewModel).map((row) => (
          <View
            key={`prep:${row.label}`}
            style={{
              backgroundColor: "transparent",
              borderBottomColor: trainPalette.cardLine,
              borderBottomWidth: 1,
              gap: spacing.xs,
              paddingVertical: spacing.md
            }}
          >
            <Text style={{ color: trainPalette.toneBlue, fontSize: 11, fontWeight: "900", letterSpacing: 0.5, lineHeight: 15, textTransform: "uppercase" }}>{row.label}</Text>
            <Text style={{ color: trainPalette.textPrimary, fontSize: 14, fontWeight: "800", lineHeight: 19 }}>{row.value}</Text>
            {row.detail ? <Text style={trainTextStyles.subtle}>{row.detail}</Text> : null}
          </View>
        ))}
      </View>
    </TrainEditorialSection>
  );
}

function ManualTrainingLoggerSection({ busy, openRequestKey, quickLogs }: { busy: boolean; openRequestKey: number; quickLogs: QuickLogActions }) {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    if (openRequestKey > 0) {
      setOpen(true);
    }
  }, [openRequestKey]);
  return (
    <View style={{ gap: spacing.md }} testID="train-manual-logger-section">
      <TrainEditorialSection title="Log Other Training">
        <Text style={trainTextStyles.body}>Add boxing class, roadwork, lifting, or coach-assigned work outside the player.</Text>
        <Text style={trainTextStyles.subtle}>Duration and RPE update training load. Rounds and notes help protect future boxing volume, pain decisions, and schedule conflicts.</Text>
        <TrainQuietButton expanded={open} onPress={() => setOpen((value) => !value)}>{open ? "Hide training log" : "Show training log"}</TrainQuietButton>
      </TrainEditorialSection>
      {open ? <ProtectedWorkoutLogCard actions={quickLogs} busy={busy} surface="today" /> : null}
    </View>
  );
}

function WeekContextCard({ asOfDate, viewModel }: { asOfDate?: ISODateString | undefined; viewModel: TrainViewModel }) {
  const weekDays = currentWeekDays(viewModel, asOfDate);
  return (
    <TrainEditorialSection testID="train-week-context" title="This Week">
      <Text style={trainTextStyles.body}>Theme: {plainTrainCopy(viewModel.supportGenerationSummary.weekDevelopmentTheme || "keep boxing quality repeatable")}</Text>
      <TrainMiniBarChart bars={weekDays} height={122} referenceLabel="7-day support view" />
      <View style={{ gap: spacing.xs }}>
        {weekDays.map((item) => (
          <View key={`train-week-session:${item.date}:${item.label}`} style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
            <Text style={{ color: trainColorForTone(item.tone), fontSize: 11, fontWeight: "900", lineHeight: 15, width: 34 }}>{item.label}</Text>
            <Text numberOfLines={1} style={{ color: item.hasSession ? trainPalette.textPrimary : trainPalette.textMuted, flex: 1, fontSize: 12, fontWeight: item.hasSession ? "800" : "700", lineHeight: 16 }}>
              {item.title}
            </Text>
            <Text numberOfLines={1} style={{ color: trainPalette.textMuted, fontSize: 11, fontWeight: "700", lineHeight: 15 }}>{item.subtitle}</Text>
          </View>
        ))}
      </View>
    </TrainEditorialSection>
  );
}

function CycleContextCard({ viewModel }: { viewModel: TrainViewModel }) {
  if (viewModel.cycleTrainingDecision.status === "none") {
    return null;
  }
  return (
    <TrainEditorialSection testID="train-cycle-context-card" title="Cycle context">
      <Text style={trainTextStyles.body}>{plainTrainCopy(viewModel.cycleTrainingDecision.summary)}</Text>
      <Text style={trainTextStyles.subtle}>{plainTrainCopy(viewModel.cycleTrainingDecision.action)}</Text>
    </TrainEditorialSection>
  );
}

function CollapsibleTrainDetails({
  busy,
  card,
  completionActions,
  completionMessage,
  detailsOpen,
  generated,
  onOpenFuelAfterWorkout,
  onToggleDetails,
  planOpenRequestKey,
  previewOnlyReason,
  primarySessionBlockedReason,
  quickLogOpenRequestKey,
  quickLogs,
  session,
  trainingLogOpenRequestKey,
  viewModel
}: {
  busy: boolean;
  card: TrainSessionCard | null;
  completionActions?: WorkoutCompletionActions | undefined;
  completionMessage?: string | null | undefined;
  detailsOpen: boolean;
  generated: CompactGeneratedSession | null;
  onOpenFuelAfterWorkout?: (() => void) | undefined;
  onToggleDetails: () => void;
  planOpenRequestKey: number;
  previewOnlyReason: string | undefined;
  primarySessionBlockedReason: string | undefined;
  quickLogOpenRequestKey: number;
  quickLogs: QuickLogActions;
  session: DetailedTrainingSession | null;
  trainingLogOpenRequestKey: number;
  viewModel: TrainViewModel;
}) {
  const hasWorkoutSummary = Boolean(viewModel.sessionCards.length > 0 || viewModel.todayGeneratedSessions.length > 0 || viewModel.nextGeneratedSession || generated);
  if (!detailsOpen) {
    return null;
  }
  return (
    <View style={{ gap: 0 }} testID="train-collapsible-details">
      <View style={{ alignItems: "flex-start" }}>
        <TrainQuietButton expanded={detailsOpen} onPress={onToggleDetails}>Hide details</TrainQuietButton>
      </View>
      {detailsOpen ? (
        <>
          <BeforeYouStartCard card={card} session={session} viewModel={viewModel} />
          {session ? (
            <View testID="train-workout-section">
              <WorkoutDetailPanel
                busy={busy}
                completionActions={completionActions}
                completionMessage={completionMessage}
                onOpenFuel={onOpenFuelAfterWorkout}
                planOpenRequestKey={planOpenRequestKey}
                previewOnlyReason={previewOnlyReason}
                quickLogOpenRequestKey={quickLogOpenRequestKey}
                startWorkoutDisabledReason={primarySessionBlockedReason}
                session={session}
              />
            </View>
          ) : hasWorkoutSummary ? (
            <View testID="train-workout-section">
              <TrainEditorialSection testID="train-workout-summary-card" title="Exercise Details">
                <Text style={trainTextStyles.body}>The player details are not available for this session. Use Log Other Training if you complete it outside the player.</Text>
              </TrainEditorialSection>
            </View>
          ) : (
            <EmptyState title="No player workout today" message={plainTrainCopy(viewModel.todaySummary)} />
          )}
          {!trainCycleDecisionIsDefaultVisible(viewModel) ? <CycleContextCard viewModel={viewModel} /> : null}
          <ManualTrainingLoggerSection busy={busy} openRequestKey={trainingLogOpenRequestKey} quickLogs={quickLogs} />
          <TrainingScheduleDebugCard viewModel={viewModel} />
        </>
      ) : null}
    </View>
  );
}

export function TrainScreen({
  activeWorkout,
  adjustmentActions,
  asOfDate,
  busy,
  completionActions,
  completionMessage,
  generationStatus = "idle",
  initialSection,
  onDiscardWorkout,
  onInitialSectionApplied,
  onOpenFuelAfterWorkout,
  onOpenReadinessLog,
  onResumeWorkout,
  onStartWorkout,
  quickLogs,
  recentLogs: _recentLogs,
  viewModel
}: TrainScreenProps) {
  const insets = useSafeAreaInsets();
  const [pendingStartSessionId, setPendingStartSessionId] = React.useState<string | null>(null);
  const [dismissedLooseEndIds, setDismissedLooseEndIds] = React.useState<ReadonlySet<string>>(new Set());
  const [looseEndFeedbackMessage, setLooseEndFeedbackMessage] = React.useState<string | null>(null);
  const [controlledStartSessionIds, setControlledStartSessionIds] = React.useState<ReadonlySet<string>>(new Set());
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [planOpenRequestKey, setPlanOpenRequestKey] = React.useState(0);
  const [trainingLogOpenRequestKey, setTrainingLogOpenRequestKey] = React.useState(0);
  const quickLogOpenRequestKey = 0;

  React.useEffect(() => {
    if (initialSection) {
      if (initialSection === "workout") {
        setDetailsOpen(true);
        setPlanOpenRequestKey((value) => value + 1);
      }
      onInitialSectionApplied?.();
    }
  }, [initialSection, onInitialSectionApplied]);

  const detailedSessions = viewModel.detailedTodaySessions
    .map((session) => session.detail)
    .filter((session): session is DetailedTrainingSession => session !== null);
  const detailedWeeklySessions = viewModel.detailedWeeklySessions
    .map((session) => session.detail)
    .filter((session): session is DetailedTrainingSession => session !== null);
  const detailsById = React.useMemo(
    () => new Map([...detailedSessions, ...detailedWeeklySessions].map((session) => [session.generatedSessionId, session] as const)),
    [detailedSessions, detailedWeeklySessions]
  );
  const visibleLooseEnds = viewModel.workoutLooseEnds.filter((looseEnd) => !dismissedLooseEndIds.has(looseEnd.generatedSessionId));
  const previewOnlyWeeklySession = detailedSessions.length === 0
    ? viewModel.detailedWeeklySessions.find((session) => session.detail !== null)
    : null;
  const primarySession = detailedSessions[0] ?? previewOnlyWeeklySession?.detail ?? null;
  const primaryCard = viewModel.sessionCards[0] ?? null;
  const generatedSummary = viewModel.todayGeneratedSessions[0] ?? viewModel.nextGeneratedSession;
  const pendingStartSession = detailedSessions.find((session) => session.generatedSessionId === pendingStartSessionId) ?? null;
  const playerInProgress = Boolean(activeWorkout && playerStatusIsInProgress(activeWorkout.status));
  const previewOnlyReason = previewOnlyWeeklySession ? `Future preview: scheduled for ${previewOnlyWeeklySession.date}. Keep it on that date unless you move it from Plan.` : undefined;
  const primarySessionBlockedReason = primarySession && !previewOnlyWeeklySession ? trainStartWorkoutBlockedReason(primarySession) : undefined;
  const readinessGateAcknowledged = Boolean(viewModel.preSessionReadinessGate.sessionId && controlledStartSessionIds.has(viewModel.preSessionReadinessGate.sessionId));

  const startWorkout = (sessionDetail: DetailedTrainingSession) => {
    const blockedReason = trainStartWorkoutBlockedReason(sessionDetail);
    if (blockedReason) {
      return;
    }
    if (playerInProgress && activeWorkout && activeWorkout.sessionId !== sessionDetail.generatedSessionId) {
      setPendingStartSessionId(sessionDetail.generatedSessionId);
      return;
    }
    setPendingStartSessionId(null);
    onStartWorkout?.(sessionDetail);
  };

  const startCurrentSession =
    primarySession && !previewOnlyWeeklySession
      ? () => startWorkout(primarySession)
      : undefined;
  const openPrimaryDetails = primarySession || primaryCard || generatedSummary
    ? () => {
        setDetailsOpen(true);
        setPlanOpenRequestKey((value) => value + 1);
      }
    : undefined;
  const openTrainingLog = () => {
    setDetailsOpen(true);
    setTrainingLogOpenRequestKey((value) => value + 1);
  };
  const criticalRisk = trainCriticalTrainingRisk(viewModel);
  const showSafety = Boolean(primarySessionBlockedReason || criticalRisk);
  return (
    <>
    <StatusBar backgroundColor="transparent" style="dark" translucent />
    <LuminousScreen accent="blue" contentGap={0} immersiveHeader testID="train-screen">
      <ScreenHeader {...tabHeroHeaders.train} immersive topInset={insets.top} />
      {showSafety ? (
        <RiskBanner
          message={primarySessionBlockedReason ?? firstSentence(criticalRisk ?? "Use today's recovery-focused guidance.")}
          title="Before you train"
          tone="critical"
        >
          <View style={{ gap: spacing.xs }}>
            <Text style={trainTextStyles.body}>Stop if symptoms return.</Text>
            {viewModel.riskSummary.slice(0, 2).map((risk, index) => <Text key={`train-risk:${index}`} style={trainTextStyles.body}>{firstSentence(risk)}</Text>)}
          </View>
        </RiskBanner>
      ) : null}
      <WorkoutLooseEndsCard
        adjustmentActions={adjustmentActions}
        asOfDate={asOfDate}
        busy={busy}
        completionActions={completionActions}
        detailsById={detailsById}
        looseEnds={visibleLooseEnds}
        onActionFeedback={setLooseEndFeedbackMessage}
        onLeaveUnknown={(sessionId) => setDismissedLooseEndIds((current) => new Set([...current, sessionId]))}
      />
      {looseEndFeedbackMessage && visibleLooseEnds.length === 0 ? <Text testID="train-loose-end-feedback" style={[trainTextStyles.subtle, { color: trainColorForTone("orange") }]}>{looseEndFeedbackMessage}</Text> : null}
      <ReadinessGateCard
        acknowledged={readinessGateAcknowledged}
        gate={viewModel.preSessionReadinessGate}
        onLogReadiness={onOpenReadinessLog}
        onStartControlled={() => {
          if (viewModel.preSessionReadinessGate.sessionId) {
            setControlledStartSessionIds((current) => new Set([...current, viewModel.preSessionReadinessGate.sessionId!]));
          }
        }}
      />
      {playerInProgress && activeWorkout ? (
        <WorkoutInProgressCard
          onDiscard={() => {
            setPendingStartSessionId(null);
            onDiscardWorkout?.();
          }}
          onResume={() => onResumeWorkout?.()}
          sessionTitle={activeWorkout.title}
          status={activeWorkout.status}
        />
      ) : null}
      <TodayTrainingPlanCard
        busy={busy}
        card={primaryCard}
        generated={generatedSummary}
        onOpenTrainingLog={openTrainingLog}
        onStart={startCurrentSession}
        onViewDetails={openPrimaryDetails}
        previewOnlyReason={previewOnlyReason}
        session={primarySession}
        startBlockedReason={primarySessionBlockedReason}
        viewModel={viewModel}
      />
      <EngineGeneratingCard status={generationStatus === "generating_workout" ? generationStatus : "idle"} />
      <WorkoutFlowCard card={primaryCard} session={primarySession} />
      <QuickStatsRow card={primaryCard} generated={generatedSummary} session={primarySession} viewModel={viewModel} />
      {pendingStartSession && activeWorkout ? (
        <TrainEditorialSection>
          <View style={{ gap: spacing.sm }} testID="train-start-conflict-card">
            <Text style={trainTextStyles.sectionTitle}>Workout in progress</Text>
            <Text style={trainTextStyles.body}>Resume {activeWorkout.title} or discard it before starting {pendingStartSession.title}.</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              <View style={{ flexBasis: 160, flexGrow: 1 }}>
                <TrainPrimaryButton onPress={onResumeWorkout}>Resume workout</TrainPrimaryButton>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setPendingStartSessionId(null);
                  onDiscardWorkout?.();
                  onStartWorkout?.(pendingStartSession);
                }}
                style={({ pressed }) => [
                  screenStyles.quietButton,
                  {
                    backgroundColor: pressed ? trainPalette.controlFillPressed : trainPalette.controlFill,
                    borderColor: trainPalette.controlLine
                  }
                ]}
              >
                <Text style={{ color: trainPalette.textBody, fontSize: 15, fontWeight: "700", lineHeight: 20, textAlign: "center" }}>Discard and start</Text>
              </Pressable>
            </View>
          </View>
        </TrainEditorialSection>
      ) : null}
      {trainCycleDecisionIsDefaultVisible(viewModel) ? <CycleContextCard viewModel={viewModel} /> : null}
      <CollapsibleTrainDetails
        busy={busy}
        card={primaryCard}
        completionActions={completionActions}
        completionMessage={completionMessage}
        detailsOpen={detailsOpen}
        generated={generatedSummary}
        onOpenFuelAfterWorkout={onOpenFuelAfterWorkout}
        onToggleDetails={() => setDetailsOpen((value) => !value)}
        planOpenRequestKey={planOpenRequestKey}
        previewOnlyReason={previewOnlyReason}
        primarySessionBlockedReason={primarySessionBlockedReason}
        quickLogOpenRequestKey={quickLogOpenRequestKey}
        quickLogs={quickLogs}
        session={primarySession}
        trainingLogOpenRequestKey={trainingLogOpenRequestKey}
        viewModel={viewModel}
      />
      {completionMessage ? <Text style={[trainTextStyles.subtle, { color: trainColorForTone("orange") }]}>{completionMessage}</Text> : null}
      <WeekContextCard asOfDate={asOfDate} viewModel={viewModel} />
    </LuminousScreen>
    </>
  );
}
