import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, useWindowDimensions, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CycleSymptom, CycleViewModel, FuelViewModel, PlanViewModel, RecentLogsViewModel, TodayViewModel, TrainViewModel } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
import { LuminousScreen, ScreenHeader, useLuminousScreenTheme } from "../../design/components/LuminousScreen";
import { TrendLineChart, WeeklyLoadBars, WorkoutLogContributionGrid } from "../../design/components/PerformanceVisuals";
import { GroupedMetricTiles, PremiumCard } from "../../design/components/PremiumPrimitives";
import { glassStyles } from "../../design/glass";
import { colors, radii, spacing } from "../../design/theme";
import { buildTodayDashboardVisual, type TodayActionVisual, type TodayDashboardVisual, type TodayQuickCheckFocus, type VisualTone } from "../../engine/presentation/dashboardVisualData";
import { plainWorkoutTitle } from "../../engine/presentation/trainingCopy";
import type { QuickLogActions } from "../../hooks/useQuickLogs";
import { CycleContextCard } from "./cycle/CycleContextCard";
import { BodyMassLogCard, CycleLogCard, HydrationLogCard, ReadinessCheckInCard } from "./logging/LogCards";
import { screenStyles } from "./screenStyles";
import { tabHeroHeaders } from "./tabHeroConfig";

export interface TodayScreenProps {
  asOfDate?: string | undefined;
  viewModel: TodayViewModel;
  fuelViewModel?: FuelViewModel | undefined;
  planViewModel?: PlanViewModel | undefined;
  trainViewModel?: TrainViewModel | undefined;
  recentLogs: RecentLogsViewModel;
  cycleContext: CycleViewModel | null;
  quickLogs: QuickLogActions;
  cycleQuickLogEnabled: boolean;
  cycleTrackingStatus: "enabled" | "disabled" | "undecided" | string;
  cycleSymptomOptions: readonly CycleSymptom[];
  preferredUnits?: "metric" | "imperial" | undefined;
  busy: boolean;
  message: string | null;
  onOpenFuel?: (() => void) | undefined;
  onOpenFuelLog?: (() => void) | undefined;
  onOpenFuelSafety?: (() => void) | undefined;
  onOpenPlan?: (() => void) | undefined;
  onOpenTrain?: (() => void) | undefined;
  onOpenTrainWorkout?: (() => void) | undefined;
}

type TodaySecondaryAction = TodayViewModel["secondaryActions"][number]["action"];
type TodayQuickCheckPlacement = "top" | "readiness_card" | "body_mass_card" | "hydration_card" | "manual";
type TodayActionResolver = (action: TodayActionVisual) => (() => void) | undefined;

interface WeekTodayModel {
  phaseLabel: string;
  sentence: string;
  sessions: readonly {
    id: string;
    label: string;
    meta: string;
    title: string;
    tone: VisualTone;
  }[];
}

const todayPalette = {
  actionBorder: "rgba(39, 206, 241, 0.58)",
  actionFill: "#27CEF1",
  actionFillPressed: "#20BADD",
  actionShadow: "rgba(39, 206, 241, 0.28)",
  cardLine: "rgba(205, 239, 247, 0.14)",
  controlFill: "rgba(224, 244, 252, 0.055)",
  controlFillPressed: "rgba(224, 244, 252, 0.095)",
  controlLine: "rgba(205, 239, 247, 0.16)",
  textBody: "#D7E7F4",
  textMuted: "#A9BDD0",
  textPrimary: "#F6FBFF",
  toneBlue: "#27CEF1",
  toneGold: "#FFD861",
  toneGreen: "#38E28A",
  toneMuted: "#A9BDD0",
  toneOrange: "#FF9448",
  tonePurple: "#9657F5",
  toneRed: "#FF5265"
} as const;

function plainTodayCopy(value: string): string {
  return value
    .replace(/\bGenerated support\b/g, "App work")
    .replace(/\bgenerated support\b/gi, "app work")
    .replace(/\bgenerated sessions\b/gi, "app sessions")
    .replace(/\bgenerated session\b/gi, "app session")
    .replace(/\bgenerated training\b/gi, "app training")
    .replace(/\bprotected anchors?\b/gi, "boxing sessions you added")
    .replace(/\bprotected sparring\b/gi, "fixed coach/team sparring")
    .replace(/\bexecution readiness\b/gi, "readiness")
    .replace(/\btraining demand\b/gi, "training need")
    .replace(/\bsafety override\b/gi, "safety note")
    .replace(/\bsafety stops\b/gi, "safety notes")
    .replace(/\bsafety stop\b/gi, "safety note")
    .replace(/\bhard stops\b/gi, "safety notes")
    .replace(/\bhard stop\b/gi, "safety note")
    .replace(/\brisk domain\b/gi, "safety area")
    .replace(/\bdecision trace\b/gi, "decision notes")
    .replace(/\bbody check\b/gi, "body status")
    .replace(/\bdashboard\b/gi, "overview")
    .replace(/\bACWR\b/g, "load trend");
}

function accentForTone(tone: VisualTone): "blue" | "green" | "orange" | "purple" | "gold" | "red" {
  return tone === "muted" ? "blue" : tone;
}

function colorForTone(tone: VisualTone): string {
  switch (tone) {
    case "green":
      return todayPalette.toneGreen;
    case "orange":
      return todayPalette.toneOrange;
    case "purple":
      return todayPalette.tonePurple;
    case "gold":
      return todayPalette.toneGold;
    case "red":
      return todayPalette.toneRed;
    case "muted":
      return todayPalette.toneMuted;
    case "blue":
    default:
      return todayPalette.toneBlue;
  }
}

function todayTint(tone: VisualTone, alpha: string): string {
  return `${colorForTone(tone)}${alpha}`;
}

