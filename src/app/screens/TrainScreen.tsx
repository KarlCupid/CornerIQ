import React from "react";
import { Pressable, Text, View } from "react-native";
import type { DetailedTrainingSession, ISODateString, RecentLogsViewModel, TrainViewModel } from "../../engine/core/types";
import { EngineGeneratingCard, type EngineGenerationStatus } from "../components/EngineGeneratingCard";
import { EngineCard } from "../../design/components/EngineCard";
import { EmptyState } from "../../design/components/EmptyState";
import { CompactStatusStrip, PrimaryTaskCard, type FastTaskAction } from "../../design/components/FastTask";
import { LuminousScreen, ScreenHeader } from "../../design/components/LuminousScreen";
import { DashboardCard, DashboardPill, MiniBarChart, TimelineStrip } from "../../design/components/PerformanceVisuals";
import { RiskBanner } from "../../design/components/RiskBanner";
import { colors, spacing } from "../../design/theme";
import type { BarVisual, TimelineVisual, VisualTone } from "../../engine/presentation/dashboardVisualData";
import { clamp01 } from "../../engine/presentation/dashboardVisualData";
import { buildTrainReferencePanelViewModel } from "../../engine/presentation/referencePanelViewModel";
import type { QuickLogActions } from "../../hooks/useQuickLogs";
import type { WorkoutCompletionActions } from "../../hooks/useWorkoutCompletion";
import { ProtectedWorkoutLogCard } from "./logging/LogCards";
import { TrainReferencePanel } from "./reference/TabReferencePanels";
import { screenStyles } from "./screenStyles";
import { tabHeroHeaders, tabScreenBackgrounds } from "./tabHeroConfig";
import { WorkoutDetailPanel } from "./train/WorkoutDetailPanel";
import type { WorkoutPlayerStatus } from "./train/WorkoutPlayer";
import { plainFuelDemandLabel, plainIntensityLabel, plainTrainingCopy as plainTrainCopy, plainWorkoutTitle } from "../../engine/presentation/trainingCopy";

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

function toneForIntensity(intensity: string): VisualTone {
  if (intensity === "hard" || intensity === "max") {
    return "orange";
  }
  if (intensity === "easy" || intensity === "recovery") {
    return "green";
  }
  return "blue";
}

function accentForTone(tone: VisualTone): "blue" | "green" | "orange" | "purple" | "gold" | "red" {
  return tone === "muted" ? "blue" : tone;
}

function firstSentence(value: string): string {
  const copy = plainTrainCopy(value).trim();
  const match = copy.match(/^.+?[.!?](?:\s|$)/);
  return (match?.[0] ?? copy).trim();
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
    title: plainWorkoutTitle(session.title, session.family),
    subtitle: `${session.durationMinutes} min - ${plainIntensityLabel(session.intensity)}`,
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

function TrainingOverviewCard({ viewModel }: { viewModel: TrainViewModel }) {
  const roleLabel = plainTrainCopy(viewModel.todayRole.status.replace(/_/g, " "));
  return (
    <DashboardCard headerRight={<DashboardPill label={roleLabel} tone={viewModel.riskSummary.length > 0 ? "red" : "purple"} />} testID="train-overview-card" title="Training overview">
      <Text style={screenStyles.body}>{firstSentence(viewModel.todaySummary)}</Text>
      <Text style={screenStyles.callout}>{plainTrainCopy(viewModel.todayRole.summary)}</Text>
      <View
        style={{
          borderBottomColor: "rgba(255, 255, 255, 0.1)",
          borderBottomWidth: 1,
          borderTopColor: "rgba(255, 255, 255, 0.1)",
          borderTopWidth: 1,
          flexDirection: "row",
          flexWrap: "wrap",
          gap: spacing.xs,
          paddingVertical: spacing.xs
        }}
      >
        <View
          style={{
            flexBasis: 180,
            flexGrow: 1,
            gap: 2,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs
          }}
        >
          <Text style={{ color: colors.amberCaution, fontSize: 11, fontWeight: "800", lineHeight: 15 }}>Fuel check</Text>
          <Text style={screenStyles.subtle}>{plainTrainCopy(viewModel.preSessionFuelHint)}</Text>
        </View>
        <View
          style={{
            flexBasis: 180,
            flexGrow: 1,
            gap: 2,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs
          }}
        >
          <Text style={{ color: colors.powerPurple, fontSize: 11, fontWeight: "800", lineHeight: 15 }}>Hydration</Text>
          <Text style={screenStyles.subtle}>{plainTrainCopy(viewModel.hydrationHint)}</Text>
        </View>
      </View>
      <Text style={screenStyles.subtle}>{firstSentence(viewModel.todayRole.explanation)}</Text>
      <Text style={screenStyles.subtle}>{firstSentence(viewModel.blockExplanation)}</Text>
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
      <Text style={screenStyles.fieldLabel}>Support workout</Text>
      <Text style={screenStyles.callout}>{plainTrainCopy(title)}</Text>
      <Text style={screenStyles.body}>{durationMinutes} min, {plainIntensityLabel(intensity)}. {plainFuelDemandLabel(fuelDemand)}.</Text>
      {card?.why ? <Text style={screenStyles.subtle}>Purpose: {plainTrainCopy(card.why)}</Text> : null}
      {card?.protects && card.protects.length > 0 ? <Text style={screenStyles.subtle}>Boxing benefit: {card.protects.map(plainTrainCopy).join(", ")}</Text> : null}
      {card?.modifications && card.modifications.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          {card.modifications.slice(0, 3).map((item, index) => <Text key={`train-summary-mod:${index}`} style={screenStyles.subtle}>{plainTrainCopy(item)}</Text>)}
        </View>
      ) : null}
      <Text style={screenStyles.subtle}>If you complete it outside the player, log the real workout manually.</Text>
    </DashboardCard>
  );
}

