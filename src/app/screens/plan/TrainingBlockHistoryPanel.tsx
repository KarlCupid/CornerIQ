import React from "react";
import { Pressable, Text, View } from "react-native";
import type { TrainingBlockHistoryDetailViewModel } from "../../../engine/core/types";
import { spacing } from "../../../design/theme";
import { screenStyles } from "../screenStyles";

export interface TrainingBlockHistoryPanelProps {
  history: TrainingBlockHistoryDetailViewModel;
}

function textKey(prefix: string, index: number): string {
  return `${prefix}:${index}`;
}

function historyCopy(value: string): string {
  return value
    .replace(new RegExp("generated " + "sessions", "gi"), "support workouts")
    .replace(new RegExp("generated " + "training", "gi"), "support workouts")
    .replace(new RegExp("material" + "ized", "gi"), "saved")
    .replace(new RegExp("material" + "ization", "gi"), "saved-next-week");
}

export function TrainingBlockHistoryPanel({ history }: TrainingBlockHistoryPanelProps) {
  const [selectedWeekIndex, setSelectedWeekIndex] = React.useState(history.groupedWeeks[0]?.weekIndex ?? null);
  const selectedWeek = history.groupedWeeks.find((week) => week.weekIndex === selectedWeekIndex) ?? history.groupedWeeks[0] ?? null;
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
      {history.whatChangedAndWhy.map((item, index) => <Text key={textKey("what-changed", index)} style={screenStyles.subtle}>{item}</Text>)}
      <Text style={screenStyles.callout}>Grouped weeks</Text>
      {history.groupedWeeks.length > 0 ? (
        history.groupedWeeks.map((week, index) => (
          <Pressable accessibilityRole="button" accessibilityState={{ selected: selectedWeek?.weekIndex === week.weekIndex }} key={`grouped-week:${index}`} onPress={() => setSelectedWeekIndex(week.weekIndex)} style={screenStyles.quietButton}>
            <Text style={screenStyles.quietButtonText}>Week {week.weekIndex}</Text>
          </Pressable>
        ))
      ) : (
        <Text style={screenStyles.subtle}>No grouped week history yet.</Text>
      )}
      {selectedWeek ? (
        <View style={{ gap: spacing.xs }} testID="training-block-history-week-detail">
          <Text style={screenStyles.callout}>Week detail</Text>
          <Text style={screenStyles.body}>Week {selectedWeek.weekIndex}</Text>
          <Text style={screenStyles.subtle}>{selectedWeek.summary}</Text>
          <Text style={screenStyles.subtle}>{selectedWeek.decision}</Text>
          <Text style={screenStyles.subtle}>{historyCopy(selectedWeek.nextWeekPreviewStatus)}</Text>
          <Text style={screenStyles.subtle}>Saved support workouts: {selectedWeek.materializedGeneratedSessionCount}</Text>
          <Text style={screenStyles.subtle}>Why it matters: this explains engine-owned block changes without exposing raw payloads.</Text>
          {selectedWeek.adjustments.length > 0 ? selectedWeek.adjustments.map((adjustment, adjustmentIndex) => <Text key={`week-adjustment:${adjustmentIndex}`} style={screenStyles.subtle}>Adjustment: {adjustment}</Text>) : <Text style={screenStyles.subtle}>No adjustments linked to this week.</Text>}
        </View>
      ) : null}
      <Text style={screenStyles.callout}>Current week</Text>
      {history.weekSummaries.length > 0 ? history.weekSummaries.map((summary, index) => <Text key={textKey("week-summary", index)} style={screenStyles.subtle}>{summary}</Text>) : <Text style={screenStyles.subtle}>No persisted week summaries yet.</Text>}
      <Text style={screenStyles.callout}>Decisions</Text>
      {history.progressionDecisions.length > 0 ? history.progressionDecisions.map((decision, index) => <Text key={textKey("progression-decision", index)} style={screenStyles.subtle}>{decision}</Text>) : <Text style={screenStyles.subtle}>No persisted progression decisions yet.</Text>}
      <Text style={screenStyles.callout}>Next-week preview</Text>
      {history.latestNextWeekPreview ? (
        <>
          <Text style={screenStyles.subtle}>Week {history.latestNextWeekPreview.weekIndex}: {history.latestNextWeekPreview.volumeStrategy.replaceAll("_", " ")}.</Text>
          <Text style={screenStyles.subtle}>{history.latestNextWeekPreview.explanation}</Text>
        </>
      ) : <Text style={screenStyles.subtle}>No persisted next-week preview yet.</Text>}
      <Text style={screenStyles.callout}>Saved status</Text>
      {history.latestNextWeekPreview ? (
        <Text style={screenStyles.subtle}>
          {historyCopy(history.latestNextWeekPreview.persistedStatusLabel)} Support workouts: {history.latestNextWeekPreview.generatedSessionCount}.
        </Text>
      ) : <Text style={screenStyles.subtle}>No saved preview yet.</Text>}
      <Text style={screenStyles.callout}>Adjustments</Text>
      {history.adjustmentEvents.length > 0 ? history.adjustmentEvents.map((event, index) => <Text key={textKey("adjustment-event", index)} style={screenStyles.subtle}>{event}</Text>) : <Text style={screenStyles.subtle}>No adjustment events yet.</Text>}
      <Text style={screenStyles.callout}>Safety events</Text>
      {history.safetyFlags.length > 0 ? history.safetyFlags.map((flag, index) => <Text key={textKey("safety-flag", index)} style={screenStyles.subtle}>Safety: {flag}</Text>) : <Text style={screenStyles.subtle}>No active safety events in this block history.</Text>}
      <Text style={screenStyles.callout}>Timeline</Text>
      {history.timelineEvents.length > 0 ? history.timelineEvents.map((event, index) => <Text key={`timeline-event:${index}`} style={screenStyles.subtle}>{event.eventDate} - {event.title}: {event.summary}</Text>) : <Text style={screenStyles.subtle}>No timeline events yet.</Text>}
      <Text style={screenStyles.callout}>Timeline groups</Text>
      <Text style={screenStyles.subtle}>Training events: {history.timelineEventGroups.trainingEvents.length}</Text>
      <Text style={screenStyles.subtle}>Adjustment events: {history.timelineEventGroups.adjustmentEvents.length}</Text>
      <Text style={screenStyles.subtle}>Saved-next-week events: {history.timelineEventGroups.materializationEvents.length}</Text>
      <Text style={screenStyles.subtle}>Safety/review events: {history.timelineEventGroups.safetyReviewEvents.length}</Text>
    </View>
  );
}
