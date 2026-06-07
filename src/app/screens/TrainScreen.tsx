import React from "react";
import { Pressable, Text, View } from "react-native";
import type { DetailedTrainingSession, RecentLogsViewModel, TrainViewModel } from "../../engine/core/types";
import { EngineGeneratingCard, type EngineGenerationStatus } from "../components/EngineGeneratingCard";
import { CollapsedDetailDisclosure, CompactStatusStrip, PrimaryTaskCard } from "../../design/components/FastTask";
import { EngineCard } from "../../design/components/EngineCard";
import { EmptyState } from "../../design/components/EmptyState";
import { LuminousScreen, ScreenHeader, type LuminousAccent } from "../../design/components/LuminousScreen";
import { RiskBanner } from "../../design/components/RiskBanner";
import { SectionTabs, type SectionTabItem } from "../../design/components/SectionTabs";
import { TopActionCard } from "../../design/components/TopActionCard";
import { colors, spacing } from "../../design/theme";
import type { QuickLogActions } from "../../hooks/useQuickLogs";
import type { WorkoutCompletionActions } from "../../hooks/useWorkoutCompletion";
import { ProtectedWorkoutLogCard } from "./logging/LogCards";
import { screenStyles } from "./screenStyles";
import { ExerciseHistoryPanel } from "./train/ExerciseHistoryPanel";
import { WorkoutDetailPanel } from "./train/WorkoutDetailPanel";
import { WorkoutPlayer, type WorkoutPlayerStatus } from "./train/WorkoutPlayer";

export type TrainSection = "today" | "workout" | "progress";

const trainSections: readonly SectionTabItem<TrainSection>[] = [
  { key: "today", label: "Today" },
  { key: "workout", label: "Workout" },
  { key: "progress", label: "Progress" }
];

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

export interface TrainScreenProps {
  busy: boolean;
  completionActions?: WorkoutCompletionActions | undefined;
  completionMessage?: string | null | undefined;
  generationStatus?: EngineGenerationStatus | undefined;
  initialSection?: TrainSection | undefined;
  onInitialSectionApplied?: (() => void) | undefined;
  onOpenFuelAfterWorkout?: (() => void) | undefined;
  quickLogs: QuickLogActions;
  recentLogs: RecentLogsViewModel;
  viewModel: TrainViewModel;
}

function ManualTrainingLoggerSection({ busy, quickLogs }: { busy: boolean; quickLogs: QuickLogActions }) {
  const [open, setOpen] = React.useState(false);
  return (
    <View style={{ gap: spacing.lg }} testID="train-manual-logger-section">
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Log your own training</Text>
          <Text style={screenStyles.subtle}>Use this for boxing class, roadwork, sparring you already do, or strength work not created by CornerIQ.</Text>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: open }} onPress={() => setOpen((value) => !value)} style={screenStyles.quietButton}>
            <Text style={screenStyles.quietButtonText}>{open ? "Hide manual training log" : "Show manual training log"}</Text>
          </Pressable>
        </View>
      </EngineCard>
      {open ? <ProtectedWorkoutLogCard actions={quickLogs} busy={busy} /> : null}
    </View>
  );
}

function sessionPurpose(session: TrainViewModel["sessionCards"][number]): string {
  if (session.intensity === "easy" || session.intensity === "recovery") {
    return "Purpose: keep the body ready for boxing without chasing fatigue.";
  }
  const protectedWork = session.protects[0];
  return protectedWork ? `Purpose: build ${protectedWork.toLowerCase()} while keeping boxing quality first.` : "Purpose: build training capacity around fixed boxing.";
}

function flowAccent(index: number): LuminousAccent {
  return (["blue", "purple", "orange", "green"] as const)[index % 4] ?? "blue";
}

function sessionMetricValue(viewModel: TrainViewModel): string {
  const count = viewModel.sessionCards.length;
  if (count === 0) {
    return "No session";
  }
  return `${count} session${count === 1 ? "" : "s"}`;
}

