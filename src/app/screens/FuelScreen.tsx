import React from "react";
import { Pressable, Text, View } from "react-native";
import type { FuelViewModel, RecentLogsViewModel } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
import { PrimaryTaskCard, type FastTaskAction } from "../../design/components/FastTask";
import { LuminousScreen, ScreenHeader } from "../../design/components/LuminousScreen";
import {
  DashboardCard,
  DashboardPill,
  MiniBarChart,
  ProgressMeter,
  RangeGauge,
  TrendLineChart
} from "../../design/components/PerformanceVisuals";
import { colors, radii, spacing } from "../../design/theme";
import { buildFuelDashboardVisual, type FuelDashboardVisual, type ModifierVisual, type ProgressVisual, type VisualTone } from "../../engine/presentation/dashboardVisualData";
import { compactFuelCopy, plainFuelCopy } from "../../engine/presentation/fuelCopy";
import type { QuickLogActions } from "../../hooks/useQuickLogs";
import { NutritionSafetyReviewCard } from "./fuel/NutritionSafetyReviewCard";
import { NutritionReviewHistoryPanel } from "./fuel/NutritionReviewHistoryPanel";
import { FoodQuickLogCard, HydrationLogCard } from "./logging/LogCards";
import { screenStyles } from "./screenStyles";
import { tabHeroHeaders } from "./tabHeroConfig";

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

function progressWidth(ratio: number): `${number}%` {
  const clamped = Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : 0;
  return `${Math.max(5, clamped * 100)}%` as `${number}%`;
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
          {viewModel.completionControls.helperCopy.slice(0, 2).map((item, index) => <Text key={`fuel-completion-helper:${index}`} style={screenStyles.subtle}>{plainFuelCopy(item)}</Text>)}
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
            <Text style={screenStyles.subtle}>Log what you know, then return to overview.</Text>
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
        <Text style={screenStyles.sectionTitle}>Fuel safety</Text>
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

function helperForProgress(item: ProgressVisual, dashboard: FuelDashboardVisual): string {
  const guide = dashboard.todayGuide.find((target) =>
    target.label === item.label || (/hydration/i.test(item.label) && target.label === "Water")
  );
  return guide?.helperLabel ?? item.stateLabel ?? "Today";
}

function FuelProgressTile({ helper, item }: { helper: string; item: ProgressVisual }) {
  const toneColor = colorForTone(item.tone);
  return (
    <View
      style={{
        backgroundColor: `${toneColor}12`,
        borderColor: `${toneColor}5C`,
        borderCurve: "continuous",
        borderRadius: radii.tile,
        borderWidth: 1,
        flexBasis: 156,
        flexGrow: 1,
        gap: spacing.sm,
        minHeight: 118,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md
      }}
    >
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }}>
        <Text numberOfLines={1} style={{ color: toneColor, flex: 1, fontSize: 12, fontWeight: "900", lineHeight: 16 }}>
          {item.label}
        </Text>
        {item.stateLabel ? (
          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.065)",
              borderColor: `${toneColor}5F`,
              borderLeftColor: toneColor,
              borderLeftWidth: 3,
              borderRadius: 8,
              borderWidth: 1,
              maxWidth: 104,
              minHeight: 26,
              justifyContent: "center",
              paddingHorizontal: spacing.sm,
              paddingVertical: 2
            }}
          >
            <Text numberOfLines={1} style={{ color: toneColor, fontSize: 10, fontWeight: "900", letterSpacing: 0, lineHeight: 14 }}>
              {item.stateLabel}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={{ gap: 2 }}>
        <Text numberOfLines={1} style={{ color: colors.canvas, fontSize: 22, fontVariant: ["tabular-nums"], fontWeight: "900", lineHeight: 27 }}>
          {item.valueLabel}
        </Text>
        <Text numberOfLines={1} style={{ color: colors.wrap, fontSize: 12, fontWeight: "800", lineHeight: 16 }}>
          Target {item.targetLabel}
        </Text>
      </View>
      <View style={{ backgroundColor: "rgba(255, 255, 255, 0.13)", borderRadius: radii.pill, height: 8, overflow: "hidden" }}>
        <View style={{ backgroundColor: toneColor, borderRadius: radii.pill, height: "100%", width: progressWidth(item.ratio) }} />
      </View>
      <Text numberOfLines={1} style={{ color: colors.mutedText, fontSize: 11, fontWeight: "800", lineHeight: 15 }}>
        {helper}
      </Text>
    </View>
  );
}

function FuelContextTile({ item }: { item: ModifierVisual }) {
  const toneColor = colorForTone(item.tone);
  const filled = Math.round(Math.max(0, Math.min(1, item.ratio)) * 4);
  return (
    <View
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        borderColor: "rgba(255, 255, 255, 0.13)",
        borderCurve: "continuous",
        borderRadius: radii.tile,
        borderWidth: 1,
        flexBasis: 132,
        flexGrow: 1,
        gap: spacing.xs,
        minHeight: 76,
        padding: spacing.md
      }}
    >
      <Text numberOfLines={1} style={{ color: colors.wrap, fontSize: 11, fontWeight: "800", lineHeight: 15 }}>
        {item.label}
      </Text>
      <Text numberOfLines={1} style={{ color: toneColor, fontSize: 17, fontVariant: ["tabular-nums"], fontWeight: "900", lineHeight: 22 }}>
        {item.value}
      </Text>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View
            key={`fuel-context-dot:${item.label}:${index}`}
            style={{
              backgroundColor: index < filled ? toneColor : "rgba(255, 255, 255, 0.14)",
              borderRadius: radii.pill,
              flex: 1,
              height: 5
            }}
          />
        ))}
      </View>
    </View>
  );
}

