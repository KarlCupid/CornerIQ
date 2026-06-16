import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";
import type { FuelViewModel, RecentLogsViewModel } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
import { LuminousScreen, ScreenHeader, useLuminousScreenTheme } from "../../design/components/LuminousScreen";
import { DashboardPill, TrendLineChart } from "../../design/components/PerformanceVisuals";
import { colors, radii, spacing } from "../../design/theme";
import { buildFuelDashboardVisual, type FuelDashboardVisual, type VisualTone } from "../../engine/presentation/dashboardVisualData";
import { plainFuelCopy } from "../../engine/presentation/fuelCopy";
import type { QuickLogActions } from "../../hooks/useQuickLogs";
import { NutritionSafetyReviewCard } from "./fuel/NutritionSafetyReviewCard";
import { NutritionReviewHistoryPanel } from "./fuel/NutritionReviewHistoryPanel";
import { FoodQuickLogCard, HydrationLogCard } from "./logging/LogCards";
import { screenStyles } from "./screenStyles";
import { tabHeroHeaders, tabScreenBackgrounds } from "./tabHeroConfig";

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

type FuelPlanLabel = "No active cut" | "On pace" | "Tight" | "Behind pace" | "Too aggressive" | "Pause cut";

interface FuelPlanStatus {
  action: string;
  label: FuelPlanLabel;
  sentence: string;
  tone: VisualTone;
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

function firstNumber(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function titleCaseStatus(value: string): string {
  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function planStatusFromFuel(viewModel: FuelViewModel, warningActive: boolean): FuelPlanStatus {
  if (warningActive || viewModel.underFuelingRisk) {
    return {
      action: "Eat normally today. Hydrate normally. Do not cut harder.",
      label: "Pause cut",
      sentence: viewModel.underFuelingRisk
        ? "Your body is not showing enough recovery to keep pushing weight."
        : "A cut warning is active, so weight pressure pauses today.",
      tone: "red"
    };
  }

  switch (viewModel.weightClassStatus.status) {
    case "no_active_weight_target":
      return {
        action: "Train normally. Keep food and fluids steady.",
        label: "No active cut",
        sentence: "No fight weight target is active today.",
        tone: "muted"
      };
    case "on_track":
    case "ahead":
      return {
        action: "Do the planned boxing. Eat before training.",
        label: "On pace",
        sentence: "Your weight is moving at a reasonable pace.",
        tone: "green"
      };
    case "behind":
      return {
        action: "Do the planned boxing. Do not add bonus work just to chase weight.",
        label: "Behind pace",
        sentence: "The scale is not moving fast enough for the current date.",
        tone: "orange"
      };
    case "unsafe":
      return {
        action: "Pause weight pressure and review the plan.",
        label: "Too aggressive",
        sentence: "Making this weight from here may cost performance.",
        tone: "red"
      };
    case "blocked":
    case "needs_review":
      return {
        action: "Pause weight pressure and review the plan.",
        label: "Too aggressive",
        sentence: "This cut needs outside support before weight pressure continues.",
        tone: "red"
      };
    case "cycle_noisy":
      return {
        action: "Keep meals predictable. No extra conditioning.",
        label: "Tight",
        sentence: "The scale may be noisy today, so use the trend before reacting.",
        tone: "orange"
      };
    case "unknown":
    default:
      return {
        action: "Log morning weight if useful. Do not guess the cut is safe.",
        label: "Tight",
        sentence: "The trend is unclear because key weight data is missing.",
        tone: "orange"
      };
  }
}

function trainingTodayCopy(viewModel: FuelViewModel, plan: FuelPlanStatus): string {
  if (plan.label === "Pause cut") {
    return "Make today a recovery day.";
  }
  if (plan.label === "Too aggressive") {
    return "Short session only.";
  }
  if (plan.label === "Behind pace") {
    return "Do the planned boxing. Do not add bonus work just to chase weight.";
  }
  if (plan.label === "Tight") {
    return "Do the planned boxing. Skip extra conditioning.";
  }
  if (viewModel.trainingDemandHandoff.todayTrainingDemand === "high") {
    return "Do the planned boxing. Eat before training.";
  }
  return plan.label === "No active cut" ? "Train normally." : "Do the planned boxing.";
}

function weightLabel(viewModel: FuelViewModel): string {
  const latest = viewModel.weightClassStatus.latestBodyMassKg;
  if (latest !== null) {
    return `${latest.toFixed(1)} kg`;
  }
  return viewModel.bodyMassTrajectory.latestWeight.replace(/^Latest:\s*/i, "") || "Unknown";
}

function toWeightLabel(dashboard: FuelDashboardVisual, viewModel: FuelViewModel): string {
  if (viewModel.weightClassStatus.status === "no_active_weight_target") {
    return "No target";
  }
  const current = dashboard.bodyMassRange.current;
  const target = dashboard.bodyMassRange.target;
  if (current === null || target === null) {
    return "Unknown";
  }
  const delta = current - target;
  if (Math.abs(delta) < 0.05) {
    return "At class";
  }
  return delta > 0 ? `${delta.toFixed(1)} kg over` : `${Math.abs(delta).toFixed(1)} kg under`;
}

function weighInLabel(viewModel: FuelViewModel): string {
  if (viewModel.weightClassStatus.status === "no_active_weight_target") {
    return "No date";
  }
  const days = firstNumber(viewModel.bodyMassTrajectory.daysToWeighIn);
  if (days === null) {
    return "Unknown";
  }
  return `${days} ${days === 1 ? "day" : "days"}`;
}

function bodyCheck(viewModel: FuelViewModel, warningActive: boolean): { tone: VisualTone; value: string } {
  if (warningActive) {
    return { tone: "red", value: "Cut warning" };
  }
  if (viewModel.underFuelingRisk || viewModel.riskSummary.length > 0 || viewModel.weightClassStatus.safetyFlags.length > 0) {
    return { tone: "orange", value: "Caution" };
  }
  if (viewModel.weightClassStatus.status === "unknown") {
    return { tone: "orange", value: "Unknown" };
  }
  return { tone: "green", value: "Clear" };
}

function trendInterpretation(viewModel: FuelViewModel, plan: FuelPlanStatus, dashboard: FuelDashboardVisual): { label: string; sentence: string; tone: VisualTone } {
  if (dashboard.bodyMass.points.length === 0) {
    return { label: "Trend unclear", sentence: "Trend unclear - log more morning weights.", tone: "orange" };
  }
  if (plan.label === "Pause cut" || plan.label === "Too aggressive") {
    return { label: "Cut is getting risky", sentence: "The weight trend needs review before pushing harder.", tone: "red" };
  }
  if (plan.label === "Behind pace") {
    return { label: "Slightly above pace", sentence: "You are slightly above the pace needed for this weigh-in.", tone: "orange" };
  }
  if (plan.label === "Tight") {
    return { label: "Trend unclear", sentence: plainFuelCopy(viewModel.bodyMassTrajectory.trend), tone: "orange" };
  }
  return {
    label: "Moving well",
    sentence: viewModel.weightClassStatus.status === "no_active_weight_target"
      ? "Your recent weight trend is context, not a cut instruction."
      : "Your 7-day average is still moving toward the class.",
    tone: "green"
  };
}

function guideValue(dashboard: FuelDashboardVisual, label: RegExp): string {
  return dashboard.todayGuide.find((item) => label.test(item.label))?.valueLabel ?? "Guide";
}

function FuelActionButtons({
  busy,
  onLogFood,
  onLogHydration,
  primaryLog
}: {
  busy: boolean;
  onLogFood: () => void;
  onLogHydration: () => void;
  primaryLog: "food" | "water";
}) {
  const primary = primaryLog === "water"
    ? { label: "Add water", onPress: onLogHydration, summary: "Fast log" }
    : { label: "Log meal", onPress: onLogFood, summary: "Optional" };
  const secondary = primaryLog === "water"
    ? { label: "Log meal", onPress: onLogFood, summary: "If useful" }
    : { label: "Add water", onPress: onLogHydration, summary: "Fast log" };
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
      {[primary, secondary].map((action, index) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          key={`fuel-plan-action:${action.label}`}
          onPress={action.onPress}
          style={[index === 0 ? screenStyles.button : screenStyles.quietButton, { flexBasis: 142, flexGrow: 1 }]}
        >
          <Text style={index === 0 ? screenStyles.buttonText : screenStyles.quietButtonText}>{action.label}</Text>
          <Text style={[screenStyles.subtle, { color: index === 0 ? colors.cornerBlack : colors.mutedText, fontSize: 11, lineHeight: 15 }]}>{action.summary}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function TodayFuelPlanCard({
  busy,
  onLogFood,
  onLogHydration,
  plan,
  primaryLog
}: {
  busy: boolean;
  onLogFood: () => void;
  onLogHydration: () => void;
  plan: FuelPlanStatus;
  primaryLog: "food" | "water";
}) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.md }} testID="fuel-today-plan-card">
        <View style={{ alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "space-between" }}>
          <View style={{ flexBasis: 260, flexGrow: 1, gap: spacing.xs, minWidth: 0 }}>
            <Text style={{ ...screenStyles.sectionTitle, fontSize: 20, lineHeight: 25 }}>Today's Fuel Plan</Text>
            <Text style={screenStyles.body}>{plan.sentence}</Text>
          </View>
          <DashboardPill label={plan.label} tone={plan.tone} />
        </View>
        <View
          style={{
            backgroundColor: `${colorForTone(plan.tone)}14`,
            borderColor: `${colorForTone(plan.tone)}55`,
            borderCurve: "continuous",
            borderRadius: radii.tile,
            borderWidth: 1,
            gap: spacing.xs,
            padding: spacing.md
          }}
        >
          <Text style={{ color: colorForTone(plan.tone), fontSize: 12, fontWeight: "900", lineHeight: 16, textTransform: "uppercase" }}>
            Today
          </Text>
          <Text style={{ color: colors.canvas, fontSize: 18, fontWeight: "900", lineHeight: 24 }}>{plan.action}</Text>
        </View>
        <FuelActionButtons busy={busy} onLogFood={onLogFood} onLogHydration={onLogHydration} primaryLog={primaryLog} />
      </View>
    </EngineCard>
  );
}

function FuelMetricTile({
  label,
  tone = "muted",
  value
}: {
  label: string;
  tone?: VisualTone | undefined;
  value: string;
}) {
  const color = colorForTone(tone);
  return (
    <View
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.055)",
        borderColor: "rgba(255, 255, 255, 0.12)",
        borderCurve: "continuous",
        borderRadius: radii.tile,
        borderWidth: 1,
        flexBasis: 132,
        flexGrow: 1,
        gap: spacing.xs,
        minHeight: 82,
        padding: spacing.md
      }}
    >
      <Text numberOfLines={1} style={{ color: colors.mutedText, fontSize: 11, fontWeight: "800", lineHeight: 15 }}>{label}</Text>
      <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={2} style={{ color, fontSize: 20, fontVariant: ["tabular-nums"], fontWeight: "900", lineHeight: 25 }}>
        {value}
      </Text>
    </View>
  );
}

