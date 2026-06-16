import React from "react";
import { Pressable, Text, View } from "react-native";
import type { DetailedTrainingSession, ISODateString, RecentLogsViewModel, TrainViewModel } from "../../engine/core/types";
import { EngineGeneratingCard, type EngineGenerationStatus } from "../components/EngineGeneratingCard";
import { EngineCard } from "../../design/components/EngineCard";
import { EmptyState } from "../../design/components/EmptyState";
import { LuminousScreen, ScreenHeader, useLuminousScreenTheme } from "../../design/components/LuminousScreen";
import { DashboardCard, DashboardPill, MiniBarChart, TimelineStrip } from "../../design/components/PerformanceVisuals";
import { RiskBanner } from "../../design/components/RiskBanner";
import { glassStyles } from "../../design/glass";
import { colors, radii, spacing } from "../../design/theme";
import type { BarVisual, TimelineVisual, VisualTone } from "../../engine/presentation/dashboardVisualData";
import { clamp01 } from "../../engine/presentation/dashboardVisualData";
import type { QuickLogActions } from "../../hooks/useQuickLogs";
import type { WorkoutCompletionActions } from "../../hooks/useWorkoutCompletion";
import { ProtectedWorkoutLogCard } from "./logging/LogCards";
import { screenStyles } from "./screenStyles";
import { tabHeroHeaders, tabScreenBackgrounds } from "./tabHeroConfig";
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
  label: string;
  value: string;
}

