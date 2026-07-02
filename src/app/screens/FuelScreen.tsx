import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";
import type { FuelPlanStatusViewModel, FuelSafetyStateViewModel, FuelViewModel, RecentLogsViewModel } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
import { LuminousScreen, ScreenHeader, useLuminousScreenTheme } from "../../design/components/LuminousScreen";
import { TrendLineChart } from "../../design/components/PerformanceVisuals";
import { PremiumCard } from "../../design/components/PremiumPrimitives";
import { colors, radii, spacing } from "../../design/theme";
import { kgToLb } from "../../engine/core/units";
import { buildFuelDashboardVisual, type FuelDashboardVisual, type VisualTone } from "../../engine/presentation/dashboardVisualData";
import { plainFuelCopy } from "../../engine/presentation/fuelCopy";
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
  preferredUnits?: PreferredUnits | undefined;
  quickLogs: QuickLogActions;
  recentLogs: RecentLogsViewModel;
  viewModel: FuelViewModel;
}

export type FuelFocusIntent = "action" | "log_food" | "log_hydration" | "safety_review";
type PreferredUnits = "metric" | "imperial";

type FuelPlanStatus = FuelPlanStatusViewModel;
type FuelSafetyState = FuelSafetyStateViewModel;

const fuelPalette = {
  actionFill: "#FF9448",
  actionFillPressed: "#E9823F",
  actionBorder: "rgba(255, 148, 72, 0.62)",
  actionShadow: "rgba(255, 148, 72, 0.28)",
  cardLine: "rgba(255, 216, 180, 0.14)",
  controlFill: "rgba(244, 230, 207, 0.055)",
  controlFillPressed: "rgba(244, 230, 207, 0.095)",
  controlLine: "rgba(255, 216, 180, 0.16)",
  textPrimary: "#F4EFE8",
  textBody: "#D8D0C3",
  textMuted: "#AFA595",
  toneBlue: "#27CEF1",
  toneGold: "#FFD861",
  toneGreen: "#38E28A",
  toneMuted: "#AFA595",
  toneOrange: "#FF9448",
  tonePurple: "#9657F5",
  toneRed: "#FF5265"
} as const;

const fuelTextStyles = {
  body: { ...screenStyles.body, color: fuelPalette.textBody },
  callout: { ...screenStyles.callout, color: fuelPalette.textPrimary, fontWeight: "700" as const },
  sectionTitle: { ...screenStyles.sectionTitle, color: fuelPalette.textPrimary, fontWeight: "800" as const },
  subtle: { ...screenStyles.subtle, color: fuelPalette.textMuted }
} as const;

function DecorativeIcon(props: React.ComponentProps<typeof Ionicons>) {
  return <Ionicons {...props} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
}

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

function massLabelFromKg(kg: number, preferredUnits: PreferredUnits): string {
  return preferredUnits === "imperial" ? `${kgToLb(kg).toFixed(1)} lb` : `${kg.toFixed(1)} kg`;
}

function convertMassCopy(value: string, preferredUnits: PreferredUnits): string {
  if (preferredUnits === "metric") {
    return value;
  }
  return value.replace(/(-?\d+(?:\.\d+)?)\s*kg(\/week)?/gi, (_match, amount: string, cadence: string | undefined) => {
    const kg = Number(amount);
    if (!Number.isFinite(kg)) {
      return _match;
    }
    return `${kgToLb(kg).toFixed(1)} lb${cadence ?? ""}`;
  });
}

function displayFuelCopy(value: string, preferredUnits: PreferredUnits): string {
  return convertMassCopy(fuelSurfaceCopy(value), preferredUnits);
}

function weightLabel(viewModel: FuelViewModel, preferredUnits: PreferredUnits): string {
  const latest = viewModel.weightClassStatus.latestBodyMassKg;
  if (latest !== null) {
    return massLabelFromKg(latest, preferredUnits);
  }
  return convertMassCopy(viewModel.bodyMassTrajectory.latestWeight.replace(/^Latest:\s*/i, ""), preferredUnits) || "Unknown";
}

function toWeightLabel(dashboard: FuelDashboardVisual, viewModel: FuelViewModel, preferredUnits: PreferredUnits): string {
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
  const mass = massLabelFromKg(Math.abs(delta), preferredUnits);
  return delta > 0 ? `${mass} over` : `${mass} under`;
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
  if (viewModel.weightClassStatus.status === "no_active_weight_target") {
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
    label: viewModel.weightClassStatus.status === "no_active_weight_target" ? "Context only" : "Moving well",
    sentence: viewModel.weightClassStatus.status === "no_active_weight_target"
      ? "Your recent weight trend is context, not a cut instruction."
      : "Your 7-day average is still moving toward the class.",
    tone: "green"
  };
}

function FuelTonePill({ label, tone: _tone = "muted" }: { label: string; tone?: VisualTone | undefined }) {
  return (
    <Text
      accessibilityLabel={`Status: ${label}`}
      numberOfLines={2}
      style={{
        alignSelf: "flex-start",
        color: colors.wrap,
        fontSize: 12,
        fontWeight: "800",
        lineHeight: 16,
        maxWidth: 190,
        minHeight: 16
      }}
    >
      {label}
    </Text>
  );
}

