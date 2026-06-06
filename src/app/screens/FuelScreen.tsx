import React, { type PropsWithChildren } from "react";
import { Pressable, Text, View } from "react-native";
import type { FuelContextCard, FuelViewModel, RecentLogsViewModel } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
import { EmptyState } from "../../design/components/EmptyState";
import { LuminousProgressBar, LuminousScreen, ScreenHeader, type LuminousAccent } from "../../design/components/LuminousScreen";
import { TopActionCard } from "../../design/components/TopActionCard";
import { colors, spacing } from "../../design/theme";
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

function loggedIsZero(value: string): boolean {
  const loggedNumber = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(loggedNumber) && loggedNumber === 0;
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
        <Text style={screenStyles.subtle}>Session fueling handoff: {viewModel.trainingDemandHandoff.fuelPriorityByDate.find((item) => item.date === viewModel.foodLogStatus.date)?.priority ?? viewModel.trainingDemandHandoff.carbPriorityToday}</Text>
        <Text style={screenStyles.subtle}>Training demand today: {viewModel.trainingDemandHandoff.todayTrainingDemand}; tier: {viewModel.trainingDemandHandoff.todayTrainingDemandTier.replaceAll("_", " ")}. This week: {viewModel.trainingDemandHandoff.weeklyTrainingDemandTier.replaceAll("_", " ")}.</Text>
        <Text style={screenStyles.subtle}>{viewModel.trainingDemandHandoff.carbPriorityToday}</Text>
        <Text style={screenStyles.subtle}>{viewModel.trainingDemandHandoff.hydrationPriorityToday}</Text>
        {viewModel.trainingDemandHandoff.missingFoodLogAdvisory ? <Text style={screenStyles.subtle}>{viewModel.trainingDemandHandoff.missingFoodLogAdvisory}</Text> : null}
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
        {card.actions.map((item, index) => <Text key={`fuel-context-action:${index}`} style={screenStyles.subtle}>{item}</Text>)}
      </View>
    </EngineCard>
  );
}

function FuelMacroTargetsCard({ recentLogs, viewModel }: { recentLogs: RecentLogsViewModel; viewModel: FuelViewModel }) {
  const noFoodLogged = recentLogs.foodToday.entryCount === 0 || viewModel.macroTargets.progress.every((item) => loggedIsZero(item.logged));
  const statusLine = noFoodLogged ? "No food logged yet" : `Confidence: ${viewModel.macroTargets.confidence}`;
  return (
    <EngineCard>
      <View style={{ gap: spacing.md }} testID="fuel-macro-target-card">
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.sectionTitle}>Today's fuel targets</Text>
          <Text style={screenStyles.fieldLabel}>Why these targets</Text>
          <Text style={screenStyles.body}>{viewModel.macroTargets.why}</Text>
          <Text style={screenStyles.callout}>Target status: {viewModel.macroTargets.targetConfidence.status.replaceAll("_", " ")}</Text>
          {viewModel.macroTargets.targetConfidence.reasons.slice(0, 3).map((reason, index) => <Text key={`fuel-target-reason:${index}`} style={screenStyles.subtle}>{reason}</Text>)}
          {viewModel.macroTargets.targetConfidence.missingInputs.length > 0 ? (
            <Text style={screenStyles.subtle}>Missing or weak inputs: {viewModel.macroTargets.targetConfidence.missingInputs.join(", ")}</Text>
          ) : null}
          <Text style={screenStyles.subtle}>Logs help compare what happened.</Text>
          <Text style={screenStyles.subtle}>{statusLine}. {viewModel.macroTargets.logStatus}</Text>
        </View>
        <View style={{ gap: spacing.md }}>
          {viewModel.macroTargets.progress.map((item, index) => (
            <View key={`fuel-progress:${index}`} style={{ gap: spacing.xs }}>
              <View style={{ alignItems: "flex-start", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }}>
                <Text style={[screenStyles.fieldLabel, { flexShrink: 1, minWidth: 0 }]}>{item.label}</Text>
                <Text style={[screenStyles.subtle, { color: colors.canvas, flexShrink: 1, minWidth: 0, textAlign: "right" }]}>{item.logged} / {item.target}</Text>
              </View>
              <LuminousProgressBar accent={macroAccent(item.label)} progress={progressRatio(item.logged, item.target)} />
            </View>
          ))}
        </View>
      </View>
    </EngineCard>
  );
}