function toneForIntensity(intensity: string): VisualTone {
  if (intensity === "hard") {
    return "orange";
  }
  if (intensity === "easy" || intensity === "recovery") {
    return "green";
  }
  return "purple";
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
      label: "Fuel",
      value: firstSentence(session?.fuelBefore ?? viewModel.preSessionFuelHint ?? plainFuelDemandLabel(card?.fuelDemand ?? "moderate"))
    },
    {
      label: "Hydration",
      value: firstSentence(session?.hydrationGate ?? viewModel.hydrationHint ?? "Keep water nearby.")
    },
    {
      label: "Readiness",
      value: readinessPrepCopy(readiness)
    },
    {
      label: "Coach's Note",
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

function currentWeekBars(viewModel: TrainViewModel): readonly BarVisual[] {
  const maxMinutes = Math.max(1, ...viewModel.weeklyWorkoutCards.map((session) => session.durationMinutes));
  const todayDate = viewModel.todayGeneratedSessions[0]?.date ?? viewModel.weeklyWorkoutCards[0]?.date ?? "";
  return viewModel.weeklyWorkoutCards.slice(0, 5).map((session) => ({
    label: compactDayLabel(session.date, session.label.split(" ")[0]?.slice(0, 3).toUpperCase() ?? session.date.slice(5)),
    value: session.durationMinutes,
    valueLabel: `${session.durationMinutes} min`,
    ratio: clamp01(session.durationMinutes / maxMinutes),
    tone: toneForIntensity(session.intensity),
    faded: session.date < todayDate
  }));
}

function weeklyTimeline(viewModel: TrainViewModel): readonly TimelineVisual[] {
  const sessions = viewModel.weeklyWorkoutCards.slice(0, 5);
  if (sessions.length === 0) {
    return [{ label: "Week", title: "Open", subtitle: "Log boxing if it happens", tone: "muted" }];
  }
  return sessions.map((session, index) => ({
    label: index === 0 ? "Today" : compactDayLabel(session.date, session.label),
    title: plainWorkoutTitle(session.title, session.family),
    subtitle: `${session.durationMinutes} min - ${sentenceCase(plainIntensityLabel(session.intensity))}`,
    tone: toneForIntensity(session.intensity)
  }));
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
      <Text style={screenStyles.body}>{sessionTitle}</Text>
      <Text style={screenStyles.subtle}>Status: {status.replace(/_/g, " ")}.</Text>
      <Text style={screenStyles.subtle}>Resume is available while this app session stays alive. If the app reloads or you discard, follow-along progress may be lost.</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        <Pressable accessibilityRole="button" onPress={onResume} style={[screenStyles.button, { flexBasis: 160, flexGrow: 1 }]}>
          <Text style={screenStyles.buttonText}>Resume workout</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onDiscard} style={[screenStyles.quietButton, { flexBasis: 160, flexGrow: 1 }]}>
          <Text style={screenStyles.quietButtonText}>Discard progress</Text>
        </Pressable>
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
  const theme = useLuminousScreenTheme();
  const intensity = session?.intensity ?? card?.intensity ?? generated?.intensity ?? "moderate";
  const durationMinutes = session?.durationMinutes ?? card?.durationMinutes ?? generated?.durationMinutes ?? 0;
  const canStart = Boolean(onStart) && !previewOnlyReason && !startBlockedReason;
  const disabled = busy || !canStart;
  const buttonColor = intensity === "hard" ? colors.amberCaution : colors.powerPurple;
  const dayNote = viewModel.todayRole.status === "support_day" ? null : firstSentence(viewModel.todayRole.summary);
  return (
    <DashboardCard
      density="regular"
      headerRight={<DashboardPill label={sentenceCase(plainIntensityLabel(intensity))} tone={toneForIntensity(intensity)} />}
      testID="train-today-plan-card"
      title="Today's Training Plan"
    >
      <View style={{ gap: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={2} style={{ color: colors.canvas, fontSize: 24, fontWeight: "900", letterSpacing: 0, lineHeight: 29 }}>
            {planTitle(session, card, generated)}
          </Text>
          <Text style={{ color: colors.wrap, fontSize: 14, fontWeight: "700", lineHeight: 19 }}>
            {sessionTypeLabel(session, card, generated)} - {durationMinutes > 0 ? `${durationMinutes} min` : "Duration TBD"} - {sentenceCase(plainIntensityLabel(intensity))}
          </Text>
          {dayNote ? <Text style={screenStyles.subtle}>{dayNote}</Text> : null}
        </View>
        <View
          style={{
            backgroundColor: theme.control,
            borderColor: theme.controlBorder,
            borderRadius: radii.tile,
            borderWidth: 1,
            gap: spacing.xs,
            padding: spacing.md
          }}
        >
          <Text style={{ color: theme.accentColor, fontSize: 12, fontWeight: "900", letterSpacing: 0, lineHeight: 16 }}>
            Training Aim
          </Text>
          <Text style={screenStyles.body}>{trainingAim(session, card, generated, viewModel)}</Text>
        </View>
        <Pressable
          accessibilityLabel="Start workout"
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onStart}
          style={[
            screenStyles.button,
            {
              backgroundColor: disabled ? "rgba(255, 255, 255, 0.105)" : buttonColor,
              borderColor: disabled ? "rgba(255, 255, 255, 0.17)" : `${buttonColor}AA`,
              boxShadow: disabled ? "none" : `0 12px 30px ${buttonColor}33`
            }
          ]}
        >
          <Text style={[screenStyles.buttonText, disabled ? { color: colors.mutedText } : null]}>Start workout</Text>
        </Pressable>
        {startBlockedReason ? <Text style={[screenStyles.subtle, { color: colors.amberCaution }]}>{startBlockedReason}</Text> : null}
        {previewOnlyReason ? <Text style={screenStyles.subtle}>{previewOnlyReason}</Text> : null}
        {!session && !generated && !card ? <Text style={screenStyles.subtle}>Log boxing class, roadwork, lifting, or anything you complete outside the player.</Text> : null}
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
  const theme = useLuminousScreenTheme();
  const intensity = session?.intensity ?? card?.intensity ?? generated?.intensity ?? "moderate";
  const durationMinutes = session?.durationMinutes ?? card?.durationMinutes ?? generated?.durationMinutes ?? 0;
  const fuelDemand = session?.fuelDemand ?? card?.fuelDemand ?? generated?.fuelDemand ?? "moderate";
  const readiness = readinessValue(session, viewModel);
  const items = [
    { label: "Duration", tone: "purple" as const, value: durationMinutes > 0 ? `${durationMinutes} min` : "TBD" },
    { label: "Intensity", tone: toneForIntensity(intensity), value: sentenceCase(plainIntensityLabel(intensity)) },
    { label: "Fuel", tone: fuelDemand === "high" || intensity === "hard" ? "orange" as const : "purple" as const, value: fuelStatLabel(fuelDemand, intensity) },
    { label: "Readiness", tone: readinessTone(readiness), value: readiness }
  ];
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }} testID="train-quick-stats">
      {items.map((item) => (
        <View
          key={`train-stat:${item.label}`}
          style={{
            ...glassStyles.tile,
            backgroundColor: theme.tile,
            borderColor: theme.tileBorder,
            flexBasis: 126,
            flexGrow: 1,
            gap: spacing.xs,
            minHeight: 72,
            padding: spacing.md
          }}
        >
          <Text numberOfLines={1} style={{ color: colors.wrap, fontSize: 11, fontWeight: "800", lineHeight: 15 }}>
            {item.label}
          </Text>
          <Text numberOfLines={1} style={{ color: item.tone === "orange" ? colors.amberCaution : item.tone === "green" ? colors.readyGreen : item.tone === "red" ? colors.redCorner : colors.powerPurple, fontSize: 17, fontWeight: "900", lineHeight: 22 }}>
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
              borderBottomColor: index === rows.length - 1 ? "transparent" : "rgba(255, 255, 255, 0.1)",
              borderBottomWidth: 1,
              flexDirection: "row",
              gap: spacing.md,
              minHeight: 38,
              paddingBottom: index === rows.length - 1 ? 0 : spacing.sm
            }}
          >
            <View style={{ backgroundColor: colors.powerPurple, borderRadius: radii.pill, height: 8, opacity: 0.9, width: 8 }} />
            <Text style={{ color: colors.canvas, flex: 1, fontSize: 14, fontWeight: "800", lineHeight: 19 }}>{row.label}</Text>
            {row.value ? <Text numberOfLines={1} style={{ color: colors.wrap, flexShrink: 1, fontSize: 13, fontWeight: "700", lineHeight: 18, textAlign: "right" }}>{row.value}</Text> : null}
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
          <View key={`prep:${row.label}`} style={{ gap: 2 }}>
            <Text style={{ color: colors.canvas, fontSize: 13, fontWeight: "900", lineHeight: 17 }}>{row.label}</Text>
            <Text style={screenStyles.subtle}>{row.value}</Text>
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
        <Text style={screenStyles.body}>Add boxing class, roadwork, lifting, or anything you did outside the player.</Text>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((value) => !value)} style={screenStyles.quietButton}>
          <Text style={screenStyles.quietButtonText}>{open ? "Hide training log" : "Show training log"}</Text>
        </Pressable>
      </DashboardCard>
      {open ? <ProtectedWorkoutLogCard actions={quickLogs} busy={busy} /> : null}
    </View>
  );
}

