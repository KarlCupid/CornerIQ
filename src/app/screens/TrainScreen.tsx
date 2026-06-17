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
import { radii, spacing } from "../../design/theme";
import type { BarVisual, VisualTone } from "../../engine/presentation/dashboardVisualData";
import { clamp01 } from "../../engine/presentation/dashboardVisualData";
import type { QuickLogActions } from "../../hooks/useQuickLogs";
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
  asOfDate?: ISODateString | undefined;
  busy: boolean;
  completionActions?: WorkoutCompletionActions | undefined;
  completionMessage?: string | null | undefined;
  generationStatus?: EngineGenerationStatus | undefined;
  initialSection?: TrainSection | undefined;
  onInitialSectionApplied?: (() => void) | undefined;
  onDiscardWorkout?: (() => void) | undefined;
  onOpenFuelAfterWorkout?: (() => void) | undefined;
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

function startWorkoutBlockedReason(viewModel: TrainViewModel, session: DetailedTrainingSession): string | undefined {
  if (session.executionReadinessStatus === "red_hard_stop") {
    return "Start workout is unavailable today. Today should be recovery-focused.";
  }
  if (session.intensity === "hard" && viewModel.riskSummary.length > 0) {
    return "Hard training is not recommended today. Keep this session easy.";
  }
  return undefined;
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

function TrainTonePill({ label, tone = "muted" }: { label: string; tone?: VisualTone | undefined }) {
  const color = trainColorForTone(tone);
  return (
    <View
      accessibilityLabel={`Status: ${label}`}
      style={{
        alignItems: "center",
        alignSelf: "flex-start",
        backgroundColor: trainTint(tone, "14"),
        borderColor: trainTint(tone, "3D"),
        borderRadius: radii.pill,
        borderWidth: 1,
        flexDirection: "row",
        gap: spacing.xs,
        justifyContent: "center",
        maxWidth: 180,
        minHeight: 28,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3
      }}
    >
      <View style={{ backgroundColor: color, borderRadius: 4, height: 7, opacity: 0.9, width: 7 }} />
      <Text numberOfLines={1} style={{ color, fontSize: 12, fontWeight: "800", lineHeight: 16 }}>
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
      <Text style={trainTextStyles.subtle}>Resume is available while this app session stays alive. If the app reloads or you discard, follow-along progress may be lost.</Text>
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

function TodayTrainingPlanCard({
  busy,
  card,
  generated,
  onStart,
  previewOnlyReason,
  session,
  startBlockedReason,
  viewModel
}: {
  busy: boolean;
  card: TrainSessionCard | null;
  generated: CompactGeneratedSession | null;
  onStart: (() => void) | undefined;
  previewOnlyReason: string | undefined;
  session: DetailedTrainingSession | null;
  startBlockedReason: string | undefined;
  viewModel: TrainViewModel;
}) {
  const intensity = session?.intensity ?? card?.intensity ?? generated?.intensity ?? "moderate";
  const durationMinutes = session?.durationMinutes ?? card?.durationMinutes ?? generated?.durationMinutes ?? 0;
  const canStart = Boolean(onStart) && !previewOnlyReason && !startBlockedReason;
  const disabled = busy || !canStart;
  const primaryTone = toneForIntensity(intensity);
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
          accessibilityLabel="Start workout"
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onStart}
          style={({ pressed }) => [
            screenStyles.button,
            {
              backgroundColor: disabled ? "rgba(255, 255, 255, 0.1)" : pressed ? trainPalette.actionFillPressed : trainPalette.actionFill,
              borderColor: disabled ? "rgba(255, 255, 255, 0.16)" : primaryTone === "orange" ? trainTint("orange", "66") : trainPalette.actionBorder,
              boxShadow: disabled ? "none" : `0 12px 30px ${primaryTone === "orange" ? `${trainColorForTone("orange")}2D` : trainPalette.actionShadow}`
            }
          ]}
        >
          <Text style={{ color: disabled ? trainPalette.textMuted : trainPalette.textPrimary, fontSize: 15, fontWeight: "800", lineHeight: 20, textAlign: "center" }}>Start workout</Text>
        </Pressable>
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
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }} testID="train-quick-stats">
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

function ManualTrainingLoggerSection({ busy, quickLogs }: { busy: boolean; quickLogs: QuickLogActions }) {
  const [open, setOpen] = React.useState(false);
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

export function TrainScreen({
  activeWorkout,
  asOfDate,
  busy,
  completionActions,
  completionMessage,
  generationStatus = "idle",
  initialSection,
  onDiscardWorkout,
  onInitialSectionApplied,
  onOpenFuelAfterWorkout,
  onResumeWorkout,
  onStartWorkout,
  quickLogs,
  viewModel
}: TrainScreenProps) {
  const [pendingStartSessionId, setPendingStartSessionId] = React.useState<string | null>(null);
  const [planOpenRequestKey, setPlanOpenRequestKey] = React.useState(0);
  const quickLogOpenRequestKey = 0;

  React.useEffect(() => {
    if (initialSection) {
      if (initialSection === "workout") {
        setPlanOpenRequestKey((value) => value + 1);
      }
      onInitialSectionApplied?.();
    }
  }, [initialSection, onInitialSectionApplied]);

  const detailedSessions = viewModel.detailedTodaySessions
    .map((session) => session.detail)
    .filter((session): session is DetailedTrainingSession => session !== null);
  const previewOnlyWeeklySession = detailedSessions.length === 0
    ? viewModel.detailedWeeklySessions.find((session) => session.detail !== null)
    : null;
  const primarySession = detailedSessions[0] ?? previewOnlyWeeklySession?.detail ?? null;
  const primaryCard = viewModel.sessionCards[0] ?? null;
  const generatedSummary = viewModel.todayGeneratedSessions[0] ?? viewModel.nextGeneratedSession;
  const pendingStartSession = detailedSessions.find((session) => session.generatedSessionId === pendingStartSessionId) ?? null;
  const playerInProgress = Boolean(activeWorkout && playerStatusIsInProgress(activeWorkout.status));
  const previewOnlyReason = previewOnlyWeeklySession ? `Scheduled for ${previewOnlyWeeklySession.date}. Keep future sessions on their planned day.` : undefined;
  const primarySessionBlockedReason = primarySession && !previewOnlyWeeklySession ? startWorkoutBlockedReason(viewModel, primarySession) : undefined;

  const startWorkout = (sessionDetail: DetailedTrainingSession) => {
    const blockedReason = startWorkoutBlockedReason(viewModel, sessionDetail);
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
  const showSafety = viewModel.riskSummary.length > 0 || Boolean(primarySessionBlockedReason);

  return (
    <LuminousScreen accent="purple" backgroundImage={tabScreenBackgrounds.train} testID="train-screen">
      <ScreenHeader {...tabHeroHeaders.train} />
      {showSafety ? (
        <RiskBanner
          message={primarySessionBlockedReason ?? "Hard training is not recommended today. Keep this session easy."}
          title="Before you train"
          tone="critical"
        >
          <View style={{ gap: spacing.xs }}>
            <Text style={trainTextStyles.body}>Stop if symptoms return.</Text>
            {viewModel.riskSummary.slice(0, 2).map((risk, index) => <Text key={`train-risk:${index}`} style={trainTextStyles.body}>{firstSentence(risk)}</Text>)}
          </View>
        </RiskBanner>
      ) : null}
      <TodayTrainingPlanCard
        busy={busy}
        card={primaryCard}
        generated={generatedSummary}
        onStart={startCurrentSession}
        previewOnlyReason={previewOnlyReason}
        session={primarySession}
        startBlockedReason={primarySessionBlockedReason}
        viewModel={viewModel}
      />
      <EngineGeneratingCard status={generationStatus === "generating_workout" ? generationStatus : "idle"} />
      <QuickStatsRow card={primaryCard} generated={generatedSummary} session={primarySession} viewModel={viewModel} />
      <WorkoutFlowCard card={primaryCard} session={primarySession} />
      <BeforeYouStartCard card={primaryCard} session={primarySession} viewModel={viewModel} />
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
      {primarySession ? (
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
            session={primarySession}
          />
        </View>
      ) : viewModel.sessionCards.length > 0 || viewModel.todayGeneratedSessions.length > 0 || viewModel.nextGeneratedSession ? (
        <View testID="train-workout-section">
          <DashboardCard testID="train-workout-summary-card" title="Exercise Details">
            <Text style={trainTextStyles.body}>The player details are not available for this session. Use Log Other Training if you complete it outside the player.</Text>
          </DashboardCard>
        </View>
      ) : (
        <EmptyState title="No player workout today" message={plainTrainCopy(viewModel.todaySummary)} />
      )}
      <WeekContextCard asOfDate={asOfDate} viewModel={viewModel} />
      {viewModel.cycleTrainingDecision.status !== "none" ? (
        <DashboardCard title="Cycle context">
          <Text style={trainTextStyles.body}>{plainTrainCopy(viewModel.cycleTrainingDecision.summary)}</Text>
          <Text style={trainTextStyles.subtle}>{plainTrainCopy(viewModel.cycleTrainingDecision.action)}</Text>
        </DashboardCard>
      ) : null}
      <ManualTrainingLoggerSection busy={busy} quickLogs={quickLogs} />
      {completionMessage ? <Text style={[trainTextStyles.subtle, { color: trainColorForTone("orange") }]}>{completionMessage}</Text> : null}
    </LuminousScreen>
  );
}