function FuelKeyNumbersCard({
  dashboard,
  viewModel,
  warningActive
}: {
  dashboard: FuelDashboardVisual;
  viewModel: FuelViewModel;
  warningActive: boolean;
}) {
  const check = bodyCheck(viewModel, warningActive);
  return (
    <EngineCard>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }} testID="fuel-key-numbers">
        <FuelMetricTile label="Morning weight" value={weightLabel(viewModel)} />
        <FuelMetricTile label="To weight" tone="orange" value={toWeightLabel(dashboard, viewModel)} />
        <FuelMetricTile label="Weigh-in" value={weighInLabel(viewModel)} />
        <FuelMetricTile label="Body check" tone={check.tone} value={check.value} />
      </View>
    </EngineCard>
  );
}

function PriorityRow({
  icon,
  label,
  meta,
  title,
  tone
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  meta: string;
  title: string;
  tone: VisualTone;
}) {
  const color = colorForTone(tone);
  return (
    <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md, minHeight: 50 }}>
      <View
        style={{
          alignItems: "center",
          backgroundColor: `${color}1F`,
          borderColor: `${color}55`,
          borderRadius: radii.pill,
          borderWidth: 1,
          height: 36,
          justifyContent: "center",
          width: 36
        }}
      >
        <Ionicons color={color} name={icon} size={18} />
      </View>
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: colors.canvas, fontSize: 14, fontWeight: "900", lineHeight: 18 }}>{label}: {title}</Text>
        <Text numberOfLines={1} style={{ color: colors.mutedText, fontSize: 12, fontWeight: "700", lineHeight: 16 }}>{meta}</Text>
      </View>
    </View>
  );
}

