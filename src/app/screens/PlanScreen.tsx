import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { ISODateString, PlanViewModel } from "../../engine/core/types";
import { DisclosureCard } from "../../design/components/DisclosureCard";
import { EngineCard } from "../../design/components/EngineCard";
import { EmptyState } from "../../design/components/EmptyState";
import { RiskBanner } from "../../design/components/RiskBanner";
import { SectionTabs, type SectionTabItem } from "../../design/components/SectionTabs";
import { TimelineList } from "../../design/components/TimelineList";
import { TopActionCard } from "../../design/components/TopActionCard";
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

function hasProtectedAnchors(value: string): boolean {
  return value !== "No protected anchors.";
}

function PlanReviewNotes({ viewModel }: { viewModel: PlanViewModel }) {
  return (
    <DisclosureCard title="Plan review notes" summary={viewModel.warnings.length > 0 ? `${viewModel.warnings.length} review note${viewModel.warnings.length === 1 ? "" : "s"} hidden until needed.` : "No active plan review notes."}>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.body}>{viewModel.rollForwardMessage}</Text>
        {viewModel.warnings.length > 0 ? viewModel.warnings.map((warning, index) => <Text key={`plan-warning:${index}`} style={screenStyles.subtle}>{warning}</Text>) : <Text style={screenStyles.subtle}>No active plan warnings.</Text>}
      </View>
    </DisclosureCard>
  );
}