function compactStatusValue(value: string): string {
  switch (value) {
    case "Eat before":
      return "Eat first";
    case "Hydrate first":
      return "Hydrate";
    case "Log if useful":
      return "Optional";
    case "No active cut":
      return "No cut";
    case "No workout":
      return "None";
    default:
      return value;
  }
}

function firstSentence(value: string | null | undefined, fallback = ""): string {
  const copy = plainTodayCopy(value ?? "").trim();
  if (!copy) {
    return fallback;
  }
  const match = copy.match(/^.+?[.!?](?:\s|$)/);
  return (match?.[0] ?? copy).trim();
}

function lowerFirst(value: string): string {
  const copy = value.trim();
  return copy.length > 0 ? `${copy.slice(0, 1).toLowerCase()}${copy.slice(1)}` : copy;
}

export const handledTodaySecondaryActions: Record<TodaySecondaryAction, true> = {
  log_food: true,
  log_readiness: true,
  mark_food_not_tracking: true,
  start_without_logging: true
};

function TodayQuickCheckSection({
  busy,
  compact = false,
  framed = true,
  focus,
  includeOtherLogs = true,
  onClose,
  preferredUnits = "metric",
  quickLogs,
  recentLogs
}: {
  busy: boolean;
  compact?: boolean | undefined;
  framed?: boolean | undefined;
  focus: TodayQuickCheckFocus;
  includeOtherLogs?: boolean | undefined;
  onClose?: (() => void) | undefined;
  preferredUnits: "metric" | "imperial";
  quickLogs: QuickLogActions;
  recentLogs: RecentLogsViewModel;
}) {
  const focusCopy =
    focus === "readiness"
      ? "Readiness first"
    : focus === "body_mass"
        ? "Weight first"
        : "Water first";
  const logCards = {
    body_mass: <BodyMassLogCard actions={quickLogs} busy={busy} compact={compact} forceOpen={focus === "body_mass"} framed={false} preferredUnits={preferredUnits} status={recentLogs.bodyMassToday} />,
    hydration: <HydrationLogCard actions={quickLogs} busy={busy} compact={compact} framed={false} status={recentLogs.hydrationToday} />,
    readiness: <ReadinessCheckInCard actions={quickLogs} busy={busy} compact={compact} forceOpen={focus === "readiness"} framed={false} status={recentLogs.readinessToday} />
  } satisfies Record<TodayQuickCheckFocus, React.ReactNode>;
  const bodyMassNeeded = recentLogs.bodyMassToday.status === "needed_for_cut" || recentLogs.bodyMassToday.status === "unknown_cut_context";
  const orderedFocuses: readonly TodayQuickCheckFocus[] =
    !includeOtherLogs
      ? [focus]
      : focus === "body_mass"
        ? ["body_mass", "readiness", "hydration"]
        : focus === "hydration"
          ? bodyMassNeeded ? ["hydration", "readiness", "body_mass"] : ["hydration", "readiness"]
          : bodyMassNeeded ? ["readiness", "body_mass", "hydration"] : ["readiness", "hydration"];
  const content = (
    <View
      accessibilityLabel="Check in quick check wizard"
      style={{ gap: spacing.md }}
      testID="today-quick-check-section"
    >
      <View style={{ alignItems: "flex-start", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }}>
        <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
          <Text style={screenStyles.sectionTitle}>Quick check</Text>
          <Text style={screenStyles.callout}>{focusCopy}</Text>
          <Text style={screenStyles.subtle}>Log only what you know. Missing data stays unknown.</Text>
        </View>
        {onClose ? (
          <Pressable
            accessibilityLabel="Close quick check"
            accessibilityRole="button"
            onPress={onClose}
            style={[screenStyles.quietButton, { minHeight: 44, minWidth: 76, paddingHorizontal: spacing.md }]}
          >
            <Text style={screenStyles.quietButtonText}>Close</Text>
          </Pressable>
        ) : null}
      </View>
      {orderedFocuses.map((item) => (
        <View key={`today-quick-check-card:${item}`} style={{ gap: spacing.sm }}>
          {logCards[item]}
        </View>
      ))}
    </View>
  );

  if (framed) {
    return <EngineCard>{content}</EngineCard>;
  }

  return (
    <View
      style={{
        gap: spacing.md,
        paddingTop: 0
      }}
    >
      {content}
    </View>
  );
}

