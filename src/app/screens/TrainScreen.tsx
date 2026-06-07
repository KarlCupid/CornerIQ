import React from "react";
import { Pressable, Text, View } from "react-native";
import type { DetailedTrainingSession, RecentLogsViewModel, TrainViewModel } from "../../engine/core/types";
import { EngineGeneratingCard, type EngineGenerationStatus } from "../components/EngineGeneratingCard";
import { EngineCard } from "../../design/components/EngineCard";
import { EmptyState } from "../../design/components/EmptyState";
import { LuminousScreen } from "../../design/components/LuminousScreen";
import { DashboardCard, DashboardPill, MiniBarChart, TimelineStrip } from "../../design/components/PerformanceVisuals";
import { RiskBanner } from "../../design/components/RiskBanner";
import { colors, spacing } from "../../design/theme";
import type { BarVisual, TimelineVisual, VisualTone } from "../../engine/presentation/dashboardVisualData";
import { clamp01 } from "../../engine/presentation/dashboardVisualData";
import type { QuickLogActions } from "../../hooks/useQuickLogs";
import type { WorkoutCompletionActions } from "../../hooks/useWorkoutCompletion";
import { ProtectedWorkoutLogCard } from "./logging/LogCards";
import { screenStyles } from "./screenStyles";
import { WorkoutDetailPanel } from "./train/WorkoutDetailPanel";
import type { WorkoutPlayerStatus } from "./train/WorkoutPlayer";

export type TrainSection = "today" | "workout" | "progress";