function DoNotMissTodayCard({ dashboard }: { dashboard: FuelDashboardVisual }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }} testID="fuel-do-not-miss-card">
        <Text style={screenStyles.sectionTitle}>Do Not Miss Today</Text>
        <PriorityRow icon="flash-outline" label="Before training" meta={guideValue(dashboard, /carb/i)} title="carbs" tone="orange" />
        <PriorityRow icon="restaurant-outline" label="After training" meta={guideValue(dashboard, /protein/i)} title="protein + meal" tone="purple" />
        <PriorityRow icon="water-outline" label="Fluids" meta={`${dashboard.hydration.targetLabel} guide`} title="water + electrolytes" tone="blue" />
      </View>
    </EngineCard>
  );
}

function TrainingTodayCard({
  plan,
  trainingCopy,
  viewModel
}: {
  plan: FuelPlanStatus;
  trainingCopy: string;
  viewModel: FuelViewModel;
}) {
  const tier = titleCaseStatus(viewModel.trainingDemandHandoff.todayTrainingDemand);
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }} testID="fuel-training-today-card">
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }}>
          <Text style={screenStyles.sectionTitle}>Training Today</Text>
          <DashboardPill label={tier} tone={plan.tone === "red" ? "red" : viewModel.trainingDemandHandoff.todayTrainingDemand === "high" ? "orange" : "blue"} />
        </View>
        <Text style={{ color: colors.canvas, fontSize: 18, fontWeight: "900", lineHeight: 24 }}>{trainingCopy}</Text>
        <Text style={screenStyles.subtle}>Training stays performance-aware. Do not add extra work just to chase the scale.</Text>
      </View>
    </EngineCard>
  );
}

