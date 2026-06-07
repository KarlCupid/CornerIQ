import React from "react";
import { Pressable, Text, View } from "react-native";
import type { FuelViewModel, RecentLogsViewModel } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
import { LuminousScreen, ScreenHeader } from "../../design/components/LuminousScreen";
import {
  DashboardCard,
  DashboardPill,
  MacroRing,
  MiniBarChart,
  ProgressMeter,
  RangeGauge,
  TrendLineChart
} from "../../design/components/PerformanceVisuals";
import { colors, spacing } from "../../design/theme";
import { buildFuelDashboardVisual, type FuelDashboardVisual } from "../../engine/presentation/dashboardVisualData";
import type { QuickLogActions } from "../../hooks/useQuickLogs";
import { NutritionSafetyReviewCard } from "./fuel/NutritionSafetyReviewCard";
import { NutritionReviewHistoryPanel } from "./fuel/NutritionReviewHistoryPanel";
import { FoodQuickLogCard, HydrationLogCard } from "./logging/LogCards";
import { screenStyles } from "./screenStyles";

export interface FuelScreenProps {
  busy: boolean;
  focusIntent?: FuelFocusIntent | undefined;
  message: string | null;
  onAcknowledgeNutritionSafetyReview?: ((reviewId: string) => void | Promise<void>) | undefined;
  onFocusIntentApplied?: (() => void) | undefined;
  quickLogs: QuickLogActions;
  recentLogs: RecentLogsViewModel;
  viewModel: FuelViewModel;
}

export type FuelFocusIntent = "action" | "log_food" | "log_hydration" | "safety_review";

function plainFuelCopy(value: string): string {
  return value
    .replace(new RegExp("target " + "confidence", "gi"), "how sure we are")
    .replace(new RegExp("pro" + "visional", "gi"), "rough guide")
    .replace(new RegExp("under-" + "fueling evidence", "gi"), "too little food for the work")
    .replace(new RegExp("under-" + "fueling", "gi"), "too little food")
    .replace(new RegExp("body-" + "mass context", "gi"), "weight trend")
    .replace(new RegExp("hard " + "stop", "gi"), "safety stop");
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
          <Text style={screenStyles.subtle}>Too little food for the work is only considered after you say the day is done.</Text>
        </View>
        <View style={{ gap: spacing.xs }}>
          {viewModel.completionControls.helperCopy.map((item, index) => <Text key={`fuel-completion-helper:${index}`} style={screenStyles.subtle}>{plainFuelCopy(item)}</Text>)}
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
              <Text style={screenStyles.subtle}>{plainFuelCopy(action.summary)}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </EngineCard>
  );
}

function FuelLogActionSection({
  busy,
  primaryLog,
  quickLogs,
  recentLogs
}: {
  busy: boolean;
  primaryLog: "food" | "water";
  quickLogs: QuickLogActions;
  recentLogs: RecentLogsViewModel;
}) {
  const primaryCard = primaryLog === "food" ? (
    <FoodQuickLogCard actions={quickLogs} busy={busy} status={recentLogs.foodToday} />
  ) : (
    <HydrationLogCard actions={quickLogs} busy={busy} status={recentLogs.hydrationToday} />
  );
  const secondaryCard = primaryLog === "food" ? (
    <HydrationLogCard actions={quickLogs} busy={busy} status={recentLogs.hydrationToday} />
  ) : (
    <FoodQuickLogCard actions={quickLogs} busy={busy} status={recentLogs.foodToday} />
  );
  return (
    <View style={{ gap: spacing.lg }} testID="fuel-log-action-section">
      {primaryCard}
      {secondaryCard}
    </View>
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

function FuelSafetyReviewSection({
  message,
  onAcknowledgeNutritionSafetyReview,
  viewModel
}: {
  message: string | null;
  onAcknowledgeNutritionSafetyReview?: ((reviewId: string) => void | Promise<void>) | undefined;
  viewModel: FuelViewModel;
}) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.lg }} testID="fuel-reviews-section">
        <View style={{ gap: spacing.xs }}>
          <Text style={[screenStyles.sectionTitle, { color: colors.redCorner }]}>Safety stop</Text>
          <Text style={screenStyles.body}>Safety is active. Keep regular food and fluids steady, and use qualified support outside the app.</Text>
        </View>
      <NutritionSafetyReviewCard
        activeReviews={viewModel.activeNutritionSafetyReviews}
        onAcknowledgeReview={onAcknowledgeNutritionSafetyReview}
        review={viewModel.nutritionSafetyReview}
      />
      <NutritionReviewHistoryPanel history={viewModel.nutritionReviewHistory} />
      <FuelRiskCard message={message} viewModel={viewModel} />
      </View>
    </EngineCard>
  );
}

