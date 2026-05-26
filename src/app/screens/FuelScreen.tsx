import React, { type PropsWithChildren } from "react";
import { Pressable, Text, View } from "react-native";
import type { FuelContextCard, FuelViewModel, RecentLogsViewModel } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
import { EmptyState } from "../../design/components/EmptyState";
import { LuminousProgressBar, LuminousScreen, MetricTile, ScreenHeader, type LuminousAccent } from "../../design/components/LuminousScreen";
import { TopActionCard } from "../../design/components/TopActionCard";
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

function progressRatio(logged: string, target: string): number {
  const loggedNumber = Number.parseFloat(logged.replace(/,/g, ""));
  const targetNumber = Number.parseFloat(target.replace(/,/g, ""));
  if (!Number.isFinite(loggedNumber) || !Number.isFinite(targetNumber) || targetNumber <= 0) {
    return 0.42;
  }
  return loggedNumber / targetNumber;
}

function macroAccent(label: string): LuminousAccent {
  if (/protein/i.test(label)) {
    return "green";
  }
  if (/carb|water/i.test(label)) {
    return "blue";
  }
  if (/fat|fiber/i.test(label)) {
    return "gold";
  }
  return "orange";
}

function FuelStartHereCard({ viewModel }: { viewModel: FuelViewModel }) {
  return (
    <TopActionCard
      accent="orange"
      optional={viewModel.topAction.optional}
      primaryAction={viewModel.topAction.primaryAction}
      purpose={viewModel.topAction.purpose}
      testID="fuel-top-action-card"
      title={viewModel.topAction.title}
      why={viewModel.topAction.why}
    />
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
        {card.actions.map((item, index) => <Text key={`${card.title}:action:${index}`} style={screenStyles.subtle}>{item}</Text>)}
      </View>
    </EngineCard>
  );
}

function FuelMacroTargetsCard({ viewModel }: { viewModel: FuelViewModel }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.md }} testID="fuel-macro-target-card">
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.sectionTitle}>Today's fuel targets</Text>
          <Text style={screenStyles.body}>{viewModel.macroTargets.why}</Text>
          <Text style={screenStyles.subtle}>Confidence: {viewModel.macroTargets.confidence}. {viewModel.macroTargets.logStatus}</Text>
        </View>
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.fieldLabel}>Targets</Text>
          {viewModel.macroTargets.targets.map((item, index) => (
            <Text key={`fuel-target:${item.label}:${index}`} style={screenStyles.body}>{item.label}: {item.value}</Text>
          ))}
        </View>
        <View style={{ gap: spacing.md }}>
          <Text style={screenStyles.fieldLabel}>Logged today</Text>
          {viewModel.macroTargets.progress.map((item, index) => (
            <View key={`fuel-progress:${item.label}:${index}`} style={{ gap: spacing.xs }}>
              <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }}>
                <Text style={screenStyles.body}>{item.label}: {item.logged} / {item.target}</Text>
              </View>
              <LuminousProgressBar accent={macroAccent(item.label)} progress={progressRatio(item.logged, item.target)} />
            </View>
          ))}
        </View>
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
        {viewModel.actualIntakeSummary.rows.map((item, index) => <Text key={`actual-intake:${index}`} style={screenStyles.subtle}>{item}</Text>)}
      </View>
    </EngineCard>
  );
}

function HydrationContextCard({ viewModel }: { viewModel: FuelViewModel }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Hydration target context</Text>
        <Text style={screenStyles.body}>{viewModel.commandCenter.hydrationAction}</Text>
        <Text style={screenStyles.subtle}>{viewModel.hydrationSummary}</Text>
      </View>
    </EngineCard>
  );
}

function RecentFuelLogsCard({ recentLogs }: { recentLogs: RecentLogsViewModel }) {
  if (recentLogs.fuel.length === 0) {
    return <EmptyState title="No recent fuel logs" message="Food or hydration history is missing. It matters because Fuel confidence is lower without real intake context. Log food or water when you have it; targets stay engine-led." />;
  }
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Recent fuel logs</Text>
        <Text style={screenStyles.body}>{recentLogs.foodLogCountToday}</Text>
        {recentLogs.fuel.map((item, index) => <Text key={`recent-fuel:${index}`} style={screenStyles.subtle}>{item}</Text>)}
      </View>
    </EngineCard>
  );
}

function FuelRiskCard({ message, viewModel }: { message: string | null; viewModel: FuelViewModel }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Risks and why</Text>
        {viewModel.riskSummary.length > 0 ? viewModel.riskSummary.map((risk, index) => <Text key={`fuel-risk:${index}`} style={screenStyles.body}>{risk}</Text>) : <Text style={screenStyles.body}>No active fuel risk.</Text>}
        <Text style={screenStyles.subtle}>{viewModel.why}</Text>
        {message ? <Text style={screenStyles.subtle}>{message}</Text> : null}
      </View>
    </EngineCard>
  );
}

export function FuelScreen({ busy, message, onAcknowledgeNutritionSafetyReview, onRequestNutritionSafetyReview, quickLogs, recentLogs, viewModel }: FuelScreenProps) {
  const calorieTarget = viewModel.macroTargets.targets.find((item) => /calories/i.test(item.label))?.value ?? viewModel.calorieSummary;
  const hydrationTarget = viewModel.macroTargets.targets.find((item) => /water/i.test(item.label))?.value ?? viewModel.hydrationSummary;
  return (
    <LuminousScreen testID="fuel-screen">
      <ScreenHeader eyebrow="Today" title={viewModel.title} />
      <View style={{ gap: spacing.lg }} testID="fuel-command-section">
        <FuelStartHereCard viewModel={viewModel} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
          <MetricTile accent="orange" label="Calories" meta={viewModel.fuelHistory.todaySummary} value={calorieTarget} />
          <MetricTile accent="blue" label="Hydration" meta="target" value={hydrationTarget} />
        </View>
        <FuelMacroTargetsCard viewModel={viewModel} />
        <TodayFuelPriorityCard viewModel={viewModel} />
        <FoodQuickLogCard actions={quickLogs} busy={busy} status={recentLogs.foodToday} />
        <HydrationLogCard actions={quickLogs} busy={busy} status={recentLogs.hydrationToday} />
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
      </CollapsibleFuelSection>
    </LuminousScreen>
  );
}
