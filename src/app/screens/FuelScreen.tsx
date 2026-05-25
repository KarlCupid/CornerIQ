import React, { type PropsWithChildren } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { FuelContextCard, FuelViewModel, RecentLogsViewModel } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
import { EmptyState } from "../../design/components/EmptyState";
import { spacing } from "../../design/theme";
import type { QuickLogActions } from "../../hooks/useQuickLogs";
import {
  FightWeekFuelCard,
  BodyMassTrajectoryCard,
  FuelCommandCard,
  FuelHistoryCard,
  NutritionSafetyReviewCard,
  RehydrationChecklistCard,
  SessionFuelingCard,
  TournamentFuelCard,
  WeightClassStatusCard
} from "./fuel/FuelCommandCards";
import { BodyMassTrajectoryPanel } from "./fuel/BodyMassTrajectoryPanel";
import { FuelHistoryPanel } from "./fuel/FuelHistoryPanel";
import { NutritionReviewHistoryPanel } from "./fuel/NutritionReviewHistoryPanel";
import { FoodQuickLogCard, HydrationLogCard } from "./logging/LogCards";
import { screenStyles } from "./screenStyles";

export interface FuelScreenProps {
  busy: boolean;
  message: string | null;
  onAcknowledgeNutritionSafetyReview?: ((reviewId: string) => void | Promise<void>) | undefined;
  onRequestNutritionSafetyReview?: (() => void | Promise<void>) | undefined;
  quickLogs: QuickLogActions;
  recentLogs: RecentLogsViewModel;
  viewModel: FuelViewModel;
}

function CollapsibleFuelSection({
  children,
  defaultOpen = false,
  summary,
  testID,
  title
}: PropsWithChildren<{
  defaultOpen?: boolean | undefined;
  summary: string;
  testID: string;
  title: string;
}>) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <View style={{ gap: spacing.sm }}>
      <Pressable
        accessibilityHint={open ? `${title} is visible.` : `Open ${title}.`}
        accessibilityRole="button"
        accessibilityState={{ selected: open }}
        onPress={() => setOpen((value) => !value)}
        style={screenStyles.quietButton}
      >
        <Text style={screenStyles.quietButtonText}>{open ? `Hide ${title}` : `Show ${title}`}</Text>
      </Pressable>
      <Text style={screenStyles.subtle}>{summary}</Text>
      {open ? <View style={{ gap: spacing.lg }} testID={testID}>{children}</View> : null}
    </View>
  );
}

function FuelStartHereCard() {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }} testID="fuel-start-here">
        <Text style={screenStyles.sectionTitle}>Fuel start here</Text>
        <Text style={screenStyles.fieldLabel}>First action</Text>
        <Text style={screenStyles.callout}>Fuel the boxing work first.</Text>
        <Text style={screenStyles.fieldLabel}>Why it matters</Text>
        <Text style={screenStyles.body}>Training quality and safety come before weight changes.</Text>
        <Text style={screenStyles.fieldLabel}>Log now</Text>
        <Text style={screenStyles.body}>Add today's food/water if you have it.</Text>
        <Text style={screenStyles.fieldLabel}>Ignore for now</Text>
        <Text style={screenStyles.body}>Do not chase weight changes before training quality and safety are covered.</Text>
        <Text style={screenStyles.fieldLabel}>Optional</Text>
        <Text style={screenStyles.subtle}>Missing logs lower confidence and stay unknown. They are not treated as safe or as failure.</Text>
      </View>
    </EngineCard>
  );
}

function TodayFuelPriorityCard({ viewModel }: { viewModel: FuelViewModel }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }} testID="fuel-today-priority">
        <Text style={screenStyles.sectionTitle}>What to do now</Text>
        <Text style={screenStyles.callout}>{viewModel.commandCenter.primaryFuelAction}</Text>
        <Text style={screenStyles.body}>{viewModel.commandCenter.sessionFuelAction}</Text>
        <Text style={screenStyles.subtle}>{viewModel.fuelHistory.todaySummary}</Text>
      </View>
    </EngineCard>
  );
}

function FuelContextCardView({ card }: { card: FuelContextCard }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>{card.title}</Text>
        <Text style={screenStyles.body}>{card.summary}</Text>
        {card.actions.map((item) => <Text key={item} style={screenStyles.subtle}>{item}</Text>)}
      </View>
    </EngineCard>
  );
}

function ActualIntakeCard({ viewModel }: { viewModel: FuelViewModel }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>{viewModel.actualIntakeSummary.title}</Text>
        <Text style={screenStyles.body}>{viewModel.actualIntakeSummary.summary}</Text>
        <Text style={screenStyles.subtle}>Confidence: {viewModel.actualIntakeSummary.confidence}. One day of food logging informs context only; targets stay engine-led.</Text>
        {viewModel.actualIntakeSummary.rows.map((item) => <Text key={item} style={screenStyles.subtle}>{item}</Text>)}
      </View>
    </EngineCard>
  );
}

function HydrationContextCard({ viewModel }: { viewModel: FuelViewModel }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Hydration and electrolytes</Text>
        <Text style={screenStyles.body}>{viewModel.commandCenter.hydrationAction}</Text>
        <Text style={screenStyles.subtle}>{viewModel.hydrationSummary}</Text>
      </View>
    </EngineCard>
  );
}

