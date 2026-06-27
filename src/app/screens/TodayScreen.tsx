import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, useWindowDimensions, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CycleSymptom, CycleViewModel, FuelViewModel, PlanViewModel, RecentLogsViewModel, TodayViewModel, TrainViewModel } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
import { LuminousScreen, ScreenHeader, useLuminousScreenTheme } from "../../design/components/LuminousScreen";
import { TrendLineChart, WeeklyLoadBars } from "../../design/components/PerformanceVisuals";
import { glassStyles } from "../../design/glass";
import { colors, radii, spacing } from "../../design/theme";
import { buildTodayDashboardVisual, type TodayDashboardVisual, type VisualTone } from "../../engine/presentation/dashboardVisualData";
import { plainFuelCopy } from "../../engine/presentation/fuelCopy";
import { plainIntensityLabel, plainWorkoutTitle } from "../../engine/presentation/trainingCopy";
import type { QuickLogActions } from "../../hooks/useQuickLogs";
import { CycleContextCard } from "./cycle/CycleContextCard";
import { BodyMassLogCard, HydrationLogCard, ReadinessCheckInCard } from "./logging/LogCards";
import { screenStyles } from "./screenStyles";
import { tabHeroHeaders, tabScreenBackgrounds } from "./tabHeroConfig";

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
type TodayQuickCheckFocus = "readiness" | "body_mass" | "hydration";
type TodayQuickCheckPlacement = "top" | "readiness_card" | "body_mass_card" | "hydration_card" | "manual";
type TodayStatusLabel = "Ready" | "Check in" | "Fuel first" | "Easy day" | "Recovery day";
type ReadinessValue = "Good" | "Caution" | "Low";
type WeightValue = "On pace" | "Tight" | "Behind" | "No active cut" | "Paused";
type FuelValue = "Eat before" | "Normal" | "Log if useful" | "Hydrate first";
type TrainingValue = "Start" | "Easy" | "Recovery" | "No workout";
type TodayFoodLogStatus = FuelViewModel["foodLogStatus"]["status"];

interface PlainStatus<TValue extends string> {
  tone: VisualTone;
  value: TValue;
}

interface TodayCheckInModel {
  focus: TodayQuickCheckFocus;
  sentence: string;
  status: TodayStatusLabel;
  tone: VisualTone;
}

interface TrainingTodayModel {
  buttonLabel: string;
  disabled: boolean;
  durationLabel: string;
  intensityLabel: string;
  sentence: string;
  title: string;
  tone: VisualTone;
}

interface FuelTodayModel {
  note: string;
  status: string;
  tone: VisualTone;
  why: string;
}

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
  actionBorder: "rgba(142, 205, 224, 0.48)",
  actionFill: "rgba(43, 137, 166, 0.34)",
  actionFillPressed: "rgba(52, 158, 190, 0.44)",
  actionShadow: "rgba(24, 102, 137, 0.26)",
  cardLine: "rgba(172, 215, 231, 0.16)",
  controlFill: "rgba(224, 244, 252, 0.062)",
  controlFillPressed: "rgba(224, 244, 252, 0.1)",
  controlLine: "rgba(172, 215, 231, 0.18)",
  textBody: "#D7E7F4",
  textMuted: "#A9BDD0",
  textPrimary: "#F6FBFF",
  toneBlue: "#8ECDE0",
  toneGold: "#D0BC78",
  toneGreen: "#8BC6A7",
  toneMuted: "#A9BDD0",
  toneOrange: "#C9956D",
  tonePurple: "#B0A3D4",
  toneRed: "#D87B88"
} as const;

const advisoryFoodLogStatuses = new Set<TodayFoodLogStatus>([
  "no_log",
  "quick_fuel_check_only",
  "not_tracking_today",
  "partial_day",
  "likely_partial",
  "auto_closed_incomplete"
]);

