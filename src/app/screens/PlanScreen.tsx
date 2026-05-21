import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { ISODateString, PlanViewModel } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
import { EmptyState } from "../../design/components/EmptyState";
import { RiskBanner } from "../../design/components/RiskBanner";
import { SectionTabs, type SectionTabItem } from "../../design/components/SectionTabs";
import { TimelineList } from "../../design/components/TimelineList";
import { spacing } from "../../design/theme";
import type { NextWeekPreviewActions } from "../../hooks/useNextWeekPreviewActions";
import type { TrainingPlanAdjustmentActions } from "../../hooks/useTrainingPlanAdjustments";
import type { FightSetupDraft, TournamentSetupDraft } from "../../services/supabase/onboardingService";
import { FightSetupScreen } from "./fight/FightSetupScreen";
import { PlanAdjustmentControls } from "./plan/PlanAdjustmentControls";
import { TrainingBlockHistoryPanel } from "./plan/TrainingBlockHistoryPanel";
import { screenStyles } from "./screenStyles";

type PlanSection = "week" | "nextWeek" | "history" | "adjustments";

const planSections: readonly SectionTabItem<PlanSection>[] = [
  { key: "week", label: "Week" },
  { key: "nextWeek", label: "Next Week" },
  { key: "history", label: "Block History" },
  { key: "adjustments", label: "Adjustments" }
];

export interface PlanScreenProps {
  adjustmentActions?: TrainingPlanAdjustmentActions | undefined;
  adjustmentMessage?: string | null | undefined;
  asOfDate: ISODateString;
  busy: boolean;
  hasActiveFightOrTournament: boolean;
  isMinor: boolean;
  nextWeekPreviewActions?: NextWeekPreviewActions | undefined;
  onSaveFightSetup: (draft: FightSetupDraft) => Promise<void>;
  onSaveTournamentSetup: (draft: TournamentSetupDraft) => Promise<void>;
  viewModel: PlanViewModel;
}