function FuelActionButton({
  basis = 142,
  block = false,
  busy,
  icon,
  label,
  onPress,
  primary,
  summary
}: {
  basis?: number | undefined;
  block?: boolean | undefined;
  busy: boolean;
  icon?: keyof typeof Ionicons.glyphMap | undefined;
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
          flexBasis: block ? undefined : basis,
          flexGrow: 1,
          gap: spacing.xs,
          justifyContent: "center",
          minHeight: block ? primary ? 82 : 50 : 50,
          opacity: busy ? 0.58 : 1,
          paddingHorizontal: spacing.lg,
          paddingVertical: block && primary ? spacing.md : spacing.sm,
          width: block ? "100%" : undefined
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
      {icon ? <DecorativeIcon color={primary ? colors.cornerBlack : fuelPalette.toneOrange} name={icon} size={18} /> : null}
      <Text adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={2} style={{ color: primary ? colors.cornerBlack : fuelPalette.textBody, flexShrink: 1, fontSize: 15, fontWeight: primary ? "900" : "700", lineHeight: 20, textAlign: "center" }}>
        {label}
      </Text>
      <Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={2} style={{ color: primary ? "rgba(3, 7, 18, 0.72)" : fuelPalette.textMuted, flexShrink: 1, fontSize: 11, fontWeight: "700", lineHeight: 15, textAlign: "center" }}>
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
    <View style={{ gap: spacing.sm }}>
      <FuelActionButton
        block
        busy={busy}
        icon={primaryLog === "water" ? "water-outline" : "restaurant-outline"}
        label={primary.label}
        primary
        summary={primary.summary}
        onPress={primary.onPress}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={secondary.onPress}
        style={({ pressed }) => ({
          alignItems: "center",
          alignSelf: "center",
          flexDirection: "row",
          gap: spacing.xs,
          flexWrap: "wrap",
          justifyContent: "center",
          minHeight: 44,
          opacity: busy ? 0.58 : pressed ? 0.78 : 1,
          paddingHorizontal: spacing.md
        })}
      >
        <DecorativeIcon color={fuelPalette.toneOrange} name={primaryLog === "water" ? "restaurant-outline" : "water-outline"} size={17} />
        <Text numberOfLines={1} style={{ color: fuelPalette.textBody, flexShrink: 1, fontSize: 14, fontWeight: "800", lineHeight: 18 }}>{secondary.label}</Text>
        <Text numberOfLines={1} style={{ color: fuelPalette.textMuted, flexShrink: 1, fontSize: 12, fontWeight: "700", lineHeight: 16 }}>{secondary.summary}</Text>
      </Pressable>
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
    <PremiumCard accent="orange" density="regular">
      <View style={{ gap: spacing.md }} testID="fuel-hero-card">
        <View testID="fuel-today-plan-card">
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md }}>
          <View
            style={{
              alignItems: "center",
              backgroundColor: fuelTint(plan.tone, "18"),
              borderColor: fuelTint(plan.tone, "55"),
              borderRadius: radii.pill,
              borderWidth: 1,
              height: 62,
              justifyContent: "center",
              width: 62
            }}
          >
            <DecorativeIcon color={colorForTone(plan.tone)} name={plan.tone === "orange" || plan.tone === "gold" ? "help-outline" : "restaurant-outline"} size={31} />
          </View>
          <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
            <Text style={{ color: fuelPalette.textPrimary, fontSize: 21, fontWeight: "900", lineHeight: 27 }}>
              Fuel status: <Text style={{ color: colorForTone(plan.tone) }}>{plan.label}</Text>
            </Text>
            <Text style={{ color: fuelPalette.textBody, fontSize: 15, fontWeight: "600", lineHeight: 22 }}>{plan.sentence}</Text>
          </View>
        </View>
        </View>
        <View
          style={{
            borderTopColor: fuelPalette.cardLine,
            borderTopWidth: 1,
            gap: spacing.xs,
            paddingTop: spacing.md
          }}
        >
          <Text style={{ color: fuelPalette.textPrimary, fontSize: 17, fontWeight: "900", lineHeight: 23 }}>{plan.action}</Text>
        </View>
        <FuelActionButtons busy={busy} onLogFood={onLogFood} onLogHydration={onLogHydration} primaryLog={primaryLog} />
      </View>
    </PremiumCard>
  );
}

function FuelSignalRow({
  helper,
  icon,
  label,
  tone,
  value
}: {
  helper: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone: VisualTone;
  value: string;
}) {
  const color = colorForTone(tone);
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: fuelPalette.controlFill,
        borderColor: fuelTint(tone, tone === "muted" ? "24" : "36"),
        borderCurve: "continuous",
        borderRadius: radii.tile,
        borderWidth: 1,
        flexDirection: "row",
        gap: spacing.md,
        minHeight: 66,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm
      }}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: fuelTint(tone, "16"),
          borderColor: fuelTint(tone, "42"),
          borderRadius: radii.pill,
          borderWidth: 1,
          height: 38,
          justifyContent: "center",
          width: 38
        }}
      >
        <DecorativeIcon color={color} name={icon} size={18} />
      </View>
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: fuelPalette.textMuted, fontSize: 11, fontWeight: "900", lineHeight: 15, textTransform: "uppercase" }}>{label}</Text>
        <Text adjustsFontSizeToFit minimumFontScale={0.74} numberOfLines={1} style={{ color: fuelPalette.textPrimary, fontSize: 17, fontVariant: ["tabular-nums"], fontWeight: "900", lineHeight: 22 }}>{value}</Text>
        <Text numberOfLines={2} style={{ color: fuelPalette.textMuted, fontSize: 12, fontWeight: "700", lineHeight: 16 }}>{helper}</Text>
      </View>
    </View>
  );
}

