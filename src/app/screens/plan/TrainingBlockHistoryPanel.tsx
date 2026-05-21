import React from "react";
import { Text, View } from "react-native";
import type { TrainingBlockHistoryDetailViewModel } from "../../../engine/core/types";
import { spacing } from "../../../design/theme";
import { screenStyles } from "../screenStyles";

export interface TrainingBlockHistoryPanelProps {
  history: TrainingBlockHistoryDetailViewModel;
}

export function TrainingBlockHistoryPanel({ history }: TrainingBlockHistoryPanelProps) {
  const hasNoHistory =
    history.weekSummaries.length === 0 &&
    history.progressionDecisions.length === 0 &&
    history.timelineEvents.length === 0 &&
    history.groupedWeeks.length === 0 &&
    history.adjustmentEvents.length === 0 &&
    history.safetyFlags.length === 0 &&
    history.latestNextWeekPreview === null;
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={screenStyles.sectionTitle}>Block history detail</Text>
      {hasNoHistory ? <Text style={screenStyles.body}>No history yet. Complete or skip real sessions and the engine will start building this audit trail.</Text> : null}
      <Text style={screenStyles.callout}>Current block</Text>
      <Text style={screenStyles.body}>{history.activeBlockSummary}</Text>
      <Text style={screenStyles.subtle}>{history.engineOwnedCopy}</Text>
      <Text style={screenStyles.subtle}>{history.screenMutationCopy}</Text>
      <Text style={screenStyles.callout}>What changed and why</Text>
      {history.whatChangedAndWhy.map((item) => <Text key={item} style={screenStyles.subtle}>{item}</Text>)}
      <Text style={screenStyles.callout}>Grouped weeks</Text>
      {history.groupedWeeks.length > 0 ? (
        history.groupedWeeks.map((week) => (
          <View key={week.weekIndex} style={{ gap: spacing.xs }}>
            <Text style={screenStyles.body}>Week {week.weekIndex}</Text>
            <Text style={screenStyles.subtle}>{week.summary}</Text>
            <Text style={screenStyles.subtle}>{week.decision}</Text>
            <Text style={screenStyles.subtle}>{week.nextWeekPreviewStatus}</Text>
            <Text style={screenStyles.subtle}>Materialized generated sessions: {week.materializedGeneratedSessionCount}</Text>
            {week.adjustments.length > 0 ? week.adjustments.map((adjustment) => <Text key={`${week.weekIndex}:${adjustment}`} style={screenStyles.subtle}>Adjustment: {adjustment}</Text>) : <Text style={screenStyles.subtle}>No adjustments linked to this week.</Text>}
          </View>
        ))
      ) : (
        <Text style={screenStyles.subtle}>No grouped week history yet.</Text>
      )}
      <Text style={screenStyles.callout}>Current week</Text>
      {history.weekSummaries.length > 0 ? history.weekSummaries.map((summary) => <Text key={summary} style={screenStyles.subtle}>{summary}</Text>) : <Text style={screenStyles.subtle}>No persisted week summaries yet.</Text>}
      <Text style={screenStyles.callout}>Decisions</Text>
      {history.progressionDecisions.length > 0 ? history.progressionDecisions.map((decision) => <Text key={decision} style={screenStyles.subtle}>{decision}</Text>) : <Text style={screenStyles.subtle}>No persisted progression decisions yet.</Text>}
      <Text style={screenStyles.callout}>Next-week preview</Text>
      {history.latestNextWeekPreview ? (
        <>
          <Text style={screenStyles.subtle}>Week {history.latestNextWeekPreview.weekIndex}: {history.latestNextWeekPreview.volumeStrategy.replaceAll("_", " ")}.</Text>
          <Text style={screenStyles.subtle}>{history.latestNextWeekPreview.explanation}</Text>
        </>
      ) : <Text style={screenStyles.subtle}>No persisted next-week preview yet.</Text>}
      <Text style={screenStyles.callout}>Materialization status</Text>
      {history.latestNextWeekPreview ? (
        <Text style={screenStyles.subtle}>
          {history.latestNextWeekPreview.persistedStatusLabel} Generated sessions: {history.latestNextWeekPreview.generatedSessionCount}.
        </Text>
      ) : <Text style={screenStyles.subtle}>No materialized preview yet.</Text>}
      <Text style={screenStyles.callout}>Adjustments</Text>
      {history.adjustmentEvents.length > 0 ? history.adjustmentEvents.map((event) => <Text key={event} style={screenStyles.subtle}>{event}</Text>) : <Text style={screenStyles.subtle}>No adjustment events yet.</Text>}
      <Text style={screenStyles.callout}>Safety events</Text>
      {history.safetyFlags.length > 0 ? history.safetyFlags.map((flag) => <Text key={flag} style={screenStyles.subtle}>Safety: {flag}</Text>) : <Text style={screenStyles.subtle}>No active safety events in this block history.</Text>}
      <Text style={screenStyles.callout}>Timeline</Text>
      {history.timelineEvents.length > 0 ? history.timelineEvents.map((event) => <Text key={`${event.eventType}:${event.eventDate}:${event.title}`} style={screenStyles.subtle}>{event.eventDate} - {event.title}: {event.summary}</Text>) : <Text style={screenStyles.subtle}>No timeline events yet.</Text>}
      <Text style={screenStyles.callout}>Timeline groups</Text>
      <Text style={screenStyles.subtle}>Training events: {history.timelineEventGroups.trainingEvents.length}</Text>
      <Text style={screenStyles.subtle}>Adjustment events: {history.timelineEventGroups.adjustmentEvents.length}</Text>
      <Text style={screenStyles.subtle}>Materialization events: {history.timelineEventGroups.materializationEvents.length}</Text>
      <Text style={screenStyles.subtle}>Safety/review events: {history.timelineEventGroups.safetyReviewEvents.length}</Text>
    </View>
  );
}