function FoodLogStatusCard({ busy, quickLogs, viewModel }: { busy: boolean; quickLogs: QuickLogActions; viewModel: FuelViewModel }) {
  const run = (kind: FuelViewModel["completionControls"]["actions"][number]["kind"]) => {
    if (kind === "still_logging") {
      void quickLogs.markFoodStillLoggingToday();
      return;
    }
    if (kind === "done_logging") {
      void quickLogs.markFoodDoneLoggingToday();
      return;
    }
    void quickLogs.markFoodNotTrackingToday();
  };
  return (
    <EngineCard>
      <View style={{ gap: spacing.md }} testID="fuel-food-status-card">
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.sectionTitle}>{viewModel.completionControls.statusTitle}</Text>
          <Text style={screenStyles.callout}>{viewModel.foodLogStatus.status.replaceAll("_", " ")}</Text>
          <Text style={screenStyles.body}>{viewModel.foodLogStatus.athleteFacingSummary}</Text>
          <Text style={screenStyles.subtle}>Logged so far: {viewModel.foodLogStatus.totalCaloriesLogged} kcal / {viewModel.calorieSummary}.</Text>
          <Text style={screenStyles.subtle}>This is not under-fueling evidence unless you mark the day complete.</Text>
        </View>
        <View style={{ gap: spacing.xs }}>
          {viewModel.completionControls.helperCopy.map((item, index) => <Text key={`fuel-completion-helper:${index}`} style={screenStyles.subtle}>{item}</Text>)}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {viewModel.completionControls.actions.map((action) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              key={`fuel-completion-action:${action.kind}`}
              onPress={() => run(action.kind)}
              style={[action.kind === "done_logging" ? screenStyles.button : screenStyles.quietButton, { flexBasis: 220, flexGrow: 1 }]}
            >
              <Text style={action.kind === "done_logging" ? screenStyles.buttonText : screenStyles.quietButtonText}>{action.label}</Text>
              <Text style={screenStyles.subtle}>{action.summary}</Text>
            </Pressable>
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

export function FuelScreen({ busy, message, onAcknowledgeNutritionSafetyReview, quickLogs, recentLogs, viewModel }: FuelScreenProps) {
  const primaryLog = recentLogs.foodToday.entryCount === 0 || recentLogs.hydrationToday.loggedToday ? "food" : "water";
  return (
    <LuminousScreen testID="fuel-screen">
      <ScreenHeader eyebrow="Today" title={viewModel.title} />
      <View style={{ gap: spacing.lg }} testID="fuel-command-section">
        <FuelStartHereCard viewModel={viewModel} />
        <FuelMacroTargetsCard recentLogs={recentLogs} viewModel={viewModel} />
        <TodayFuelPriorityCard viewModel={viewModel} />
        <FoodLogStatusCard busy={busy} quickLogs={quickLogs} viewModel={viewModel} />
        {primaryLog === "food" ? (
          <FoodQuickLogCard actions={quickLogs} busy={busy} status={recentLogs.foodToday} />
        ) : (
          <HydrationLogCard actions={quickLogs} busy={busy} status={recentLogs.hydrationToday} />
        )}
      </View>
      <CollapsibleFuelSection
        summary="Open when a hard stop or saved safety history matters."
        testID="fuel-reviews-section"
        title="Safety review"
      >
        <NutritionSafetyReviewCard
          activeReviews={viewModel.activeNutritionSafetyReviews}
          onAcknowledgeReview={onAcknowledgeNutritionSafetyReview}
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
        {primaryLog === "food" ? (
          <HydrationLogCard actions={quickLogs} busy={busy} status={recentLogs.hydrationToday} />
        ) : (
          <FoodQuickLogCard actions={quickLogs} busy={busy} status={recentLogs.foodToday} />
        )}
        <RecentFuelLogsCard recentLogs={recentLogs} />
      </CollapsibleFuelSection>
      <CollapsibleFuelSection
        summary="Body-mass context is secondary unless the engine flags a safety concern."
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