function FuelKeyNumbersCard({
  dashboard,
  hasActiveWeightTarget,
  preferredUnits,
  safety,
  viewModel,
}: {
  dashboard: FuelDashboardVisual;
  hasActiveWeightTarget: boolean;
  preferredUnits: PreferredUnits;
  safety: FuelSafetyState;
  viewModel: FuelViewModel;
}) {
  const check = bodyCheck(viewModel, safety);
  const currentWeight = weightLabel(viewModel, preferredUnits);
  const rows = hasActiveWeightTarget
    ? [
        { helper: "Use the latest logged morning value.", icon: "scale-outline" as const, label: "Morning weight", tone: "muted" as const, value: currentWeight },
        { helper: "Gap to the active contracted class.", icon: "flag-outline" as const, label: "To weight", tone: "orange" as const, value: toWeightLabel(dashboard, viewModel, preferredUnits) },
        { helper: "Timing changes how conservative fuel guidance stays.", icon: "calendar-outline" as const, label: "Weigh-in", tone: "muted" as const, value: weighInLabel(viewModel) },
        { helper: "Safety and fuel confidence before training.", icon: "shield-checkmark-outline" as const, label: "Fuel readiness", tone: check.tone, value: check.value }
      ]
    : [
        { helper: "Fluid target context from today's logs.", icon: "water-outline" as const, label: "Hydration", tone: dashboard.hydration.tone, value: dashboard.hydration.targetLabel },
        { helper: "Optional daily log; useful for trends.", icon: "scale-outline" as const, label: "Weight", tone: currentWeight === "Unknown" ? "orange" as const : "muted" as const, value: currentWeight }
      ];
  if (!hasActiveWeightTarget) {
    return (
      <PremiumCard accent="orange" density="compact" testID="fuel-key-numbers">
        <View style={{ gap: spacing.md }}>
          <View style={{ gap: spacing.xs }}>
            <Text style={fuelTextStyles.sectionTitle}>Today fuel checks</Text>
            <Text style={fuelTextStyles.subtle}>Quick context after macros. Optional logs refine the read; missing data stays unknown.</Text>
          </View>
          <View style={{ gap: spacing.sm }}>
            {rows.map((item) => (
              <FuelSignalRow helper={item.helper} icon={item.icon} key={`fuel-check:${item.label}`} label={item.label} tone={item.tone} value={item.value} />
            ))}
          </View>
        </View>
      </PremiumCard>
    );
  }
  return (
    <PremiumCard accent="gold" density="compact" testID="fuel-key-numbers">
      <View style={{ gap: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={fuelTextStyles.sectionTitle}>Weight-class fuel checks</Text>
          <Text style={fuelTextStyles.subtle}>Use these for context before changing food or water. Safety beats making weight pressure.</Text>
        </View>
        <View style={{ gap: spacing.sm }}>
          {rows.map((item) => (
            <FuelSignalRow helper={item.helper} icon={item.icon} key={`fuel-check:${item.label}`} label={item.label} tone={item.tone} value={item.value} />
          ))}
        </View>
      </View>
    </PremiumCard>
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
    <View
      style={{
        alignItems: "center",
        backgroundColor: fuelPalette.controlFill,
        borderColor: fuelTint(tone, "30"),
        borderCurve: "continuous",
        borderRadius: radii.tile,
        borderWidth: 1,
        flexDirection: "row",
        gap: spacing.md,
        minHeight: 62,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm
      }}
    >
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
        <DecorativeIcon color={color} name={icon} size={18} />
      </View>
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <Text numberOfLines={2} style={{ color: fuelPalette.textPrimary, fontSize: 14, fontWeight: "900", lineHeight: 18 }}>{label}: {title}</Text>
        <Text numberOfLines={2} style={{ color: fuelPalette.textMuted, fontSize: 12, fontWeight: "700", lineHeight: 16 }}>{meta}</Text>
      </View>
    </View>
  );
}

function DoNotMissTodayCard({ dashboard }: { dashboard: FuelDashboardVisual }) {
  return (
    <PremiumCard accent="blue" density="compact">
      <View style={{ gap: spacing.md }} testID="fuel-do-not-miss-card">
        <Text style={fuelTextStyles.sectionTitle}>Training fuel priorities</Text>
        <Text style={fuelTextStyles.subtle}>Use these around the next session. Log only what you know; missing food stays unknown.</Text>
        <PriorityRow icon="flash-outline" label="Before training" meta={dashboard.trainingFuelPriorities.beforeTraining} title="Carbs + protein" tone="orange" />
        <PriorityRow icon="restaurant-outline" label="After training" meta={dashboard.trainingFuelPriorities.afterTraining} title="Protein + meal" tone="purple" />
        <PriorityRow icon="water-outline" label="Fluids" meta={dashboard.trainingFuelPriorities.fluids} title="Water + electrolytes" tone="blue" />
      </View>
    </PremiumCard>
  );
}

function MacroGraphRow({ item }: { item: FuelDashboardVisual["macros"][number] }) {
  const color = colorForTone(item.tone);
  const fillPercent = Math.round(item.ratio * 100);
  const percentLabel = item.stateLabel === "Unknown" || item.stateLabel === "Partial" ? item.stateLabel : `${fillPercent}%`;
  return (
    <View
      accessibilityLabel={`${item.label}: ${item.valueLabel} of ${item.targetLabel}`}
      style={{
        gap: spacing.xs,
        minHeight: 68
      }}
    >
      <View style={{ alignItems: "flex-end", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: fuelPalette.textPrimary, fontSize: 14, fontWeight: "900", lineHeight: 18 }}>{item.label}</Text>
          <Text numberOfLines={1} style={{ color: fuelPalette.textMuted, fontSize: 11, fontWeight: "700", lineHeight: 15 }}>Target {item.targetLabel}</Text>
        </View>
        <View style={{ alignItems: "flex-end", minWidth: 86 }}>
          <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={{ color, fontSize: 18, fontVariant: ["tabular-nums"], fontWeight: "900", lineHeight: 22 }}>
            {item.valueLabel}
          </Text>
          <Text numberOfLines={1} style={{ color: item.stateLabel === "Unknown" || item.stateLabel === "Partial" ? fuelPalette.toneOrange : fuelPalette.textMuted, fontSize: 11, fontWeight: "800", lineHeight: 15 }}>
            {percentLabel}
          </Text>
        </View>
      </View>
      <View
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.075)",
          borderColor: "rgba(255, 255, 255, 0.08)",
          borderRadius: radii.pill,
          borderWidth: 1,
          height: 14,
          overflow: "hidden",
          position: "relative"
        }}
      >
        {fillPercent > 0 ? (
          <View
            style={{
              backgroundColor: color,
              borderRadius: radii.pill,
              boxShadow: `0 0 14px ${fuelTint(item.tone, "66")}`,
              height: "100%",
              width: `${fillPercent}%`
            }}
          />
        ) : null}
        <View
          pointerEvents="none"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.52)",
            bottom: -1,
            position: "absolute",
            right: 0,
            top: -1,
            width: 2
          }}
        />
      </View>
    </View>
  );
}