function WeightTrendCard({
  dashboard,
  plan,
  viewModel
}: {
  dashboard: FuelDashboardVisual;
  plan: FuelPlanStatus;
  viewModel: FuelViewModel;
}) {
  const trend = trendInterpretation(viewModel, plan, dashboard);
  return (
    <EngineCard>
      <View style={{ gap: spacing.md }} testID="fuel-weight-trend-card">
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }}>
          <Text style={screenStyles.sectionTitle}>Weight Trend</Text>
          <DashboardPill label={trend.label} tone={trend.tone} />
        </View>
        <TrendLineChart accent={trend.tone} height={92} points={dashboard.bodyMass.points} testID="fuel-weight-trend-chart" width={280} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <FuelMetricTile label="7-day read" tone={dashboard.bodyMass.tone} value={dashboard.bodyMass.deltaLabel} />
          <FuelMetricTile label="Needed pace" tone={plan.tone} value={plan.label} />
        </View>
        <Text style={screenStyles.body}>{trend.sentence}</Text>
      </View>
    </EngineCard>
  );
}

function detailRowsFromItems(items: readonly string[], fallback: string): readonly string[] {
  return items.length > 0 ? items : [fallback];
}

function fuelSurfaceCopy(value: string): string {
  return plainFuelCopy(value)
    .replace(/\bsafety stops\b/gi, "cut warnings")
    .replace(/\bsafety stop\b/gi, "cut warning");
}