function FuelDoNowSummary({ dashboard }: { dashboard: FuelDashboardVisual }) {
  const items = [
    ...dashboard.macros.filter((item) => /protein|carb/i.test(item.label)).slice(0, 2),
    { ...dashboard.hydration, label: "Water" }
  ];
  const foodStatus = dashboard.quickContext.find((item) => item.label === "Food log");
  return (
    <View
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        borderColor: "rgba(255, 255, 255, 0.12)",
        borderCurve: "continuous",
        borderRadius: radii.tile,
        borderWidth: 1,
        gap: spacing.sm,
        padding: spacing.md
      }}
      testID="fuel-do-now-summary"
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {items.map((item) => (
          <View key={`fuel-do-now:${item.label}`} style={{ flexBasis: 84, flexGrow: 1, gap: 2, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ color: colors.mutedText, fontSize: 11, fontWeight: "800", lineHeight: 15 }}>
              {item.label}
            </Text>
            <Text numberOfLines={1} style={{ color: colorForTone(item.tone), fontSize: 16, fontVariant: ["tabular-nums"], fontWeight: "900", lineHeight: 20 }}>
              {item.valueLabel}
            </Text>
            <Text numberOfLines={1} style={{ color: colors.wrap, fontSize: 10, fontWeight: "800", lineHeight: 13 }}>
              {item.stateLabel ?? "Today"}
            </Text>
          </View>
        ))}
        {foodStatus ? (
          <View style={{ flexBasis: 104, flexGrow: 1, gap: 2, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ color: colors.mutedText, fontSize: 11, fontWeight: "800", lineHeight: 15 }}>
              Food status
            </Text>
            <Text numberOfLines={1} style={{ color: colorForTone(foodStatus.tone), fontSize: 16, fontWeight: "900", lineHeight: 20 }}>
              {foodStatus.value}
            </Text>
            <Text numberOfLines={1} style={{ color: colors.wrap, fontSize: 10, fontWeight: "800", lineHeight: 13 }}>
              {foodStatus.ratio >= 0.65 ? "Enough context" : "Optional log"}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function FuelBoardCard({ dashboard }: { dashboard: FuelDashboardVisual }) {
  const progressItems: readonly ProgressVisual[] = [
    ...dashboard.macros,
    { ...dashboard.hydration, label: "Water" }
  ];
  return (
    <EngineCard>
      <View style={{ gap: spacing.md }} testID="fuel-macro-summary">
        <View style={{ alignItems: "flex-start", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }}>
          <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
            <Text style={screenStyles.sectionTitle}>Today's fuel</Text>
          </View>
          <DashboardPill label={dashboard.recommendation.label} tone={dashboard.recommendation.tone} />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {progressItems.map((item) => (
            <FuelProgressTile helper={helperForProgress(item, dashboard)} item={item} key={`fuel-progress-tile:${item.label}`} />
          ))}
        </View>
        <View style={{ borderTopColor: "rgba(255, 255, 255, 0.11)", borderTopWidth: 1, gap: spacing.sm, paddingTop: spacing.md }}>
          <Text style={{ color: colors.wrap, fontSize: 13, fontWeight: "900", lineHeight: 17 }}>Status</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {dashboard.quickContext.map((item) => <FuelContextTile item={item} key={`fuel-context:${item.label}`} />)}
          </View>
        </View>
      </View>
    </EngineCard>
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
      <View style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "space-between" }}>
        <View style={{ flexBasis: 240, flexGrow: 1, gap: spacing.xs }}>
          <Text style={screenStyles.sectionTitle}>Details</Text>
          <Text style={screenStyles.subtle}>{summary}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: detailOpen }}
          onPress={onToggle}
          style={[screenStyles.quietButton, { flexBasis: 156, flexGrow: 0, minHeight: 44, paddingHorizontal: spacing.md }]}
        >
          <Text style={screenStyles.quietButtonText}>{detailOpen ? "Hide fuel detail" : "Show fuel detail"}</Text>
        </Pressable>
      </View>
    </EngineCard>
  );
}

function FuelDetailDashboard({ dashboard }: { dashboard: FuelDashboardVisual }) {
  return (
    <View style={{ gap: spacing.md }} testID="fuel-detail-dashboard">
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
      <FuelBoardCard dashboard={dashboard} />
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
      <ScreenHeader {...tabHeroHeaders.fuel} title="Fuel" />
      <PrimaryTaskCard
        accent={accentForTone(dashboard.recommendation.tone)}
        actionLayout="primary-led"
        primaryAction={compactFuelCopy(dashboard.recommendation.body)}
        primaryButton={primaryFuelButton}
        purpose="Missing food stays unknown until you log it."
        secondaryActions={secondaryFuelActions}
        testID="fuel-primary-task"
        title="Do now"
      >
        <FuelDoNowSummary dashboard={dashboard} />
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