function plainTodayCopy(value: string): string {
  return value
    .replace(/\bGenerated support\b/g, "App work")
    .replace(/\bgenerated support\b/gi, "app work")
    .replace(/\bgenerated sessions\b/gi, "app sessions")
    .replace(/\bgenerated session\b/gi, "app session")
    .replace(/\bgenerated training\b/gi, "app training")
    .replace(/\bprotected anchors?\b/gi, "boxing sessions you added")
    .replace(/\bprotected sparring\b/gi, "fixed sparring")
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

function sentenceCase(value: string): string {
  const copy = plainTodayCopy(value).trim();
  return copy.length > 0 ? `${copy.slice(0, 1).toUpperCase()}${copy.slice(1)}` : "Unknown";
}

function lowerFirst(value: string): string {
  const copy = value.trim();
  return copy.length > 0 ? `${copy.slice(0, 1).toLowerCase()}${copy.slice(1)}` : copy;
}

function toneForIntensity(intensity: string | undefined): VisualTone {
  if (intensity === "hard" || intensity === "max") {
    return "orange";
  }
  if (intensity === "easy" || intensity === "recovery") {
    return "green";
  }
  return "purple";
}

export const handledTodaySecondaryActions: Record<TodaySecondaryAction, true> = {
  log_food: true,
  log_readiness: true,
  mark_food_not_tracking: true,
  start_without_logging: true
};

function TodayQuickCheckSection({
  busy,
  framed = true,
  focus,
  includeOtherLogs = true,
  onClose,
  preferredUnits = "metric",
  quickLogs,
  recentLogs
}: {
  busy: boolean;
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
    body_mass: <BodyMassLogCard actions={quickLogs} busy={busy} forceOpen={focus === "body_mass"} framed={false} preferredUnits={preferredUnits} status={recentLogs.bodyMassToday} />,
    hydration: <HydrationLogCard actions={quickLogs} busy={busy} framed={false} status={recentLogs.hydrationToday} />,
    readiness: <ReadinessCheckInCard actions={quickLogs} busy={busy} forceOpen={focus === "readiness"} framed={false} status={recentLogs.readinessToday} />
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
      accessibilityLabel="Quick check wizard"
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
  const modalPaddingTop = Math.max(insets.top + spacing.md, spacing.lg);
  const availablePanelHeight = Math.max(320, height - modalPaddingTop - modalPaddingBottom);
  const maxPanelHeight = Math.min(availablePanelHeight, 820);
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
          justifyContent: "flex-start",
          paddingBottom: modalPaddingBottom,
          paddingHorizontal: spacing.lg,
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
              padding: compact ? spacing.sm : spacing.lg,
              width: "100%"
            },
            modalShadowStyle
          ]}
          testID="today-quick-check-modal"
        >
          <ScrollView
            contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.sm }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TodayQuickCheckSection
              busy={busy}
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
        minHeight: 30,
        paddingHorizontal: spacing.md,
        paddingVertical: 4
      }}
    >
      <Text numberOfLines={1} style={{ color: colors.wrap, fontSize: 12, fontWeight: "900", lineHeight: 16 }}>
        {label}
      </Text>
    </View>
  );
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
          flexBasis: primary ? 230 : 130,
          flexDirection: "row",
          flexGrow: primary ? 1.2 : 1,
          gap: spacing.sm,
          justifyContent: "center",
          minHeight: primary ? 52 : 46,
          opacity: disabled ? 0.56 : 1,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm
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
      <Ionicons color={disabled ? todayPalette.textMuted : primary ? todayPalette.textPrimary : toneColor} name={icon} size={18} />
      <Text style={{ color: primary ? todayPalette.textPrimary : todayPalette.textBody, fontSize: 15, fontWeight: "800", lineHeight: 20, textAlign: "center" }}>
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

function TodaySectionCard({
  action,
  children,
  label,
  sentence,
  testID,
  title,
  tone = "blue"
}: React.PropsWithChildren<{
  action?: React.ReactNode;
  label?: string | undefined;
  sentence?: string | undefined;
  testID?: string | undefined;
  title: string;
  tone?: VisualTone | undefined;
}>) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.md }} testID={testID}>
        <View style={{ alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "space-between" }}>
          <View style={{ flexBasis: 250, flexGrow: 1, gap: spacing.xs, minWidth: 0 }}>
            <Text style={{ color: colors.canvas, fontSize: 19, fontWeight: "900", lineHeight: 24 }}>{title}</Text>
            {sentence ? <Text style={screenStyles.body}>{sentence}</Text> : null}
          </View>
          {label ? <TodayTonePill label={label} tone={tone} /> : null}
        </View>
        {children}
        {action}
      </View>
    </EngineCard>
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