function TodayQuickCheckModal({
  busy,
  onClose,
  preferredUnits = "metric",
  quickCheck,
  quickLogs,
  recentLogs
}: {
  busy: boolean;
  onClose: () => void;
  preferredUnits: "metric" | "imperial";
  quickCheck: { focus: TodayQuickCheckFocus; placement: TodayQuickCheckPlacement } | null;
  quickLogs: QuickLogActions;
  recentLogs: RecentLogsViewModel;
}) {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  if (!quickCheck) {
    return null;
  }

  const compact = width < 520;
  const modalPaddingBottom = Math.max(insets.bottom + spacing.md, spacing.lg);
  const modalPaddingTop = compact ? Math.max(insets.top + spacing.sm, spacing.md) : Math.max(insets.top + spacing.md, spacing.lg);
  const availablePanelHeight = Math.max(320, height - modalPaddingTop - modalPaddingBottom);
  const maxPanelHeight = compact ? Math.max(520, Math.min(availablePanelHeight, Math.round(height * 0.78))) : Math.min(availablePanelHeight, 820);
  const includeOtherLogs = !compact && (quickCheck.placement === "top" || quickCheck.placement === "manual");
  const modalShadowStyle: ViewStyle =
    Platform.OS === "web"
      ? ({ boxShadow: "0 22px 52px rgba(0, 0, 0, 0.42)" } as ViewStyle)
      : {
          elevation: 12,
          shadowColor: "#000000",
          shadowOffset: { height: 16, width: 0 },
          shadowOpacity: 0.36,
          shadowRadius: 28
        };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
      visible
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{
          alignItems: "center",
          flex: 1,
          justifyContent: compact ? "flex-end" : "flex-start",
          paddingBottom: modalPaddingBottom,
          paddingHorizontal: compact ? spacing.md : spacing.lg,
          paddingTop: modalPaddingTop
        }}
      >
        <Pressable
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onPress={onClose}
          style={{
            backgroundColor: "rgba(3, 6, 15, 0.88)",
            bottom: 0,
            left: 0,
            position: "absolute",
            right: 0,
            top: 0
          }}
        />
        <View
          accessibilityLabel="Quick check popup"
          accessibilityViewIsModal
          style={[
            {
              ...glassStyles.cardDeep,
              backgroundColor: "rgba(12, 18, 35, 0.98)",
              borderColor: "rgba(255, 255, 255, 0.22)",
              borderRadius: compact ? 28 : radii.card,
              maxHeight: maxPanelHeight,
              maxWidth: 640,
              overflow: "hidden",
              padding: compact ? spacing.md : spacing.lg,
              width: "100%"
            },
            modalShadowStyle
          ]}
          testID="today-quick-check-modal"
        >
          {compact ? (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{ alignItems: "center", paddingBottom: spacing.sm }}
            >
              <View style={{ backgroundColor: "rgba(255, 255, 255, 0.34)", borderRadius: radii.pill, height: 4, width: 42 }} />
            </View>
          ) : null}
          <ScrollView
            contentContainerStyle={{ gap: spacing.md, paddingBottom: compact ? spacing.md : spacing.sm }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TodayQuickCheckSection
              busy={busy}
              compact={compact}
              focus={quickCheck.focus}
              framed={false}
              includeOtherLogs={includeOtherLogs}
              onClose={onClose}
              preferredUnits={preferredUnits}
              quickLogs={quickLogs}
              recentLogs={recentLogs}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function TodayTonePill({ label, tone: _tone = "blue" }: { label: string; tone?: VisualTone | undefined }) {
  return (
    <Text
      accessibilityLabel={`Status: ${label}`}
      style={{
        alignSelf: "flex-start",
        color: colors.wrap,
        fontSize: 11,
        fontWeight: "900",
        lineHeight: 15
      }}
    >
      {label}
    </Text>
  );
}

function actionIcon(action: TodayActionVisual): keyof typeof Ionicons.glyphMap {
  return action.icon as keyof typeof Ionicons.glyphMap;
}

function todayActionTone(action: TodayActionVisual): VisualTone {
  return /workout/i.test(action.label) ? "blue" : action.tone;
}

function TodayButton({
  disabled,
  icon,
  label,
  onPress,
  primary = false,
  testID,
  tone = "blue"
}: {
  disabled?: boolean | undefined;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: (() => void) | undefined;
  primary?: boolean | undefined;
  testID?: string | undefined;
  tone?: VisualTone | undefined;
}) {
  const theme = useLuminousScreenTheme();
  const toneColor = colorForTone(tone);
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          alignItems: "center",
          borderCurve: "continuous",
          borderRadius: primary ? radii.control : radii.pill,
          borderWidth: 1,
          alignSelf: primary ? "stretch" : "flex-start",
          flexDirection: "row",
          flexShrink: 1,
          gap: spacing.sm,
          justifyContent: "center",
          minWidth: primary ? 108 : 92,
          minHeight: primary ? 48 : 40,
          opacity: disabled ? 0.56 : 1,
          paddingHorizontal: primary ? spacing.md : spacing.sm,
          paddingVertical: spacing.xs
        },
        primary
          ? {
              backgroundColor: disabled
                ? todayPalette.controlFill
                : tone === "blue"
                  ? pressed ? todayPalette.actionFillPressed : todayPalette.actionFill
                  : pressed ? todayTint(tone, "44") : todayTint(tone, "34"),
              borderColor: disabled ? todayPalette.controlLine : tone === "blue" ? todayPalette.actionBorder : todayTint(tone, "66"),
              boxShadow: disabled ? "none" : `0 10px 24px ${tone === "blue" ? todayPalette.actionShadow : `${toneColor}26`}`
            }
          : {
              backgroundColor: pressed ? todayPalette.controlFillPressed : todayPalette.controlFill,
              borderColor: todayPalette.controlLine,
              boxShadow: `0 6px 16px ${theme.strongGlow}`
            }
      ]}
      testID={testID}
    >
      <Ionicons color={disabled ? todayPalette.textMuted : primary && tone !== "red" ? colors.cornerBlack : toneColor} name={icon} size={16} />
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.78}
        numberOfLines={2}
        style={{ color: disabled ? todayPalette.textMuted : primary && tone !== "red" ? colors.cornerBlack : todayPalette.textBody, flexShrink: 1, fontSize: 14, fontWeight: "900", lineHeight: 18, textAlign: "center" }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function TodayStatusTile({
  label,
  tone,
  value
}: {
  label: string;
  tone: VisualTone;
  value: string;
}) {
  const { width } = useWindowDimensions();
  const compact = width < 430;
  const compactTileBasis = width < 360 ? 64 : 78;
  const compactValueFontSize = width < 360 ? 14 : 15;
  const color = colorForTone(tone);
  const displayValue = compact ? compactStatusValue(value) : value;
  return (
    <View
      accessibilityLabel={`${label}: ${value}`}
      style={{
        ...glassStyles.tile,
        backgroundColor: todayPalette.controlFill,
        borderColor: todayPalette.cardLine,
        flexBasis: compact ? compactTileBasis : 132,
        flexGrow: 1,
        gap: spacing.xs,
        minHeight: compact ? 68 : 74,
        padding: compact ? spacing.sm : spacing.md
      }}
    >
      <Text numberOfLines={1} style={{ color: todayPalette.textMuted, fontSize: 11, fontWeight: "800", lineHeight: 15 }}>
        {label}
      </Text>
      <Text adjustsFontSizeToFit minimumFontScale={0.62} numberOfLines={1} style={{ color, fontSize: compact ? compactValueFontSize : 19, fontWeight: "900", lineHeight: compact ? 19 : 24 }}>
        {displayValue}
      </Text>
    </View>
  );
}

function TodayDetailRow({
  children,
  defaultOpen = false,
  icon,
  summary,
  testID,
  title,
  tone = "blue"
}: React.PropsWithChildren<{
  defaultOpen?: boolean | undefined;
  icon: keyof typeof Ionicons.glyphMap;
  summary: string;
  testID?: string | undefined;
  title: string;
  tone?: VisualTone | undefined;
}>) {
  const [open, setOpen] = React.useState(defaultOpen);
  const theme = useLuminousScreenTheme();
  React.useEffect(() => {
    if (defaultOpen) {
      setOpen(true);
    }
  }, [defaultOpen]);
  const color = colorForTone(tone);
  return (
    <EngineCard>
      <View style={{ gap: open ? spacing.md : 0 }} testID={testID}>
        <Pressable
          accessibilityLabel={title}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((value) => !value)}
          style={{ alignItems: "center", flexDirection: "row", gap: spacing.md, minHeight: 54 }}
        >
          <View
            style={{
              alignItems: "center",
              backgroundColor: theme.control,
              borderColor: theme.controlBorder,
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
            <Text numberOfLines={1} style={{ color: colors.mutedText, fontSize: 12, fontWeight: "700", lineHeight: 16 }}>{summary}</Text>
          </View>
          <Ionicons color={colors.wrap} name={open ? "chevron-up" : "chevron-down"} size={18} />
        </Pressable>
        {open ? <View style={{ gap: spacing.sm }}>{children}</View> : null}
      </View>
    </EngineCard>
  );
}

function planPhaseLabel(plan: PlanViewModel | undefined): string {
  if (!plan) {
    return "Week view";
  }
  return `Week ${plan.weekIndex} - ${plan.modeLabel}`;
}

function weekSentence(plan: PlanViewModel | undefined): string {
  if (!plan) {
    return "This week is about keeping the day simple until a plan is available.";
  }
  const source = firstSentence(plan.athleteFacingWeekSummary || plan.weekDevelopmentTheme || plan.weeklySummary, "");
  if (!source) {
    return "This week is about boxing first, then support work where it fits.";
  }
  if (/^this week/i.test(source)) {
    return plainTodayCopy(source);
  }
  return `This week is about ${lowerFirst(source).replace(/^main focus:\s*/i, "")}`;
}

function toneForPlanDay(day: PlanViewModel["dayPlans"][number]): VisualTone {
  if (day.warningSummary) {
    return "red";
  }
  if (day.marker === "Hard day" || day.fuelDemand === "high") {
    return "orange";
  }
  if (day.compactTag === "Recovery") {
    return "green";
  }
  if (day.compactTag === "Protected") {
    return "gold";
  }
  if (day.compactTag === "Support") {
    return "purple";
  }
  return "muted";
}

function shortDayLabel(date: string, fallback: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return fallback.split(",")[0] ?? fallback;
  }
  return parsed.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

function buildWeekModel(plan: PlanViewModel | undefined, asOfDate?: string | undefined): WeekTodayModel {
  const sessions: Array<WeekTodayModel["sessions"][number]> = [];
  for (const day of plan?.dayPlans ?? []) {
    if (asOfDate && day.date < asOfDate) {
      continue;
    }
    const label = day.date === asOfDate ? "Today" : shortDayLabel(day.date, day.label);
    if (day.protectedAnchors && day.protectedAnchors !== "No boxing added.") {
      sessions.push({
        id: `boxing:${day.date}`,
        label,
        meta: day.compactMetric,
        title: plainTodayCopy(day.protectedAnchors.split(",")[0]?.trim() || "Boxing"),
        tone: "gold"
      });
    }
    for (const session of day.generatedSessions) {
      sessions.push({
        id: session.id,
        label,
        meta: day.compactMetric,
        title: plainWorkoutTitle(session.title),
        tone: toneForPlanDay(day)
      });
    }
    if (sessions.length >= 2) {
      break;
    }
  }
  return {
    phaseLabel: planPhaseLabel(plan),
    sentence: weekSentence(plan),
    sessions: sessions.slice(0, 2)
  };
}

function logRows(recentLogs: RecentLogsViewModel): readonly string[] {
  const rows = [
    recentLogs.readinessToday.summary,
    recentLogs.bodyMassToday.summary,
    recentLogs.hydrationToday.summary,
    recentLogs.foodToday.summary,
    recentLogs.trainingRecentSummary
  ];
  return rows.map((item) => plainTodayCopy(item)).filter(Boolean).slice(0, 5);
}

function TodayCheckInCard({
  busy,
  checkIn,
  resolveAction
}: {
  busy: boolean;
  checkIn: TodayDashboardVisual["checkIn"];
  resolveAction: TodayActionResolver;
}) {
  const primaryAction = checkIn.primaryAction;
  const primaryHandler = resolveAction(primaryAction);
  const compactCheckInAction = checkIn.secondaryActions.find((action) => action.label === "Check in");
  const compactCheckInHandler = compactCheckInAction ? resolveAction(compactCheckInAction) : undefined;
  const { width } = useWindowDimensions();
  const compact = width < 390;
  return (
    <PremiumCard accent={checkIn.tone} density="regular">
      <View style={{ gap: spacing.md }} testID="today-hero-card">
        <View testID="today-check-in-card">
          <View style={{ gap: spacing.md }}>
            <View style={{ alignItems: "center", flexDirection: "row", gap: compact ? spacing.sm : spacing.md }}>
              <View style={{ alignItems: "center", width: compact ? 48 : 54 }}>
                <View
                  style={{
                    alignItems: "center",
                    backgroundColor: todayTint(checkIn.tone, "16"),
                    borderColor: todayTint(checkIn.tone, "55"),
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    height: compact ? 46 : 50,
                    justifyContent: "center",
                    width: compact ? 46 : 50
                  }}
                >
                  <Ionicons color={colorForTone(checkIn.tone)} name="shield-outline" size={compact ? 23 : 25} />
                </View>
              </View>
              <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
                <Text style={{ color: colorForTone(checkIn.tone), fontSize: 12, fontWeight: "900", lineHeight: 16, textTransform: "uppercase" }}>
                  Readiness
                </Text>
                <Text numberOfLines={2} style={{ color: colors.canvas, fontSize: compact ? 18 : 20, fontWeight: "900", lineHeight: compact ? 23 : 25 }}>
                  Readiness: <Text style={{ color: colorForTone(checkIn.tone) }}>{checkIn.status}</Text>
                </Text>
                <Text numberOfLines={3} style={{ color: colors.wrap, fontSize: compact ? 13 : 14, fontWeight: "600", lineHeight: compact ? 18 : 20 }}>{checkIn.sentence}</Text>
              </View>
              {!compact ? <Ionicons color={colors.wrap} name="chevron-forward" size={20} /> : null}
            </View>
            <View>
              <TodayButton disabled={busy || primaryAction.disabled || !primaryHandler} icon={actionIcon(primaryAction)} label={primaryAction.label} onPress={primaryHandler} primary testID="today-primary-check-in-action" tone="blue" />
            </View>
          </View>
        </View>
        {compactCheckInAction ? (
          <View style={{ marginTop: spacing.xs }}>
            <TodayButton disabled={busy || compactCheckInAction.disabled || !compactCheckInHandler} icon={actionIcon(compactCheckInAction)} label={compactCheckInAction.label} onPress={compactCheckInHandler} tone={compactCheckInAction.tone} />
          </View>
        ) : null}
      </View>
    </PremiumCard>
  );
}

function KeyStatusRow({
  statuses
}: {
  statuses: TodayDashboardVisual["keyStatuses"];
}) {
  return (
    <View testID="today-status-row">
      <GroupedMetricTiles
        items={[
          { icon: "barbell-outline", label: "Training", tone: statuses.training.tone, value: statuses.training.value },
          { icon: "restaurant-outline", label: "Fuel", tone: statuses.fuel.tone, value: statuses.fuel.value },
          { icon: "scale-outline", label: "Weight", tone: statuses.weight.tone, value: statuses.weight.value },
          { icon: "shield-checkmark-outline", label: "Readiness", tone: statuses.readiness.tone, value: statuses.readiness.value }
        ]}
        testID="today-key-status-row"
      />
    </View>
  );
}

function TodayNextActionCard({
  busy,
  nextAction,
  resolveAction
}: {
  busy: boolean;
  nextAction: TodayDashboardVisual["nextAction"];
  resolveAction: TodayActionResolver;
}) {
  const handler = resolveAction(nextAction.action);
  return (
    <EngineCard>
      <View style={{ gap: spacing.md }} testID="today-next-action-card">
        <View style={{ alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "space-between" }}>
          <View style={{ flexBasis: 250, flexGrow: 1, gap: spacing.xs, minWidth: 0 }}>
            <Text style={{ color: colors.canvas, fontSize: 18, fontWeight: "900", lineHeight: 23 }}>{nextAction.title}</Text>
            <Text style={screenStyles.body}>{nextAction.sentence}</Text>
          </View>
          <TodayTonePill label={nextAction.label} tone={nextAction.tone} />
        </View>
        <TodayButton disabled={busy || nextAction.action.disabled || !handler} icon={actionIcon(nextAction.action)} label={nextAction.action.label} onPress={handler} primary tone={todayActionTone(nextAction.action)} />
      </View>
    </EngineCard>
  );
}

function TrainingTodayCard({
  busy,
  model,
  resolveAction
}: {
  busy: boolean;
  model: TodayDashboardVisual["trainingToday"];
  resolveAction: TodayActionResolver;
}) {
  const handler = resolveAction(model.action);
  return (
    <PremiumCard accent={model.tone} density="spacious" testID="today-training-card">
      <View style={{ gap: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
            <Text style={{ color: colorForTone(model.tone), fontSize: 12, fontWeight: "900", lineHeight: 16, textTransform: "uppercase" }}>
              Training Today
            </Text>
            <Text adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={2} style={{ color: colors.canvas, fontSize: 25, fontWeight: "900", lineHeight: 31 }}>
              {model.title}
            </Text>
            <Text numberOfLines={2} style={screenStyles.body}>{model.sentence}</Text>
          </View>
          <Text style={{ color: colors.wrap, fontSize: 12, fontWeight: "800", lineHeight: 16 }}>
            {model.durationLabel} / {model.intensityLabel}
          </Text>
        </View>
        <View style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "space-between" }}>
          <TodayButton disabled={busy || !handler || model.disabled || model.action.disabled} icon={actionIcon(model.action)} label={model.action.label} onPress={handler} tone={todayActionTone(model.action)} />
        </View>
      </View>
    </PremiumCard>
  );
}

function FuelTodayCard({
  busy,
  model,
  resolveAction
}: {
  busy: boolean;
  model: TodayDashboardVisual["fuelToday"];
  resolveAction: TodayActionResolver;
}) {
  const cardAction: TodayActionVisual =
    model.action.kind === "open_fuel"
      ? { icon: "restaurant-outline", kind: "log_food", label: "Log food", tone: "orange" }
      : model.action;
  const handler = resolveAction(cardAction);
  return (
    <PremiumCard accent={model.tone} density="regular" testID="today-fuel-card">
      <View style={{ gap: spacing.md }}>
        <View style={{ alignItems: "flex-start", flexDirection: "row", gap: spacing.md }}>
          <View
            style={{
              alignItems: "center",
              backgroundColor: todayTint(model.tone, "14"),
              borderColor: todayTint(model.tone, "42"),
              borderRadius: radii.pill,
              borderWidth: 1,
              height: 46,
              justifyContent: "center",
              width: 46
            }}
          >
            <Ionicons color={colorForTone(model.tone)} name="restaurant-outline" size={22} />
          </View>
          <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
            <Text style={{ color: colorForTone(model.tone), fontSize: 12, fontWeight: "900", lineHeight: 16, textTransform: "uppercase" }}>
              Fuel Status
            </Text>
            <Text style={{ color: colors.canvas, fontSize: 21, fontWeight: "900", lineHeight: 26 }}>Fuel Today</Text>
            <Text numberOfLines={2} style={screenStyles.body}>{model.note}</Text>
          </View>
        </View>
        <View style={{ backgroundColor: todayPalette.cardLine, height: 1 }} />
        <View style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "space-between" }}>
          <Text numberOfLines={3} style={[screenStyles.subtle, { flex: 1, minWidth: 180 }]}>{model.why}</Text>
          <TodayButton disabled={busy || cardAction.disabled || !handler} icon={actionIcon(cardAction)} label={cardAction.label} onPress={handler} tone={cardAction.tone} />
        </View>
      </View>
    </PremiumCard>
  );
}