function fuelMetricValue(viewModel: TrainViewModel): string {
  const demand = viewModel.sessionCards[0]?.fuelDemand;
  if (!demand) {
    return "Fuel check";
  }
  return `${demand.charAt(0).toUpperCase()}${demand.slice(1)} fuel demand`;
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
    <EngineCard>
      <View style={{ gap: spacing.sm }} testID="train-workout-in-progress-card">
        <Text style={screenStyles.sectionTitle}>Workout in progress</Text>
        <Text style={screenStyles.body}>{sessionTitle}</Text>
        <Text style={screenStyles.subtle}>Status: {status.replace(/_/g, " ")}. Progress stays available while Train remains mounted.</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <Pressable accessibilityRole="button" onPress={onResume} style={screenStyles.button}>
            <Text style={screenStyles.buttonText}>Resume workout</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onDiscard} style={screenStyles.quietButton}>
            <Text style={screenStyles.quietButtonText}>Discard progress</Text>
          </Pressable>
        </View>
      </View>
    </EngineCard>
  );
}

function WorkoutFlowPreview({ session }: { session: TrainViewModel["sessionCards"][number] }) {
  const label = session.sessionTypeLabel ?? "Support workout";
  return (
      <View style={{ gap: spacing.lg }}>
        <Text style={screenStyles.sectionTitle}>Flow</Text>
        {session.prescription.slice(0, 4).map((item, index) => (
          <View key={`flow:${index}`} style={{ alignItems: "center", flexDirection: "row", gap: spacing.md }}>
            <View
              style={{
                alignItems: "center",
                backgroundColor: "rgba(255, 255, 255, 0.06)",
                borderColor:
                  flowAccent(index) === "blue"
                    ? "rgba(39, 206, 241, 0.36)"
                    : flowAccent(index) === "purple"
                      ? "rgba(150, 87, 245, 0.34)"
                      : flowAccent(index) === "orange"
                        ? "rgba(255, 148, 72, 0.34)"
                        : "rgba(56, 226, 138, 0.34)",
                borderRadius: 16,
                borderWidth: 1,
                height: 48,
                justifyContent: "center",
                width: 48
              }}
            >
              <Text style={{ color: colors.canvas, fontSize: 16, fontWeight: "800" }}>{String(index + 1).padStart(2, "0")}</Text>
            </View>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text style={screenStyles.body}>{item}</Text>
              <Text style={screenStyles.subtle}>{label}</Text>
            </View>
          </View>
        ))}
      </View>
  );
}

function WeeklySupportWorkCard({ viewModel }: { viewModel: TrainViewModel }) {
  const generation = viewModel.supportGenerationSummary;
  if (viewModel.weeklyWorkoutCards.length === 0 && generation.blockedGenerationReasons.length === 0) {
    return null;
  }
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }} testID="train-weekly-generated-work">
        <Text style={screenStyles.sectionTitle}>Support workouts</Text>
        <Text style={screenStyles.body}>
          Current week: {generation.actualGeneratedSupportCount}/{generation.targetGeneratedSupportCount} support workout{generation.actualGeneratedSupportCount === 1 ? "" : "s"}.
        </Text>
        <Text style={screenStyles.body}>{plainTrainCopy(generation.athleteFacingWeekSummary)}</Text>
        <Text style={screenStyles.subtle}>Development theme: {generation.weekDevelopmentTheme}</Text>
        <Text style={screenStyles.subtle}>Today: {generation.todayGeneratedSupportCount} support workout{generation.todayGeneratedSupportCount === 1 ? "" : "s"}.</Text>
        <Text style={screenStyles.body}>{plainTrainCopy(viewModel.todaySummary)}</Text>
        {viewModel.weeklyWorkoutCards.length > 0 ? viewModel.weeklyWorkoutCards.map((session) => (
          <View key={session.id} style={{ gap: spacing.xs }}>
            <Text style={screenStyles.fieldLabel}>{session.label}</Text>
            <Text style={screenStyles.body}>{session.sessionTypeLabel ?? "Support workout"}: {session.title}</Text>
            <Text style={screenStyles.subtle}>{session.summary}</Text>
          </View>
        )) : <Text style={screenStyles.subtle}>No current-week support workouts are active.</Text>}
        {generation.blockedGenerationReasons.map((reason, index) => <Text key={`train-generation-reason:${index}`} style={screenStyles.subtle}>Plan note: {plainTrainCopy(reason)}</Text>)}
      </View>
    </EngineCard>
  );
}