function FuelDetailRow({
  children,
  defaultOpen = false,
  icon,
  status,
  title,
  tone = "muted"
}: React.PropsWithChildren<{
  defaultOpen?: boolean | undefined;
  icon: keyof typeof Ionicons.glyphMap;
  status: string;
  title: string;
  tone?: VisualTone | undefined;
}>) {
  const [open, setOpen] = React.useState(defaultOpen);
  React.useEffect(() => {
    if (defaultOpen) {
      setOpen(true);
    }
  }, [defaultOpen]);
  const color = colorForTone(tone);
  return (
    <EngineCard>
      <View style={{ gap: open ? spacing.md : 0 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((value) => !value)}
          style={{ alignItems: "center", flexDirection: "row", gap: spacing.md, minHeight: 56 }}
        >
          <View
            style={{
              alignItems: "center",
              backgroundColor: `${color}18`,
              borderColor: `${color}4D`,
              borderRadius: radii.pill,
              borderWidth: 1,
              height: 38,
              justifyContent: "center",
              width: 38
            }}
          >
            <Ionicons color={color} name={icon} size={18} />
          </View>
          <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
            <Text style={{ color: colors.canvas, fontSize: 15, fontWeight: "900", lineHeight: 20 }}>{title}</Text>
            <Text numberOfLines={1} style={{ color: colors.mutedText, fontSize: 12, fontWeight: "700", lineHeight: 16 }}>{status}</Text>
          </View>
          <Ionicons color={colors.wrap} name={open ? "chevron-up" : "chevron-down"} size={18} />
        </Pressable>
        {open ? <View style={{ gap: spacing.sm }}>{children}</View> : null}
      </View>
    </EngineCard>
  );
}

function DetailLine({ text, tone = "subtle" }: { text: string; tone?: "body" | "subtle" | "callout" | undefined }) {
  return <Text style={screenStyles[tone]}>{fuelSurfaceCopy(text)}</Text>;
}

function FoodDetailsContent({ dashboard, viewModel }: { dashboard: FuelDashboardVisual; viewModel: FuelViewModel }) {
  const foodRows: readonly string[] = [
    `Calories: ${viewModel.calorieSummary}`,
    `Protein/carbs/fat: ${viewModel.macroSummary}`,
    `Logged meals: ${viewModel.foodLogStatus.entryCount}`,
    viewModel.actualIntakeSummary.summary,
    `Water: ${dashboard.hydration.valueLabel} of ${dashboard.hydration.targetLabel}`
  ];
  return (
    <>
      {foodRows.map((item, index) => <DetailLine key={`fuel-food-detail:${index}`} text={item} />)}
    </>
  );
}

function WeighInPlanContent({ viewModel }: { viewModel: FuelViewModel }) {
  const rows = [
    viewModel.bodyMassTrajectory.target,
    viewModel.bodyMassTrajectory.weighInCountdown,
    viewModel.fightWeekFuelPlan.carbohydrateGuidance,
    viewModel.fightWeekFuelPlan.hydrationGuidance,
    ...(viewModel.rehydrationPlan ? [viewModel.rehydrationPlan.summary, ...viewModel.rehydrationPlan.actions.slice(0, 3)] : []),
    ...(viewModel.tournamentFuel ? [viewModel.tournamentFuel.summary, ...viewModel.tournamentFuel.actions.slice(0, 2)] : [])
  ];
  return (
    <>
      {detailRowsFromItems(rows.map(fuelSurfaceCopy), "No weigh-in plan is active today.").slice(0, 7).map((item, index) => (
        <DetailLine key={`fuel-weigh-in-detail:${index}`} text={item} />
      ))}
    </>
  );
}

function HealthChecksContent({
  message,
  onAcknowledgeNutritionSafetyReview,
  viewModel,
  warningActive
}: {
  message: string | null;
  onAcknowledgeNutritionSafetyReview?: ((reviewId: string) => void | Promise<void>) | undefined;
  viewModel: FuelViewModel;
  warningActive: boolean;
}) {
  return (
    <View style={{ gap: spacing.md }} testID="fuel-health-checks-content">
      {warningActive ? (
        <>
          <NutritionSafetyReviewCard
            activeReviews={viewModel.activeNutritionSafetyReviews}
            onAcknowledgeReview={onAcknowledgeNutritionSafetyReview}
            review={viewModel.nutritionSafetyReview}
          />
          <NutritionReviewHistoryPanel history={viewModel.nutritionReviewHistory} />
        </>
      ) : null}
      {viewModel.underFuelingRisk ? (
        <View style={{ gap: spacing.xs }}>
          <Text style={[screenStyles.callout, { color: colors.amberCaution }]}>{viewModel.underFuelingRisk.title}</Text>
          <DetailLine text={viewModel.underFuelingRisk.summary} tone="body" />
          {viewModel.underFuelingRisk.actions.map((item, index) => <DetailLine key={`fuel-under-risk:${index}`} text={item} />)}
        </View>
      ) : null}
      {viewModel.riskSummary.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.callout}>Health warning</Text>
          {viewModel.riskSummary.slice(0, 4).map((risk, index) => <DetailLine key={`fuel-risk:${index}`} text={risk} tone="body" />)}
        </View>
      ) : null}
      <DetailLine text={viewModel.hydrationSummary} />
      <DetailLine text={viewModel.bodyMassTrajectory.riskExplanation} />
      {message ? <DetailLine text={message} tone="callout" /> : null}
      {!warningActive && !viewModel.underFuelingRisk && viewModel.riskSummary.length === 0 ? <DetailLine text="No health warnings logged today." tone="body" /> : null}
    </View>
  );
}