function ThisWeekCard({
  busy,
  model,
  onOpenPlan
}: {
  busy: boolean;
  model: WeekTodayModel;
  onOpenPlan?: (() => void) | undefined;
}) {
  return (
    <PremiumCard accent="green" density="regular" testID="today-week-card">
      <View style={{ gap: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
            <Text style={{ color: todayPalette.toneGreen, fontSize: 12, fontWeight: "900", lineHeight: 16, textTransform: "uppercase" }}>
              This Week
            </Text>
            <Text style={{ color: colors.canvas, fontSize: 21, fontWeight: "900", lineHeight: 26 }}>This Week</Text>
            <Text numberOfLines={2} style={screenStyles.body}>{model.sentence}</Text>
          </View>
          <Text style={{ color: colors.wrap, fontSize: 12, fontWeight: "800", lineHeight: 16 }}>{model.phaseLabel}</Text>
        </View>
        <View style={{ gap: 0 }}>
        {model.sessions.length > 0 ? model.sessions.map((session) => (
          <View
            key={`today-week-session:${session.id}`}
            style={{
              borderBottomColor: todayPalette.cardLine,
              borderBottomWidth: 1,
              gap: spacing.xs,
              paddingVertical: spacing.sm
            }}
          >
            <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }}>
              <Text numberOfLines={1} style={{ color: colors.canvas, flex: 1, fontSize: 14, fontWeight: "900", lineHeight: 19 }}>{session.label} - {session.title}</Text>
              <Text numberOfLines={1} style={{ color: colorForTone(session.tone), fontSize: 12, fontWeight: "900", lineHeight: 16 }}>{session.meta}</Text>
            </View>
          </View>
        )) : (
          <Text style={screenStyles.subtle}>No next session is pinned here. Open Plan when the week changes.</Text>
        )}
        </View>
        <TodayButton disabled={busy || !onOpenPlan} icon="calendar-outline" label="View Plan" onPress={onOpenPlan} tone="green" />
      </View>
    </PremiumCard>
  );
}

