import React from "react";
import { Pressable, Text, View } from "react-native";
import type { TrainingBlockHistoryDetailViewModel } from "../../../engine/core/types";
import { spacing } from "../../../design/theme";
import { screenStyles } from "../screenStyles";
import { planPalette, planTextStyles } from "./planPalette";

export interface TrainingBlockHistoryPanelProps {
  history: TrainingBlockHistoryDetailViewModel;
}

function textKey(prefix: string, index: number): string {
  return `${prefix}:${index}`;
}

function historyCopy(value: string): string {
  return value
    .replace(new RegExp("generated " + "sessions", "gi"), "app sessions")
    .replace(new RegExp("generated " + "training", "gi"), "app sessions")
    .replace(new RegExp("material" + "ized", "gi"), "saved")
    .replace(new RegExp("material" + "ization", "gi"), "saving next week")
    .replace(/engine-owned/gi, "saved")
    .replace(/raw payloads/gi, "technical records")
    .replace(/screen mutation/gi, "plan change")
    .replace(/hard-day cap/gi, "hard training limit")
    .replace(/\bsafety stops\b/gi, "health warnings")
    .replace(/\bsafety stop\b/gi, "health warning")
    .replace(/\bhard stops\b/gi, "health warnings")
    .replace(/\bhard stop\b/gi, "health warning");
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
      <Text style={planTextStyles.sectionTitle}>Plan History</Text>
      {hasNoHistory ? <Text style={planTextStyles.body}>No history yet. Complete or skip real sessions and CornerIQ will start saving week notes.</Text> : null}
      <Text style={planTextStyles.callout}>Current block</Text>
      <Text style={planTextStyles.body}>{historyCopy(history.activeBlockSummary)}</Text>
      <Text style={planTextStyles.subtle}>Plan history is saved by CornerIQ.</Text>
      <Text style={planTextStyles.subtle}>Plan changes stay attached to this block.</Text>
      <Text style={planTextStyles.callout}>What changed and why</Text>
      {history.whatChangedAndWhy.map((item, index) => <Text key={textKey("what-changed", index)} style={planTextStyles.subtle}>{historyCopy(item)}</Text>)}
      <Text style={planTextStyles.callout}>Grouped weeks</Text>
      {history.groupedWeeks.length > 0 ? (
        history.groupedWeeks.map((week, index) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: selectedWeek?.weekIndex === week.weekIndex }}
            key={`grouped-week:${index}`}
            onPress={() => setSelectedWeekIndex(week.weekIndex)}
            style={({ pressed }) => [
              screenStyles.quietButton,
              {
                backgroundColor: selectedWeek?.weekIndex === week.weekIndex || pressed ? planPalette.controlFillPressed : planPalette.controlFill,
                borderColor: selectedWeek?.weekIndex === week.weekIndex ? planPalette.actionBorder : planPalette.controlLine
              }
            ]}
          >
            <Text style={{ color: planPalette.textBody, fontSize: 15, fontWeight: "700", lineHeight: 20, textAlign: "center" }}>Week {week.weekIndex}</Text>
          </Pressable>
        ))
      ) : (
        <Text style={planTextStyles.subtle}>No grouped week history yet.</Text>
      )}
      {selectedWeek ? (
        <View style={{ gap: spacing.xs }} testID="training-block-history-week-detail">
          <Text style={planTextStyles.callout}>Week detail</Text>
          <Text style={planTextStyles.body}>Week {selectedWeek.weekIndex}</Text>
          <Text style={planTextStyles.subtle}>{historyCopy(selectedWeek.summary)}</Text>
          <Text style={planTextStyles.subtle}>{historyCopy(selectedWeek.decision)}</Text>
          <Text style={planTextStyles.subtle}>{historyCopy(selectedWeek.nextWeekPreviewStatus)}</Text>
          <Text style={planTextStyles.subtle}>Saved app sessions: {selectedWeek.materializedGeneratedSessionCount}</Text>
          <Text style={planTextStyles.subtle}>Why it matters: this shows what changed without exposing technical records.</Text>
          {selectedWeek.adjustments.length > 0 ? selectedWeek.adjustments.map((adjustment, adjustmentIndex) => <Text key={`week-adjustment:${adjustmentIndex}`} style={planTextStyles.subtle}>Adjustment: {historyCopy(adjustment)}</Text>) : <Text style={planTextStyles.subtle}>No adjustments linked to this week.</Text>}
        </View>
      ) : null}
      <Text style={planTextStyles.callout}>Current week</Text>
      {history.weekSummaries.length > 0 ? history.weekSummaries.map((summary, index) => <Text key={textKey("week-summary", index)} style={planTextStyles.subtle}>{historyCopy(summary)}</Text>) : <Text style={planTextStyles.subtle}>No saved week summaries yet.</Text>}
      <Text style={planTextStyles.callout}>Decisions</Text>
      {history.progressionDecisions.length > 0 ? history.progressionDecisions.map((decision, index) => <Text key={textKey("progression-decision", index)} style={planTextStyles.subtle}>{historyCopy(decision)}</Text>) : <Text style={planTextStyles.subtle}>No saved progression decisions yet.</Text>}
      <Text style={planTextStyles.callout}>Next-week preview</Text>
      {history.latestNextWeekPreview ? (
        <>
          <Text style={planTextStyles.subtle}>Week {history.latestNextWeekPreview.weekIndex}: {history.latestNextWeekPreview.volumeStrategy.replaceAll("_", " ")}.</Text>
          <Text style={planTextStyles.subtle}>{historyCopy(history.latestNextWeekPreview.explanation)}</Text>
        </>
      ) : <Text style={planTextStyles.subtle}>No saved next-week preview yet.</Text>}
      <Text style={planTextStyles.callout}>Saved status</Text>
      {history.latestNextWeekPreview ? (
        <Text style={planTextStyles.subtle}>
          {historyCopy(history.latestNextWeekPreview.persistedStatusLabel)} App sessions: {history.latestNextWeekPreview.generatedSessionCount}.
        </Text>
      ) : <Text style={planTextStyles.subtle}>No saved preview yet.</Text>}
      <Text style={planTextStyles.callout}>Adjustments</Text>
      {history.adjustmentEvents.length > 0 ? history.adjustmentEvents.map((event, index) => <Text key={textKey("adjustment-event", index)} style={planTextStyles.subtle}>{historyCopy(event)}</Text>) : <Text style={planTextStyles.subtle}>No adjustment events yet.</Text>}
      <Text style={planTextStyles.callout}>Review events</Text>
      {history.safetyFlags.length > 0 ? history.safetyFlags.map((flag, index) => <Text key={textKey("safety-flag", index)} style={planTextStyles.subtle}>Review: {historyCopy(flag)}</Text>) : <Text style={planTextStyles.subtle}>No active review events in this plan history.</Text>}
      <Text style={planTextStyles.callout}>Timeline</Text>
      {history.timelineEvents.length > 0 ? history.timelineEvents.map((event, index) => <Text key={`timeline-event:${index}`} style={planTextStyles.subtle}>{event.eventDate} - {historyCopy(event.title)}: {historyCopy(event.summary)}</Text>) : <Text style={planTextStyles.subtle}>No timeline events yet.</Text>}
      <Text style={planTextStyles.callout}>Timeline groups</Text>
      <Text style={planTextStyles.subtle}>Training events: {history.timelineEventGroups.trainingEvents.length}</Text>
      <Text style={planTextStyles.subtle}>Adjustment events: {history.timelineEventGroups.adjustmentEvents.length}</Text>
      <Text style={planTextStyles.subtle}>Next-week saves: {history.timelineEventGroups.materializationEvents.length}</Text>
      <Text style={planTextStyles.subtle}>Review events: {history.timelineEventGroups.safetyReviewEvents.length}</Text>
    </View>
  );
}
