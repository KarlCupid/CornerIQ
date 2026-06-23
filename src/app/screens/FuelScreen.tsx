import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";
import type { FuelViewModel, RecentLogsViewModel } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
import { LuminousScreen, ScreenHeader, useLuminousScreenTheme } from "../../design/components/LuminousScreen";
import { TrendLineChart } from "../../design/components/PerformanceVisuals";
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

interface FuelSafetyState {
  active: boolean;
  healthStatus: string;
  reviewActive: boolean;
  stripText: string;
  tone: VisualTone;
}

const fuelPalette = {
  actionFill: "rgba(148, 88, 54, 0.34)",
  actionFillPressed: "rgba(164, 98, 60, 0.42)",
  actionBorder: "rgba(217, 160, 112, 0.54)",
  actionShadow: "rgba(119, 69, 38, 0.28)",
  cardLine: "rgba(222, 190, 150, 0.16)",
  controlFill: "rgba(244, 230, 207, 0.064)",
  controlFillPressed: "rgba(244, 230, 207, 0.1)",
  controlLine: "rgba(222, 190, 150, 0.18)",
  textPrimary: "#F4EFE8",
  textBody: "#D8D0C3",
  textMuted: "#AFA595",
  toneBlue: "#7DAFBD",
  toneGold: "#CBB578",
  toneGreen: "#8DB99B",
  toneMuted: "#AFA595",
  toneOrange: "#C78355",
  tonePurple: "#A996BD",
  toneRed: "#D2767D"
} as const;

const fuelTextStyles = {
  body: { ...screenStyles.body, color: fuelPalette.textBody },
  callout: { ...screenStyles.callout, color: fuelPalette.textPrimary, fontWeight: "700" as const },
  sectionTitle: { ...screenStyles.sectionTitle, color: fuelPalette.textPrimary, fontWeight: "800" as const },
  subtle: { ...screenStyles.subtle, color: fuelPalette.textMuted }
} as const;

function colorForTone(tone: VisualTone): string {
  switch (tone) {
    case "blue":
      return fuelPalette.toneBlue;
    case "green":
      return fuelPalette.toneGreen;
    case "orange":
      return fuelPalette.toneOrange;
    case "purple":
      return fuelPalette.tonePurple;
    case "gold":
      return fuelPalette.toneGold;
    case "red":
      return fuelPalette.toneRed;
    case "muted":
    default:
      return fuelPalette.toneMuted;
  }
}