function TodayLoadGraphCard({ dashboard }: { dashboard: TodayDashboardVisual }) {
  return (
    <PremiumCard accent="blue" density="regular" testID="today-load-graph-card">
      <View style={{ gap: spacing.md }}>
        <WorkoutLogContributionGrid testID="today-workout-log-graph" visual={dashboard.workoutLog} />
        <Text style={screenStyles.subtle}>Only completed workout logs fill the grid. Missing days stay unknown until you log them.</Text>
      </View>
    </PremiumCard>
  );
}

function QuickLogsCard({
  busy,
  onLogFood,
  onOpenQuickCheck
}: {
  busy: boolean;
  onLogFood?: (() => void) | undefined;
  onOpenQuickCheck: (focus: TodayQuickCheckFocus, placement: TodayQuickCheckPlacement) => void;
}) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.md }} testID="today-quick-logs">
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.sectionTitle}>Quick Logs</Text>
          <Text style={screenStyles.subtle}>Add only what changed. Skip anything you don't know.</Text>
          <Text style={screenStyles.subtle}>Missing info stays unknown.</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <TodayButton disabled={busy} icon="pulse-outline" label="Readiness" onPress={() => onOpenQuickCheck("readiness", "manual")} tone="blue" />
          <TodayButton disabled={busy} icon="scale-outline" label="Weight" onPress={() => onOpenQuickCheck("body_mass", "manual")} tone="gold" />
          <TodayButton disabled={busy} icon="water-outline" label="Water" onPress={() => onOpenQuickCheck("hydration", "manual")} tone="blue" />
          <TodayButton disabled={busy || !onLogFood} icon="restaurant-outline" label="Food" onPress={onLogFood} tone="orange" />
        </View>
      </View>
    </EngineCard>
  );
}