export function PlanScreen({ adjustmentActions, adjustmentMessage, asOfDate, busy, hasActiveFightOrTournament, isMinor, nextWeekPreviewActions, onSaveFightSetup, onSaveTournamentSetup, viewModel }: PlanScreenProps) {
  const [section, setSection] = React.useState<PlanSection>("week");
  const hasPlanRisk = viewModel.warnings.length > 0 || viewModel.rollForwardStatus === "blocked";
  return (
    <ScrollView style={screenStyles.screen} contentContainerStyle={screenStyles.content}>
      <Text style={screenStyles.title}>{viewModel.title}</Text>
      <SectionTabs items={planSections} value={section} onChange={setSection} />
      {hasPlanRisk ? (
        <RiskBanner title="Plan safety check" message={viewModel.rollForwardStatus === "blocked" ? viewModel.rollForwardMessage : "Warnings are active for this plan. The engine keeps safety ahead of performance pressure."} tone={viewModel.rollForwardStatus === "blocked" ? "critical" : "caution"}>
          <View style={{ gap: spacing.xs }}>
            {viewModel.warnings.map((warning) => <Text key={warning} style={screenStyles.body}>{warning}</Text>)}
          </View>
        </RiskBanner>
      ) : null}
      {viewModel.lastAutoRollForwardMessage ? (
        <RiskBanner title="Week boundary update" message={viewModel.lastAutoRollForwardMessage} tone="info" />
      ) : null}
      {section === "week" ? (
        <>
          <EngineCard>
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.sectionTitle}>Active block</Text>
              <Text style={screenStyles.body}>{viewModel.blockPhase.replaceAll("_", " ")} - {viewModel.blockGoal}</Text>
              <Text style={screenStyles.body}>Week {viewModel.weekIndex}</Text>
              <Text style={screenStyles.subtle}>Hard days: {viewModel.plannedHardDays}/{viewModel.hardDayCap}</Text>
              <Text style={screenStyles.subtle}>{viewModel.blockPersistenceStatus}</Text>
            </View>
          </EngineCard>
          <EngineCard>
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.sectionTitle}>Week</Text>
              <Text style={screenStyles.body}>{viewModel.weeklySummary}</Text>
              <Text style={screenStyles.body}>{viewModel.hardDaySummary}</Text>
              <Text style={screenStyles.body}>{viewModel.recoveryDaySummary}</Text>
              <Text style={screenStyles.body}>{viewModel.protectedAnchorSummary}</Text>
              {viewModel.fightOrTournamentNote ? <Text style={screenStyles.body}>{viewModel.fightOrTournamentNote}</Text> : null}
            </View>
          </EngineCard>
          {viewModel.dayPlans.map((day) => (
            <EngineCard key={day.date}>
              <View style={{ gap: spacing.sm }}>
                <Text style={screenStyles.sectionTitle}>{day.label}</Text>
                <Text style={screenStyles.callout}>{day.marker} - fuel demand {day.fuelDemand}</Text>
                <Text style={screenStyles.body}>Protected: {day.protectedAnchors}</Text>
                <Text style={screenStyles.body}>Generated: {day.generatedSupport}</Text>
                <Text style={screenStyles.subtle}>{day.explanation}</Text>
                {day.adjustmentNotes.map((note) => <Text key={note} style={screenStyles.subtle}>{note}</Text>)}
                {day.warningSummary ? <Text style={screenStyles.subtle}>Warning: {day.warningSummary}</Text> : null}
              </View>
            </EngineCard>
          ))}
          <EngineCard>
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.sectionTitle}>Warnings</Text>
              {viewModel.warnings.length > 0 ? viewModel.warnings.map((warning) => <Text key={warning} style={screenStyles.body}>{warning}</Text>) : <Text style={screenStyles.body}>No active plan warnings.</Text>}
            </View>
          </EngineCard>
          <FightSetupScreen
            asOfDate={asOfDate}
            busy={busy}
            hasActiveFightOrTournament={hasActiveFightOrTournament}
            isMinor={isMinor}
            onSaveFight={onSaveFightSetup}
            onSaveTournament={onSaveTournamentSetup}
          />
        </>
      ) : null}
      {section === "nextWeek" ? (
        <EngineCard>
          <View style={{ gap: spacing.sm }}>
            <Text style={screenStyles.sectionTitle}>Next week preview</Text>
            <Text style={screenStyles.body}>Engine preview, not a user-edited plan.</Text>
            <Text style={screenStyles.callout}>{viewModel.rollForwardMessage}</Text>
            <Text style={screenStyles.body}>{viewModel.nextWeekPreview.persistedStatusLabel}</Text>
            <Text style={screenStyles.body}>
              Generated sessions: {viewModel.nextWeekPreview.generatedSessionCount} ({viewModel.nextWeekPreview.generatedSessionPersistence.replaceAll("_", " ")})
            </Text>
            <Text style={screenStyles.body}>Week {viewModel.nextWeekPreview.weekIndex}: {viewModel.nextWeekPreview.phase.replaceAll("_", " ")} - {viewModel.nextWeekPreview.decision}</Text>
            <Text style={screenStyles.body}>{viewModel.nextWeekPreview.weekStartDate} to {viewModel.nextWeekPreview.weekEndDate}</Text>
            <Text style={screenStyles.callout}>{viewModel.nextWeekPreview.volumeStrategy.replaceAll("_", " ")} - hard day cap {viewModel.nextWeekPreview.hardDayCap}</Text>
            <Text style={screenStyles.body}>Support bias: {viewModel.nextWeekPreview.supportBias.replaceAll("_", " ")}</Text>
            <Text style={screenStyles.subtle}>{viewModel.nextWeekPreview.actionCopy}</Text>
            {viewModel.nextWeekPreview.requiresReview ? <Text style={screenStyles.subtle}>Review required before materializing.</Text> : null}
            {viewModel.nextWeekPreview.canAccept ? (
              <Pressable accessibilityLabel="Accept next week preview" accessibilityRole="button" accessibilityState={{ disabled: busy || !nextWeekPreviewActions }} disabled={busy || !nextWeekPreviewActions} style={screenStyles.quietButton} onPress={() => void nextWeekPreviewActions?.acceptPreview(viewModel.nextWeekPreview.previewId ?? undefined)}>
                <Text style={screenStyles.quietButtonText}>Accept preview</Text>
              </Pressable>
            ) : null}
            {viewModel.nextWeekPreview.showMaterializeAction ? (
              <Pressable accessibilityLabel="Materialize next week" accessibilityRole="button" accessibilityState={{ disabled: busy || !nextWeekPreviewActions || viewModel.nextWeekPreview.requiresReview }} disabled={busy || !nextWeekPreviewActions || viewModel.nextWeekPreview.requiresReview} style={screenStyles.quietButton} onPress={() => void nextWeekPreviewActions?.materializeNextWeek(viewModel.nextWeekPreview.previewId ?? undefined)}>
                <Text style={screenStyles.quietButtonText}>Materialize next week</Text>
              </Pressable>
            ) : null}
            <Text style={screenStyles.subtle}>{viewModel.nextWeekPreview.explanation}</Text>
            {viewModel.nextWeekPreview.materializedGeneratedSessions.map((session) => (
              <Text key={session.id} style={screenStyles.subtle}>
                Materialized: {session.date} - {session.title} ({session.intensity}, {session.durationMinutes} min, fuel {session.fuelDemand})
              </Text>
            ))}
            {viewModel.nextWeekPreview.safetyNotes.map((note) => <Text key={note} style={screenStyles.subtle}>Safety: {note}</Text>)}
            {viewModel.nextWeekPreview.dayPlanPreview.map((day) => (
              <View key={day.date} style={{ gap: spacing.sm }}>
                <Text style={screenStyles.callout}>{day.date} - {day.marker} - fuel demand {day.fuelDemand}</Text>
                <Text style={screenStyles.subtle}>Protected: {day.protectedAnchors}</Text>
                <Text style={screenStyles.subtle}>Generated preview: {day.generatedSupport}</Text>
                <Text style={screenStyles.subtle}>{day.explanation}</Text>
              </View>
            ))}
          </View>
        </EngineCard>
      ) : null}
      {section === "history" ? (
        <>
          <EngineCard>
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.sectionTitle}>Block timeline</Text>
              <Text style={screenStyles.body}>History weeks: {viewModel.blockHistorySummary.activeBlockHistoryCount}</Text>
              {viewModel.latestProgressionDecision ? <Text style={screenStyles.body}>{viewModel.latestProgressionDecision}</Text> : <Text style={screenStyles.body}>No persisted progression decision yet.</Text>}
              {viewModel.currentWeekSummary ? (
                <View style={{ gap: spacing.sm }}>
                  <Text style={screenStyles.callout}>{viewModel.currentWeekSummary.title}</Text>
                  <Text style={screenStyles.body}>{viewModel.currentWeekSummary.summary}</Text>
                  {viewModel.currentWeekSummary.rows.map((row) => <Text key={row} style={screenStyles.subtle}>{row}</Text>)}
                </View>
              ) : (
                <Text style={screenStyles.body}>Current week summary is pending persistence.</Text>
              )}
              <TimelineList
                emptyCopy="No block timeline events yet."
                items={viewModel.timelineEvents.map((event) => ({
                  id: `${event.eventType}:${event.eventDate}:${event.title}`,
                  title: `${event.eventDate} - ${event.title}`,
                  body: event.summary,
                  meta: event.eventType.replaceAll("_", " ")
                }))}
              />
            </View>
          </EngineCard>
          <EngineCard>
            <TrainingBlockHistoryPanel history={viewModel.blockHistoryDetail} />
          </EngineCard>
        </>
      ) : null}
      {section === "adjustments" ? (
        <>
          <EngineCard>
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.sectionTitle}>Adjustment audit</Text>
              <Text style={screenStyles.body}>{viewModel.adjustmentSummary}</Text>
              {viewModel.activeAdjustments.length > 0 ? viewModel.activeAdjustments.map((adjustment) => <Text key={adjustment} style={screenStyles.subtle}>{adjustment}</Text>) : <Text style={screenStyles.subtle}>No active manual adjustment is changing this plan.</Text>}
              {adjustmentMessage ? <Text style={screenStyles.subtle}>{adjustmentMessage}</Text> : null}
            </View>
          </EngineCard>
          {viewModel.dayPlans.length > 0 ? viewModel.dayPlans.map((day) => (
            <EngineCard key={day.date}>
              <View style={{ gap: spacing.sm }}>
                <Text style={screenStyles.sectionTitle}>{day.label}</Text>
                <Text style={screenStyles.body}>Service-owned controls for this day. Screens request changes; the engine decides what applies.</Text>
                {day.adjustmentNotes.map((note) => <Text key={note} style={screenStyles.subtle}>{note}</Text>)}
                <PlanAdjustmentControls actions={adjustmentActions} busy={busy} date={day.date as ISODateString} generatedSessions={day.generatedSessions} />
              </View>
            </EngineCard>
          )) : (
            <EmptyState title="No day plans loaded" message="Adjustment controls appear after the engine has a week projection." />
          )}
        </>
      ) : null}
    </ScrollView>
  );
}