function ExecutionOverlayDetails({ viewModel }: { viewModel: TrainViewModel }) {
  return (
      <View style={{ gap: spacing.sm }} testID="train-execution-overlay-card">
        <Text style={screenStyles.sectionTitle}>Planned workout</Text>
        <Text style={screenStyles.body}>{viewModel.executionOverlay.plannedTraining}</Text>
        <Text style={screenStyles.sectionTitle}>How to do it</Text>
        {viewModel.executionOverlay.executionGuidance.map((item, index) => <Text key={`train-how-to:${index}`} style={screenStyles.subtle}>{item}</Text>)}
        {viewModel.executionOverlay.missingDataAdvisories.length > 0 ? (
          <>
            <Text style={screenStyles.sectionTitle}>Missing-data advisory</Text>
            {viewModel.executionOverlay.missingDataAdvisories.map((item, index) => <Text key={`train-missing-advisory:${index}`} style={screenStyles.subtle}>{item}</Text>)}
          </>
        ) : null}
        {viewModel.executionOverlay.safetyOverrideReason ? (
          <>
            <Text style={screenStyles.sectionTitle}>Evidence-based safety override</Text>
            <Text style={screenStyles.body}>{viewModel.executionOverlay.safetyOverrideReason}</Text>
          </>
        ) : null}
      </View>
  );
}