function TodayDetails({
  cycleContext,
  cycleTrackingStatus,
  dashboard,
  hasWarning,
  onOpenBodyMass,
  onOpenReadiness,
  recentLogs,
  showCycleImpact
}: {
  cycleContext: CycleViewModel | null;
  cycleTrackingStatus: TodayScreenProps["cycleTrackingStatus"];
  dashboard: TodayDashboardVisual;
  hasWarning: boolean;
  onOpenBodyMass: () => void;
  onOpenReadiness: () => void;
  recentLogs: RecentLogsViewModel;
  showCycleImpact: boolean;
}) {
  const hasBodyMassLine = dashboard.bodyMass.points.length >= 2;
  const cycleVisible = showCycleImpact && (cycleContext || cycleTrackingStatus === "undecided");
  return (
    <View style={{ gap: spacing.sm }} testID="today-detail-rows">
      <TodayDetailRow defaultOpen={hasWarning} icon="pulse-outline" summary={dashboard.readiness.statusLabel} testID="today-readiness-details" title="Readiness details" tone={dashboard.readiness.tone}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {dashboard.readiness.metrics.map((metric) => (
            <TodayStatusTile key={`today-readiness-metric:${metric.label}`} label={metric.label} tone={metric.tone} value={metric.value} />
          ))}
        </View>
        <Text style={screenStyles.subtle}>{plainTodayCopy(recentLogs.readinessToday.why)}</Text>
        {dashboard.readiness.emptyActionLabel ? <TodayButton icon="checkmark-circle-outline" label="Readiness" onPress={onOpenReadiness} tone="blue" /> : null}
      </TodayDetailRow>

      <TodayDetailRow icon="bar-chart-outline" summary={`Load trend: ${dashboard.loadStateLabel}`} testID="today-training-load-details" title="Training load" tone={dashboard.loadStateLabel === "High" ? "red" : dashboard.loadStateLabel === "Watch" ? "orange" : "blue"}>
        <WeeklyLoadBars bars={dashboard.weeklyLoad} />
        <Text style={screenStyles.subtle}>Use this only when you want the weekly context behind today's call.</Text>
      </TodayDetailRow>

      <TodayDetailRow icon="scale-outline" summary={`${dashboard.bodyMass.currentLabel} - ${dashboard.bodyMass.deltaLabel}`} testID="today-weight-trend-details" title="Weight trend" tone={dashboard.bodyMass.tone}>
        {hasBodyMassLine ? (
          <TrendLineChart accent={accentForTone(dashboard.bodyMass.tone)} height={82} points={dashboard.bodyMass.points} />
        ) : (
          <Text style={screenStyles.subtle}>{plainTodayCopy(dashboard.bodyMass.emptyLabel)}</Text>
        )}
        <TodayButton icon="scale-outline" label={/no body (mass|weight)|unknown/i.test(dashboard.bodyMass.currentLabel) ? "Weight" : "Weight"} onPress={onOpenBodyMass} tone="gold" />
      </TodayDetailRow>

      <TodayDetailRow icon="list-outline" summary={recentLogs.today.length > 0 ? `${recentLogs.today.length} today` : "Nothing extra logged"} testID="today-recent-logs-details" title="Recent logs" tone="muted">
        {logRows(recentLogs).map((row, index) => <Text key={`today-log-row:${index}`} style={screenStyles.subtle}>{row}</Text>)}
      </TodayDetailRow>

      {cycleVisible ? (
        <TodayDetailRow defaultOpen={hasWarning && showCycleImpact} icon="refresh-outline" summary={cycleContext ? plainTodayCopy(cycleContext.trainingAdjustment) : "Optional and private"} testID="today-cycle-context-details" title="Cycle context" tone={cycleContext?.symptomBurden === "high" ? "orange" : "blue"}>
          <CycleContextCard cycleContext={cycleContext} framed={false} trackingStatus={cycleTrackingStatus} />
        </TodayDetailRow>
      ) : null}
    </View>
  );
}