function MacroTargetsCard({ dashboard, viewModel }: { dashboard: FuelDashboardVisual; viewModel: FuelViewModel }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.md }} testID="fuel-macro-targets-card">
        <View style={{ gap: spacing.xs }}>
          <Text style={fuelTextStyles.sectionTitle}>Protein / carbs / fat</Text>
          <Text style={fuelTextStyles.subtle}>{plainFuelCopy(viewModel.macroTargets.logStatus)}</Text>
        </View>
        <View style={{ gap: spacing.md }}>
          {dashboard.macros.map((item) => <MacroGraphRow item={item} key={`fuel-visible-macro:${item.label}`} />)}
        </View>
        <Text style={fuelTextStyles.subtle}>Log exact grams when you have them. Calories-only entries stay visible, but macro gaps stay unknown.</Text>
      </View>
    </EngineCard>
  );
}

function timingIcon(id: string): keyof typeof Ionicons.glyphMap {
  if (/post/i.test(id)) {
    return "refresh-outline";
  }
  if (/snack/i.test(id)) {
    return "timer-outline";
  }
  return "restaurant-outline";
}

function FuelTimingCard({ viewModel }: { viewModel: FuelViewModel }) {
  if (viewModel.fuelTimingRecommendations.length === 0) {
    return null;
  }
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }} testID="fuel-timing-card">
        <Text style={fuelTextStyles.sectionTitle}>Food timing</Text>
        {viewModel.fuelTimingRecommendations.map((item) => (
          <View
            key={`fuel-timing:${item.id}`}
            style={{
              alignItems: "flex-start",
              backgroundColor: fuelPalette.controlFill,
              borderColor: fuelPalette.cardLine,
              borderCurve: "continuous",
              borderRadius: radii.tile,
              borderWidth: 1,
              flexDirection: "row",
              gap: spacing.sm,
              padding: spacing.md
            }}
          >
            <View
              style={{
                alignItems: "center",
                backgroundColor: fuelTint(item.id.includes("post") ? "purple" : "orange", "16"),
                borderRadius: radii.pill,
                height: 34,
                justifyContent: "center",
                width: 34
              }}
            >
              <DecorativeIcon color={colorForTone(item.id.includes("post") ? "purple" : "orange")} name={timingIcon(item.id)} size={17} />
            </View>
            <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
              <Text numberOfLines={2} style={{ color: fuelPalette.textPrimary, fontSize: 14, fontWeight: "900", lineHeight: 18 }}>{item.title}: {item.timing}</Text>
              <Text style={{ color: fuelPalette.textBody, fontSize: 12, fontWeight: "700", lineHeight: 17 }}>{item.amount}. {item.suggestion}</Text>
            </View>
          </View>
        ))}
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

function WeightTrendInfoRow({
  helper,
  icon,
  label,
  tone,
  value
}: {
  helper: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone: VisualTone;
  value: string;
}) {
  const color = colorForTone(tone);
  return (
    <View
      accessibilityLabel={`${label}: ${value}. ${helper}`}
      style={{
        alignItems: "center",
        backgroundColor: fuelPalette.controlFill,
        borderColor: fuelTint(tone, tone === "muted" ? "26" : "3A"),
        borderCurve: "continuous",
        borderRadius: radii.tile,
        borderWidth: 1,
        flexDirection: "row",
        gap: spacing.md,
        minHeight: 74,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm
      }}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: fuelTint(tone, "16"),
          borderColor: fuelTint(tone, "40"),
          borderRadius: radii.pill,
          borderWidth: 1,
          height: 40,
          justifyContent: "center",
          width: 40
        }}
      >
        <DecorativeIcon color={color} name={icon} size={19} />
      </View>
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: fuelPalette.textMuted, fontSize: 11, fontWeight: "900", lineHeight: 15, textTransform: "uppercase" }}>{label}</Text>
        <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={{ color, fontSize: 18, fontVariant: ["tabular-nums"], fontWeight: "900", lineHeight: 23 }}>{value}</Text>
        <Text numberOfLines={2} style={{ color: fuelPalette.textMuted, fontSize: 12, fontWeight: "700", lineHeight: 16 }}>{helper}</Text>
      </View>
    </View>
  );
}