function FuelCollapsedDetails({
  dashboard,
  message,
  onAcknowledgeNutritionSafetyReview,
  viewModel,
  warningActive
}: {
  dashboard: FuelDashboardVisual;
  message: string | null;
  onAcknowledgeNutritionSafetyReview?: ((reviewId: string) => void | Promise<void>) | undefined;
  viewModel: FuelViewModel;
  warningActive: boolean;
}) {
  const foodStatus = viewModel.foodLogStatus.entryCount > 0 ? `${viewModel.foodLogStatus.entryCount} logged` : "Food stays unknown until logged";
  const healthStatus = warningActive ? "Cut warning active" : viewModel.riskSummary.length > 0 || viewModel.underFuelingRisk ? "Caution" : "No health warnings";
  return (
    <View style={{ gap: spacing.sm }} testID="fuel-detail-rows">
      <FuelDetailRow icon="restaurant-outline" status={foodStatus} title="Food details" tone="orange">
        <FoodDetailsContent dashboard={dashboard} viewModel={viewModel} />
      </FuelDetailRow>
      <FuelDetailRow icon="calendar-outline" status={viewModel.bodyMassTrajectory.daysToWeighIn} title="Weigh-in plan" tone="gold">
        <WeighInPlanContent viewModel={viewModel} />
      </FuelDetailRow>
      <FuelDetailRow defaultOpen={warningActive} icon="shield-checkmark-outline" status={healthStatus} title="Health checks" tone={warningActive ? "red" : "green"}>
        <HealthChecksContent
          message={message}
          onAcknowledgeNutritionSafetyReview={onAcknowledgeNutritionSafetyReview}
          viewModel={viewModel}
          warningActive={warningActive}
        />
      </FuelDetailRow>
    </View>
  );
}

