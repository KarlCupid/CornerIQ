import React from "react";
import { ScrollView, Text, View } from "react-native";
import type { RecentLogsViewModel, TrainViewModel } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
import { spacing } from "../../design/theme";
import type { QuickLogActions } from "../../hooks/useQuickLogs";
import type { WorkoutCompletionActions } from "../../hooks/useWorkoutCompletion";
import { ProtectedWorkoutLogCard } from "./logging/LogCards";
import { screenStyles } from "./screenStyles";
import { WorkoutDetailPanel } from "./train/WorkoutDetailPanel";

export interface TrainScreenProps {
  busy: boolean;
  completionActions?: WorkoutCompletionActions | undefined;
  completionMessage?: string | null | undefined;
  quickLogs: QuickLogActions;
  recentLogs: RecentLogsViewModel;
  viewModel: TrainViewModel;
}

export function TrainScreen({ busy, completionActions, completionMessage, quickLogs, recentLogs, viewModel }: TrainScreenProps) {
  return (
    <ScrollView style={screenStyles.screen} contentContainerStyle={screenStyles.content}>
      <Text style={screenStyles.title}>{viewModel.title}</Text>
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Today's training decision</Text>
          <Text style={screenStyles.body}>{viewModel.todaySummary}</Text>
          <Text style={screenStyles.body}>{viewModel.protectedAnchorSummary}</Text>
        </View>
      </EngineCard>
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Block context</Text>
          <Text style={screenStyles.body}>{viewModel.blockPhase.replaceAll("_", " ")} - {viewModel.blockGoal}</Text>
          <Text style={screenStyles.body}>{viewModel.blockExplanation}</Text>
          <Text style={screenStyles.callout}>{viewModel.todayRole.summary}</Text>
          <Text style={screenStyles.subtle}>{viewModel.todayRole.explanation}</Text>
        </View>
      </EngineCard>
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Fuel handoff</Text>
          <Text style={screenStyles.body}>{viewModel.preSessionFuelHint}</Text>
          <Text style={screenStyles.body}>{viewModel.postSessionFuelHint}</Text>
          <Text style={screenStyles.subtle}>{viewModel.hydrationHint}</Text>
        </View>
      </EngineCard>
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Cycle training decision</Text>
          <Text style={screenStyles.body}>{viewModel.cycleTrainingDecision.summary}</Text>
          <Text style={screenStyles.subtle}>{viewModel.cycleTrainingDecision.action}</Text>
        </View>
      </EngineCard>
      {viewModel.detailedTodaySessions.map((session) => (
        <EngineCard key={session.generatedSessionId}>
          {session.detail ? (
            <WorkoutDetailPanel busy={busy} completionActions={completionActions} completionMessage={completionMessage} session={session.detail} />
          ) : (
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.sectionTitle}>{session.title}</Text>
              <Text style={screenStyles.body}>{session.whyThisMattersForBoxing}</Text>
              {session.safetyNotes.map((note) => <Text key={note} style={screenStyles.subtle}>{note}</Text>)}
            </View>
          )}
        </EngineCard>
      ))}
      {viewModel.sessionCards.map((session) => (
        <EngineCard key={session.title}>
          <View style={{ gap: spacing.sm }}>
            <Text style={screenStyles.sectionTitle}>Generated support summary</Text>
            <Text style={screenStyles.body}>{session.title}: {session.intensity} - {session.durationMinutes} min</Text>
            <Text style={screenStyles.body}>Why: {session.why}</Text>
            <Text style={screenStyles.body}>Fuel demand: {session.fuelDemand}</Text>
            {session.modifications.map((item) => <Text key={item} style={screenStyles.subtle}>Modify: {item}</Text>)}
            {session.protects.map((item) => <Text key={item} style={screenStyles.subtle}>Protects: {item}</Text>)}
          </View>
        </EngineCard>
      ))}
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Recent training</Text>
          {recentLogs.training.map((item) => <Text key={item} style={screenStyles.body}>{item}</Text>)}
          {viewModel.analytics.lastCompletedSession ? <Text style={screenStyles.subtle}>Last completed: {viewModel.analytics.lastCompletedSession}</Text> : null}
          {viewModel.analytics.lastSkippedSession ? <Text style={screenStyles.subtle}>Last skipped: {viewModel.analytics.lastSkippedSession}</Text> : null}
          <Text style={screenStyles.subtle}>Completions last 7 days: {viewModel.analytics.completionCountLast7Days}</Text>
          <Text style={screenStyles.subtle}>Exercise results last 7 days: {viewModel.analytics.exerciseResultCountLast7Days}</Text>
          <Text style={screenStyles.subtle}>{viewModel.analytics.consistencySummary}</Text>
        </View>
      </EngineCard>
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Progression / next best action</Text>
          <Text style={screenStyles.body}>{viewModel.progressionSummary.summary}</Text>
          <Text style={screenStyles.subtle}>{viewModel.progressionSummary.status}: {viewModel.progressionSummary.why}</Text>
          <Text style={screenStyles.callout}>{viewModel.analytics.nextBestTrainingAction}</Text>
          <Text style={screenStyles.subtle}>Generated completed/skipped: {viewModel.analytics.generatedSessionsCompleted}/{viewModel.analytics.generatedSessionsSkipped}</Text>
          <Text style={screenStyles.subtle}>Pain flags: {viewModel.analytics.painFlagCount}</Text>
          <Text style={screenStyles.subtle}>Exercise status completed/partial/prescribed only: {viewModel.analytics.completedResultCount}/{viewModel.analytics.partialResultCount}/{viewModel.analytics.prescribedOnlyCount}</Text>
          {viewModel.analytics.averageSessionRpe === null ? null : <Text style={screenStyles.subtle}>Average session RPE: {viewModel.analytics.averageSessionRpe}</Text>}
          {viewModel.analytics.averageExerciseRpe === null ? null : <Text style={screenStyles.subtle}>Average exercise RPE: {viewModel.analytics.averageExerciseRpe}</Text>}
          {viewModel.analytics.mostRecentExerciseResultSummary ? <Text style={screenStyles.subtle}>Recent exercise: {viewModel.analytics.mostRecentExerciseResultSummary}</Text> : null}
          {viewModel.analytics.mostRepeatedExercise ? <Text style={screenStyles.subtle}>Repeated exercise: {viewModel.analytics.mostRepeatedExercise}</Text> : null}
          {viewModel.analytics.latestStrengthExerciseSummary ? <Text style={screenStyles.subtle}>Strength actual: {viewModel.analytics.latestStrengthExerciseSummary}</Text> : null}
          {viewModel.analytics.painFlagExercises.map((exercise) => <Text key={exercise} style={screenStyles.subtle}>Pain flag exercise: {exercise}</Text>)}
          <Text style={screenStyles.subtle}>Today's completion will influence next week's dose.</Text>
        </View>
      </EngineCard>
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Risk summary</Text>
          {viewModel.riskSummary.length > 0 ? viewModel.riskSummary.map((risk) => <Text key={risk} style={screenStyles.body}>{risk}</Text>) : <Text style={screenStyles.body}>No active training warnings.</Text>}
        </View>
      </EngineCard>
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Protected workout logging</Text>
          <Text style={screenStyles.subtle}>Log coach-led boxing work here so generated support stays secondary.</Text>
        </View>
      </EngineCard>
      <ProtectedWorkoutLogCard actions={quickLogs} busy={busy} />
    </ScrollView>
  );
}
