import React from "react";
import { Pressable, Text, View } from "react-native";
import type { DetailedTrainingSession, ISODateString, RecentLogsViewModel, TrainViewModel } from "../../engine/core/types";
import { EngineGeneratingCard, type EngineGenerationStatus } from "../components/EngineGeneratingCard";
import { EngineCard } from "../../design/components/EngineCard";
import { EmptyState } from "../../design/components/EmptyState";
import { LuminousScreen, ScreenHeader } from "../../design/components/LuminousScreen";
import { DashboardCard } from "../../design/components/PerformanceVisuals";
import { RiskBanner } from "../../design/components/RiskBanner";
import { glassStyles } from "../../design/glass";
import { colors, radii, spacing } from "../../design/theme";
import type { BarVisual, VisualTone } from "../../engine/presentation/dashboardVisualData";
import { clamp01 } from "../../engine/presentation/dashboardVisualData";
import type { QuickLogActions } from "../../hooks/useQuickLogs";
import type { TrainingPlanAdjustmentActions } from "../../hooks/useTrainingPlanAdjustments";
import type { WorkoutCompletionActions } from "../../hooks/useWorkoutCompletion";
import { ProtectedWorkoutLogCard } from "./logging/LogCards";
import { screenStyles } from "./screenStyles";
import { tabHeroHeaders, tabScreenBackgrounds } from "./tabHeroConfig";
import { trainColorForTone, trainPalette, trainTextStyles, trainTint } from "./train/trainPalette";
import { WorkoutDetailPanel } from "./train/WorkoutDetailPanel";
import type { WorkoutPlayerStatus } from "./train/WorkoutPlayer";
import {
  plainFuelDemandLabel,
  plainGeneratedSessionFamilyLabel,
  plainGeneratedSessionFamilyWhy,
  plainIntensityLabel,
  plainSectionName,
  plainTrainingCopy as plainTrainCopy,
  plainTrainingStimulusLabel,
  plainWorkoutTitle
} from "../../engine/presentation/trainingCopy";
import { recipeFlowLines, recipeQuickLogContext, recipeTitle, recipeWhy } from "../../engine/presentation/workoutRecipePresentation";

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

type TrainSessionCard = TrainViewModel["sessionCards"][number];
type CompactGeneratedSession = NonNullable<TrainViewModel["nextGeneratedSession"]>;

interface FlowRow {
  label: string;
  value: string;
}

