import React from "react";
import { Pressable, Text, View } from "react-native";
import type { FuelViewModel, RecentLogsViewModel } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
import { CompactStatusStrip, PrimaryTaskCard, type FastTaskAction } from "../../design/components/FastTask";
import { LuminousScreen, ScreenHeader } from "../../design/components/LuminousScreen";
import {
  DashboardCard,
  DashboardPill,
  MiniBarChart,
  ProgressMeter,
  RangeGauge,
  TrendLineChart
} from "../../design/components/PerformanceVisuals";
import { colors, spacing } from "../../design/theme";
import { buildFuelDashboardVisual, type FuelDashboardVisual, type TargetGuideVisual, type VisualTone } from "../../engine/presentation/dashboardVisualData";
import { compactFuelCopy, plainFuelCopy } from "../../engine/presentation/fuelCopy";
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

function accentForTone(tone: VisualTone): "blue" | "green" | "orange" | "purple" | "gold" | "red" {
  return tone === "muted" ? "blue" : tone;
}

function colorForTone(tone: VisualTone): string {
  switch (tone) {
    case "blue":
      return colors.blueIQ;
    case "green":
      return colors.readyGreen;
    case "orange":
      return colors.amberCaution;
    case "purple":
      return colors.powerPurple;
    case "gold":
      return colors.gold;
    case "red":
      return colors.redCorner;
    case "muted":
    default:
      return colors.mutedText;
  }
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
          <Text style={screenStyles.callout}>{plainFuelCopy(viewModel.foodLogStatus.status.replaceAll("_", " "))}</Text>
          <Text style={screenStyles.body}>{plainFuelCopy(viewModel.foodLogStatus.athleteFacingSummary)}</Text>
          <Text style={screenStyles.subtle}>Logged: {viewModel.foodLogStatus.totalCaloriesLogged} kcal. Guide: {plainFuelCopy(viewModel.calorieSummary)}.</Text>
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
  onClose,
  primaryLog,
  quickLogs,
  recentLogs
}: {
  busy: boolean;
  onClose: () => void;
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
      <EngineCard>
        <View style={{ alignItems: "flex-start", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }}>
          <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
            <Text style={screenStyles.sectionTitle}>{primaryLog === "water" ? "Add water" : "Log food"}</Text>
            <Text style={screenStyles.subtle}>Use this logger, then return to the overview. Quick logging stays available any time.</Text>
          </View>
          <Pressable accessibilityLabel="Back to Fuel overview" accessibilityRole="button" onPress={onClose} style={[screenStyles.quietButton, { minHeight: 44, minWidth: 92, paddingHorizontal: spacing.md }]}>
            <Text style={screenStyles.quietButtonText}>Back to overview</Text>
          </Pressable>
        </View>
      </EngineCard>
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
        {viewModel.riskSummary.length > 0 ? viewModel.riskSummary.map((risk, index) => <Text key={`fuel-risk:${index}`} style={screenStyles.body}>{plainFuelCopy(risk)}</Text>) : <Text style={screenStyles.body}>No active fuel risk.</Text>}
        <Text style={screenStyles.subtle}>{plainFuelCopy(viewModel.why)}</Text>
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
          <Text style={screenStyles.body}>Safety is active. Keep regular food and fluids steady, and use medical or nutrition support outside the app.</Text>
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

function TargetGuideTile({ item }: { item: TargetGuideVisual }) {
  const toneColor = colorForTone(item.tone);
  return (
    <View
      style={{
        backgroundColor: `${toneColor}14`,
        borderColor: `${toneColor}55`,
        borderRadius: 8,
        borderWidth: 1,
        flexBasis: 132,
        flexGrow: 1,
        gap: spacing.xs,
        minHeight: 78,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm
      }}
    >
      <Text numberOfLines={1} style={{ color: toneColor, fontSize: 12, fontWeight: "900", lineHeight: 16 }}>
        {item.label}
      </Text>
      <Text numberOfLines={1} style={{ color: colors.canvas, fontSize: 20, fontWeight: "900", lineHeight: 25 }}>
        {item.valueLabel}
      </Text>
      <Text numberOfLines={1} style={{ color: colors.wrap, fontSize: 11, fontWeight: "700", lineHeight: 15 }}>
        {item.helperLabel}
      </Text>
    </View>
  );
}

function FuelDetailToggle({
  detailOpen,
  onToggle,
  summary
}: {
  detailOpen: boolean;
  onToggle: () => void;
  summary: string;
}) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: detailOpen }}
          onPress={onToggle}
          style={[screenStyles.quietButton, { minHeight: 44, paddingHorizontal: spacing.md }]}
        >
          <Text style={screenStyles.quietButtonText}>{detailOpen ? "Hide fuel detail" : "Show fuel detail"}</Text>
        </Pressable>
        <Text style={screenStyles.subtle}>{summary}</Text>
      </View>
    </EngineCard>
  );
}

function FuelDetailDashboard({ dashboard }: { dashboard: FuelDashboardVisual }) {
  return (
    <View style={{ gap: spacing.md }} testID="fuel-detail-dashboard">
      <DashboardCard testID="fuel-macro-summary" title="Food progress">
        <View style={{ gap: spacing.sm }}>
          {dashboard.macros.map((item) => <ProgressMeter compact item={item} key={`fuel-macro-progress:${item.label}`} />)}
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
          <DashboardCard title="Body weight and fueling trend">
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.subtle}>Body weight</Text>
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
    </View>
  );
}

