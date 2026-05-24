import React from "react";
import { ScrollView, Text, View } from "react-native";
import type { FuelContextCard, FuelViewModel, RecentLogsViewModel } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
import { EmptyState } from "../../design/components/EmptyState";
import { RiskBanner } from "../../design/components/RiskBanner";
import { SectionTabs, type SectionTabItem } from "../../design/components/SectionTabs";
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

type FuelSection = "command" | "history" | "reviews" | "bodyMass";

const fuelSections: readonly SectionTabItem<FuelSection>[] = [
  { key: "command", label: "Command" },
  { key: "history", label: "History" },
  { key: "reviews", label: "Reviews" },
  { key: "bodyMass", label: "Body Mass" }
];

export interface FuelScreenProps {
  busy: boolean;
  message: string | null;
  onAcknowledgeNutritionSafetyReview?: ((reviewId: string) => void | Promise<void>) | undefined;
  onRequestNutritionSafetyReview?: (() => void | Promise<void>) | undefined;
  quickLogs: QuickLogActions;
  recentLogs: RecentLogsViewModel;
  viewModel: FuelViewModel;
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
  const [section, setSection] = React.useState<FuelSection>("command");
  const activeReview = viewModel.activeNutritionSafetyReviews[0] ?? viewModel.nutritionSafetyReview.activeReview ?? null;
  return (
    <ScrollView style={screenStyles.screen} contentContainerStyle={screenStyles.content} testID="fuel-screen">
      <Text style={screenStyles.title}>{viewModel.title}</Text>
      <SectionTabs items={fuelSections} value={section} onChange={setSection} />
      {activeReview && section !== "command" && section !== "reviews" ? (
        <RiskBanner
          title="Safety review remains active"
          message="This section is available for context, but nutrition hard stops stay visible and cannot be self-cleared."
          tone={activeReview.hardStop ? "critical" : "caution"}
        />
      ) : null}
      {section === "command" ? (
        <View style={{ gap: spacing.lg }} testID="fuel-command-section">
          <FuelCommandCard command={viewModel.commandCenter} />
          <NutritionSafetyReviewCard
            activeReviews={viewModel.activeNutritionSafetyReviews}
            onAcknowledgeReview={onAcknowledgeNutritionSafetyReview}
            onRequestReview={onRequestNutritionSafetyReview}
            review={viewModel.nutritionSafetyReview}
          />
          <WeightClassStatusCard status={viewModel.weightClassStatus} />
          <SessionFuelingCard command={viewModel.commandCenter} hitTheseFirst={viewModel.hitTheseFirst} />
          {viewModel.underFuelingRisk ? <FuelContextCardView card={viewModel.underFuelingRisk} /> : null}
          <FightWeekFuelCard plan={viewModel.fightWeekFuelPlan} />
          <RehydrationChecklistCard checklist={viewModel.rehydrationChecklist} />
          <TournamentFuelCard plan={viewModel.tournamentFuelPlan} />
          <FoodQuickLogCard actions={quickLogs} busy={busy} />
          <HydrationLogCard actions={quickLogs} busy={busy} />
        </View>
      ) : null}
      {section === "history" ? (
        <View style={{ gap: spacing.lg }} testID="fuel-history-section">
          <ActualIntakeCard viewModel={viewModel} />
          <FuelHistoryCard history={viewModel.fuelHistory} />
          <FuelHistoryPanel history={viewModel.fuelHistory} />
          <HydrationContextCard viewModel={viewModel} />
          <RecentFuelLogsCard recentLogs={recentLogs} />
        </View>
      ) : null}
      {section === "reviews" ? (
        <View style={{ gap: spacing.lg }} testID="fuel-reviews-section">
          <NutritionSafetyReviewCard
            activeReviews={viewModel.activeNutritionSafetyReviews}
            onAcknowledgeReview={onAcknowledgeNutritionSafetyReview}
            onRequestReview={onRequestNutritionSafetyReview}
            review={viewModel.nutritionSafetyReview}
          />
          <NutritionReviewHistoryPanel history={viewModel.nutritionReviewHistory} />
          <FuelRiskCard message={message} viewModel={viewModel} />
        </View>
      ) : null}
      {section === "bodyMass" ? (
        <View style={{ gap: spacing.lg }} testID="fuel-body-mass-section">
          <BodyMassTrajectoryCard trajectory={viewModel.bodyMassTrajectory} />
          <BodyMassTrajectoryPanel trajectory={viewModel.bodyMassTrajectory} />
          <TargetsCard viewModel={viewModel} />
        </View>
      ) : null}
    </ScrollView>
  );
}