interface PrepRow {
  detail?: string | undefined;
  label: string;
  tone: VisualTone;
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

function firstUsefulSentence(...values: (string | null | undefined)[]): string | undefined {
  for (const value of values) {
    const copy = firstSentence(value ?? "");
    if (copy) {
      return copy;
    }
  }
  return undefined;
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

function sessionTypeLabel(session: DetailedTrainingSession | null, card: TrainSessionCard | null, generated: CompactGeneratedSession | null): string {
  if (session) {
    return plainGeneratedSessionFamilyLabel(session.family);
  }
  if (card?.sessionTypeLabel) {
    return sentenceCase(card.sessionTypeLabel);
  }
  if (generated?.sessionTypeLabel) {
    return sentenceCase(generated.sessionTypeLabel);
  }
  if (generated?.trainingStimulus) {
    return plainTrainingStimulusLabel(generated.trainingStimulus);
  }
  return plainGeneratedSessionFamilyLabel(generated?.family);
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

function coachNote(session: DetailedTrainingSession | null, card: TrainSessionCard | null): string {
  if (session) {
    const fromSession =
      session.athleteQualityCues?.[0] ??
      session.selfCheckCues?.[0] ??
      session.sessionQualityCheckpoints?.[0] ??
      session.walkthrough.steps.find((step) => step.items.length > 0)?.items[0]?.cue ??
      recipeQuickLogContext(session).mainJob;
    return firstSentence(fromSession || "Win the reset, then go again.");
  }
  return firstSentence(card?.modifications[0] ?? "Win the reset, then go again.");
}

function readinessValue(session: DetailedTrainingSession | null, viewModel: TrainViewModel): "Good" | "Caution" | "Low" | "Stop" {
  if (viewModel.riskSummary.length > 0 || session?.executionReadinessStatus === "red_hard_stop") {
    return "Stop";
  }
  if (session?.executionReadinessStatus === "red_non_hard_stop") {
    return "Low";
  }
  if (session?.executionReadinessStatus === "green") {
    return "Good";
  }
  return "Caution";
}

function readinessTone(value: "Good" | "Caution" | "Low" | "Stop"): VisualTone {
  if (value === "Good") {
    return "green";
  }
  if (value === "Stop") {
    return "red";
  }
  return "orange";
}

function readinessPrepCopy(value: "Good" | "Caution" | "Low" | "Stop"): string {
  switch (value) {
    case "Good":
      return "Warm up normally before intensity rises.";
    case "Caution":
      return "Start controlled. Build only if you feel sharp.";
    case "Low":
      return "Keep this session easy and cut any round that gets messy.";
    case "Stop":
      return "Today should be recovery-focused. Stop if symptoms return.";
  }
}

function fuelStatLabel(fuelDemand: "low" | "moderate" | "high" | string, intensity: string): string {
  if (fuelDemand === "high" || intensity === "hard") {
    return "Eat before";
  }
  if (fuelDemand === "low" || intensity === "easy" || intensity === "recovery") {
    return "Light";
  }
  return "Eat before";
}

function prepRows(session: DetailedTrainingSession | null, card: TrainSessionCard | null, viewModel: TrainViewModel): readonly PrepRow[] {
  const readiness = readinessValue(session, viewModel);
  return [
    {
      detail: firstUsefulSentence(session?.fuelingGate, viewModel.preSessionFuelHint),
      label: "Fuel check",
      tone: "gold",
      value: firstUsefulSentence(session?.fuelBefore, viewModel.preSessionFuelHint, plainFuelDemandLabel(card?.fuelDemand ?? "moderate")) ?? "Fuel status is unknown."
    },
    {
      detail: "Use a real water/sodium log if you want the engine to raise confidence.",
      label: "Hydration check",
      tone: "blue",
      value: firstUsefulSentence(session?.hydrationGate, viewModel.hydrationHint, "Keep water nearby.") ?? "Hydration is unknown."
    },
    {
      label: "Readiness",
      tone: readinessTone(readiness),
      value: firstUsefulSentence(session?.readinessGate, readinessPrepCopy(readiness)) ?? "Start controlled."
    },
    {
      detail: session?.downshiftIf?.[0] ? "Make the next block easier before technique breaks." : "Check this before the first hard or technical block.",
      label: session?.downshiftIf?.[0] ? "Downshift if" : "First check",
      tone: session?.downshiftIf?.[0] ? "orange" : "green",
      value: firstUsefulSentence(session?.downshiftIf?.[0], session?.preSessionChecklist?.[0], session?.selfCheckCues?.[0], coachNote(session, card)) ?? "Keep the first clean cue repeatable."
    },
    {
      detail: "Safety beats completing the prescription.",
      label: "Stop if",
      tone: "red",
      value: firstUsefulSentence(session?.stopConditions[0], "Pain, dizziness, or unusual symptoms appear.") ?? "Pain, dizziness, or unusual symptoms appear."
    },
    {
      label: "Coach's note",
      tone: "purple",
      value: coachNote(session, card)
    }
  ];
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

function startWorkoutBlockedReason(session: DetailedTrainingSession): string | undefined {
  if (session.executionReadinessStatus === "red_hard_stop" && session.intensity !== "recovery" && session.intensity !== "easy") {
    return "Readiness logged hard-stop symptoms. Use recovery-focused work today.";
  }
  return undefined;
}

function playerStatusIsInProgress(status: WorkoutPlayerStatus): boolean {
  return status === "active" || status === "paused" || status === "finishing";
}

function criticalTrainingRisk(viewModel: TrainViewModel): string | undefined {
  return viewModel.riskSummary.find((risk) => /safety stop|hard stop|hard-stop|no training|fainting/i.test(risk));
}

function cycleDecisionIsDefaultVisible(viewModel: TrainViewModel): boolean {
  return viewModel.cycleTrainingDecision.status === "safety_review" || viewModel.cycleTrainingDecision.status === "symptom_trim";
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
  const maxMinutes = Math.max(1, ...viewModel.weeklyWorkoutCards.map((session) => session.durationMinutes));
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
      ratio: totalMinutes > 0 ? clamp01(totalMinutes / maxMinutes) : 0.08,
      subtitle: primary ? `${totalMinutes} min - ${sentenceCase(plainIntensityLabel(primary.intensity))}` : "No support session",
      title,
      tone: primary ? toneForIntensity(primary.intensity) : "muted",
      value: totalMinutes,
      valueLabel: primary ? `${totalMinutes} min` : "Open"
    };
  });
}

function TrainTonePill({ label, tone: _tone = "muted" }: { label: string; tone?: VisualTone | undefined }) {
  return (
    <View
      accessibilityLabel={`Status: ${label}`}
      style={{
        alignItems: "center",
        alignSelf: "flex-start",
        backgroundColor: "rgba(255, 255, 255, 0.075)",
        borderColor: "rgba(255, 255, 255, 0.16)",
        borderRadius: radii.pill,
        borderWidth: 1,
        justifyContent: "center",
        maxWidth: 180,
        minHeight: 28,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3
      }}
    >
      <Text numberOfLines={1} style={{ color: colors.wrap, fontSize: 12, fontWeight: "800", lineHeight: 16 }}>
        {label}
      </Text>
    </View>
  );
}

function TrainPrimaryButton({
  children,
  disabled,
  onPress,
  tone = "purple"
}: React.PropsWithChildren<{
  disabled?: boolean | undefined;
  onPress?: (() => void) | undefined;
  tone?: VisualTone | undefined;
}>) {
  const toneColor = trainColorForTone(tone);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        screenStyles.button,
        {
          backgroundColor: disabled ? "rgba(255, 255, 255, 0.1)" : pressed ? trainPalette.actionFillPressed : trainPalette.actionFill,
          borderColor: disabled ? "rgba(255, 255, 255, 0.16)" : tone === "purple" ? trainPalette.actionBorder : trainTint(tone, "66"),
          boxShadow: disabled ? "none" : `0 12px 28px ${tone === "purple" ? trainPalette.actionShadow : `${toneColor}2B`}`
        }
      ]}
    >
      <Text style={{ color: disabled ? trainPalette.textMuted : trainPalette.textPrimary, fontSize: 15, fontWeight: "800", lineHeight: 20, textAlign: "center" }}>
        {children}
      </Text>
    </Pressable>
  );
}