function TargetsCard({ viewModel }: { viewModel: FuelViewModel }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Targets</Text>
        <Text style={screenStyles.body}>{viewModel.calorieSummary}</Text>
        <Text style={screenStyles.body}>{viewModel.macroSummary}</Text>
        <Text style={screenStyles.body}>{viewModel.hydrationSummary}</Text>
        <Text style={screenStyles.body}>{viewModel.bodyMassSummary}</Text>
        {viewModel.cycleNote ? <Text style={screenStyles.body}>{viewModel.cycleNote}</Text> : null}
        {viewModel.fightOrTournamentNote ? <Text style={screenStyles.body}>{viewModel.fightOrTournamentNote}</Text> : null}
      </View>
    </EngineCard>
  );
}

function RecentFuelLogsCard({ recentLogs }: { recentLogs: RecentLogsViewModel }) {
  if (recentLogs.fuel.length === 0) {
    return <EmptyState title="No recent fuel logs" message="Fuel history is optional context. Missing food logs lower confidence; they do not judge the boxer or change targets by themselves." />;
  }
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Recent fuel logs</Text>
        <Text style={screenStyles.body}>{recentLogs.foodLogCountToday}</Text>
        {recentLogs.fuel.map((item) => <Text key={item} style={screenStyles.subtle}>{item}</Text>)}
      </View>
    </EngineCard>
  );
}

function FuelRiskCard({ message, viewModel }: { message: string | null; viewModel: FuelViewModel }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Risks and why</Text>
        {viewModel.riskSummary.length > 0 ? viewModel.riskSummary.map((risk) => <Text key={risk} style={screenStyles.body}>{risk}</Text>) : <Text style={screenStyles.body}>No active fuel risk.</Text>}
        <Text style={screenStyles.subtle}>{viewModel.why}</Text>
        {message ? <Text style={screenStyles.subtle}>{message}</Text> : null}
      </View>
    </EngineCard>
  );
}

export function FuelScreen({ busy, message, onAcknowledgeNutritionSafetyReview, onRequestNutritionSafetyReview, quickLogs, recentLogs, viewModel }: FuelScreenProps) {
  return (
    <ScrollView style={screenStyles.screen} contentContainerStyle={screenStyles.content} testID="fuel-screen">
      <Text style={screenStyles.title}>{viewModel.title}</Text>
      <View style={{ gap: spacing.lg }} testID="fuel-command-section">
        <FuelStartHereCard />
        <TodayFuelPriorityCard viewModel={viewModel} />
        <FoodQuickLogCard actions={quickLogs} busy={busy} />
        <HydrationLogCard actions={quickLogs} busy={busy} />
      </View>
      <CollapsibleFuelSection
        summary="Open only when a hard stop, review request, or reviewer context matters."
        testID="fuel-reviews-section"
        title="Safety review"
      >
        <NutritionSafetyReviewCard
          activeReviews={viewModel.activeNutritionSafetyReviews}
          onAcknowledgeReview={onAcknowledgeNutritionSafetyReview}
          onRequestReview={onRequestNutritionSafetyReview}
          review={viewModel.nutritionSafetyReview}
        />
        <NutritionReviewHistoryPanel history={viewModel.nutritionReviewHistory} />
        <FuelRiskCard message={message} viewModel={viewModel} />
      </CollapsibleFuelSection>
      <CollapsibleFuelSection
        summary="Engine rationale, confidence, and fight-week or tournament detail live here."
        testID="fuel-command-detail-section"
        title="Details / why"
      >
        <FuelCommandCard command={viewModel.commandCenter} />
        <SessionFuelingCard command={viewModel.commandCenter} hitTheseFirst={viewModel.hitTheseFirst} />
        {viewModel.underFuelingRisk ? <FuelContextCardView card={viewModel.underFuelingRisk} /> : null}
        <FightWeekFuelCard plan={viewModel.fightWeekFuelPlan} />
        <RehydrationChecklistCard checklist={viewModel.rehydrationChecklist} />
        <TournamentFuelCard plan={viewModel.tournamentFuelPlan} />
      </CollapsibleFuelSection>
      <CollapsibleFuelSection
        summary="Manual fuel history is context only. Missing logs lower confidence; they do not judge the boxer."
        testID="fuel-history-section"
        title="History"
      >
        <ActualIntakeCard viewModel={viewModel} />
        <FuelHistoryCard history={viewModel.fuelHistory} />
        <FuelHistoryPanel history={viewModel.fuelHistory} />
        <HydrationContextCard viewModel={viewModel} />
        <RecentFuelLogsCard recentLogs={recentLogs} />
      </CollapsibleFuelSection>
      <CollapsibleFuelSection
        summary="Body-mass context is secondary unless the engine or a qualified reviewer flags a safety concern."
        testID="fuel-body-mass-section"
        title="Body Mass"
      >
        <BodyMassTrajectoryCard trajectory={viewModel.bodyMassTrajectory} />
        <BodyMassTrajectoryPanel trajectory={viewModel.bodyMassTrajectory} />
        <WeightClassStatusCard status={viewModel.weightClassStatus} />
        <TargetsCard viewModel={viewModel} />
      </CollapsibleFuelSection>
    </ScrollView>
  );
}