function ManualTrainingLoggerSection({ busy, quickLogs }: { busy: boolean; quickLogs: QuickLogActions }) {
  const [open, setOpen] = React.useState(false);
  return (
    <View style={{ gap: spacing.md }} testID="train-manual-logger-section">
      <DashboardCard title="Manual boxing log">
        <Text style={screenStyles.body}>Log boxing class, roadwork, or outside strength work.</Text>
        <Text style={screenStyles.subtle}>Free-text notes stay advisory.</Text>
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
      headerRight={<DashboardPill label={`${viewModel.supportGenerationSummary.actualGeneratedSupportCount}/${viewModel.supportGenerationSummary.targetGeneratedSupportCount} support`} tone="purple" />}
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
            {session.date}: {plainWorkoutTitle(session.title, session.family)} ({session.durationMinutes} min)
          </Text>
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
  const [quickLogOpenRequestKey, setQuickLogOpenRequestKey] = React.useState(0);

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
  const primarySessionBlockedReason = primarySession && !previewOnlyWeeklySession ? startWorkoutBlockedReason(viewModel, primarySession) : undefined;
  const primarySessionTone = primarySession ? toneForIntensity(primarySession.intensity) : viewModel.riskSummary.length > 0 ? "red" : "blue";
  const referencePanel = buildTrainReferencePanelViewModel(viewModel, asOfDate);

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
  const topPrimaryAction =
    primarySession
          ? previewOnlyWeeklySession
        ? "Preview next support workout. Do not pull forward."
        : plainWorkoutTitle(primarySession.title, primarySession.family)
      : "Log the boxing work you actually did.";
  const topPurpose =
    primarySession
      ? `${primarySession.durationMinutes} min, ${plainIntensityLabel(primarySession.intensity)}. ${plainTrainCopy(viewModel.preSessionFuelHint)}`
      : plainTrainCopy(viewModel.todaySummary);
  const topPrimaryButton: FastTaskAction | undefined = primarySession
    ? {
        accessibilityLabel: "Start workout",
        disabled: busy || Boolean(primarySessionBlockedReason) || Boolean(previewOnlyWeeklySession) || !onStartWorkout,
        label: previewOnlyWeeklySession ? "Preview only" : "Start workout",
        onPress: () => startWorkout(primarySession),
        summary: previewOnlyWeeklySession ? "Preview only" : primarySessionBlockedReason ? "Blocked" : "Follow along"
      }
    : undefined;
  const topSecondaryActions: FastTaskAction[] = [
    ...(primarySession && !previewOnlyWeeklySession
      ? [{
          disabled: busy,
          label: "Quick log",
          onPress: () => setQuickLogOpenRequestKey((value) => value + 1),
          summary: "RPE only"
        }]
      : []),
    ...(primarySession
      ? [{
          disabled: busy,
          label: "Show exercise details",
          onPress: () => setPlanOpenRequestKey((value) => value + 1),
          summary: "Exercises"
        }]
      : [])
  ];
  const openReferenceDetails = () => {
    setPlanOpenRequestKey((value) => value + 1);
  };
  const startReferenceSession = () => {
    if (primarySession && !primarySessionBlockedReason && !previewOnlyWeeklySession) {
      startWorkout(primarySession);
      return;
    }
    openReferenceDetails();
  };

  return (
    <LuminousScreen accent="purple" backgroundImage={tabScreenBackgrounds.train} testID="train-screen">
      <ScreenHeader {...tabHeroHeaders.train} />
      <TrainReferencePanel model={referencePanel} onOpenDetails={openReferenceDetails} onStartSession={startReferenceSession} />
      <EngineGeneratingCard status={generationStatus === "generating_workout" ? generationStatus : "idle"} />
      <PrimaryTaskCard
        accent={accentForTone(primarySessionTone)}
        actionLayout="primary-led"
        primaryAction={topPrimaryAction}
        primaryButton={topPrimaryButton}
        purpose={topPurpose}
        secondaryActions={topSecondaryActions}
        testID="train-primary-task"
        title="Next session"
      >
        <CompactStatusStrip
          items={[
            {
              accent: viewModel.riskSummary.length > 0 ? "red" : "blue",
              label: "Today",
              meta: plainTrainCopy(viewModel.todayRole.summary),
              value: plainTrainCopy(viewModel.todayRole.status.replace(/_/g, " "))
            },
            {
              accent: accentForTone(primarySessionTone),
              label: "Workout",
              meta: primarySession ? `${primarySession.durationMinutes} min` : "Manual log",
              value: primarySession ? plainIntensityLabel(primarySession.intensity) : "None"
            },
            {
              accent: "green",
              label: "Week",
              meta: "Support workouts",
              value: `${viewModel.supportGenerationSummary.actualGeneratedSupportCount}/${viewModel.supportGenerationSummary.targetGeneratedSupportCount}`
            }
          ]}
          variant="quiet"
        />
      </PrimaryTaskCard>
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
            planOpenRequestKey={planOpenRequestKey}
            previewOnlyReason={previewOnlyWeeklySession ? `Scheduled for ${previewOnlyWeeklySession.date}. Do not pull future support work forward from Plan.` : undefined}
            quickLogOpenRequestKey={quickLogOpenRequestKey}
            session={primarySession}
            startWorkoutDisabledReason={previewOnlyWeeklySession ? undefined : startWorkoutBlockedReason(viewModel, primarySession)}
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