function fuelTint(tone: VisualTone, alpha: string): string {
  return `${colorForTone(tone)}${alpha}`;
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

function buildFuelSafetyState(viewModel: FuelViewModel, message: string | null): FuelSafetyState {
  const reviewActive =
    viewModel.nutritionSafetyReview.required ||
    viewModel.activeNutritionSafetyReviews.length > 0 ||
    viewModel.nutritionReviewHistory.activeReviewCount > 0;
  const underFuelingActive = Boolean(viewModel.underFuelingRisk);
  const riskActive = viewModel.riskSummary.length > 0;
  const weightSafetyActive = viewModel.weightClassStatus.safetyFlags.length > 0;
  const active = reviewActive || underFuelingActive || riskActive || weightSafetyActive;

  if (reviewActive) {
    return {
      active,
      healthStatus: "Review active",
      reviewActive,
      stripText: "Cut paused. Eat and hydrate normally today.",
      tone: "red"
    };
  }
  if (underFuelingActive) {
    return {
      active,
      healthStatus: "Under-fueling risk",
      reviewActive,
      stripText: "Fuel comes first today. Eat and hydrate normally.",
      tone: "red"
    };
  }
  if (weightSafetyActive) {
    return {
      active,
      healthStatus: "Weight safety flags",
      reviewActive,
      stripText: "Weight pressure pauses until the safety flags are reviewed.",
      tone: "red"
    };
  }
  if (riskActive) {
    return {
      active,
      healthStatus: "Caution",
      reviewActive,
      stripText: "Review the fuel signals before pushing training or weight.",
      tone: "orange"
    };
  }
  return {
    active,
    healthStatus: message ? "App note" : "Clear",
    reviewActive,
    stripText: message ?? "No cut warnings today.",
    tone: message ? "orange" : "green"
  };
}

function planStatusFromFuel(viewModel: FuelViewModel, safety: FuelSafetyState): FuelPlanStatus {
  if (safety.active) {
    return {
      action: "Eat normally today. Hydrate normally. Do not cut harder.",
      label: "Pause cut",
      sentence: viewModel.underFuelingRisk
        ? "Your body is not showing enough recovery to keep pushing weight."
        : "Fuel or weight safety signals are active, so weight pressure pauses today.",
      tone: safety.tone === "orange" ? "orange" : "red"
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

function hasActiveWeightContext(viewModel: FuelViewModel): boolean {
  return (
    viewModel.weightClassStatus.status !== "no_active_weight_target" ||
    Boolean(viewModel.fightOrTournamentNote || viewModel.fightWeekFuel || viewModel.tournamentFuel || viewModel.rehydrationPlan)
  );
}

function bodyCheck(viewModel: FuelViewModel, safety: FuelSafetyState): { tone: VisualTone; value: string } {
  if (safety.active) {
    return { tone: safety.tone, value: safety.healthStatus };
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

function FuelTonePill({ label, tone: _tone = "muted" }: { label: string; tone?: VisualTone | undefined }) {
  return (
    <View
      accessibilityLabel={`Status: ${label}`}
      style={{
        alignItems: "center",
        alignSelf: "flex-start",
        backgroundColor: "rgba(255, 255, 255, 0.075)",
        borderColor: "rgba(255, 255, 255, 0.16)",
        borderRadius: radii.pill,
        borderWidth: 1,
        justifyContent: "center",
        maxWidth: 190,
        minHeight: 28,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3
      }}
    >
      <Text numberOfLines={1} style={{ color: colors.wrap, fontSize: 12, fontWeight: "800", lineHeight: 16 }}>
        {label}
      </Text>
    </View>
  );
}

function FuelActionButton({
  basis = 142,
  busy,
  label,
  onPress,
  primary,
  summary
}: {
  basis?: number | undefined;
  busy: boolean;
  label: string;
  onPress: () => void;
  primary?: boolean | undefined;
  summary: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        {
          alignItems: "center",
          borderCurve: "continuous",
          borderRadius: primary ? radii.pill : radii.control,
          borderWidth: 1,
          flexBasis: basis,
          flexGrow: 1,
          gap: 1,
          justifyContent: "center",
          minHeight: 50,
          opacity: busy ? 0.58 : 1,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm
        },
        primary
          ? {
              backgroundColor: pressed ? fuelPalette.actionFillPressed : fuelPalette.actionFill,
              borderColor: fuelPalette.actionBorder,
              boxShadow: `0 12px 28px ${fuelPalette.actionShadow}`
            }
          : {
              backgroundColor: pressed ? fuelPalette.controlFillPressed : fuelPalette.controlFill,
              borderColor: fuelPalette.controlLine,
              boxShadow: "0 8px 22px rgba(0, 0, 0, 0.18)"
            }
      ]}
    >
      <Text style={{ color: primary ? fuelPalette.textPrimary : fuelPalette.textBody, fontSize: 15, fontWeight: primary ? "800" : "700", lineHeight: 20, textAlign: "center" }}>
        {label}
      </Text>
      <Text style={{ color: primary ? "#D9B690" : fuelPalette.textMuted, fontSize: 11, fontWeight: "600", lineHeight: 15, textAlign: "center" }}>
        {summary}
      </Text>
    </Pressable>
  );
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
        <FuelActionButton
          busy={busy}
          label={action.label}
          primary={index === 0}
          summary={action.summary}
          key={`fuel-plan-action:${action.label}`}
          onPress={action.onPress}
        />
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
            <Text style={{ ...fuelTextStyles.sectionTitle, fontSize: 20, lineHeight: 25 }}>Today's Fuel Plan</Text>
            <Text style={fuelTextStyles.body}>{plan.sentence}</Text>
          </View>
          <FuelTonePill label={plan.label} tone={plan.tone} />
        </View>
        <View
          style={{
            backgroundColor: fuelTint(plan.tone, "12"),
            borderColor: fuelTint(plan.tone, "42"),
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
          <Text style={{ color: fuelPalette.textPrimary, fontSize: 18, fontWeight: "900", lineHeight: 24 }}>{plan.action}</Text>
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
        backgroundColor: fuelPalette.controlFill,
        borderColor: fuelPalette.cardLine,
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
      <Text numberOfLines={1} style={{ color: fuelPalette.textMuted, fontSize: 11, fontWeight: "800", lineHeight: 15 }}>{label}</Text>
      <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={2} style={{ color, fontSize: 20, fontVariant: ["tabular-nums"], fontWeight: "900", lineHeight: 25 }}>
        {value}
      </Text>
    </View>
  );
}

function FuelKeyNumbersCard({
  dashboard,
  hasActiveWeightTarget,
  safety,
  viewModel,
}: {
  dashboard: FuelDashboardVisual;
  hasActiveWeightTarget: boolean;
  safety: FuelSafetyState;
  viewModel: FuelViewModel;
}) {
  const check = bodyCheck(viewModel, safety);
  if (!hasActiveWeightTarget) {
    return (
      <EngineCard>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }} testID="fuel-key-numbers">
          <FuelMetricTile label="Fuel readiness" tone={check.tone} value={check.value} />
          <FuelMetricTile label="Hydration guide" tone={dashboard.hydration.tone} value={dashboard.hydration.targetLabel} />
          <FuelMetricTile label="Food log" tone={viewModel.foodLogStatus.entryCount > 0 ? "green" : "muted"} value={viewModel.foodLogStatus.entryCount > 0 ? `${viewModel.foodLogStatus.entryCount} logged` : "Optional"} />
          <FuelMetricTile label="Training load" tone={viewModel.trainingDemandHandoff.todayTrainingDemand === "high" ? "orange" : "blue"} value={titleCaseStatus(viewModel.trainingDemandHandoff.todayTrainingDemand)} />
        </View>
      </EngineCard>
    );
  }
  return (
    <EngineCard>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }} testID="fuel-key-numbers">
        <FuelMetricTile label="Morning weight" value={weightLabel(viewModel)} />
        <FuelMetricTile label="To weight" tone="orange" value={toWeightLabel(dashboard, viewModel)} />
        <FuelMetricTile label="Weigh-in" value={weighInLabel(viewModel)} />
        <FuelMetricTile label="Fuel readiness" tone={check.tone} value={check.value} />
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
          backgroundColor: fuelTint(tone, "18"),
          borderColor: fuelTint(tone, "42"),
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
        <Text numberOfLines={1} style={{ color: fuelPalette.textPrimary, fontSize: 14, fontWeight: "900", lineHeight: 18 }}>{label}: {title}</Text>
        <Text numberOfLines={1} style={{ color: fuelPalette.textMuted, fontSize: 12, fontWeight: "700", lineHeight: 16 }}>{meta}</Text>
      </View>
    </View>
  );
}

function DoNotMissTodayCard({ dashboard }: { dashboard: FuelDashboardVisual }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }} testID="fuel-do-not-miss-card">
        <Text style={fuelTextStyles.sectionTitle}>Do Not Miss Today</Text>
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
          <Text style={fuelTextStyles.sectionTitle}>Training Today</Text>
          <FuelTonePill label={tier} tone={plan.tone === "red" ? "red" : viewModel.trainingDemandHandoff.todayTrainingDemand === "high" ? "orange" : "blue"} />
        </View>
        <Text style={{ color: fuelPalette.textPrimary, fontSize: 18, fontWeight: "900", lineHeight: 24 }}>{trainingCopy}</Text>
        <Text style={fuelTextStyles.subtle}>Training stays performance-aware. Do not add extra work just to chase the scale.</Text>
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
          <Text style={fuelTextStyles.sectionTitle}>Weight Trend</Text>
          <FuelTonePill label={trend.label} tone={trend.tone} />
        </View>
        <TrendLineChart accent={trend.tone} height={92} points={dashboard.bodyMass.points} testID="fuel-weight-trend-chart" width={280} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <FuelMetricTile label="7-day read" tone={dashboard.bodyMass.tone} value={dashboard.bodyMass.deltaLabel} />
          <FuelMetricTile label="Needed pace" tone={plan.tone} value={plan.label} />
        </View>
        <Text style={fuelTextStyles.body}>{trend.sentence}</Text>
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
              backgroundColor: fuelTint(tone, "16"),
              borderColor: fuelTint(tone, "3D"),
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
            <Text style={{ color: fuelPalette.textPrimary, fontSize: 15, fontWeight: "900", lineHeight: 20 }}>{title}</Text>
            <Text numberOfLines={1} style={{ color: fuelPalette.textMuted, fontSize: 12, fontWeight: "700", lineHeight: 16 }}>{status}</Text>
          </View>
          <Ionicons color={fuelPalette.textBody} name={open ? "chevron-up" : "chevron-down"} size={18} />
        </Pressable>
        {open ? <View style={{ gap: spacing.sm }}>{children}</View> : null}
      </View>
    </EngineCard>
  );
}