function TrainQuietButton({
  children,
  expanded,
  onPress
}: React.PropsWithChildren<{
  expanded?: boolean | undefined;
  onPress?: (() => void) | undefined;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={expanded === undefined ? undefined : { expanded }}
      onPress={onPress}
      style={({ pressed }) => [
        screenStyles.quietButton,
        {
          backgroundColor: pressed ? trainPalette.controlFillPressed : trainPalette.controlFill,
          borderColor: trainPalette.controlLine,
          boxShadow: "0 8px 22px rgba(0, 0, 0, 0.18)"
        }
      ]}
    >
      <Text style={{ color: trainPalette.textBody, fontSize: 15, fontWeight: "700", lineHeight: 20, textAlign: "center" }}>
        {children}
      </Text>
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
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ alignItems: "flex-end", flexDirection: "row", gap: spacing.sm, height }}>
        {bars.map((bar, index) => {
          const color = trainColorForTone(bar.tone);
          return (
            <View key={`train-bar:${bar.label}:${index}`} style={{ alignItems: "center", flex: 1, gap: spacing.xs, height: "100%", justifyContent: "flex-end", minWidth: 22 }}>
              <Text numberOfLines={1} style={{ color: bar.hasSession ? trainPalette.textBody : trainPalette.textMuted, fontSize: 10, fontWeight: "800", lineHeight: 13 }}>
                {bar.valueLabel}
              </Text>
              <View
                style={{
                  backgroundColor: !bar.hasSession || bar.faded ? "transparent" : color,
                  borderColor: !bar.hasSession || bar.faded ? "rgba(218, 208, 242, 0.24)" : `${color}77`,
                  borderRadius: 8,
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
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
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
    <DashboardCard testID="train-workout-in-progress-card" title="Workout in progress">
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
    </DashboardCard>
  );
}

function WorkoutLooseEndsCard({
  adjustmentActions,
  asOfDate,
  busy,
  completionActions,
  detailsById,
  looseEnds,
  onLeaveUnknown
}: {
  adjustmentActions?: Pick<TrainingPlanAdjustmentActions, "moveGeneratedSession"> | undefined;
  asOfDate?: ISODateString | undefined;
  busy: boolean;
  completionActions?: WorkoutCompletionActions | undefined;
  detailsById: ReadonlyMap<string, DetailedTrainingSession>;
  looseEnds: TrainViewModel["workoutLooseEnds"];
  onLeaveUnknown: (sessionId: string) => void;
}) {
  if (looseEnds.length === 0) {
    return null;
  }
  const looseEnd = looseEnds[0]!;
  const detail = detailsById.get(looseEnd.generatedSessionId) ?? null;
  const canResolve = Boolean(detail && completionActions);
  const canMove = Boolean(adjustmentActions && asOfDate);
  return (
    <DashboardCard testID="train-loose-end-card" title="Still open">
      <View style={{ gap: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={{ color: trainPalette.textPrimary, fontSize: 18, fontWeight: "900", lineHeight: 23 }}>{looseEnd.title}</Text>
          <Text style={trainTextStyles.body}>This workout was planned for {looseEnd.originalDate}. Did it happen?</Text>
          <Text style={trainTextStyles.subtle}>{looseEnd.sessionTypeLabel} - {looseEnd.duration} - {sentenceCase(plainIntensityLabel(looseEnd.intensity))}</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <View style={{ flexBasis: 132, flexGrow: 1 }}>
            <TrainPrimaryButton
              disabled={busy || !canResolve}
              onPress={() => {
                if (!detail || !completionActions) {
                  return;
                }
                void completionActions.complete(detail, {
                  painNotes: [],
                  notes: "Completed from loose-end resolution.",
                  exerciseResults: []
                });
              }}
              tone="green"
            >
              Did it
            </TrainPrimaryButton>
          </View>
          <View style={{ flexBasis: 132, flexGrow: 1 }}>
            <TrainQuietButton
              onPress={() => {
                if (!detail || !completionActions || busy) {
                  return;
                }
                void completionActions.skip(detail, "Skipped from loose-end resolution.");
              }}
            >
              Skipped
            </TrainQuietButton>
          </View>
          <View style={{ flexBasis: 132, flexGrow: 1 }}>
            <TrainQuietButton
              onPress={() => {
                if (!adjustmentActions || !asOfDate || busy) {
                  return;
                }
                void adjustmentActions.moveGeneratedSession(looseEnd.generatedSessionId, looseEnd.originalDate, asOfDate);
              }}
            >
              Move to today
            </TrainQuietButton>
          </View>
          <View style={{ flexBasis: 132, flexGrow: 1 }}>
            <TrainQuietButton onPress={() => onLeaveUnknown(looseEnd.generatedSessionId)}>Leave unknown</TrainQuietButton>
          </View>
        </View>
        {!canResolve ? <Text style={trainTextStyles.subtle}>Exercise details are unavailable for quick resolution. Move it or leave it unknown.</Text> : null}
        {!canMove ? <Text style={trainTextStyles.subtle}>Move is available after the plan and date are loaded.</Text> : null}
        {looseEnds.length > 1 ? <Text style={trainTextStyles.subtle}>{looseEnds.length - 1} more open workout{looseEnds.length === 2 ? "" : "s"} after this.</Text> : null}
      </View>
    </DashboardCard>
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
    <DashboardCard testID="train-readiness-gate-card" title={gate.title}>
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
    </DashboardCard>
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
    <DashboardCard testID="train-schedule-debug-card" title="Training Schedule Debug">
      <View style={{ gap: spacing.sm }}>
        <TrainQuietButton expanded={open} onPress={() => setOpen((value) => !value)}>{open ? "Hide debug" : "Show debug"}</TrainQuietButton>
        {open ? rows.map((row) => <Text key={`train-debug:${row}`} style={trainTextStyles.subtle}>{row}</Text>) : null}
      </View>
    </DashboardCard>
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
          ? { label: "Start workout", onPress: onStart, tone: primaryTone }
          : session
            ? { label: "View details", onPress: onViewDetails, tone: primaryTone }
            : hasSessionSummary
              ? { label: "Log outside player", onPress: onOpenTrainingLog, tone: primaryTone }
              : { label: "Log other training", onPress: onOpenTrainingLog, tone: "blue" as const };
  const disabled = busy || !primaryAction.onPress;
  const showDetailsAction = Boolean(onViewDetails && primaryAction.label !== "View details");
  const showTrainingLogAction = primaryAction.label !== "Log other training" && primaryAction.label !== "Log outside player";
  const dayNote = viewModel.todayRole.status === "support_day" ? null : firstSentence(viewModel.todayRole.summary);
  return (
    <DashboardCard
      density="regular"
      headerRight={<TrainTonePill label={sentenceCase(plainIntensityLabel(intensity))} tone={primaryTone} />}
      testID="train-today-plan-card"
      title="Today's Training Plan"
    >
      <View style={{ gap: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={2} style={{ color: trainPalette.textPrimary, fontSize: 24, fontWeight: "900", letterSpacing: 0, lineHeight: 29 }}>
            {planTitle(session, card, generated)}
          </Text>
          <Text style={{ color: trainPalette.textBody, fontSize: 14, fontWeight: "700", lineHeight: 19 }}>
            {sessionTypeLabel(session, card, generated)} - {durationMinutes > 0 ? `${durationMinutes} min` : "Duration TBD"} - {sentenceCase(plainIntensityLabel(intensity))}
          </Text>
          {dayNote ? <Text style={trainTextStyles.subtle}>{dayNote}</Text> : null}
        </View>
        <View
          style={{
            backgroundColor: trainTint(primaryTone, "12"),
            borderColor: trainTint(primaryTone, "42"),
            borderRadius: radii.tile,
            borderWidth: 1,
            gap: spacing.xs,
            padding: spacing.md
          }}
        >
          <Text style={{ color: trainColorForTone("gold"), fontSize: 12, fontWeight: "900", letterSpacing: 0, lineHeight: 16, textTransform: "uppercase" }}>
            Your job today
          </Text>
          <Text style={trainTextStyles.body}>{trainingAim(session, card, generated, viewModel)}</Text>
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
              borderColor: disabled ? "rgba(255, 255, 255, 0.16)" : primaryAction.tone === "orange" ? trainTint("orange", "66") : trainPalette.actionBorder,
              boxShadow: disabled ? "none" : `0 12px 30px ${primaryAction.tone === "orange" ? `${trainColorForTone("orange")}2D` : trainPalette.actionShadow}`
            }
          ]}
        >
          <Text style={{ color: disabled ? trainPalette.textMuted : trainPalette.textPrimary, fontSize: 15, fontWeight: "800", lineHeight: 20, textAlign: "center" }}>{primaryAction.label}</Text>
        </Pressable>
        {showDetailsAction || showTrainingLogAction ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {showDetailsAction ? (
              <View style={{ flexBasis: 150, flexGrow: 1 }}>
                <TrainQuietButton onPress={onViewDetails}>View details</TrainQuietButton>
              </View>
            ) : null}
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
    </DashboardCard>
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
  const readiness = readinessValue(session, viewModel);
  const items = [
    { label: "Duration", tone: "muted" as const, value: durationMinutes > 0 ? `${durationMinutes} min` : "TBD" },
    { label: "Intensity", tone: toneForIntensity(intensity), value: sentenceCase(plainIntensityLabel(intensity)) },
    { label: "Fuel", tone: fuelDemand === "high" || intensity === "hard" ? "orange" as const : "gold" as const, value: fuelStatLabel(fuelDemand, intensity) },
    { label: "Readiness", tone: readinessTone(readiness), value: readiness }
  ];
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }} testID="train-compact-stats">
      {items.map((item) => (
        <View
          key={`train-stat:${item.label}`}
          style={{
            ...glassStyles.tile,
            backgroundColor: trainPalette.controlFill,
            borderColor: trainPalette.cardLine,
            flexBasis: 126,
            flexGrow: 1,
            gap: spacing.xs,
            minHeight: 72,
            padding: spacing.md
          }}
        >
          <Text numberOfLines={1} style={{ color: trainPalette.textMuted, fontSize: 11, fontWeight: "800", lineHeight: 15 }}>
            {item.label}
          </Text>
          <Text adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={1} style={{ color: trainColorForTone(item.tone), fontSize: 17, fontWeight: "900", lineHeight: 22 }}>
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function CompactTrainDetailRow({
  label,
  testID,
  tone,
  value
}: {
  label: string;
  testID: string;
  tone: VisualTone;
  value: string;
}) {
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: trainTint(tone, "0E"),
        borderColor: trainTint(tone, "32"),
        borderRadius: radii.tile,
        borderWidth: 1,
        flexDirection: "row",
        gap: spacing.md,
        minHeight: 46,
        padding: spacing.md
      }}
      testID={testID}
    >
      <View style={{ backgroundColor: trainColorForTone(tone), borderRadius: radii.pill, height: 8, width: 8 }} />
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <Text style={{ color: trainPalette.textPrimary, fontSize: 14, fontWeight: "900", lineHeight: 18 }}>{label}</Text>
        <Text numberOfLines={1} style={trainTextStyles.subtle}>{value}</Text>
      </View>
    </View>
  );
}

function WorkoutFlowCard({ card, session }: { card: TrainSessionCard | null; session: DetailedTrainingSession | null }) {
  const rows = flowRows(session, card);
  return (
    <DashboardCard testID="train-workout-flow-card" title="Workout Flow">
      <View style={{ gap: spacing.sm }}>
        {rows.map((row, index) => (
          <View
            key={`flow:${index}:${row.label}`}
            style={{
              alignItems: "center",
              borderBottomColor: index === rows.length - 1 ? "transparent" : trainPalette.cardLine,
              borderBottomWidth: 1,
              flexDirection: "row",
              gap: spacing.md,
              minHeight: 38,
              paddingBottom: index === rows.length - 1 ? 0 : spacing.sm
            }}
          >
            <View style={{ backgroundColor: trainColorForTone(index === 0 ? "gold" : index === rows.length - 1 ? "green" : "blue"), borderRadius: radii.pill, height: 8, opacity: 0.9, width: 8 }} />
            <Text style={{ color: trainPalette.textPrimary, flex: 1, fontSize: 14, fontWeight: "800", lineHeight: 19 }}>{row.label}</Text>
            {row.value ? <Text numberOfLines={1} style={{ color: trainPalette.textMuted, flexShrink: 1, fontSize: 13, fontWeight: "700", lineHeight: 18, textAlign: "right" }}>{row.value}</Text> : null}
          </View>
        ))}
      </View>
    </DashboardCard>
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
    <DashboardCard testID="train-before-start-card" title="Before You Start">
      <View style={{ gap: spacing.sm }}>
        {prepRows(session, card, viewModel).map((row) => (
          <View
            key={`prep:${row.label}`}
            style={{
              backgroundColor: trainTint(row.tone, "0E"),
              borderColor: trainTint(row.tone, "32"),
              borderRadius: 14,
              borderWidth: 1,
              gap: spacing.xs,
              padding: spacing.md
            }}
          >
            <Text style={{ color: trainColorForTone(row.tone), fontSize: 11, fontWeight: "900", lineHeight: 15, textTransform: "uppercase" }}>{row.label}</Text>
            <Text style={{ color: trainPalette.textPrimary, fontSize: 14, fontWeight: "800", lineHeight: 19 }}>{row.value}</Text>
            {row.detail ? <Text style={trainTextStyles.subtle}>{row.detail}</Text> : null}
          </View>
        ))}
      </View>
    </DashboardCard>
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
      <DashboardCard title="Log Other Training">
        <Text style={trainTextStyles.body}>Add boxing class, roadwork, lifting, or coach-assigned work outside the player.</Text>
        <Text style={trainTextStyles.subtle}>Duration and RPE update training load. Rounds and notes help protect future boxing volume, pain decisions, and schedule conflicts.</Text>
        <TrainQuietButton expanded={open} onPress={() => setOpen((value) => !value)}>{open ? "Hide training log" : "Show training log"}</TrainQuietButton>
      </DashboardCard>
      {open ? <ProtectedWorkoutLogCard actions={quickLogs} busy={busy} /> : null}
    </View>
  );
}

function WeekContextCard({ asOfDate, viewModel }: { asOfDate?: ISODateString | undefined; viewModel: TrainViewModel }) {
  const weekDays = currentWeekDays(viewModel, asOfDate);
  return (
    <DashboardCard testID="train-week-context" title="This Week">
      <Text style={trainTextStyles.body}>Theme: {plainTrainCopy(viewModel.supportGenerationSummary.weekDevelopmentTheme || "keep boxing quality repeatable")}</Text>
      <TrainMiniBarChart bars={weekDays} height={86} referenceLabel="7-day support view" />
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
    </DashboardCard>
  );
}

function CycleContextCard({ viewModel }: { viewModel: TrainViewModel }) {
  if (viewModel.cycleTrainingDecision.status === "none") {
    return null;
  }
  return (
    <DashboardCard testID="train-cycle-context-card" title="Cycle context">
      <Text style={trainTextStyles.body}>{plainTrainCopy(viewModel.cycleTrainingDecision.summary)}</Text>
      <Text style={trainTextStyles.subtle}>{plainTrainCopy(viewModel.cycleTrainingDecision.action)}</Text>
    </DashboardCard>
  );
}

function CollapsibleTrainDetails({
  asOfDate,
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
  asOfDate?: ISODateString | undefined;
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
  const prep = prepRows(session, card, viewModel);
  const fuel = prep.find((row) => row.label === "Fuel check")?.value ?? "Fuel unknown";
  const readiness = prep.find((row) => row.label === "Readiness")?.value ?? "Readiness unknown";
  const stop = prep.find((row) => row.label === "Stop if")?.value ?? "Stop if symptoms appear.";
  const hasWorkoutSummary = Boolean(viewModel.sessionCards.length > 0 || viewModel.todayGeneratedSessions.length > 0 || viewModel.nextGeneratedSession || generated);
  return (
    <View style={{ gap: spacing.md }} testID="train-collapsible-details">
      <DashboardCard title="Details">
        <View style={{ gap: spacing.sm }}>
          <CompactTrainDetailRow label="Workout flow" testID="train-workout-flow-collapsed" tone="blue" value="Warm-up -> Main -> Cooldown" />
          <CompactTrainDetailRow label="Before you start" testID="train-before-start-collapsed" tone={readinessValue(session, viewModel) === "Stop" ? "red" : "gold"} value={`${fuel} / ${readiness} / ${stop}`} />
          <TrainQuietButton expanded={detailsOpen} onPress={onToggleDetails}>{detailsOpen ? "Hide details" : "View details"}</TrainQuietButton>
        </View>
      </DashboardCard>
      {detailsOpen ? (
        <>
          <WorkoutFlowCard card={card} session={session} />
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
              <DashboardCard testID="train-workout-summary-card" title="Exercise Details">
                <Text style={trainTextStyles.body}>The player details are not available for this session. Use Log Other Training if you complete it outside the player.</Text>
              </DashboardCard>
            </View>
          ) : (
            <EmptyState title="No player workout today" message={plainTrainCopy(viewModel.todaySummary)} />
          )}
          <WeekContextCard asOfDate={asOfDate} viewModel={viewModel} />
          {!cycleDecisionIsDefaultVisible(viewModel) ? <CycleContextCard viewModel={viewModel} /> : null}
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
  viewModel
}: TrainScreenProps) {
  const [pendingStartSessionId, setPendingStartSessionId] = React.useState<string | null>(null);
  const [dismissedLooseEndIds, setDismissedLooseEndIds] = React.useState<ReadonlySet<string>>(new Set());
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
  const previewOnlyReason = previewOnlyWeeklySession ? `Scheduled for ${previewOnlyWeeklySession.date}. Keep future sessions on their planned day.` : undefined;
  const primarySessionBlockedReason = primarySession && !previewOnlyWeeklySession ? startWorkoutBlockedReason(primarySession) : undefined;
  const readinessGateAcknowledged = Boolean(viewModel.preSessionReadinessGate.sessionId && controlledStartSessionIds.has(viewModel.preSessionReadinessGate.sessionId));

  const startWorkout = (sessionDetail: DetailedTrainingSession) => {
    const blockedReason = startWorkoutBlockedReason(sessionDetail);
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
  const openPrimaryDetails = primarySession
    ? () => {
        setDetailsOpen(true);
        setPlanOpenRequestKey((value) => value + 1);
      }
    : undefined;
  const openTrainingLog = () => {
    setDetailsOpen(true);
    setTrainingLogOpenRequestKey((value) => value + 1);
  };
  const criticalRisk = criticalTrainingRisk(viewModel);
  const showSafety = Boolean(primarySessionBlockedReason || criticalRisk);

  return (
    <LuminousScreen accent="purple" backgroundImage={tabScreenBackgrounds.train} testID="train-screen">
      <ScreenHeader {...tabHeroHeaders.train} />
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
        onLeaveUnknown={(sessionId) => setDismissedLooseEndIds((current) => new Set([...current, sessionId]))}
      />
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
      <QuickStatsRow card={primaryCard} generated={generatedSummary} session={primarySession} viewModel={viewModel} />
      {pendingStartSession && activeWorkout ? (
        <EngineCard>
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
        </EngineCard>
      ) : null}
      {cycleDecisionIsDefaultVisible(viewModel) ? <CycleContextCard viewModel={viewModel} /> : null}
      <CollapsibleTrainDetails
        asOfDate={asOfDate}
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
    </LuminousScreen>
  );
}