function WeekContextCard({ viewModel }: { viewModel: TrainViewModel }) {
  const bars = currentWeekBars(viewModel);
  const timeline = weeklyTimeline(viewModel);
  return (
    <DashboardCard testID="train-week-context" title="This Week">
      <Text style={screenStyles.body}>Theme: {plainTrainCopy(viewModel.supportGenerationSummary.weekDevelopmentTheme || "keep boxing quality repeatable")}</Text>
      {bars.length > 1 ? <MiniBarChart bars={bars} height={84} referenceLabel="Minutes" /> : <TimelineStrip items={timeline} />}
      <View style={{ gap: spacing.xs }}>
        {timeline.slice(0, 5).map((item, index) => (
          <Text key={`train-week-session:${index}:${item.title}`} style={screenStyles.subtle}>
            {item.label}: {item.title}
          </Text>
        ))}
      </View>
    </DashboardCard>
  );
}

export function TrainScreen({
  activeWorkout,
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
            <Text style={screenStyles.body}>Stop if symptoms return.</Text>
            {viewModel.riskSummary.slice(0, 2).map((risk, index) => <Text key={`train-risk:${index}`} style={screenStyles.body}>{firstSentence(risk)}</Text>)}
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
            <Text style={screenStyles.sectionTitle}>Workout in progress</Text>
            <Text style={screenStyles.body}>Resume {activeWorkout.title} or discard it before starting {pendingStartSession.title}.</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              <Pressable accessibilityRole="button" onPress={onResumeWorkout} style={screenStyles.button}>
                <Text style={screenStyles.buttonText}>Resume workout</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setPendingStartSessionId(null);
                  onDiscardWorkout?.();
                  onStartWorkout?.(pendingStartSession);
                }}
                style={screenStyles.quietButton}
              >
                <Text style={screenStyles.quietButtonText}>Discard and start</Text>
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
            <Text style={screenStyles.body}>The player details are not available for this session. Use Log Other Training if you complete it outside the player.</Text>
          </DashboardCard>
        </View>
      ) : (
        <EmptyState title="No player workout today" message={plainTrainCopy(viewModel.todaySummary)} />
      )}
      <WeekContextCard viewModel={viewModel} />
      {viewModel.cycleTrainingDecision.status !== "none" ? (
        <DashboardCard title="Cycle context">
          <Text style={screenStyles.body}>{plainTrainCopy(viewModel.cycleTrainingDecision.summary)}</Text>
          <Text style={screenStyles.subtle}>{plainTrainCopy(viewModel.cycleTrainingDecision.action)}</Text>
        </DashboardCard>
      ) : null}
      <ManualTrainingLoggerSection busy={busy} quickLogs={quickLogs} />
      {completionMessage ? <Text style={[screenStyles.subtle, { color: colors.amberCaution }]}>{completionMessage}</Text> : null}
    </LuminousScreen>
  );
}