function readinessStatus(dashboard: TodayDashboardVisual, recentLogs: RecentLogsViewModel): PlainStatus<ReadinessValue> {
  if (!recentLogs.readinessToday.loggedToday || dashboard.readiness.score === null) {
    return { tone: "orange", value: "Caution" };
  }
  if (dashboard.readiness.score >= 72) {
    return { tone: "green", value: "Good" };
  }
  if (dashboard.readiness.score >= 55) {
    return { tone: "orange", value: "Caution" };
  }
  return { tone: "red", value: "Low" };
}

function weightStatus(fuel: FuelViewModel | undefined): PlainStatus<WeightValue> {
  if (
    fuel?.underFuelingRisk ||
    fuel?.nutritionSafetyReview.required ||
    (fuel?.activeNutritionSafetyReviews.length ?? 0) > 0 ||
    (fuel?.nutritionReviewHistory.activeReviewCount ?? 0) > 0 ||
    (fuel?.riskSummary.length ?? 0) > 0 ||
    (fuel?.weightClassStatus.safetyFlags.length ?? 0) > 0
  ) {
    return { tone: "red", value: "Paused" };
  }
  switch (fuel?.weightClassStatus.status) {
    case "ahead":
    case "on_track":
      return { tone: "green", value: "On pace" };
    case "behind":
      return { tone: "orange", value: "Behind" };
    case "blocked":
    case "needs_review":
    case "unsafe":
      return { tone: "red", value: "Paused" };
    case "cycle_noisy":
    case "unknown":
      return { tone: "orange", value: "Tight" };
    case "no_active_weight_target":
    default:
      return { tone: "muted", value: "No active cut" };
  }
}

function fuelStatus(dashboard: TodayDashboardVisual, fuel: FuelViewModel | undefined): PlainStatus<FuelValue> {
  const hydration = dashboard.fuel.find((item) => /hydration/i.test(item.label));
  const carbs = dashboard.fuel.find((item) => /carb/i.test(item.label));
  const highFuelNeed = fuel?.trainingDemandHandoff.todayTrainingDemand === "high";
  if (!fuel || fuel.foodLogStatus.entryCount === 0 || advisoryFoodLogStatuses.has(fuel.foodLogStatus.status)) {
    return { tone: "muted", value: "Log if useful" };
  }
  if (hydration && hydration.ratio > 0 && hydration.ratio < 0.55) {
    return { tone: "blue", value: "Hydrate first" };
  }
  if (highFuelNeed || (carbs && carbs.ratio > 0 && carbs.ratio < 0.55)) {
    return { tone: "orange", value: "Eat before" };
  }
  return { tone: "green", value: "Normal" };
}

function trainingStatus(train: TrainViewModel | undefined): PlainStatus<TrainingValue> {
  const session = train?.todayGeneratedSessions[0] ?? train?.nextGeneratedSession;
  const intensity = train?.sessionCards[0]?.intensity ?? session?.intensity;
  if (!session && (train?.sessionCards.length ?? 0) === 0) {
    return { tone: "muted", value: "No workout" };
  }
  if (intensity === "recovery") {
    return { tone: "green", value: "Recovery" };
  }
  if (intensity === "easy") {
    return { tone: "green", value: "Easy" };
  }
  return { tone: "purple", value: "Start" };
}