function FuelVisualDashboard({
  dashboard,
  onLogHydration,
  onLogMeal
}: {
  dashboard: FuelDashboardVisual;
  onLogHydration: () => void;
  onLogMeal: () => void;
}) {
  return (
    <View style={{ gap: spacing.md }} testID="fuel-visual-dashboard">
      <DashboardCard testID="fuel-macro-summary" title="Macro summary">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "space-between" }}>
          {dashboard.macros.map((item) => <MacroRing item={item} key={`fuel-macro-ring:${item.label}`} />)}
        </View>
      </DashboardCard>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
        <View style={{ flexBasis: 240, flexGrow: 1 }}>
          <DashboardCard headerRight={<DashboardPill label={dashboard.hydration.stateLabel ?? "Today"} tone={dashboard.hydration.tone} />} title="Hydration">
            <ProgressMeter item={dashboard.hydration} />
          </DashboardCard>
        </View>
        <View style={{ flexBasis: 240, flexGrow: 1 }}>
          <DashboardCard headerRight={<DashboardPill label={dashboard.sodium.stateLabel ?? "Today"} tone={dashboard.sodium.tone} />} title="Sodium">
            <ProgressMeter item={dashboard.sodium} />
          </DashboardCard>
        </View>
      </View>

      <DashboardCard
        headerRight={<DashboardPill label={dashboard.mealReferenceLabel} tone={dashboard.meals.some((item) => item.value > 0) ? "blue" : "orange"} />}
        testID="fuel-meal-distribution"
        title="Meal distribution"
      >
        <MiniBarChart bars={dashboard.meals} height={112} referenceLabel="Target context" />
      </DashboardCard>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
        <View style={{ flexBasis: 280, flexGrow: 1 }}>
          <DashboardCard title="Body mass and fueling trend">
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.subtle}>Body mass</Text>
              <TrendLineChart accent="blue" points={dashboard.trend.bodyMass} width={230} />
              <Text style={screenStyles.subtle}>Carbs</Text>
              <TrendLineChart accent="orange" points={dashboard.trend.carbs} width={230} />
            </View>
          </DashboardCard>
        </View>
        <View style={{ flexBasis: 280, flexGrow: 1 }}>
          <DashboardCard title={dashboard.bodyMassRange.title}>
            <RangeGauge
              current={dashboard.bodyMassRange.current}
              currentLabel={dashboard.bodyMassRange.currentLabel}
              max={dashboard.bodyMassRange.max}
              min={dashboard.bodyMassRange.min}
              target={dashboard.bodyMassRange.target}
              targetLabel={dashboard.bodyMassRange.targetLabel}
            />
            <Text style={screenStyles.subtle}>{dashboard.bodyMass.deltaLabel}</Text>
          </DashboardCard>
        </View>
      </View>

      <DashboardCard title="Recovery support">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
          {dashboard.recovery.map((item) => (
            <View key={`fuel-recovery:${item.label}`} style={{ flexBasis: 140, flexGrow: 1 }}>
              <ProgressMeter compact item={item} />
            </View>
          ))}
        </View>
      </DashboardCard>

      <DashboardCard headerRight={<DashboardPill label={dashboard.recommendation.label} tone={dashboard.recommendation.tone} />} title="Today's recommendation">
        <Text style={{ color: colors.canvas, fontSize: 18, fontWeight: "900", lineHeight: 24 }}>{dashboard.recommendation.body}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <Pressable accessibilityLabel="Log meal" accessibilityRole="button" onPress={onLogMeal} style={[screenStyles.button, { flexBasis: 160, flexGrow: 1 }]}>
            <Text style={screenStyles.buttonText}>Log meal</Text>
          </Pressable>
          <Pressable accessibilityLabel="Log hydration" accessibilityRole="button" onPress={onLogHydration} style={[screenStyles.quietButton, { flexBasis: 160, flexGrow: 1 }]}>
            <Text style={screenStyles.quietButtonText}>Add water</Text>
          </Pressable>
        </View>
      </DashboardCard>
    </View>
  );
}