function WeightTrendCard({
  dashboard,
  plan,
  preferredUnits,
  viewModel
}: {
  dashboard: FuelDashboardVisual;
  plan: FuelPlanStatus;
  preferredUnits: PreferredUnits;
  viewModel: FuelViewModel;
}) {
  const trend = trendInterpretation(viewModel, plan, dashboard);
  const currentLabel = convertMassCopy(dashboard.bodyMass.currentLabel, preferredUnits);
  const trendPointCount = dashboard.bodyMass.points.length;
  return (
    <PremiumCard accent={trend.tone} density="regular" testID="fuel-weight-trend-card">
      <View style={{ gap: spacing.lg }}>
        <View style={{ alignItems: "flex-start", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }}>
          <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
            <Text style={fuelTextStyles.sectionTitle}>Weight Trend</Text>
            <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={{ color: fuelPalette.textPrimary, fontSize: 28, fontVariant: ["tabular-nums"], fontWeight: "900", lineHeight: 34 }}>{currentLabel}</Text>
            <Text numberOfLines={2} style={fuelTextStyles.subtle}>
              {trendPointCount > 0 ? `${trendPointCount} recent log${trendPointCount === 1 ? "" : "s"} in view` : dashboard.bodyMass.emptyLabel}
            </Text>
          </View>
          <View
            accessibilityLabel={`Trend status: ${trend.label}`}
            style={{
              alignItems: "center",
              backgroundColor: fuelTint(trend.tone, "18"),
              borderColor: fuelTint(trend.tone, "45"),
              borderRadius: radii.pill,
              borderWidth: 1,
              flexDirection: "row",
              gap: spacing.xs,
              maxWidth: 154,
              minHeight: 34,
              paddingHorizontal: spacing.sm,
              paddingVertical: 5
            }}
          >
            <DecorativeIcon color={colorForTone(trend.tone)} name="analytics-outline" size={15} />
            <Text adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={1} style={{ color: colorForTone(trend.tone), flexShrink: 1, fontSize: 12, fontWeight: "900", lineHeight: 16 }}>{trend.label}</Text>
          </View>
        </View>
        <TrendLineChart accent={trend.tone} height={154} points={dashboard.bodyMass.points} testID="fuel-weight-trend-chart" width={320} />
        <View style={{ gap: spacing.sm }}>
          <WeightTrendInfoRow
            helper={trendPointCount > 0 ? `Latest logged value: ${currentLabel}.` : "Log body weight manually if it feels safe and useful."}
            icon="scale-outline"
            label="7-day change"
            tone={dashboard.bodyMass.tone}
            value={convertMassCopy(dashboard.bodyMass.deltaLabel, preferredUnits)}
          />
          <WeightTrendInfoRow
            helper="Used as context only. Do not add weight pressure from missing data."
            icon="speedometer-outline"
            label="Pace signal"
            tone={plan.tone}
            value={plan.label}
          />
        </View>
        <View
          style={{
            alignItems: "flex-start",
            backgroundColor: fuelTint(trend.tone, "10"),
            borderColor: fuelTint(trend.tone, "2D"),
            borderCurve: "continuous",
            borderRadius: radii.tile,
            borderWidth: 1,
            flexDirection: "row",
            gap: spacing.sm,
            padding: spacing.md
          }}
        >
          <DecorativeIcon color={colorForTone(trend.tone)} name="information-circle-outline" size={18} />
          <Text style={{ color: fuelPalette.textBody, flex: 1, fontSize: 13, fontWeight: "700", lineHeight: 19 }}>{convertMassCopy(trend.sentence, preferredUnits)}</Text>
        </View>
      </View>
    </PremiumCard>
  );
}

function CutRunwayMetricTile({
  helper,
  label,
  preferredUnits,
  tone,
  value
}: {
  helper: string;
  label: string;
  preferredUnits: PreferredUnits;
  tone: VisualTone;
  value: string;
}) {
  const color = colorForTone(tone);
  return (
    <View
      style={{
        backgroundColor: fuelPalette.controlFill,
        borderColor: fuelTint(tone, tone === "muted" ? "2A" : "3D"),
        borderCurve: "continuous",
        borderRadius: radii.tile,
        borderWidth: 1,
        flexBasis: 132,
        flexGrow: 1,
        gap: spacing.xs,
        minHeight: 102,
        minWidth: 0,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.md
      }}
    >
      <Text numberOfLines={2} style={{ color: fuelPalette.textMuted, fontSize: 11, fontWeight: "800", lineHeight: 15 }}>{label}</Text>
      <Text adjustsFontSizeToFit minimumFontScale={0.68} numberOfLines={2} style={{ color, fontSize: 19, fontVariant: ["tabular-nums"], fontWeight: "900", lineHeight: 24 }}>
        {displayFuelCopy(value, preferredUnits)}
      </Text>
      <Text numberOfLines={3} style={{ color: fuelPalette.textMuted, fontSize: 11, fontWeight: "700", lineHeight: 15 }}>
        {displayFuelCopy(helper, preferredUnits)}
      </Text>
    </View>
  );
}