function buildCheckInModel(input: {
  fuel: PlainStatus<FuelValue>;
  readinessLogged: boolean;
  readiness: PlainStatus<ReadinessValue>;
  training: PlainStatus<TrainingValue>;
}): TodayCheckInModel {
  if (!input.readinessLogged) {
    return {
      focus: "readiness",
      sentence: "Log today's readiness first. Fuel, water, and body weight can wait unless they help you.",
      status: "Check in",
      tone: "blue"
    };
  }
  if (input.readiness.value === "Low") {
    return {
      focus: "readiness",
      sentence: "Readiness is low, so keep the work controlled and stop if symptoms show up.",
      status: input.training.value === "Recovery" ? "Recovery day" : "Easy day",
      tone: "orange"
    };
  }
  if (input.fuel.value === "Eat before" || input.fuel.value === "Hydrate first") {
    return {
      focus: input.fuel.value === "Hydrate first" ? "hydration" : "readiness",
      sentence: input.fuel.value === "Hydrate first"
        ? "Water matters before today's work. Do not turn this into a low-fluid session."
        : "Food matters before today's work. Do not turn this into a low-energy session.",
      status: "Fuel first",
      tone: "orange"
    };
  }
  if (input.readiness.value === "Caution") {
    return {
      focus: "readiness",
      sentence: "Give CornerIQ a quick update before it points you into the day.",
      status: "Check in",
      tone: "blue"
    };
  }
  if (input.training.value === "Recovery") {
    return {
      focus: "readiness",
      sentence: "Today is about getting your body back under you.",
      status: "Recovery day",
      tone: "green"
    };
  }
  if (input.training.value === "Easy") {
    return {
      focus: "readiness",
      sentence: "Keep today controlled. The goal is to leave better than you started.",
      status: "Easy day",
      tone: "green"
    };
  }
  return {
    focus: "readiness",
    sentence: "You're good to start. Check in first if anything feels different today.",
    status: "Ready",
    tone: "green"
  };
}

function trainingHumanLine(input: {
  card: TrainViewModel["sessionCards"][number] | null;
  generated: NonNullable<TrainViewModel["nextGeneratedSession"]> | null;
  readinessLogged: boolean;
  session: TrainViewModel["detailedTodaySessions"][number]["detail"] | null;
  viewModel: TrainViewModel | undefined;
}): string {
  const intensity = input.session?.intensity ?? input.card?.intensity ?? input.generated?.intensity;
  const source = firstSentence(
    input.session?.whyThisMattersForBoxing ?? input.card?.why ?? input.viewModel?.todayRole.summary ?? input.viewModel?.todaySummary,
    ""
  );
  const lowerSource = source.toLowerCase();
  if (!input.session && !input.card && !input.generated) {
    return "No app workout is set for today. Log real boxing if training changes.";
  }
  if (!input.readinessLogged) {
    return "Today's workout is ready. Log readiness first, then start if the warm-up feels right.";
  }
  if (intensity === "recovery" || intensity === "easy") {
    return "Today is a lighter session. Move well and leave some gas in the tank.";
  }
  if (/jab|footwork|technical|skill|timing|rhythm/.test(lowerSource)) {
    return "Today is about keeping the jab sharp and getting out clean.";
  }
  if (/condition|aerobic|roadwork|capacity|gas/.test(lowerSource)) {
    return "Use this session to build conditioning without losing your shape.";
  }
  if (/pressure|round|tempo/.test(lowerSource)) {
    return "The work today is controlled pressure, not rushing your feet.";
  }
  return "Use the workout to stay sharp without adding extra fatigue.";
}

function buildTrainingTodayModel(train: TrainViewModel | undefined, readinessLogged: boolean, hasStartHandler: boolean): TrainingTodayModel {
  const session = train?.detailedTodaySessions.find((item) => item.detail !== null)?.detail ?? null;
  const card = train?.sessionCards[0] ?? null;
  const generated = train?.todayGeneratedSessions[0] ?? train?.nextGeneratedSession ?? null;
  const title = session
    ? plainWorkoutTitle(session.title, session.family)
    : card
      ? plainWorkoutTitle(card.title)
      : generated
        ? plainWorkoutTitle(generated.title, generated.family)
        : "No workout set";
  const durationMinutes = session?.durationMinutes ?? card?.durationMinutes ?? generated?.durationMinutes ?? 0;
  const intensity = session?.intensity ?? card?.intensity ?? generated?.intensity ?? "moderate";
  const hasWorkout = Boolean(session || card || generated);
  const canStartPlayableSession = Boolean(session && hasStartHandler && readinessLogged);
  return {
    buttonLabel: canStartPlayableSession ? "Start workout" : hasWorkout ? "View workout" : "Open Train",
    disabled: false,
    durationLabel: durationMinutes > 0 ? `${durationMinutes} min` : "Duration TBD",
    intensityLabel: sentenceCase(plainIntensityLabel(intensity)),
    sentence: trainingHumanLine({ card, generated, readinessLogged, session, viewModel: train }),
    title,
    tone: toneForIntensity(intensity)
  };
}