function FuelVisualDashboard({
  dashboard,
  detailOpen,
  onToggleDetail
}: {
  dashboard: FuelDashboardVisual;
  detailOpen: boolean;
  onToggleDetail: () => void;
}) {
  return (
    <View style={{ gap: spacing.md }} testID="fuel-visual-dashboard">
      <DashboardCard testID="fuel-today-guide" title="Today's guide">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {dashboard.todayGuide.map((item) => <TargetGuideTile item={item} key={`fuel-guide:${item.label}`} />)}
        </View>
      </DashboardCard>

      <FuelDetailToggle detailOpen={detailOpen} onToggle={onToggleDetail} summary={dashboard.detailSummary} />
      {detailOpen ? <FuelDetailDashboard dashboard={dashboard} /> : null}
    </View>
  );
}

export function FuelScreen({ busy, focusIntent, message, onAcknowledgeNutritionSafetyReview, onFocusIntentApplied, quickLogs, recentLogs, viewModel }: FuelScreenProps) {
  const [appliedFocusIntent, setAppliedFocusIntent] = React.useState<FuelFocusIntent | null>(null);
  const dashboard = buildFuelDashboardVisual(viewModel, recentLogs);
  const [fuelDetailOpen, setFuelDetailOpen] = React.useState(dashboard.detailDefaultOpen);
  React.useEffect(() => {
    if (!focusIntent) {
      return;
    }
    setAppliedFocusIntent(focusIntent);
    onFocusIntentApplied?.();
  }, [focusIntent, onFocusIntentApplied]);
  React.useEffect(() => {
    if (dashboard.detailDefaultOpen) {
      setFuelDetailOpen(true);
    }
  }, [dashboard.detailDefaultOpen]);
  const safetyReviewActive = viewModel.nutritionSafetyReview.required || viewModel.activeNutritionSafetyReviews.length > 0 || viewModel.nutritionReviewHistory.activeReviewCount > 0;
  const primaryLog =
    appliedFocusIntent === "log_hydration" || focusIntent === "log_hydration"
      ? "water"
      : appliedFocusIntent === "log_food" || focusIntent === "log_food" || recentLogs.foodToday.entryCount === 0 || recentLogs.hydrationToday.loggedToday
        ? "food"
        : "water";
  const closeLogSection = () => {
    setAppliedFocusIntent(null);
    onFocusIntentApplied?.();
  };
  const logSection = <FuelLogActionSection busy={busy} onClose={closeLogSection} primaryLog={primaryLog} quickLogs={quickLogs} recentLogs={recentLogs} />;
  const showLogSection = appliedFocusIntent === "log_food" || appliedFocusIntent === "log_hydration";
  const primaryFuelButton: FastTaskAction = primaryLog === "water"
    ? {
        disabled: busy,
        label: "Add water",
        onPress: () => setAppliedFocusIntent("log_hydration"),
        summary: "Fast log"
      }
    : {
        disabled: busy,
        label: "Log meal",
        onPress: () => setAppliedFocusIntent("log_food"),
        summary: "Optional"
      };
  const secondaryFuelActions: FastTaskAction[] = primaryLog === "water"
    ? [{
        disabled: busy,
        label: "Log meal",
        onPress: () => setAppliedFocusIntent("log_food"),
        summary: "If useful"
      }]
    : [{
        disabled: busy,
        label: "Add water",
        onPress: () => setAppliedFocusIntent("log_hydration"),
        summary: "Fast log"
      }];
  return (
    <LuminousScreen testID="fuel-screen">
      <ScreenHeader eyebrow="Today" title="Fuel" />
      <PrimaryTaskCard
        accent={accentForTone(dashboard.recommendation.tone)}
        actionLayout="primary-led"
        primaryAction={compactFuelCopy(dashboard.recommendation.body)}
        primaryButton={primaryFuelButton}
        purpose="Log only what you know. Missing food stays unknown, not unsafe by itself."
        secondaryActions={secondaryFuelActions}
        testID="fuel-primary-task"
        title="Do now"
      >
        <CompactStatusStrip
          items={[
            ...dashboard.macros.slice(0, 3).map((item) => ({
              accent: accentForTone(item.tone),
              label: item.label,
              meta: item.targetLabel,
              value: item.valueLabel
            })),
            {
              accent: accentForTone(dashboard.hydration.tone),
              label: "Water",
              meta: dashboard.hydration.targetLabel,
              value: dashboard.hydration.valueLabel
            }
          ]}
          variant="quiet"
        />
      </PrimaryTaskCard>
      {safetyReviewActive ? (
        <FuelSafetyReviewSection
          message={message}
          onAcknowledgeNutritionSafetyReview={onAcknowledgeNutritionSafetyReview}
          viewModel={viewModel}
        />
      ) : null}
      {viewModel.underFuelingRisk ? (
        <EngineCard>
          <View style={{ gap: spacing.sm }}>
            <Text style={screenStyles.sectionTitle}>{viewModel.underFuelingRisk.title}</Text>
            <Text style={screenStyles.body}>{plainFuelCopy(viewModel.underFuelingRisk.summary)}</Text>
            {viewModel.underFuelingRisk.actions.map((item, index) => <Text key={`fuel-under-risk:${index}`} style={screenStyles.subtle}>{plainFuelCopy(item)}</Text>)}
          </View>
        </EngineCard>
      ) : null}
      {showLogSection ? logSection : null}
      {showLogSection ? <FoodLogStatusCard busy={busy} quickLogs={quickLogs} viewModel={viewModel} /> : null}
      <FuelVisualDashboard
        dashboard={dashboard}
        detailOpen={fuelDetailOpen}
        onToggleDetail={() => setFuelDetailOpen((value) => !value)}
      />
      {message && !safetyReviewActive ? (
        <EngineCard>
          <Text style={[screenStyles.subtle, { color: colors.amberCaution }]}>{message}</Text>
        </EngineCard>
      ) : null}
    </LuminousScreen>
  );
}