export function PlanScreen({ adjustmentActions, adjustmentMessage, asOfDate, busy, hasActiveFightOrTournament, isMinor, nextWeekPreviewActions, onSaveFightSetup, onSaveTournamentSetup, viewModel }: PlanScreenProps) {
  const [section, setSection] = React.useState<PlanSection>("week");
  const showCriticalPlanRisk = viewModel.rollForwardStatus === "blocked" && viewModel.rollForwardRiskTone === "critical";
  return (
    <ScrollView style={screenStyles.screen} contentContainerStyle={screenStyles.content} testID="plan-screen">
      <Text style={screenStyles.title}>{viewModel.title}</Text>
      <TopActionCard
        optional={viewModel.topAction.optional}
        primaryAction={viewModel.topAction.primaryAction}
        purpose={viewModel.topAction.purpose}
        testID="plan-top-action-card"
        title={viewModel.topAction.title}
        why={viewModel.topAction.why}
      />
      <SectionTabs items={planSections} value={section} onChange={setSection} />
      {showCriticalPlanRisk ? (
        <RiskBanner title="Plan safety check" message={viewModel.rollForwardMessage} statusLabel={viewModel.rollForwardRiskLabel} tone={viewModel.rollForwardRiskTone}>
          <View style={{ gap: spacing.xs }}>
            {viewModel.warnings.map((warning, index) => <Text key={`critical-plan-warning:${index}`} style={screenStyles.body}>{warning}</Text>)}
          </View>
        </RiskBanner>
      ) : null}
      {viewModel.lastAutoRollForwardMessage ? (
        <RiskBanner title="Week boundary update" message={viewModel.lastAutoRollForwardMessage} tone="info" />
      ) : null}
      {section === "week" ? (
        <View style={{ gap: spacing.lg }} testID="plan-week-section">
          <EngineCard>
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.sectionTitle}>This week</Text>
              <Text style={screenStyles.callout}>Protected anchors are respected first.</Text>
              <Text style={screenStyles.body}>{viewModel.blockPhase.replaceAll("_", " ")} - {viewModel.blockGoal}, week {viewModel.weekIndex}</Text>
              <Text style={screenStyles.body}>{viewModel.protectedAnchorSummary}</Text>
              <Text style={screenStyles.body}>Generated support: {viewModel.generatedSupportDayCount} day{viewModel.generatedSupportDayCount === 1 ? "" : "s"}.</Text>
              <Text style={screenStyles.body}>Rest/recovery: {viewModel.recoveryDayCount} day{viewModel.recoveryDayCount === 1 ? "" : "s"}.</Text>
              <Text style={screenStyles.body}>{viewModel.hardDaySummary}</Text>
              <Text style={screenStyles.subtle}>{viewModel.supportWorkReason}</Text>
              {viewModel.fightOrTournamentNote ? <Text style={screenStyles.body}>{viewModel.fightOrTournamentNote}</Text> : null}
              <Text style={screenStyles.subtle}>{viewModel.blockPersistenceStatus}</Text>
            </View>
          </EngineCard>
          {viewModel.dayPlans.map((day) => (
            <EngineCard key={day.date}>
              <View style={{ gap: spacing.sm }}>
                <Text style={screenStyles.sectionTitle}>{day.label}</Text>
                <Text style={screenStyles.callout}>{day.marker} - fuel demand {day.fuelDemand}</Text>
                <Text style={screenStyles.fieldLabel}>Protected boxing work</Text>
                <Text style={screenStyles.body}>{day.protectedAnchors}</Text>
                <Text style={screenStyles.fieldLabel}>Generated support</Text>
                <Text style={screenStyles.body}>{day.generatedSupport}</Text>
                {hasProtectedAnchors(day.protectedAnchors) ? <Text style={screenStyles.subtle}>Protected anchor respected on this day.</Text> : null}
                {day.marker === "Recovery" || day.marker === "Taper" || day.marker === "Tournament conservation" ? <Text style={screenStyles.subtle}>Rest/recovery day: generated work stays low.</Text> : null}
                <Text style={screenStyles.subtle}>{day.explanation}</Text>
                {day.adjustmentNotes.map((note, index) => <Text key={`day-adjustment:${day.date}:${index}`} style={screenStyles.subtle}>{note}</Text>)}
                {day.warningSummary ? <Text style={screenStyles.subtle}>Warning: {day.warningSummary}</Text> : null}
              </View>
            </EngineCard>
          ))}
          <PlanReviewNotes viewModel={viewModel} />
          <FightSetupScreen
            asOfDate={asOfDate}
            busy={busy}
            hasActiveFightOrTournament={hasActiveFightOrTournament}
            isMinor={isMinor}
            onSaveFight={onSaveFightSetup}
            onSaveTournament={onSaveTournamentSetup}
          />
        </View>
      ) : null}
      {section === "nextWeek" ? (
        <View style={{ gap: spacing.lg }} testID="plan-next-week-section">
          <EngineCard>
            <View style={{ gap: spacing.sm }} testID="plan-next-week-summary-card">
              <Text style={screenStyles.sectionTitle}>Next week preview</Text>
              <Text style={screenStyles.callout}>{viewModel.nextWeekPreview.goal}</Text>
              <Text style={screenStyles.body}>Planned support: {viewModel.nextWeekPreview.plannedSupportCount} day{viewModel.nextWeekPreview.plannedSupportCount === 1 ? "" : "s"}.</Text>
              <Text style={screenStyles.body}>{viewModel.nextWeekPreview.protectedAnchorSummary}</Text>
              <Text style={screenStyles.body}>{viewModel.nextWeekPreview.persistedStatusLabel}</Text>
              <Text style={screenStyles.subtle}>{viewModel.rollForwardMessage}</Text>
              {viewModel.nextWeekPreview.requiresReview ? <Text style={screenStyles.subtle}>Review required before materializing.</Text> : null}
              <Text style={screenStyles.subtle}>Preview status: {viewModel.nextWeekPreview.persistedStatus.replaceAll("_", " ")}.</Text>
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
            </View>
          </EngineCard>
          <DisclosureCard title="Next week detail" summary="Daily preview, safety notes, and materialized session rows are collapsed until you need them.">
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.body}>{viewModel.nextWeekPreview.weekStartDate} to {viewModel.nextWeekPreview.weekEndDate}</Text>
              <Text style={screenStyles.callout}>{viewModel.nextWeekPreview.volumeStrategy.replaceAll("_", " ")} - hard day cap {viewModel.nextWeekPreview.hardDayCap}</Text>
              <Text style={screenStyles.body}>Support bias: {viewModel.nextWeekPreview.supportBias.replaceAll("_", " ")}</Text>
              <Text style={screenStyles.subtle}>{viewModel.nextWeekPreview.actionCopy}</Text>
              <Text style={screenStyles.subtle}>{viewModel.nextWeekPreview.explanation}</Text>
              {viewModel.nextWeekPreview.materializedGeneratedSessions.map((session) => (
                <Text key={session.id} style={screenStyles.subtle}>
                  Materialized: {session.date} - {session.title} ({session.intensity}, {session.durationMinutes} min, fuel {session.fuelDemand})
                </Text>
              ))}
              {viewModel.nextWeekPreview.safetyNotes.map((note, index) => <Text key={`next-week-safety:${index}`} style={screenStyles.subtle}>Safety: {note}</Text>)}
              {viewModel.nextWeekPreview.dayPlanPreview.map((day, index) => (
                <View key={`next-week-day:${day.date}:${index}`} style={{ gap: spacing.sm }}>
                  <Text style={screenStyles.callout}>{day.date} - {day.marker} - fuel demand {day.fuelDemand}</Text>
                  <Text style={screenStyles.fieldLabel}>Protected boxing work</Text>
                  <Text style={screenStyles.subtle}>{day.protectedAnchors}</Text>
                  <Text style={screenStyles.fieldLabel}>Generated support preview</Text>
                  <Text style={screenStyles.subtle}>{day.generatedSupport}</Text>
                  <Text style={screenStyles.subtle}>{day.explanation}</Text>
                </View>
              ))}
            </View>
          </DisclosureCard>
        </View>
      ) : null}
      {section === "history" ? (
        <View style={{ gap: spacing.lg }} testID="plan-history-section">
          <EngineCard>
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.sectionTitle}>Block timeline</Text>
              <Text style={screenStyles.body}>History weeks: {viewModel.blockHistorySummary.activeBlockHistoryCount}</Text>
              {viewModel.latestProgressionDecision ? <Text style={screenStyles.body}>{viewModel.latestProgressionDecision}</Text> : <Text style={screenStyles.body}>No persisted progression decision yet.</Text>}
              {viewModel.currentWeekSummary ? (
                <View style={{ gap: spacing.sm }}>
                  <Text style={screenStyles.callout}>{viewModel.currentWeekSummary.title}</Text>
                  <Text style={screenStyles.body}>{viewModel.currentWeekSummary.summary}</Text>
                  {viewModel.currentWeekSummary.rows.map((row, index) => <Text key={`current-week-row:${index}`} style={screenStyles.subtle}>{row}</Text>)}
                </View>
              ) : (
                <Text style={screenStyles.body}>Current week summary is pending persistence.</Text>
              )}
              <TimelineList
                emptyCopy="No block timeline events yet."
                items={viewModel.timelineEvents.map((event, index) => ({
                  id: `${event.eventType}:${event.eventDate}:${event.title}:${index}`,
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
        </View>
      ) : null}
      {section === "adjustments" ? (
        <View style={{ gap: spacing.lg }} testID="plan-adjustments-section">
          <EngineCard>
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.sectionTitle}>Adjustment audit</Text>
              <Text style={screenStyles.body}>{viewModel.adjustmentSummary}</Text>
              {viewModel.activeAdjustments.length > 0 ? viewModel.activeAdjustments.map((adjustment, index) => <Text key={`active-adjustment:${index}`} style={screenStyles.subtle}>{adjustment}</Text>) : <Text style={screenStyles.subtle}>No active manual adjustment is changing this plan.</Text>}
              {adjustmentMessage ? <Text style={screenStyles.subtle}>{adjustmentMessage}</Text> : null}
            </View>
          </EngineCard>
          {viewModel.dayPlans.length > 0 ? viewModel.dayPlans.map((day) => (
            <EngineCard key={day.date}>
              <View style={{ gap: spacing.sm }}>
                <Text style={screenStyles.sectionTitle}>{day.label}</Text>
                <Text style={screenStyles.body}>Service-owned controls for this day. Screens request changes; the engine decides what applies.</Text>
                {day.adjustmentNotes.map((note, index) => <Text key={`adjustment-day-note:${day.date}:${index}`} style={screenStyles.subtle}>{note}</Text>)}
                <PlanAdjustmentControls actions={adjustmentActions} busy={busy} date={day.date as ISODateString} generatedSessions={day.generatedSessions} />
              </View>
            </EngineCard>
          )) : (
            <EmptyState title="No day plans loaded" message="The week projection is missing, so adjustment controls cannot target real days yet. Refresh engine state or complete setup; missing plan data stays unknown." />
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}