function buildFuelTodayModel(input: {
  fuel: FuelViewModel | undefined;
  fuelStatus: PlainStatus<FuelValue>;
  weightStatus: PlainStatus<WeightValue>;
}): FuelTodayModel {
  if (input.weightStatus.value === "Paused" || fuelWarningIsActive(input.fuel)) {
    const reviewRequired = input.fuel?.nutritionSafetyReview.required || (input.fuel?.nutritionReviewHistory.activeReviewCount ?? 0) > 0;
    return {
      note: reviewRequired ? "Fuel guidance is active. Eat and hydrate normally." : "Weight pressure stays off today. Eat and hydrate normally.",
      status: reviewRequired ? "Guidance" : "Weight pressure off",
      tone: "orange",
      why: "Fuel and weight notes do not block the workout."
    };
  }
  if (input.fuelStatus.value === "Hydrate first") {
    return {
      note: "Hydration matters more than extra restriction today.",
      status: "Hydrate first",
      tone: "blue",
      why: "Fluids help the session stay controlled and safer."
    };
  }
  if (input.fuelStatus.value === "Eat before") {
    return {
      note: "Food matters before today's work. Get some carbs in before you train.",
      status: "Fuel first",
      tone: "orange",
      why: "The day asks for work that should not become a low-energy grind."
    };
  }
  if (input.weightStatus.value === "Behind" || input.weightStatus.value === "Tight") {
    return {
      note: "You're tight on the cut, but don't make today a fasted grind.",
      status: input.weightStatus.value,
      tone: "orange",
      why: "The scale matters, but performance and recovery still come first."
    };
  }
  if (input.weightStatus.value === "On pace") {
    return {
      note: "You're on pace. Keep meals steady and train normally.",
      status: "On pace",
      tone: "green",
      why: "No extra restriction is needed for today's plan."
    };
  }
  return {
    note: input.fuel ? firstSentence(plainFuelCopy(input.fuel.commandCenter.primaryFuelAction), "Normal meals are enough today.") : "Normal meals are enough today. No need to overthink it.",
    status: "Normal",
    tone: "green",
    why: "Food and water only need attention if something changed."
  };
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

function fuelWarningIsActive(fuel: FuelViewModel | undefined): boolean {
  return Boolean(
    fuel?.nutritionSafetyReview.required ||
      (fuel?.activeNutritionSafetyReviews.length ?? 0) > 0 ||
      (fuel?.nutritionReviewHistory.activeReviewCount ?? 0) > 0 ||
      fuel?.underFuelingRisk ||
      (fuel?.riskSummary.length ?? 0) > 0 ||
      (fuel?.weightClassStatus.safetyFlags.length ?? 0) > 0
  );
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
  onCheckIn,
  onLogFood,
  onLogHydration,
  onStartWorkout,
  workoutLabel
}: {
  busy: boolean;
  checkIn: TodayCheckInModel;
  onCheckIn: () => void;
  onLogFood?: (() => void) | undefined;
  onLogHydration: () => void;
  onStartWorkout?: (() => void) | undefined;
  workoutLabel: string;
}) {
  const primaryAction =
    checkIn.status === "Fuel first" && checkIn.focus === "hydration"
      ? { icon: "water-outline" as const, label: "Add water", onPress: onLogHydration, tone: "blue" as const }
      : checkIn.status === "Fuel first" && onLogFood
        ? { icon: "restaurant-outline" as const, label: "Log food", onPress: onLogFood, tone: "orange" as const }
        : checkIn.status === "Ready" && onStartWorkout
          ? {
              icon: workoutLabel === "Start workout" ? "play-outline" as const : "barbell-outline" as const,
              label: workoutLabel,
              onPress: onStartWorkout,
              tone: "purple" as const
            }
          : { icon: "checkmark-circle-outline" as const, label: "Check in", onPress: onCheckIn, tone: "blue" as const };
  const secondaryActions = [
    primaryAction.label !== "Check in" ? { icon: "checkmark-circle-outline" as const, label: "Check in", onPress: onCheckIn, tone: "blue" as const } : null,
    primaryAction.label !== "Log food" ? { icon: "restaurant-outline" as const, label: "Log food", onPress: onLogFood, tone: "orange" as const, disabled: !onLogFood } : null,
    primaryAction.label !== workoutLabel
      ? {
          icon: workoutLabel === "Start workout" ? "play-outline" as const : "barbell-outline" as const,
          label: workoutLabel,
          onPress: onStartWorkout,
          tone: "purple" as const,
          disabled: !onStartWorkout
        }
      : null
  ].filter((item): item is NonNullable<typeof item> => item !== null);
  return (
    <EngineCard>
      <View style={{ gap: spacing.lg }} testID="today-hero-card">
        <View testID="today-check-in-card">
        <View style={{ alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "space-between" }}>
          <View style={{ flexBasis: 260, flexGrow: 1, gap: spacing.xs, minWidth: 0 }}>
            <Text style={{ color: colors.canvas, fontSize: 23, fontWeight: "900", lineHeight: 29 }}>Today</Text>
            <Text style={{ color: colors.wrap, fontSize: 16, fontWeight: "600", lineHeight: 23 }}>{checkIn.sentence}</Text>
          </View>
          <TodayTonePill label={checkIn.status} tone={checkIn.tone} />
        </View>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <TodayButton disabled={busy} icon={primaryAction.icon} label={primaryAction.label} onPress={primaryAction.onPress} primary testID="today-primary-check-in-action" tone={primaryAction.tone} />
          {secondaryActions.map((action) => (
            <TodayButton disabled={busy || action.disabled} icon={action.icon} key={`today-secondary-action:${action.label}`} label={action.label} onPress={action.onPress} tone={action.tone} />
          ))}
        </View>
      </View>
    </EngineCard>
  );
}