function FuelStatusStrip({
  message,
  warningActive
}: {
  message: string | null;
  warningActive: boolean;
}) {
  const theme = useLuminousScreenTheme();
  const tone: VisualTone = warningActive ? "red" : message ? "orange" : "green";
  const color = colorForTone(tone);
  const text = warningActive ? "Cut paused. Eat and hydrate normally today." : message ?? "No cut warnings today.";
  return (
    <View
      style={{
        backgroundColor: warningActive ? "rgba(255, 82, 101, 0.105)" : theme.tile,
        borderColor: `${color}55`,
        borderCurve: "continuous",
        borderRadius: radii.tile,
        borderWidth: 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm
      }}
      testID="fuel-status-strip"
    >
      <Text style={{ color, fontSize: 12, fontWeight: "900", lineHeight: 16 }}>{text}</Text>
    </View>
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

function FuelOverview({
  busy,
  dashboard,
  message,
  onAcknowledgeNutritionSafetyReview,
  onLogFood,
  onLogHydration,
  plan,
  primaryLog,
  trainingCopy,
  viewModel,
  warningActive
}: {
  busy: boolean;
  dashboard: FuelDashboardVisual;
  message: string | null;
  onAcknowledgeNutritionSafetyReview?: ((reviewId: string) => void | Promise<void>) | undefined;
  onLogFood: () => void;
  onLogHydration: () => void;
  plan: FuelPlanStatus;
  primaryLog: "food" | "water";
  trainingCopy: string;
  viewModel: FuelViewModel;
  warningActive: boolean;
}) {
  return (
    <View style={{ gap: spacing.md }} testID="fuel-overview">
      <TodayFuelPlanCard busy={busy} onLogFood={onLogFood} onLogHydration={onLogHydration} plan={plan} primaryLog={primaryLog} />
      <FuelKeyNumbersCard dashboard={dashboard} viewModel={viewModel} warningActive={warningActive} />
      <DoNotMissTodayCard dashboard={dashboard} />
      <TrainingTodayCard plan={plan} trainingCopy={trainingCopy} viewModel={viewModel} />
      <WeightTrendCard dashboard={dashboard} plan={plan} viewModel={viewModel} />
      <FuelCollapsedDetails
        dashboard={dashboard}
        message={message}
        onAcknowledgeNutritionSafetyReview={onAcknowledgeNutritionSafetyReview}
        viewModel={viewModel}
        warningActive={warningActive}
      />
      <FuelStatusStrip message={message} warningActive={warningActive} />
    </View>
  );
}

export function FuelScreen({ busy, focusIntent, message, onAcknowledgeNutritionSafetyReview, onFocusIntentApplied, quickLogs, recentLogs, viewModel }: FuelScreenProps) {
  const [appliedFocusIntent, setAppliedFocusIntent] = React.useState<FuelFocusIntent | null>(null);
  const dashboard = buildFuelDashboardVisual(viewModel, recentLogs);
  React.useEffect(() => {
    if (!focusIntent) {
      return;
    }
    setAppliedFocusIntent(focusIntent);
    onFocusIntentApplied?.();
  }, [focusIntent, onFocusIntentApplied]);
  const warningActive = viewModel.nutritionSafetyReview.required || viewModel.activeNutritionSafetyReviews.length > 0 || viewModel.nutritionReviewHistory.activeReviewCount > 0;
  const plan = planStatusFromFuel(viewModel, warningActive);
  const trainingCopy = trainingTodayCopy(viewModel, plan);
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
  const showLogSection = appliedFocusIntent === "log_food" || appliedFocusIntent === "log_hydration";
  const openLogFood = () => setAppliedFocusIntent("log_food");
  const openLogHydration = () => setAppliedFocusIntent("log_hydration");

  return (
    <LuminousScreen accent="orange" backgroundImage={tabScreenBackgrounds.fuel} testID="fuel-screen">
      <ScreenHeader {...tabHeroHeaders.fuel} />
      {showLogSection ? (
        <>
          <FuelLogActionSection busy={busy} onClose={closeLogSection} primaryLog={primaryLog} quickLogs={quickLogs} recentLogs={recentLogs} />
          <FoodLogStatusCard busy={busy} quickLogs={quickLogs} viewModel={viewModel} />
        </>
      ) : (
        <FuelOverview
          busy={busy}
          dashboard={dashboard}
          message={message}
          onAcknowledgeNutritionSafetyReview={onAcknowledgeNutritionSafetyReview}
          onLogFood={openLogFood}
          onLogHydration={openLogHydration}
          plan={plan}
          primaryLog={primaryLog}
          trainingCopy={trainingCopy}
          viewModel={viewModel}
          warningActive={warningActive}
        />
      )}
    </LuminousScreen>
  );
}