function CutRunwayCard({
  preferredUnits,
  viewModel
}: {
  preferredUnits: PreferredUnits;
  viewModel: FuelViewModel;
}) {
  const runway = viewModel.bodyMassTrajectory.cutRunway;
  if (!runway.visible) {
    return null;
  }
  const metrics = runway.metrics.filter((metric) => metric.label !== "Official target").slice(0, 4);
  return (
    <EngineCard>
      <View style={{ gap: spacing.md }} testID="fuel-cut-runway-card">
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }}>
          <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
            <Text style={fuelTextStyles.sectionTitle}>{runway.title}</Text>
            <Text style={fuelTextStyles.body}>{displayFuelCopy(runway.summary, preferredUnits)}</Text>
          </View>
          <FuelTonePill label={titleCaseStatus(runway.statusLabel)} tone={runway.tone} />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {metrics.map((metric) => (
            <CutRunwayMetricTile
              helper={metric.helper}
              key={`fuel-cut-runway-metric:${metric.label}`}
              label={metric.label}
              preferredUnits={preferredUnits}
              tone={metric.tone}
              value={metric.value}
            />
          ))}
        </View>
        <View style={{ gap: spacing.xs }}>
          {runway.safeActions.slice(0, 3).map((action, index) => (
            <DetailLine key={`fuel-cut-runway-action:${index}`} preferredUnits={preferredUnits} text={action} tone={index === 0 ? "body" : "subtle"} />
          ))}
          <DetailLine preferredUnits={preferredUnits} text={runway.boundaryCopy} />
        </View>
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
            <DecorativeIcon color={color} name={icon} size={18} />
          </View>
          <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
            <Text numberOfLines={2} style={{ color: fuelPalette.textPrimary, fontSize: 15, fontWeight: "900", lineHeight: 20 }}>{title}</Text>
            <Text numberOfLines={2} style={{ color: fuelPalette.textMuted, fontSize: 12, fontWeight: "700", lineHeight: 16 }}>{status}</Text>
          </View>
          <DecorativeIcon color={fuelPalette.textBody} name={open ? "chevron-up" : "chevron-down"} size={18} />
        </Pressable>
        {open ? <View style={{ gap: spacing.sm }}>{children}</View> : null}
      </View>
    </EngineCard>
  );
}

function DetailLine({ preferredUnits = "metric", text, tone = "subtle" }: { preferredUnits?: PreferredUnits | undefined; text: string; tone?: "body" | "subtle" | "callout" | undefined }) {
  const style = tone === "body" ? fuelTextStyles.body : tone === "callout" ? fuelTextStyles.callout : fuelTextStyles.subtle;
  return <Text style={style}>{displayFuelCopy(text, preferredUnits)}</Text>;
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

function WeighInPlanContent({ preferredUnits, viewModel }: { preferredUnits: PreferredUnits; viewModel: FuelViewModel }) {
  const runway = viewModel.bodyMassTrajectory.cutRunway;
  const rows = [
    ...(runway.visible ? [runway.summary, runway.boundaryCopy, ...runway.safeActions.slice(0, 2)] : []),
    viewModel.bodyMassTrajectory.target,
    viewModel.bodyMassTrajectory.weighInCountdown,
    viewModel.fightWeekFuelPlan.carbohydrateGuidance,
    viewModel.fightWeekFuelPlan.hydrationGuidance,
    ...(viewModel.rehydrationPlan ? [viewModel.rehydrationPlan.summary, ...viewModel.rehydrationPlan.actions.slice(0, 3)] : []),
    ...(viewModel.tournamentFuel ? [viewModel.tournamentFuel.summary, ...viewModel.tournamentFuel.actions.slice(0, 2)] : [])
  ];
  return (
    <>
      {detailRowsFromItems(rows, "No weigh-in plan is active today.").slice(0, 10).map((item, index) => (
        <DetailLine key={`fuel-weigh-in-detail:${index}`} preferredUnits={preferredUnits} text={item} />
      ))}
    </>
  );
}

function HealthChecksContent({
  message,
  onAcknowledgeNutritionSafetyReview,
  preferredUnits,
  safety,
  viewModel,
}: {
  message: string | null;
  onAcknowledgeNutritionSafetyReview?: ((reviewId: string) => void | Promise<void>) | undefined;
  preferredUnits: PreferredUnits;
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
          <DetailLine preferredUnits={preferredUnits} text={viewModel.underFuelingRisk.summary} tone="body" />
          {viewModel.underFuelingRisk.actions.map((item, index) => <DetailLine key={`fuel-under-risk:${index}`} preferredUnits={preferredUnits} text={item} />)}
        </View>
      ) : null}
      {viewModel.riskSummary.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Text style={fuelTextStyles.callout}>Health warning</Text>
          {viewModel.riskSummary.slice(0, 4).map((risk, index) => <DetailLine key={`fuel-risk:${index}`} preferredUnits={preferredUnits} text={risk} tone="body" />)}
        </View>
      ) : null}
      {viewModel.weightClassStatus.safetyFlags.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Text style={fuelTextStyles.callout}>Weight safety</Text>
          {viewModel.weightClassStatus.safetyFlags.slice(0, 4).map((flag, index) => <DetailLine key={`fuel-weight-flag:${index}`} preferredUnits={preferredUnits} text={flag} tone="body" />)}
        </View>
      ) : null}
      <DetailLine preferredUnits={preferredUnits} text={viewModel.hydrationSummary} />
      <DetailLine preferredUnits={preferredUnits} text={viewModel.bodyMassTrajectory.riskExplanation} />
      {message ? <DetailLine preferredUnits={preferredUnits} text={message} tone="callout" /> : null}
      {!safety.active ? <DetailLine text="No health warnings logged today." tone="body" /> : null}
    </View>
  );
}

