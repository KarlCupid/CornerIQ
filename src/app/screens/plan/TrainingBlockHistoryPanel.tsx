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
    history.adjustmentEvents.length === 0 &&
    history.safetyFlags.length === 0 &&
    history.latestNextWeekPreview === null;
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={screenStyles.sectionTitle}>Block history detail</Text>
      {hasNoHistory ? <Text style={screenStyles.body}>No history yet. Complete or skip real sessions and the engine will start building this audit trail.</Text> : null}
      <Text style={screenStyles.callout}>Current block</Text>
      <Text style={screenStyles.body}>{history.activeBlockSummary}</Text>
      <Text style={screenStyles.callout}>What changed and why</Text>
      {history.whatChangedAndWhy.map((item) => <Text key={item} style={screenStyles.subtle}>{item}</Text>)}
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
    </View>
  );
}