function KeyStatusRow({
  fuel,
  readiness,
  training,
  weight
}: {
  fuel: PlainStatus<FuelValue>;
  readiness: PlainStatus<ReadinessValue>;
  training: PlainStatus<TrainingValue>;
  weight: PlainStatus<WeightValue>;
}) {
  return (
    <View testID="today-status-row">
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }} testID="today-key-status-row">
        <TodayStatusTile label="Training" tone={training.tone} value={training.value} />
        <TodayStatusTile label="Fuel" tone={fuel.tone} value={fuel.value} />
        <TodayStatusTile label="Weight" tone={weight.tone} value={weight.value} />
        <TodayStatusTile label="Readiness" tone={readiness.tone} value={readiness.value} />
      </View>
    </View>
  );
}

function TodayNextActionCard({
  busy,
  checkIn,
  fuel,
  fuelToday,
  onCheckIn,
  onLogFood,
  onLogHydration,
  onOpenFuel,
  onOpenPlan,
  onStartWorkout,
  trainingToday
}: {
  busy: boolean;
  checkIn: TodayCheckInModel;
  fuel: PlainStatus<FuelValue>;
  fuelToday: FuelTodayModel;
  onCheckIn: () => void;
  onLogFood?: (() => void) | undefined;
  onLogHydration: () => void;
  onOpenFuel?: (() => void) | undefined;
  onOpenPlan?: (() => void) | undefined;
  onStartWorkout?: (() => void) | undefined;
  trainingToday: TrainingTodayModel;
}) {
  const next =
    fuelToday.status === "Guidance" || fuelToday.status === "Weight pressure off"
      ? {
          actionIcon: "flame-outline" as const,
          actionLabel: onOpenFuel ? "Open Fuel" : "Log food",
          action: onOpenFuel ?? onLogFood,
          label: fuelToday.status,
          sentence: fuelToday.note,
          title: "Fuel first",
          tone: fuelToday.tone
        }
      : !/Ready|Easy day|Recovery day/.test(checkIn.status)
        ? {
            actionIcon: "checkmark-circle-outline" as const,
            actionLabel: "Check in",
            action: onCheckIn,
            label: checkIn.status,
            sentence: "Log readiness, then use the workout or fuel action that still matters.",
            title: "Next up: Check in",
            tone: checkIn.tone
          }
        : fuel.value === "Hydrate first"
          ? {
              actionIcon: "water-outline" as const,
              actionLabel: "Add water",
              action: onLogHydration,
              label: "Hydrate",
              sentence: "Hydrate first. Keep the session controlled if fluids are low.",
              title: "Hydrate first",
              tone: "blue" as const
            }
          : fuel.value === "Eat before"
            ? {
                actionIcon: "restaurant-outline" as const,
                actionLabel: "Log food",
                action: onLogFood,
                label: "Fuel first",
                sentence: "Eat before training. Do not turn this into a low-energy session.",
                title: "Eat before training",
                tone: "orange" as const
              }
            : trainingToday.buttonLabel !== "Open Train"
              ? {
                  actionIcon: trainingToday.buttonLabel === "Start workout" ? "play-outline" as const : "barbell-outline" as const,
                  actionLabel: trainingToday.buttonLabel,
                  action: onStartWorkout,
                  label: trainingToday.intensityLabel,
                  sentence: trainingToday.sentence,
                  title: `Next up: ${trainingToday.buttonLabel}`,
                  tone: trainingToday.tone
                }
              : {
                  actionIcon: "calendar-outline" as const,
                  actionLabel: "View plan",
                  action: onOpenPlan,
                  label: "Plan",
                  sentence: "Open the plan when the week changes. Log if useful.",
                  title: "Next up: View plan",
                  tone: "green" as const
                };
  return (
    <EngineCard>
      <View style={{ gap: spacing.md }} testID="today-next-action-card">
        <View style={{ alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "space-between" }}>
          <View style={{ flexBasis: 250, flexGrow: 1, gap: spacing.xs, minWidth: 0 }}>
            <Text style={{ color: colors.canvas, fontSize: 18, fontWeight: "900", lineHeight: 23 }}>{next.title}</Text>
            <Text style={screenStyles.body}>{next.sentence}</Text>
          </View>
          <TodayTonePill label={next.label} tone={next.tone} />
        </View>
        <TodayButton disabled={busy || !next.action} icon={next.actionIcon} label={next.actionLabel} onPress={next.action} primary tone={next.tone} />
      </View>
    </EngineCard>
  );
}