export function FuelScreen({ busy, focusIntent, message, onAcknowledgeNutritionSafetyReview, onFocusIntentApplied, quickLogs, recentLogs, viewModel }: FuelScreenProps) {
  const [appliedFocusIntent, setAppliedFocusIntent] = React.useState<FuelFocusIntent | null>(null);
  React.useEffect(() => {
    if (!focusIntent) {
      return;
    }
    setAppliedFocusIntent(focusIntent);
    onFocusIntentApplied?.();
  }, [focusIntent, onFocusIntentApplied]);
  const safetyReviewActive = viewModel.nutritionSafetyReview.required || viewModel.activeNutritionSafetyReviews.length > 0 || viewModel.nutritionReviewHistory.activeReviewCount > 0;
  const primaryLog =
    appliedFocusIntent === "log_hydration" || focusIntent === "log_hydration"
      ? "water"
      : appliedFocusIntent === "log_food" || focusIntent === "log_food" || recentLogs.foodToday.entryCount === 0 || recentLogs.hydrationToday.loggedToday
        ? "food"
        : "water";
  const logSection = <FuelLogActionSection busy={busy} primaryLog={primaryLog} quickLogs={quickLogs} recentLogs={recentLogs} />;
  const dashboard = buildFuelDashboardVisual(viewModel, recentLogs);
  const showLogSection = appliedFocusIntent === "log_food" || appliedFocusIntent === "log_hydration" || focusIntent === "log_food" || focusIntent === "log_hydration";
  return (
    <LuminousScreen testID="fuel-screen">
      <ScreenHeader eyebrow="Today" title="Fuel" />
      <FuelVisualDashboard
        dashboard={dashboard}
        onLogHydration={() => setAppliedFocusIntent("log_hydration")}
        onLogMeal={() => setAppliedFocusIntent("log_food")}
      />
      {safetyReviewActive ? (
        <FuelSafetyReviewSection
          message={message}
          onAcknowledgeNutritionSafetyReview={onAcknowledgeNutritionSafetyReview}
          viewModel={viewModel}
        />
      ) : null}
      {showLogSection ? logSection : null}
      {showLogSection ? <FoodLogStatusCard busy={busy} quickLogs={quickLogs} viewModel={viewModel} /> : null}
      {viewModel.underFuelingRisk ? (
        <EngineCard>
          <View style={{ gap: spacing.sm }}>
            <Text style={screenStyles.sectionTitle}>{viewModel.underFuelingRisk.title}</Text>
            <Text style={screenStyles.body}>{viewModel.underFuelingRisk.summary}</Text>
            {viewModel.underFuelingRisk.actions.map((item, index) => <Text key={`fuel-under-risk:${index}`} style={screenStyles.subtle}>{plainFuelCopy(item)}</Text>)}
          </View>
        </EngineCard>
      ) : null}
      {message && !safetyReviewActive ? (
        <EngineCard>
          <Text style={[screenStyles.subtle, { color: colors.amberCaution }]}>{message}</Text>
        </EngineCard>
      ) : null}
    </LuminousScreen>
  );
}