function TodayDetailsDisclosure({
  busy,
  children,
  cycleQuickLogEnabled,
  cycleSymptomOptions,
  onLogFood,
  onOpenQuickCheck,
  quickLogs,
  keyStatuses,
  nextAction,
  resolveAction
}: React.PropsWithChildren<{
  busy: boolean;
  cycleQuickLogEnabled: boolean;
  cycleSymptomOptions: readonly CycleSymptom[];
  onLogFood?: (() => void) | undefined;
  onOpenQuickCheck: (focus: TodayQuickCheckFocus, placement: TodayQuickCheckPlacement) => void;
  quickLogs: QuickLogActions;
  keyStatuses: TodayDashboardVisual["keyStatuses"];
  nextAction: TodayDashboardVisual["nextAction"];
  resolveAction: TodayActionResolver;
}>) {
  const [open, setOpen] = React.useState(false);
  return (
    <View style={{ gap: spacing.sm }}>
      <EngineCard>
        <View style={{ gap: spacing.md }}>
          <Pressable
            accessibilityLabel={open ? "Hide More today" : "More today"}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen((value) => !value)}
            style={{ alignItems: "center", flexDirection: "row", gap: spacing.md, minHeight: 54 }}
            testID="today-details-toggle"
          >
            <View
              style={{
                alignItems: "center",
                backgroundColor: todayTint("blue", "16"),
                borderColor: todayTint("blue", "42"),
                borderRadius: radii.pill,
                borderWidth: 1,
                height: 38,
                justifyContent: "center",
                width: 38
              }}
            >
              <Ionicons color={todayPalette.toneBlue} name="list-outline" size={18} />
            </View>
            <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
              <Text style={{ color: colors.canvas, fontSize: 15, fontWeight: "900", lineHeight: 20 }}>More today</Text>
              <Text numberOfLines={1} style={{ color: colors.mutedText, fontSize: 12, fontWeight: "700", lineHeight: 16 }}>
                Status tiles, next action, quick logs, and recent logs.
              </Text>
            </View>
            <Ionicons color={colors.wrap} name={open ? "chevron-up" : "chevron-down"} size={18} />
          </Pressable>
        </View>
      </EngineCard>
      {open ? (
        <View style={{ gap: spacing.sm }} testID="today-details-section">
          <KeyStatusRow statuses={keyStatuses} />
          <TodayNextActionCard
            busy={busy}
            nextAction={nextAction}
            resolveAction={resolveAction}
          />
          <QuickLogsCard busy={busy} onLogFood={onLogFood} onOpenQuickCheck={onOpenQuickCheck} />
          {cycleQuickLogEnabled ? <CycleLogCard actions={quickLogs} busy={busy} cycleSymptomOptions={cycleSymptomOptions} /> : null}
          {children}
        </View>
      ) : null}
    </View>
  );
}