function DetailLine({ text, tone = "subtle" }: { text: string; tone?: "body" | "subtle" | "callout" | undefined }) {
  const style = tone === "body" ? fuelTextStyles.body : tone === "callout" ? fuelTextStyles.callout : fuelTextStyles.subtle;
  return <Text style={style}>{fuelSurfaceCopy(text)}</Text>;
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
  safety,
  viewModel,
}: {
  message: string | null;
  onAcknowledgeNutritionSafetyReview?: ((reviewId: string) => void | Promise<void>) | undefined;
  safety: FuelSafetyState;
  viewModel: FuelViewModel;
}) {
  return (
    <View style={{ gap: spacing.md }} testID="fuel-health-checks-content">
      {safety.reviewActive ? (
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
          <Text style={[fuelTextStyles.callout, { color: colorForTone("orange") }]}>{viewModel.underFuelingRisk.title}</Text>
          <DetailLine text={viewModel.underFuelingRisk.summary} tone="body" />
          {viewModel.underFuelingRisk.actions.map((item, index) => <DetailLine key={`fuel-under-risk:${index}`} text={item} />)}
        </View>
      ) : null}
      {viewModel.riskSummary.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Text style={fuelTextStyles.callout}>Health warning</Text>
          {viewModel.riskSummary.slice(0, 4).map((risk, index) => <DetailLine key={`fuel-risk:${index}`} text={risk} tone="body" />)}
        </View>
      ) : null}
      {viewModel.weightClassStatus.safetyFlags.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Text style={fuelTextStyles.callout}>Weight safety</Text>
          {viewModel.weightClassStatus.safetyFlags.slice(0, 4).map((flag, index) => <DetailLine key={`fuel-weight-flag:${index}`} text={flag} tone="body" />)}
        </View>
      ) : null}
      <DetailLine text={viewModel.hydrationSummary} />
      <DetailLine text={viewModel.bodyMassTrajectory.riskExplanation} />
      {message ? <DetailLine text={message} tone="callout" /> : null}
      {!safety.active ? <DetailLine text="No health warnings logged today." tone="body" /> : null}
    </View>
  );
}