export interface TrainScreenProps {
  activeWorkout?: TrainWorkoutPlayerSummary | null | undefined;
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

function plainTrainCopy(value: string): string {
  return value
    .replace(new RegExp("generated boxing " + "training", "gi"), "support workout")
    .replace(new RegExp("generated " + "training", "gi"), "support workout")
    .replace(new RegExp("protected " + "anchors?", "gi"), "boxing sessions you added")
    .replace(new RegExp("protected " + "boxing", "gi"), "fixed boxing")
    .replace(new RegExp("protected " + "work", "gi"), "boxing work")
    .replace(new RegExp("prescribed" + "_only", "gi"), "not logged")
    .replace(new RegExp("structured " + "actuals", "gi"), "extra details");
}

function toneForIntensity(intensity: string): VisualTone {
  if (intensity === "hard" || intensity === "max") {
    return "orange";
  }
  if (intensity === "easy" || intensity === "recovery") {
    return "green";
  }
  return "blue";
}

function currentWeekBars(viewModel: TrainViewModel): readonly BarVisual[] {
  const maxMinutes = Math.max(1, ...viewModel.weeklyWorkoutCards.map((session) => session.durationMinutes));
  return viewModel.weeklyWorkoutCards.slice(0, 7).map((session) => ({
    label: session.label.split(" ")[0]?.slice(0, 3).toUpperCase() ?? session.date.slice(5),
    value: session.durationMinutes,
    valueLabel: `${session.durationMinutes} min`,
    ratio: clamp01(session.durationMinutes / maxMinutes),
    tone: toneForIntensity(session.intensity),
    faded: session.date < (viewModel.todayGeneratedSessions[0]?.date ?? "")
  }));
}

function weeklyTimeline(viewModel: TrainViewModel): readonly TimelineVisual[] {
  const sessions = viewModel.weeklyWorkoutCards.slice(0, 4);
  if (sessions.length === 0) {
    return [{ label: "Week", title: "No support workout", subtitle: "Log boxing if it happens", tone: "muted" }];
  }
  return sessions.map((session) => ({
    label: session.label.split(" ")[0]?.slice(0, 3).toUpperCase() ?? session.date.slice(5),
    title: session.title,
    subtitle: `${session.durationMinutes} min - ${session.intensity}`,
    tone: toneForIntensity(session.intensity)
  }));
}

function startWorkoutBlockedReason(viewModel: TrainViewModel, session: DetailedTrainingSession): string | undefined {
  if (session.executionReadinessStatus === "red_hard_stop") {
    return "Safety check is active. Start workout is unavailable while stop-for-safety symptoms are active.";
  }
  if (session.intensity === "hard" && viewModel.riskSummary.length > 0) {
    return "Safety notes are active, so hard support work cannot start here.";
  }
  return undefined;
}

function playerStatusIsInProgress(status: WorkoutPlayerStatus): boolean {
  return status === "active" || status === "paused" || status === "finishing";
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

function TrainingOverviewCard({ viewModel }: { viewModel: TrainViewModel }) {
  const roleLabel = viewModel.todayRole.status.replace(/_/g, " ");
  return (
    <DashboardCard headerRight={<DashboardPill label={roleLabel} tone={viewModel.riskSummary.length > 0 ? "red" : "blue"} />} testID="train-overview-card" title="Training overview">
      <Text style={screenStyles.body}>{plainTrainCopy(viewModel.todaySummary)}</Text>
      <Text style={screenStyles.callout}>{plainTrainCopy(viewModel.todayRole.summary)}</Text>
      <Text style={screenStyles.subtle}>{plainTrainCopy(viewModel.todayRole.explanation)}</Text>
      <Text style={screenStyles.subtle}>{plainTrainCopy(viewModel.blockExplanation)}</Text>
      <Text style={screenStyles.subtle}>Fuel check: {plainTrainCopy(viewModel.preSessionFuelHint)}</Text>
      <Text style={screenStyles.subtle}>Hydration: {plainTrainCopy(viewModel.hydrationHint)}</Text>
    </DashboardCard>
  );
}

function WorkoutSummaryCard({ viewModel }: { viewModel: TrainViewModel }) {
  const card = viewModel.sessionCards[0];
  const generated = viewModel.todayGeneratedSessions[0] ?? viewModel.nextGeneratedSession;
  if (!card && !generated) {
    return null;
  }
  const title = card?.title ?? generated?.title ?? "Support workout";
  const durationMinutes = card?.durationMinutes ?? generated?.durationMinutes ?? 0;
  const intensity = card?.intensity ?? generated?.intensity ?? "moderate";
  const fuelDemand = card?.fuelDemand ?? generated?.fuelDemand ?? "moderate";
  return (
    <DashboardCard testID="train-workout-summary-card" title="Workout preview">
      <Text style={screenStyles.fieldLabel}>Generated workout</Text>
      <Text style={screenStyles.callout}>{plainTrainCopy(title)}</Text>
      <Text style={screenStyles.body}>{durationMinutes} min, {intensity}. Fuel: {fuelDemand}.</Text>
      {card?.why ? <Text style={screenStyles.subtle}>Purpose: {plainTrainCopy(card.why)}</Text> : null}
      {card?.protects && card.protects.length > 0 ? <Text style={screenStyles.subtle}>Boxing benefit: {card.protects.map(plainTrainCopy).join(", ")}</Text> : null}
      {card?.modifications && card.modifications.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          {card.modifications.slice(0, 3).map((item, index) => <Text key={`train-summary-mod:${index}`} style={screenStyles.subtle}>{plainTrainCopy(item)}</Text>)}
        </View>
      ) : null}
      <Text style={screenStyles.subtle}>Detailed player is unavailable for this session, so log the real workout manually if you complete it.</Text>
    </DashboardCard>
  );
}

function ManualTrainingLoggerSection({ busy, quickLogs }: { busy: boolean; quickLogs: QuickLogActions }) {
  const [open, setOpen] = React.useState(false);
  return (
    <View style={{ gap: spacing.md }} testID="train-manual-logger-section">
      <DashboardCard title="Manual boxing log">
        <Text style={screenStyles.body}>Use this for boxing class, roadwork, boxing sessions you already do, or strength work not created by CornerIQ.</Text>
        <Text style={screenStyles.subtle}>Free-text load notes are never treated as exact load progression.</Text>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((value) => !value)} style={screenStyles.quietButton}>
          <Text style={screenStyles.quietButtonText}>{open ? "Hide manual log" : "Show manual log"}</Text>
        </Pressable>
      </DashboardCard>
      {open ? <ProtectedWorkoutLogCard actions={quickLogs} busy={busy} /> : null}
    </View>
  );
}