export function TrainScreen({
  busy,
  completionActions,
  completionMessage,
  generationStatus = "idle",
  initialSection,
  onInitialSectionApplied,
  onOpenFuelAfterWorkout,
  quickLogs,
  recentLogs,
  viewModel
}: TrainScreenProps) {
  const [section, setSection] = React.useState<TrainSection>(initialSection ?? "today");
  const [playerSessionId, setPlayerSessionId] = React.useState<string | null>(null);
  const [playerInstanceKey, setPlayerInstanceKey] = React.useState(0);
  const [playerVisible, setPlayerVisible] = React.useState(false);
  const [playerStatus, setPlayerStatus] = React.useState<WorkoutPlayerStatus>("not_started");
  const [pendingStartSessionId, setPendingStartSessionId] = React.useState<string | null>(null);
  const [quickLogRequest, setQuickLogRequest] = React.useState<{ key: number; sessionId: string | null }>({ key: 0, sessionId: null });
  const [planOpenRequest, setPlanOpenRequest] = React.useState<{ key: number; sessionId: string | null }>({ key: 0, sessionId: null });
  React.useEffect(() => {
    if (!initialSection) {
      return;
    }
    setSection(initialSection);
    onInitialSectionApplied?.();
  }, [initialSection, onInitialSectionApplied]);

  const detailedSessions = viewModel.detailedTodaySessions
    .map((session) => session.detail)
    .filter((session): session is DetailedTrainingSession => session !== null);
  const playerSession = detailedSessions.find((session) => session.generatedSessionId === playerSessionId) ?? null;
  const pendingStartSession = detailedSessions.find((session) => session.generatedSessionId === pendingStartSessionId) ?? null;
  const playerInProgress = Boolean(playerSession && playerStatusIsInProgress(playerStatus));

  const discardPlayer = () => {
    setPlayerVisible(false);
    setPlayerSessionId(null);
    setPendingStartSessionId(null);
    setPlayerStatus("not_started");
    setPlayerInstanceKey((value) => value + 1);
  };

  const startWorkout = (sessionDetail: DetailedTrainingSession) => {
    const blockedReason = startWorkoutBlockedReason(viewModel, sessionDetail);
    if (blockedReason) {
      return;
    }
    if (playerInProgress && playerSessionId && playerSessionId !== sessionDetail.generatedSessionId) {
      setPendingStartSessionId(sessionDetail.generatedSessionId);
      setPlayerVisible(false);
      return;
    }
    if (playerSessionId !== sessionDetail.generatedSessionId || playerStatus === "completed" || playerStatus === "skipped") {
      setPlayerInstanceKey((value) => value + 1);
      setPlayerStatus("active");
    }
    setPlayerSessionId(sessionDetail.generatedSessionId);
    setPendingStartSessionId(null);
    setPlayerVisible(true);
  };

  const openQuickLog = (sessionDetail: DetailedTrainingSession) => {
    setSection("workout");
    setPlayerVisible(false);
    setQuickLogRequest((current) => ({ key: current.key + 1, sessionId: sessionDetail.generatedSessionId }));
  };

  const openPlan = (sessionDetail: DetailedTrainingSession) => {
    setSection("workout");
    setPlayerVisible(false);
    setPlanOpenRequest((current) => ({ key: current.key + 1, sessionId: sessionDetail.generatedSessionId }));
  };

  const changeSection = (nextSection: TrainSection) => {
    setSection(nextSection);
    if (playerInProgress) {
      setPlayerVisible(false);
    }
  };
  return (
    <LuminousScreen testID="train-screen">
      <ScreenHeader eyebrow="Workout" title={viewModel.title} />
      <EngineGeneratingCard status={generationStatus === "generating_workout" ? generationStatus : "idle"} />
      <TopActionCard
        accent="purple"
        optional={plainTrainCopy(viewModel.topAction.optional)}
        primaryAction={plainTrainCopy(viewModel.topAction.primaryAction)}
        purpose={plainTrainCopy(viewModel.topAction.purpose)}
        testID="train-top-action-card"
        title={viewModel.topAction.title}
        why={plainTrainCopy(viewModel.topAction.why)}
      />
      <CompactStatusStrip
        items={[
          { accent: "purple", label: "Session", meta: viewModel.todayRole.status.replace(/_/g, " "), value: sessionMetricValue(viewModel) },
          { accent: "orange", label: "Fuel", meta: "Carbs + water", value: fuelMetricValue(viewModel) }
        ]}
        testID="train-compact-status-strip"
      />
      <SectionTabs items={trainSections} value={section} onChange={changeSection} />
      {viewModel.riskSummary.length > 0 ? (
        <RiskBanner title="Training safety check" message="Training changes stay blocked or reduced while these safety notes are active." tone="critical">
          <View style={{ gap: spacing.xs }}>
            {viewModel.riskSummary.map((risk, index) => <Text key={`train-risk:${index}`} style={screenStyles.body}>{risk}</Text>)}
          </View>
        </RiskBanner>
      ) : null}
      {pendingStartSession && playerSession ? (
        <EngineCard>
          <View style={{ gap: spacing.sm }} testID="train-start-conflict-card">
            <Text style={screenStyles.sectionTitle}>Workout in progress</Text>
            <Text style={screenStyles.body}>Resume {playerSession.title} or discard it before starting {pendingStartSession.title}.</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              <Pressable accessibilityRole="button" onPress={() => setPlayerVisible(true)} style={screenStyles.button}>
                <Text style={screenStyles.buttonText}>Resume workout</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setPlayerSessionId(pendingStartSession.generatedSessionId);
                  setPendingStartSessionId(null);
                  setPlayerStatus("active");
                  setPlayerInstanceKey((value) => value + 1);
                  setPlayerVisible(true);
                }}
                style={screenStyles.quietButton}
              >
                <Text style={screenStyles.quietButtonText}>Discard and start</Text>
              </Pressable>
            </View>
          </View>
        </EngineCard>
      ) : null}
      {playerInProgress && !playerVisible && playerSession ? (
        <WorkoutInProgressCard
          onDiscard={discardPlayer}
          onResume={() => setPlayerVisible(true)}
          sessionTitle={playerSession.title}
          status={playerStatus}
        />
      ) : null}
      {playerSession ? (
        <View style={{ display: playerVisible ? "flex" : "none" }}>
          <WorkoutPlayer
            busy={busy}
            completionActions={completionActions}
            completionMessage={completionMessage}
            key={`${playerSession.generatedSessionId}:${playerInstanceKey}`}
            onClose={() => setPlayerVisible(false)}
            onDiscard={discardPlayer}
            onOpenFuel={onOpenFuelAfterWorkout}
            onStatusChange={setPlayerStatus}
            session={playerSession}
          />
        </View>
      ) : null}
      {!playerVisible && section === "today" ? (
        <View style={{ gap: spacing.lg }} testID="train-today-section">
          {viewModel.sessionCards.length > 0 ? viewModel.sessionCards.map((session, index) => {
            const detail = viewModel.detailedTodaySessions[index]?.detail ?? null;
            const blockedReason = detail ? startWorkoutBlockedReason(viewModel, detail) : undefined;
            return (
            <View key={`today-session:${index}`} testID={index === 0 ? "train-main-workout-command" : undefined}>
              <PrimaryTaskCard
                accent="purple"
                primaryAction={detail ? "Start workout and follow one step at a time." : "Open workout, then quick log."}
                primaryButton={
                  detail
                    ? {
                        disabled: busy || Boolean(blockedReason),
                        label: blockedReason ? "Safety first" : "Start workout",
                        onPress: () => startWorkout(detail),
                        summary: blockedReason ? "Start unavailable" : "Follow along"
                      }
                    : { disabled: busy, label: "Open workout", onPress: () => changeSection("workout"), summary: "Quick log" }
                }
                purpose={`${session.durationMinutes} min, ${session.intensity}. ${sessionPurpose(session)}`}
                secondaryActions={
                  detail
                    ? [
                        { disabled: busy, label: "Quick log", onPress: () => openQuickLog(detail), summary: "Fast fallback" },
                        { disabled: busy, label: "Show plan", onPress: () => openPlan(detail), summary: "Collapsed detail" }
                      ]
                    : []
                }
                testID={index === 0 ? "train-primary-workout-task" : undefined}
                title={session.title}
              />
              {blockedReason ? <Text style={[screenStyles.subtle, { color: colors.amberCaution }]}>{blockedReason}</Text> : null}
              <CollapsedDetailDisclosure title="Why / safety" summary="Plan context, fuel notes, and safety detail stay hidden unless you need them.">
                <View style={{ gap: spacing.sm }}>
                  <Text style={screenStyles.body}>Why: {session.why}</Text>
                  {session.readinessGate ? <Text style={screenStyles.subtle}>Readiness check: {session.readinessGate}</Text> : null}
                  {session.fuelingGate ? <Text style={screenStyles.subtle}>Fuel check: {session.fuelingGate}</Text> : null}
                  {session.hydrationGate ? <Text style={screenStyles.subtle}>Hydration check: {session.hydrationGate}</Text> : null}
                  {session.prescription.slice(0, 6).map((item, itemIndex) => <Text key={`prescription:${index}:${itemIndex}`} style={screenStyles.subtle}>Plan: {item}</Text>)}
                  {session.downshiftIf?.slice(0, 2).map((item, itemIndex) => <Text key={`downshift:${index}:${itemIndex}`} style={screenStyles.subtle}>Downshift if: {item}</Text>)}
                  <Text style={screenStyles.subtle}>{viewModel.postSessionFuelHint}</Text>
                  <Text style={screenStyles.subtle}>{viewModel.hydrationHint}</Text>
                  {session.modifications.map((item, itemIndex) => <Text key={`modify:${index}:${itemIndex}`} style={screenStyles.subtle}>Modify: {item}</Text>)}
                  {session.protects.map((item, itemIndex) => <Text key={`protects:${index}:${itemIndex}`} style={screenStyles.subtle}>Protects: {item}</Text>)}
                </View>
              </CollapsedDetailDisclosure>
            </View>
          );
          }) : (
            <EmptyState title="No support workout today" message={plainTrainCopy(viewModel.todaySummary)} />
          )}
          {viewModel.sessionCards[0] ? (
            <CollapsedDetailDisclosure title="Workout flow" summary="Open for section order when you need the plan before training.">
              <WorkoutFlowPreview session={viewModel.sessionCards[0]} />
            </CollapsedDetailDisclosure>
          ) : null}
          <CollapsedDetailDisclosure title="Plan context" summary={`${viewModel.todayRole.summary} ${viewModel.protectedAnchorSummary}`}>
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.body}>{viewModel.blockPhase.replaceAll("_", " ")} - {viewModel.blockGoal}</Text>
              <Text style={screenStyles.body}>{viewModel.blockExplanation}</Text>
              <Text style={screenStyles.subtle}>{viewModel.todayRole.explanation}</Text>
              <Text style={screenStyles.subtle}>{viewModel.analytics.nextBestTrainingAction}</Text>
            </View>
          </CollapsedDetailDisclosure>
          {viewModel.cycleTrainingDecision.status !== "none" ? (
          <EngineCard>
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.sectionTitle}>Cycle context</Text>
              <Text style={screenStyles.body}>{viewModel.cycleTrainingDecision.summary}</Text>
              <Text style={screenStyles.subtle}>{viewModel.cycleTrainingDecision.action}</Text>
            </View>
          </EngineCard>
          ) : null}
        </View>
      ) : null}
      {!playerVisible && section === "workout" ? (
        <View style={{ gap: spacing.lg }} testID="train-workout-section">
          {viewModel.detailedTodaySessions.length > 0 ? viewModel.detailedTodaySessions.map((session) => (
            session.detail ? (
              <WorkoutDetailPanel
                busy={busy}
                completionActions={completionActions}
                completionMessage={completionMessage}
                key={session.generatedSessionId}
                onOpenFuel={onOpenFuelAfterWorkout}
                onStartWorkout={() => startWorkout(session.detail!)}
                planOpenRequestKey={planOpenRequest.sessionId === session.generatedSessionId ? planOpenRequest.key : 0}
                quickLogOpenRequestKey={quickLogRequest.sessionId === session.generatedSessionId ? quickLogRequest.key : 0}
                session={session.detail}
                startWorkoutDisabledReason={startWorkoutBlockedReason(viewModel, session.detail)}
              />
            ) : (
              <EngineCard key={session.generatedSessionId}>
                <View style={{ gap: spacing.sm }}>
                  <Text style={screenStyles.sectionTitle}>{session.title}</Text>
                  {session.firstExercises.map((item, index) => <Text key={`first-exercise:${session.generatedSessionId}:${index}`} style={screenStyles.body}>{item}</Text>)}
                  <Text style={screenStyles.body}>{session.whyThisMattersForBoxing}</Text>
                  {session.safetyNotes.map((note, index) => <Text key={`fallback-safety:${session.generatedSessionId}:${index}`} style={screenStyles.subtle}>{note}</Text>)}
                </View>
              </EngineCard>
            )
          )) : <EmptyState title="No workout detail today" message="No support workout detail is due today. Future work should not be pulled forward from Plan. Log boxing if it happens; otherwise this section can wait." />}
          <CollapsedDetailDisclosure title="How to do it" summary="Planned workout and missing-log notes stay collapsed by default.">
            <ExecutionOverlayDetails viewModel={viewModel} />
          </CollapsedDetailDisclosure>
          <ManualTrainingLoggerSection busy={busy} quickLogs={quickLogs} />
        </View>
      ) : null}
      {!playerVisible && section === "progress" ? (
        <View style={{ gap: spacing.lg }} testID="train-progress-section">
          <WeeklySupportWorkCard viewModel={viewModel} />
          <EngineCard>
            <ExerciseHistoryPanel history={viewModel.exerciseHistory} />
          </EngineCard>
          <EngineCard>
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.sectionTitle}>Recent training</Text>
              {recentLogs.training.length > 0 ? recentLogs.training.map((item, index) => <Text key={`recent-training:${index}`} style={screenStyles.body}>{item}</Text>) : <Text style={screenStyles.body}>No recent training logs yet.</Text>}
              {viewModel.analytics.lastCompletedSession ? <Text style={screenStyles.subtle}>Last completed: {viewModel.analytics.lastCompletedSession}</Text> : null}
              {viewModel.analytics.lastSkippedSession ? <Text style={screenStyles.subtle}>Last skipped: {viewModel.analytics.lastSkippedSession}</Text> : null}
              <Text style={screenStyles.subtle}>Completions last 7 days: {viewModel.analytics.completionCountLast7Days}</Text>
              <Text style={screenStyles.subtle}>Exercise results last 7 days: {viewModel.analytics.exerciseResultCountLast7Days}</Text>
              <Text style={screenStyles.subtle}>{viewModel.analytics.consistencySummary}</Text>
            </View>
          </EngineCard>
          <EngineCard>
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.sectionTitle}>Progress</Text>
              <Text style={screenStyles.body}>{viewModel.progressionSummary.summary}</Text>
              <Text style={screenStyles.subtle}>{viewModel.progressionSummary.status}: {viewModel.progressionSummary.why}</Text>
              <Text style={screenStyles.callout}>{viewModel.analytics.nextBestTrainingAction}</Text>
              <Text style={screenStyles.subtle}>Support workouts done/skipped: {viewModel.analytics.generatedSessionsCompleted}/{viewModel.analytics.generatedSessionsSkipped}</Text>
              <Text style={screenStyles.subtle}>Pain flags: {viewModel.analytics.painFlagCount}</Text>
              <Text style={screenStyles.subtle}>Exercise status done/partial/not logged: {viewModel.analytics.completedResultCount}/{viewModel.analytics.partialResultCount}/{viewModel.analytics.prescribedOnlyCount}</Text>
              {viewModel.analytics.averageSessionRpe === null ? null : <Text style={screenStyles.subtle}>Average session RPE: {viewModel.analytics.averageSessionRpe}</Text>}
              {viewModel.analytics.averageExerciseRpe === null ? null : <Text style={screenStyles.subtle}>Average exercise RPE: {viewModel.analytics.averageExerciseRpe}</Text>}
              {viewModel.analytics.mostRecentExerciseResultSummary ? <Text style={screenStyles.subtle}>Recent exercise: {viewModel.analytics.mostRecentExerciseResultSummary}</Text> : null}
              {viewModel.analytics.mostRepeatedExercise ? <Text style={screenStyles.subtle}>Repeated exercise: {viewModel.analytics.mostRepeatedExercise}</Text> : null}
              {viewModel.analytics.latestStrengthExerciseSummary ? <Text style={screenStyles.subtle}>Strength actual: {viewModel.analytics.latestStrengthExerciseSummary}</Text> : null}
              <Text style={screenStyles.subtle}>{viewModel.analytics.structuredLoadSummary}</Text>
              {viewModel.analytics.painFlagExercises.map((exercise, index) => <Text key={`pain-flag-exercise:${index}`} style={screenStyles.subtle}>Pain flag exercise: {exercise}</Text>)}
              <Text style={screenStyles.subtle}>Today's completion will influence next week's dose, but no numeric load progression is inferred from notes.</Text>
            </View>
          </EngineCard>
        </View>
      ) : null}
    </LuminousScreen>
  );
}