function FuelCollapsedDetails({
  dashboard,
  message,
  onAcknowledgeNutritionSafetyReview,
  safety,
  viewModel,
}: {
  dashboard: FuelDashboardVisual;
  message: string | null;
  onAcknowledgeNutritionSafetyReview?: ((reviewId: string) => void | Promise<void>) | undefined;
  safety: FuelSafetyState;
  viewModel: FuelViewModel;
}) {
  const foodStatus = viewModel.foodLogStatus.entryCount > 0 ? `${viewModel.foodLogStatus.entryCount} logged` : "Food stays unknown until logged";
  const healthStatus = safety.active ? safety.healthStatus : "No health warnings";
  const hasActiveWeightTarget = hasActiveWeightContext(viewModel);
  const weightDetailTitle = hasActiveWeightTarget ? "Weigh-in plan" : "Weight context";
  const weightDetailStatus = hasActiveWeightTarget ? viewModel.bodyMassTrajectory.daysToWeighIn : "Trend context";
  return (
    <View style={{ gap: spacing.sm }} testID="fuel-detail-rows">
      <FuelDetailRow icon="restaurant-outline" status={foodStatus} title="Food details" tone="orange">
        <FoodDetailsContent dashboard={dashboard} viewModel={viewModel} />
      </FuelDetailRow>
      <FuelDetailRow icon="calendar-outline" status={weightDetailStatus} title={weightDetailTitle} tone="gold">
        <WeighInPlanContent viewModel={viewModel} />
      </FuelDetailRow>
      <FuelDetailRow defaultOpen={safety.active} icon="shield-checkmark-outline" status={healthStatus} title="Health checks" tone={safety.active ? safety.tone : "green"}>
        <HealthChecksContent
          message={message}
          onAcknowledgeNutritionSafetyReview={onAcknowledgeNutritionSafetyReview}
          safety={safety}
          viewModel={viewModel}
        />
      </FuelDetailRow>
    </View>
  );
}