function WeekContextCard({ viewModel }: { viewModel: TrainViewModel }) {
  const bars = currentWeekBars(viewModel);
  return (
    <DashboardCard
      headerRight={<DashboardPill label={`${viewModel.supportGenerationSummary.actualGeneratedSupportCount}/${viewModel.supportGenerationSummary.targetGeneratedSupportCount} support`} tone="blue" />}
      testID="train-week-context"
      title="Next 7 days"
    >
      {bars.length > 0 ? <MiniBarChart bars={bars} height={96} referenceLabel="Support load" /> : <TimelineStrip items={weeklyTimeline(viewModel)} />}
      <Text style={screenStyles.body}>
        Current week: {viewModel.supportGenerationSummary.actualGeneratedSupportCount}/{viewModel.supportGenerationSummary.targetGeneratedSupportCount} support workouts.
      </Text>
      <Text style={screenStyles.subtle}>{plainTrainCopy(viewModel.supportGenerationSummary.athleteFacingWeekSummary)}</Text>
      <View style={{ gap: spacing.xs }}>
        {viewModel.weeklyWorkoutCards.slice(0, 4).map((session) => (
          <Text key={`train-week-session:${session.id}`} style={screenStyles.subtle}>
            {session.date}: {plainTrainCopy(session.title)} ({session.durationMinutes} min)
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

  React.useEffect(() => {
    if (initialSection) {
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
  const pendingStartSession = detailedSessions.find((session) => session.generatedSessionId === pendingStartSessionId) ?? null;
  const playerInProgress = Boolean(activeWorkout && playerStatusIsInProgress(activeWorkout.status));

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

  return (
    <LuminousScreen testID="train-screen">
      <EngineGeneratingCard status={generationStatus === "generating_workout" ? generationStatus : "idle"} />
      {viewModel.riskSummary.length > 0 ? (
        <RiskBanner title="Training safety check" message="Training changes stay blocked or reduced while these safety notes are active." tone="critical">
          <View style={{ gap: spacing.xs }}>
            {viewModel.riskSummary.map((risk, index) => <Text key={`train-risk:${index}`} style={screenStyles.body}>{risk}</Text>)}
          </View>
        </RiskBanner>
      ) : null}
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
      <TrainingOverviewCard viewModel={viewModel} />
      {primarySession ? (
        <View testID="train-workout-section">
          <WorkoutDetailPanel
            busy={busy}
            completionActions={completionActions}
            completionMessage={completionMessage}
            onOpenFuel={onOpenFuelAfterWorkout}
            onStartWorkout={previewOnlyWeeklySession ? undefined : () => startWorkout(primarySession)}
            previewOnlyReason={previewOnlyWeeklySession ? `Scheduled for ${previewOnlyWeeklySession.date}. Do not pull future support work forward from Plan.` : undefined}
            session={primarySession}
            startWorkoutDisabledReason={previewOnlyWeeklySession ? undefined : startWorkoutBlockedReason(viewModel, primarySession)}
            trainViewModel={viewModel}
          />
        </View>
      ) : viewModel.sessionCards.length > 0 || viewModel.todayGeneratedSessions.length > 0 || viewModel.nextGeneratedSession ? (
        <View testID="train-workout-section">
          <WorkoutSummaryCard viewModel={viewModel} />
        </View>
      ) : (
        <EmptyState title="No support workout today" message={plainTrainCopy(viewModel.todaySummary)} />
      )}
      <WeekContextCard viewModel={viewModel} />
      {viewModel.cycleTrainingDecision.status !== "none" ? (
        <DashboardCard title="Cycle context">
          <Text style={screenStyles.body}>{viewModel.cycleTrainingDecision.summary}</Text>
          <Text style={screenStyles.subtle}>{viewModel.cycleTrainingDecision.action}</Text>
        </DashboardCard>
      ) : null}
      <ManualTrainingLoggerSection busy={busy} quickLogs={quickLogs} />
      {completionMessage ? <Text style={[screenStyles.subtle, { color: colors.amberCaution }]}>{completionMessage}</Text> : null}
    </LuminousScreen>
  );
}