function FuelCollapsedDetails({
  dashboard,
  message,
  onAcknowledgeNutritionSafetyReview,
  preferredUnits,
  safety,
  viewModel,
}: {
  dashboard: FuelDashboardVisual;
  message: string | null;
  onAcknowledgeNutritionSafetyReview?: ((reviewId: string) => void | Promise<void>) | undefined;
  preferredUnits: PreferredUnits;
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
        <WeighInPlanContent preferredUnits={preferredUnits} viewModel={viewModel} />
      </FuelDetailRow>
      <FuelDetailRow defaultOpen={safety.active} icon="shield-checkmark-outline" status={healthStatus} title="Health checks" tone={safety.active ? safety.tone : "green"}>
        <HealthChecksContent
          message={message}
          onAcknowledgeNutritionSafetyReview={onAcknowledgeNutritionSafetyReview}
          preferredUnits={preferredUnits}
          safety={safety}
          viewModel={viewModel}
        />
      </FuelDetailRow>
    </View>
  );
}

function FuelSafetyCard({
  message,
  onAcknowledgeNutritionSafetyReview,
  preferredUnits,
  safety,
  viewModel
}: {
  message: string | null;
  onAcknowledgeNutritionSafetyReview?: ((reviewId: string) => void | Promise<void>) | undefined;
  preferredUnits: PreferredUnits;
  safety: FuelSafetyState;
  viewModel: FuelViewModel;
}) {
  if (!safety.active) {
    return null;
  }
  return (
    <EngineCard>
      <View style={{ gap: spacing.md }} testID="fuel-safety-card">
        <View style={{ alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "space-between" }}>
          <View style={{ flexBasis: 250, flexGrow: 1, gap: spacing.xs, minWidth: 0 }}>
            <Text style={fuelTextStyles.sectionTitle}>{safety.reviewActive ? "Review safety" : "Fuel safety"}</Text>
            <Text style={fuelTextStyles.body}>{convertMassCopy(safety.stripText, preferredUnits)}</Text>
          </View>
          <FuelTonePill label={safety.healthStatus} tone={safety.tone} />
        </View>
        {safety.reviewActive ? (
          <NutritionSafetyReviewCard
            activeReviews={viewModel.activeNutritionSafetyReviews}
            onAcknowledgeReview={onAcknowledgeNutritionSafetyReview}
            review={viewModel.nutritionSafetyReview}
          />
        ) : null}
        {viewModel.underFuelingRisk ? (
          <View style={{ gap: spacing.xs }}>
            <Text style={[fuelTextStyles.callout, { color: colorForTone("orange") }]}>{viewModel.underFuelingRisk.title}</Text>
            <DetailLine preferredUnits={preferredUnits} text={viewModel.underFuelingRisk.summary} tone="body" />
          </View>
        ) : null}
        {viewModel.weightClassStatus.safetyFlags.slice(0, 2).map((flag, index) => (
          <DetailLine key={`fuel-default-weight-flag:${index}`} preferredUnits={preferredUnits} text={flag} tone="body" />
        ))}
        {viewModel.riskSummary.slice(0, safety.reviewActive ? 1 : 2).map((risk, index) => (
          <DetailLine key={`fuel-default-risk:${index}`} preferredUnits={preferredUnits} text={risk} tone="body" />
        ))}
        {message && !safety.reviewActive ? <DetailLine preferredUnits={preferredUnits} text={message} tone="callout" /> : null}
      </View>
    </EngineCard>
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

function FuelDetailsDisclosure({
  dashboard,
  detailsOpen,
  message,
  onAcknowledgeNutritionSafetyReview,
  onToggleDetails,
  plan,
  preferredUnits,
  safety,
  trainingCopy,
  viewModel
}: {
  dashboard: FuelDashboardVisual;
  detailsOpen: boolean;
  message: string | null;
  onAcknowledgeNutritionSafetyReview?: ((reviewId: string) => void | Promise<void>) | undefined;
  onToggleDetails: () => void;
  plan: FuelPlanStatus;
  preferredUnits: PreferredUnits;
  safety: FuelSafetyState;
  trainingCopy: string;
  viewModel: FuelViewModel;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <EngineCard>
        <Pressable
          accessibilityLabel={detailsOpen ? "Hide Fuel details" : "Fuel details"}
          accessibilityRole="button"
          accessibilityState={{ expanded: detailsOpen }}
          onPress={onToggleDetails}
          style={{ alignItems: "center", flexDirection: "row", gap: spacing.md, minHeight: 54 }}
          testID="fuel-details-toggle"
        >
          <View
            style={{
              alignItems: "center",
              backgroundColor: fuelTint("orange", "16"),
              borderColor: fuelTint("orange", "42"),
              borderRadius: radii.pill,
              borderWidth: 1,
              height: 38,
              justifyContent: "center",
              width: 38
            }}
          >
            <DecorativeIcon color={fuelPalette.toneOrange} name="list-outline" size={18} />
          </View>
          <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
            <Text style={{ color: fuelPalette.textPrimary, fontSize: 15, fontWeight: "900", lineHeight: 20 }}>Fuel details</Text>
            <Text numberOfLines={1} style={{ color: fuelPalette.textMuted, fontSize: 12, fontWeight: "700", lineHeight: 16 }}>
              Weight trend, training context, logs, safety history, and full fuel context.
            </Text>
          </View>
          <DecorativeIcon color={fuelPalette.textBody} name={detailsOpen ? "chevron-up" : "chevron-down"} size={18} />
        </Pressable>
      </EngineCard>
      {detailsOpen ? (
        <View style={{ gap: spacing.sm }} testID="fuel-details-section">
          <TrainingTodayCard plan={plan} trainingCopy={trainingCopy} viewModel={viewModel} />
          <FuelCollapsedDetails
            dashboard={dashboard}
            message={message}
            onAcknowledgeNutritionSafetyReview={onAcknowledgeNutritionSafetyReview}
            preferredUnits={preferredUnits}
            safety={safety}
            viewModel={viewModel}
          />
          <FuelStatusStrip safety={safety} />
        </View>
      ) : null}
    </View>
  );
}

function FoodLogStatusCard({ busy, quickLogs, viewModel }: { busy: boolean; quickLogs: QuickLogActions; viewModel: FuelViewModel }) {
  const run = (kind: FuelViewModel["completionControls"]["actions"][number]["kind"]) => {
    if (kind === "still_logging") {
      void quickLogs.markFoodStillLoggingToday().catch(() => undefined);
      return;
    }
    if (kind === "done_logging") {
      void quickLogs.markFoodDoneLoggingToday().catch(() => undefined);
      return;
    }
    void quickLogs.markFoodNotTrackingToday().catch(() => undefined);
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
            <Text style={fuelTextStyles.subtle}>Log only what you know. Missing food or water stays unknown.</Text>
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
  detailsOpen,
  message,
  onAcknowledgeNutritionSafetyReview,
  onLogFood,
  onLogHydration,
  onToggleDetails,
  plan,
  preferredUnits,
  primaryLog,
  safety,
  trainingCopy,
  viewModel
}: {
  busy: boolean;
  dashboard: FuelDashboardVisual;
  detailsOpen: boolean;
  message: string | null;
  onAcknowledgeNutritionSafetyReview?: ((reviewId: string) => void | Promise<void>) | undefined;
  onLogFood: () => void;
  onLogHydration: () => void;
  onToggleDetails: () => void;
  plan: FuelPlanStatus;
  preferredUnits: PreferredUnits;
  primaryLog: "food" | "water";
  safety: FuelSafetyState;
  trainingCopy: string;
  viewModel: FuelViewModel;
}) {
  const hasActiveWeightTarget = hasActiveWeightContext(viewModel);
  return (
    <View style={{ gap: spacing.md }} testID="fuel-overview">
      <TodayFuelPlanCard busy={busy} onLogFood={onLogFood} onLogHydration={onLogHydration} plan={plan} primaryLog={primaryLog} />
      <MacroTargetsCard dashboard={dashboard} viewModel={viewModel} />
      <FuelKeyNumbersCard dashboard={dashboard} hasActiveWeightTarget={hasActiveWeightTarget} preferredUnits={preferredUnits} safety={safety} viewModel={viewModel} />
      <CutRunwayCard preferredUnits={preferredUnits} viewModel={viewModel} />
      <WeightTrendCard dashboard={dashboard} plan={plan} preferredUnits={preferredUnits} viewModel={viewModel} />
      <DoNotMissTodayCard dashboard={dashboard} />
      <FuelTimingCard viewModel={viewModel} />
      <FuelSafetyCard
        message={message}
        onAcknowledgeNutritionSafetyReview={onAcknowledgeNutritionSafetyReview}
        preferredUnits={preferredUnits}
        safety={safety}
        viewModel={viewModel}
      />
      <FuelDetailsDisclosure
        dashboard={dashboard}
        detailsOpen={detailsOpen}
        message={message}
        onAcknowledgeNutritionSafetyReview={onAcknowledgeNutritionSafetyReview}
        onToggleDetails={onToggleDetails}
        plan={plan}
        preferredUnits={preferredUnits}
        safety={safety}
        trainingCopy={trainingCopy}
        viewModel={viewModel}
      />
    </View>
  );
}

export function FuelScreen({ busy, focusIntent, message, onAcknowledgeNutritionSafetyReview, onFocusIntentApplied, preferredUnits = "metric", quickLogs, recentLogs, viewModel }: FuelScreenProps) {
  const [appliedFocusIntent, setAppliedFocusIntent] = React.useState<FuelFocusIntent | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const dashboard = buildFuelDashboardVisual(viewModel, recentLogs);
  React.useEffect(() => {
    if (!focusIntent) {
      return;
    }
    setAppliedFocusIntent(focusIntent);
    if (focusIntent === "safety_review") {
      setDetailsOpen(true);
    }
    onFocusIntentApplied?.();
  }, [focusIntent, onFocusIntentApplied]);
  const safety: FuelSafetyState =
    message && !viewModel.safetyState.active
      ? {
          ...viewModel.safetyState,
          healthStatus: "App note",
          stripText: message,
          tone: "orange"
        }
      : viewModel.safetyState;
  const plan = viewModel.planStatus;
  const trainingCopy = viewModel.trainingTodayCopy;
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
    <LuminousScreen accent="orange" testID="fuel-screen">
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
          detailsOpen={detailsOpen}
          message={message}
          onAcknowledgeNutritionSafetyReview={onAcknowledgeNutritionSafetyReview}
          onLogFood={openLogFood}
          onLogHydration={openLogHydration}
          onToggleDetails={() => setDetailsOpen((value) => !value)}
          plan={plan}
          preferredUnits={preferredUnits}
          primaryLog={primaryLog}
          safety={safety}
          trainingCopy={trainingCopy}
          viewModel={viewModel}
        />
      )}
    </LuminousScreen>
  );
}