export function TodayScreen({
  asOfDate,
  viewModel,
  fuelViewModel,
  planViewModel,
  trainViewModel,
  recentLogs,
  cycleContext,
  quickLogs,
  cycleQuickLogEnabled,
  cycleTrackingStatus,
  cycleSymptomOptions,
  busy,
  message,
  preferredUnits = "metric",
  onOpenFuel,
  onOpenFuelLog,
  onOpenFuelSafety,
  onOpenPlan,
  onOpenTrain,
  onOpenTrainWorkout
}: TodayScreenProps) {
  const [quickCheck, setQuickCheck] = React.useState<{ focus: TodayQuickCheckFocus; placement: TodayQuickCheckPlacement } | null>(null);
  const cycleText = [
    viewModel.cycleContext ?? "",
    viewModel.whatChanged,
    viewModel.trainingPriority,
    viewModel.fuelPriority,
    viewModel.why,
    ...viewModel.executionGuidance,
    ...viewModel.riskSummary
  ].join(" ");
  const showCycleImpact = Boolean(viewModel.cycleContext && /cycle|symptom|cramp|period|flow/i.test(cycleText));
  const openQuickCheck = (focus: TodayQuickCheckFocus, placement: TodayQuickCheckPlacement = "top") => {
    setQuickCheck({ focus, placement });
  };
  const closeQuickCheck = () => {
    setQuickCheck(null);
  };
  const dashboard = buildTodayDashboardVisual({
    asOfDate,
    fuel: fuelViewModel,
    plan: planViewModel,
    recentLogs,
    today: viewModel,
    train: trainViewModel
  });
  const { checkIn, fuelToday, keyStatuses, nextAction, trainingToday } = dashboard;
  const weekToday = buildWeekModel(planViewModel, asOfDate);
  const foodAction = onOpenFuelLog ?? onOpenFuel;
  const resolveAction: TodayActionResolver = (action) => {
    switch (action.kind) {
      case "open_quick_check":
        return () => openQuickCheck(action.quickCheckFocus ?? "readiness", "top");
      case "log_food":
        return foodAction;
      case "log_hydration":
        return () => openQuickCheck("hydration", "top");
      case "open_fuel":
        return onOpenFuel ?? onOpenFuelLog;
      case "open_fuel_safety":
        return onOpenFuelSafety ?? onOpenFuel ?? onOpenFuelLog;
      case "open_plan":
        return onOpenPlan;
      case "open_train":
        return onOpenTrain;
      case "open_train_workout":
        return onOpenTrainWorkout ?? onOpenTrain;
      default:
        return undefined;
    }
  };
  return (
    <>
      <LuminousScreen accent="blue" testID="today-screen">
        <ScreenHeader {...tabHeroHeaders.today} />
        <TodayCheckInCard
          busy={busy}
          checkIn={checkIn}
          resolveAction={resolveAction}
        />
        <TrainingTodayCard busy={busy} model={trainingToday} resolveAction={resolveAction} />
        <FuelTodayCard busy={busy} model={fuelToday} resolveAction={resolveAction} />
        <ThisWeekCard busy={busy} model={weekToday} onOpenPlan={onOpenPlan} />
        <TodayLoadGraphCard dashboard={dashboard} />
        <TodayDetailsDisclosure
          busy={busy}
          cycleQuickLogEnabled={cycleQuickLogEnabled}
          cycleSymptomOptions={cycleSymptomOptions}
          keyStatuses={keyStatuses}
          nextAction={nextAction}
          onLogFood={foodAction}
          onOpenQuickCheck={openQuickCheck}
          quickLogs={quickLogs}
          resolveAction={resolveAction}
        >
          <TodayDetails
            cycleContext={cycleContext}
            cycleTrackingStatus={cycleTrackingStatus}
            dashboard={dashboard}
            hasWarning={false}
            onOpenBodyMass={() => openQuickCheck("body_mass", "body_mass_card")}
            onOpenReadiness={() => openQuickCheck("readiness", "readiness_card")}
            recentLogs={recentLogs}
            showCycleImpact={showCycleImpact}
          />
        </TodayDetailsDisclosure>
        {message ? <Text style={[screenStyles.subtle, { color: todayPalette.toneOrange }]} testID="today-app-note">App note: {message}. Existing plan stays visible.</Text> : null}
      </LuminousScreen>
      <TodayQuickCheckModal
        busy={busy}
        onClose={closeQuickCheck}
        preferredUnits={preferredUnits}
        quickCheck={quickCheck}
        quickLogs={quickLogs}
        recentLogs={recentLogs}
      />
    </>
  );
}