function FuelStatusStrip({
  safety
}: {
  safety: FuelSafetyState;
}) {
  const theme = useLuminousScreenTheme();
  const tone = safety.tone;
  const color = colorForTone(tone);
  return (
    <View
      style={{
        backgroundColor: safety.active ? fuelTint(tone, "12") : theme.tile,
        borderColor: fuelTint(tone, "42"),
        borderCurve: "continuous",
        borderRadius: radii.tile,
        borderWidth: 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm
      }}
      testID="fuel-status-strip"
    >
      <Text style={{ color, fontSize: 12, fontWeight: "900", lineHeight: 16 }}>{safety.stripText}</Text>
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
          <Text style={fuelTextStyles.sectionTitle}>{viewModel.completionControls.statusTitle}</Text>
          <Text style={fuelTextStyles.callout}>{plainFuelCopy(viewModel.foodLogStatus.status.replaceAll("_", " "))}</Text>
          <Text style={fuelTextStyles.body}>{plainFuelCopy(viewModel.foodLogStatus.athleteFacingSummary)}</Text>
          <Text style={fuelTextStyles.subtle}>Logged: {viewModel.foodLogStatus.totalCaloriesLogged} kcal. Guide: {plainFuelCopy(viewModel.calorieSummary)}.</Text>
          <Text style={fuelTextStyles.subtle}>Too little food for the work is only considered after you say the day is done.</Text>
        </View>
        <View style={{ gap: spacing.xs }}>
          {viewModel.completionControls.helperCopy.slice(0, 2).map((item, index) => <Text key={`fuel-completion-helper:${index}`} style={fuelTextStyles.subtle}>{plainFuelCopy(item)}</Text>)}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {viewModel.completionControls.actions.map((action) => (
            <FuelActionButton
              basis={220}
              busy={busy}
              label={action.label}
              primary={action.kind === "done_logging"}
              summary={plainFuelCopy(action.summary)}
              key={`fuel-completion-action:${action.kind}`}
              onPress={() => run(action.kind)}
            />
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
    <FoodQuickLogCard actions={quickLogs} busy={busy} status={recentLogs.foodToday} surface="fuel" />
  ) : (
    <HydrationLogCard actions={quickLogs} busy={busy} status={recentLogs.hydrationToday} surface="fuel" />
  );
  const secondaryCard = primaryLog === "food" ? (
    <HydrationLogCard actions={quickLogs} busy={busy} status={recentLogs.hydrationToday} surface="fuel" />
  ) : (
    <FoodQuickLogCard actions={quickLogs} busy={busy} status={recentLogs.foodToday} surface="fuel" />
  );
  return (
    <View style={{ gap: spacing.lg }} testID="fuel-log-action-section">
      <EngineCard>
        <View style={{ alignItems: "flex-start", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }}>
          <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
            <Text style={fuelTextStyles.sectionTitle}>{primaryLog === "water" ? "Add water" : "Log food"}</Text>
            <Text style={fuelTextStyles.subtle}>Log what you know, then return to overview.</Text>
          </View>
          <Pressable
            accessibilityLabel="Back to Fuel overview"
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [
              {
                alignItems: "center",
                backgroundColor: pressed ? fuelPalette.controlFillPressed : fuelPalette.controlFill,
                borderColor: fuelPalette.controlLine,
                borderCurve: "continuous",
                borderRadius: radii.control,
                borderWidth: 1,
                justifyContent: "center",
                minHeight: 44,
                minWidth: 92,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm
              }
            ]}
          >
            <Text style={{ color: fuelPalette.textBody, fontSize: 15, fontWeight: "700", lineHeight: 20, textAlign: "center" }}>Back to overview</Text>
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
  safety,
  trainingCopy,
  viewModel
}: {
  busy: boolean;
  dashboard: FuelDashboardVisual;
  message: string | null;
  onAcknowledgeNutritionSafetyReview?: ((reviewId: string) => void | Promise<void>) | undefined;
  onLogFood: () => void;
  onLogHydration: () => void;
  plan: FuelPlanStatus;
  primaryLog: "food" | "water";
  safety: FuelSafetyState;
  trainingCopy: string;
  viewModel: FuelViewModel;
}) {
  const hasActiveWeightTarget = hasActiveWeightContext(viewModel);
  return (
    <View style={{ gap: spacing.md }} testID="fuel-overview">
      <TodayFuelPlanCard busy={busy} onLogFood={onLogFood} onLogHydration={onLogHydration} plan={plan} primaryLog={primaryLog} />
      <DoNotMissTodayCard dashboard={dashboard} />
      <TrainingTodayCard plan={plan} trainingCopy={trainingCopy} viewModel={viewModel} />
      <FuelKeyNumbersCard dashboard={dashboard} hasActiveWeightTarget={hasActiveWeightTarget} safety={safety} viewModel={viewModel} />
      {hasActiveWeightTarget ? <WeightTrendCard dashboard={dashboard} plan={plan} viewModel={viewModel} /> : null}
      <FuelCollapsedDetails
        dashboard={dashboard}
        message={message}
        onAcknowledgeNutritionSafetyReview={onAcknowledgeNutritionSafetyReview}
        safety={safety}
        viewModel={viewModel}
      />
      {!hasActiveWeightTarget ? <WeightTrendCard dashboard={dashboard} plan={plan} viewModel={viewModel} /> : null}
      <FuelStatusStrip safety={safety} />
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
  const safety = buildFuelSafetyState(viewModel, message);
  const plan = planStatusFromFuel(viewModel, safety);
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
          safety={safety}
          trainingCopy={trainingCopy}
          viewModel={viewModel}
        />
      )}
    </LuminousScreen>
  );
}