function TrainingTodayCard({
  busy,
  model,
  onOpen
}: {
  busy: boolean;
  model: TrainingTodayModel;
  onOpen?: (() => void) | undefined;
}) {
  return (
    <TodaySectionCard
      action={<TodayButton disabled={busy || !onOpen || model.disabled} icon={model.buttonLabel === "Start workout" ? "play-outline" : "barbell-outline"} label={model.buttonLabel} onPress={onOpen} primary tone="blue" />}
      label={model.intensityLabel}
      sentence={model.sentence}
      testID="today-training-card"
      title="Training Today"
      tone={model.tone}
    >
      <View style={{ gap: spacing.xs }}>
        <Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={2} style={{ color: colors.canvas, fontSize: 22, fontWeight: "900", lineHeight: 28 }}>
          {model.title}
        </Text>
        <Text style={screenStyles.subtle}>{model.durationLabel} - {model.intensityLabel}</Text>
      </View>
    </TodaySectionCard>
  );
}

function FuelTodayCard({
  busy,
  model,
  onOpenFuel
}: {
  busy: boolean;
  model: FuelTodayModel;
  onOpenFuel?: (() => void) | undefined;
}) {
  return (
    <TodaySectionCard
      action={<TodayButton disabled={busy || !onOpenFuel} icon="flame-outline" label="Open Fuel" onPress={onOpenFuel} primary tone="blue" />}
      label={model.status}
      sentence={model.note}
      testID="today-fuel-card"
      title="Fuel Today"
      tone={model.tone}
    >
      <Text style={screenStyles.subtle}>{model.why}</Text>
    </TodaySectionCard>
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
    <TodaySectionCard
      action={<TodayButton disabled={busy || !onOpenPlan} icon="calendar-outline" label="View Plan" onPress={onOpenPlan} tone="green" />}
      label={model.phaseLabel}
      sentence={model.sentence}
      testID="today-week-card"
      title="This Week"
      tone="green"
    >
      <View style={{ gap: spacing.sm }}>
        {model.sessions.length > 0 ? model.sessions.map((session) => (
          <View
            key={`today-week-session:${session.id}`}
            style={{
              backgroundColor: todayPalette.controlFill,
              borderColor: todayPalette.cardLine,
              borderRadius: radii.tile,
              borderWidth: 1,
              gap: spacing.xs,
              padding: spacing.md
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
    </TodaySectionCard>
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
  fuelToday,
  onLogFood,
  onOpenQuickCheck,
  onOpenTraining,
  onOpenFuel,
  onOpenPlan,
  trainingToday,
  weekToday
}: React.PropsWithChildren<{
  busy: boolean;
  fuelToday: FuelTodayModel;
  onLogFood?: (() => void) | undefined;
  onOpenQuickCheck: (focus: TodayQuickCheckFocus, placement: TodayQuickCheckPlacement) => void;
  onOpenTraining?: (() => void) | undefined;
  onOpenFuel?: (() => void) | undefined;
  onOpenPlan?: (() => void) | undefined;
  trainingToday: TrainingTodayModel;
  weekToday: WeekTodayModel;
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
                Training, fuel, week notes, quick logs, and recent logs.
              </Text>
            </View>
            <Ionicons color={colors.wrap} name={open ? "chevron-up" : "chevron-down"} size={18} />
          </Pressable>
        </View>
      </EngineCard>
      {open ? (
        <View style={{ gap: spacing.sm }} testID="today-details-section">
          <TrainingTodayCard busy={busy} model={trainingToday} onOpen={onOpenTraining} />
          <FuelTodayCard busy={busy} model={fuelToday} onOpenFuel={onOpenFuel} />
          <ThisWeekCard busy={busy} model={weekToday} onOpenPlan={onOpenPlan} />
          <QuickLogsCard busy={busy} onLogFood={onLogFood} onOpenQuickCheck={onOpenQuickCheck} />
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
  cycleTrackingStatus,
  busy,
  message,
  preferredUnits = "metric",
  onOpenFuel,
  onOpenFuelLog,
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
  const readinessLogged = recentLogs.readinessToday.loggedToday;
  const readiness = readinessStatus(dashboard, recentLogs);
  const weight = weightStatus(fuelViewModel);
  const fuel = fuelStatus(dashboard, fuelViewModel);
  const training = trainingStatus(trainViewModel);
  const checkIn = buildCheckInModel({ fuel, readiness, readinessLogged, training });
  const trainingToday = buildTrainingTodayModel(trainViewModel, readinessLogged, Boolean(onOpenTrainWorkout));
  const fuelToday = buildFuelTodayModel({ fuel: fuelViewModel, fuelStatus: fuel, weightStatus: weight });
  const weekToday = buildWeekModel(planViewModel, asOfDate);
  const foodAction = onOpenFuelLog ?? onOpenFuel;
  const workoutAction = trainingToday.buttonLabel === "Start workout" ? onOpenTrainWorkout : onOpenTrain;
  return (
    <>
      <LuminousScreen accent="blue" backgroundImage={tabScreenBackgrounds.today} testID="today-screen">
        <ScreenHeader {...tabHeroHeaders.today} />
        <TodayCheckInCard
          busy={busy}
          checkIn={checkIn}
          onCheckIn={() => openQuickCheck(checkIn.focus, "top")}
          onLogHydration={() => openQuickCheck("hydration", "top")}
          onLogFood={foodAction}
          onStartWorkout={workoutAction}
          workoutLabel={trainingToday.buttonLabel}
        />
        <KeyStatusRow fuel={fuel} readiness={readiness} training={training} weight={weight} />
        <TodayNextActionCard
          busy={busy}
          checkIn={checkIn}
          fuel={fuel}
          fuelToday={fuelToday}
          onCheckIn={() => openQuickCheck(checkIn.focus, "top")}
          onLogFood={foodAction}
          onLogHydration={() => openQuickCheck("hydration", "top")}
          onOpenFuel={onOpenFuel ?? onOpenFuelLog}
          onOpenPlan={onOpenPlan}
          onStartWorkout={workoutAction}
          trainingToday={trainingToday}
        />
        <TodayDetailsDisclosure
          busy={busy}
          fuelToday={fuelToday}
          onLogFood={foodAction}
          onOpenFuel={onOpenFuel ?? onOpenFuelLog}
          onOpenPlan={onOpenPlan}
          onOpenQuickCheck={openQuickCheck}
          onOpenTraining={workoutAction}
          trainingToday={trainingToday}
          weekToday={weekToday}
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
