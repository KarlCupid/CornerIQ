import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, useWindowDimensions, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CycleSymptom, CycleViewModel, FuelViewModel, PlanViewModel, RecentLogsViewModel, TodayViewModel, TrainViewModel } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
import { LuminousScreen, ScreenHeader, useLuminousScreenTheme } from "../../design/components/LuminousScreen";
import { TrendLineChart, WeeklyLoadBars } from "../../design/components/PerformanceVisuals";
import { RiskBanner } from "../../design/components/RiskBanner";
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
type TodayStatusLabel = "Ready" | "Check in" | "Fuel first" | "Easy day" | "Recovery day" | "Review needed";
type ReadinessValue = "Good" | "Caution" | "Low" | "Stop";
type WeightValue = "On pace" | "Tight" | "Behind" | "No active cut" | "Paused";
type FuelValue = "Eat before" | "Normal" | "Log if useful" | "Hydrate first";
type TrainingValue = "Start" | "Easy" | "Recovery" | "No workout" | "Review";

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
    .replace(/\bsafety override\b/gi, "review note")
    .replace(/\bsafety stops\b/gi, "review notes")
    .replace(/\bsafety stop\b/gi, "review needed")
    .replace(/\bhard stops\b/gi, "review notes")
    .replace(/\bhard stop\b/gi, "review needed")
    .replace(/\brisk domain\b/gi, "review area")
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
      return colors.mutedText;
    case "blue":
    default:
      return colors.blueIQ;
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
  quickLogs,
  recentLogs
}: {
  busy: boolean;
  framed?: boolean | undefined;
  focus: TodayQuickCheckFocus;
  includeOtherLogs?: boolean | undefined;
  onClose?: (() => void) | undefined;
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
    body_mass: <BodyMassLogCard actions={quickLogs} busy={busy} forceOpen={focus === "body_mass"} framed={false} status={recentLogs.bodyMassToday} />,
    hydration: <HydrationLogCard actions={quickLogs} busy={busy} framed={false} status={recentLogs.hydrationToday} />,
    readiness: <ReadinessCheckInCard actions={quickLogs} busy={busy} forceOpen={focus === "readiness"} framed={false} status={recentLogs.readinessToday} />
  } satisfies Record<TodayQuickCheckFocus, React.ReactNode>;
  const orderedFocuses: readonly TodayQuickCheckFocus[] =
    !includeOtherLogs
      ? [focus]
      : focus === "body_mass"
      ? ["body_mass", "readiness", "hydration"]
      : focus === "hydration"
        ? ["hydration", "readiness", "body_mass"]
        : ["readiness", "body_mass", "hydration"];
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
  quickCheck,
  quickLogs,
  recentLogs
}: {
  busy: boolean;
  onClose: () => void;
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
  const maxPanelHeight = Math.max(
    320,
    Math.min(height * (compact ? 0.72 : 0.84), compact ? 560 : 720)
  );
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
          justifyContent: compact ? "flex-end" : "center",
          paddingBottom: Math.max(insets.bottom + spacing.md, spacing.lg),
          paddingHorizontal: spacing.lg,
          paddingTop: Math.max(insets.top, spacing.lg)
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
              quickLogs={quickLogs}
              recentLogs={recentLogs}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function TodayTonePill({ label, tone = "blue" }: { label: string; tone?: VisualTone | undefined }) {
  const theme = useLuminousScreenTheme();
  const color = colorForTone(tone);
  return (
    <View
      accessibilityLabel={`Status: ${label}`}
      style={{
        alignItems: "center",
        alignSelf: "flex-start",
        backgroundColor: theme.control,
        borderColor: theme.controlBorder,
        borderLeftColor: color,
        borderLeftWidth: 3,
        borderRadius: radii.pill,
        borderWidth: 1,
        flexDirection: "row",
        gap: spacing.xs,
        justifyContent: "center",
        minHeight: 30,
        paddingHorizontal: spacing.md,
        paddingVertical: 4
      }}
    >
      <View style={{ backgroundColor: color, borderRadius: 4, height: 7, width: 7 }} />
      <Text numberOfLines={1} style={{ color, fontSize: 12, fontWeight: "900", lineHeight: 16 }}>
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
  const primaryColor = tone === "red" ? colors.redCorner : theme.accentColor;
  const primaryForeground = tone === "red" ? colors.canvas : colors.cornerBlack;
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
              backgroundColor: disabled ? theme.control : pressed ? `${primaryColor}C7` : `${primaryColor}E0`,
              borderColor: disabled ? theme.controlBorder : `${primaryColor}70`,
              boxShadow: disabled ? "none" : `0 10px 24px ${theme.strongGlow}`
            }
          : {
              backgroundColor: pressed ? theme.tile : theme.control,
              borderColor: theme.controlBorder
            }
      ]}
      testID={testID}
    >
      <Ionicons color={primary && !disabled ? primaryForeground : disabled ? colors.mutedText : toneColor} name={icon} size={18} />
      <Text style={{ color: primary && !disabled ? primaryForeground : colors.canvas, fontSize: 15, fontWeight: "800", lineHeight: 20, textAlign: "center" }}>
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
  const theme = useLuminousScreenTheme();
  const color = colorForTone(tone);
  return (
    <View
      accessibilityLabel={`${label}: ${value}`}
      style={{
        ...glassStyles.tile,
        backgroundColor: theme.tile,
        borderColor: theme.tileBorder,
        borderLeftColor: tone === "muted" ? theme.hairline : color,
        borderLeftWidth: 2,
        flexBasis: 132,
        flexGrow: 1,
        gap: spacing.xs,
        minHeight: 74,
        padding: spacing.md
      }}
    >
      <Text numberOfLines={1} style={{ color: colors.mutedText, fontSize: 11, fontWeight: "800", lineHeight: 15 }}>
        {label}
      </Text>
      <Text adjustsFontSizeToFit minimumFontScale={0.74} numberOfLines={1} style={{ color, fontSize: 19, fontWeight: "900", lineHeight: 24 }}>
        {value}
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

function readinessStatus(dashboard: TodayDashboardVisual, recentLogs: RecentLogsViewModel, warningActive: boolean): PlainStatus<ReadinessValue> {
  if (warningActive || dashboard.readiness.tone === "red") {
    return { tone: "red", value: "Stop" };
  }
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

function weightStatus(fuel: FuelViewModel | undefined, warningActive: boolean): PlainStatus<WeightValue> {
  if (warningActive || fuel?.underFuelingRisk || fuel?.nutritionSafetyReview.required || (fuel?.activeNutritionSafetyReviews.length ?? 0) > 0) {
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

function fuelStatus(dashboard: TodayDashboardVisual, fuel: FuelViewModel | undefined, warningActive: boolean): PlainStatus<FuelValue> {
  const hydration = dashboard.fuel.find((item) => /hydration/i.test(item.label));
  const carbs = dashboard.fuel.find((item) => /carb/i.test(item.label));
  const highFuelNeed = fuel?.trainingDemandHandoff.todayTrainingDemand === "high";
  if (warningActive) {
    return { tone: "orange", value: "Hydrate first" };
  }
  if (hydration && hydration.ratio > 0 && hydration.ratio < 0.55) {
    return { tone: "blue", value: "Hydrate first" };
  }
  if (highFuelNeed || (carbs && carbs.ratio > 0 && carbs.ratio < 0.55)) {
    return { tone: "orange", value: "Eat before" };
  }
  if (!fuel || fuel.foodLogStatus.entryCount === 0) {
    return { tone: "muted", value: "Log if useful" };
  }
  return { tone: "green", value: "Normal" };
}

function trainingStatus(train: TrainViewModel | undefined, warningActive: boolean): PlainStatus<TrainingValue> {
  const session = train?.todayGeneratedSessions[0] ?? train?.nextGeneratedSession;
  const intensity = train?.sessionCards[0]?.intensity ?? session?.intensity;
  if (warningActive) {
    return { tone: "red", value: "Review" };
  }
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
  readiness: PlainStatus<ReadinessValue>;
  training: PlainStatus<TrainingValue>;
  warningActive: boolean;
}): TodayCheckInModel {
  if (input.warningActive || input.training.value === "Review" || input.readiness.value === "Stop") {
    return {
      focus: "readiness",
      sentence: "Something needs attention before you push training or weight.",
      status: "Review needed",
      tone: "red"
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
  hasWarning: boolean;
  session: TrainViewModel["detailedTodaySessions"][number]["detail"] | null;
  viewModel: TrainViewModel | undefined;
}): string {
  const intensity = input.session?.intensity ?? input.card?.intensity ?? input.generated?.intensity;
  const source = firstSentence(
    input.session?.whyThisMattersForBoxing ?? input.card?.why ?? input.viewModel?.todayRole.summary ?? input.viewModel?.todaySummary,
    ""
  );
  const lowerSource = source.toLowerCase();
  if (input.hasWarning) {
    return "Today should stay easy. Stop if symptoms return.";
  }
  if (!input.session && !input.card && !input.generated) {
    return "No app workout is set for today. Log real boxing if training changes.";
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

function buildTrainingTodayModel(train: TrainViewModel | undefined, warningActive: boolean, hasStartHandler: boolean): TrainingTodayModel {
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
  return {
    buttonLabel: hasWorkout && hasStartHandler ? "Start workout" : "Open Train",
    disabled: false,
    durationLabel: durationMinutes > 0 ? `${durationMinutes} min` : "Duration TBD",
    intensityLabel: sentenceCase(plainIntensityLabel(intensity)),
    sentence: trainingHumanLine({ card, generated, hasWarning: warningActive, session, viewModel: train }),
    title,
    tone: warningActive ? "red" : toneForIntensity(intensity)
  };
}

function buildFuelTodayModel(input: {
  fuel: FuelViewModel | undefined;
  fuelStatus: PlainStatus<FuelValue>;
  warningActive: boolean;
  weightStatus: PlainStatus<WeightValue>;
}): FuelTodayModel {
  if (input.warningActive || input.weightStatus.value === "Paused") {
    return {
      note: "Cut paused today. Eat and hydrate normally.",
      status: "Paused",
      tone: "red",
      why: "Weight pressure should not drive training today."
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

function warningIsActive(fuel: FuelViewModel | undefined, today: TodayViewModel): boolean {
  return Boolean(
    today.riskSummary.length > 0 ||
      fuel?.nutritionSafetyReview.required ||
      (fuel?.activeNutritionSafetyReviews.length ?? 0) > 0 ||
      (fuel?.nutritionReviewHistory.activeReviewCount ?? 0) > 0 ||
      fuel?.underFuelingRisk ||
      (fuel?.riskSummary.length ?? 0) > 0
  );
}

function warningLines(fuel: FuelViewModel | undefined, today: TodayViewModel): readonly string[] {
  return [
    ...today.riskSummary,
    ...(fuel?.underFuelingRisk ? [fuel.underFuelingRisk.summary] : []),
    ...(fuel?.riskSummary ?? [])
  ].map((item) => sentenceCase(firstSentence(item))).filter(Boolean).slice(0, 4);
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
  onStartWorkout
}: {
  busy: boolean;
  checkIn: TodayCheckInModel;
  onCheckIn: () => void;
  onLogFood?: (() => void) | undefined;
  onStartWorkout?: (() => void) | undefined;
}) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.lg }} testID="today-check-in-card">
        <View style={{ alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "space-between" }}>
          <View style={{ flexBasis: 260, flexGrow: 1, gap: spacing.xs, minWidth: 0 }}>
            <Text style={{ color: colors.canvas, fontSize: 23, fontWeight: "900", lineHeight: 29 }}>Today's Check-In</Text>
            <Text style={{ color: colors.wrap, fontSize: 16, fontWeight: "600", lineHeight: 23 }}>{checkIn.sentence}</Text>
          </View>
          <TodayTonePill label={checkIn.status} tone={checkIn.tone} />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <TodayButton disabled={busy} icon="checkmark-circle-outline" label="Check in" onPress={onCheckIn} primary testID="today-primary-check-in-action" tone="blue" />
          <TodayButton disabled={busy || !onLogFood} icon="restaurant-outline" label="Log food" onPress={onLogFood} tone="orange" />
          <TodayButton disabled={busy || !onStartWorkout} icon="barbell-outline" label="Start workout" onPress={onStartWorkout} tone="purple" />
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
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }} testID="today-key-status-row">
      <TodayStatusTile label="Training" tone={training.tone} value={training.value} />
      <TodayStatusTile label="Fuel" tone={fuel.tone} value={fuel.value} />
      <TodayStatusTile label="Weight" tone={weight.tone} value={weight.value} />
      <TodayStatusTile label="Readiness" tone={readiness.tone} value={readiness.value} />
    </View>
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
      action={<TodayButton disabled={busy || !onOpen || model.disabled} icon={model.buttonLabel === "Start workout" ? "play-outline" : "barbell-outline"} label={model.buttonLabel} onPress={onOpen} primary tone={model.tone} />}
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
      action={<TodayButton disabled={busy || !onOpenFuel} icon="flame-outline" label="Open Fuel" onPress={onOpenFuel} primary tone={model.tone} />}
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
  const theme = useLuminousScreenTheme();
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
              backgroundColor: theme.tile,
              borderColor: theme.tileBorder,
              borderLeftColor: colorForTone(session.tone),
              borderLeftWidth: 3,
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
  const hasWarning = warningIsActive(fuelViewModel, viewModel);
  const readiness = readinessStatus(dashboard, recentLogs, hasWarning);
  const weight = weightStatus(fuelViewModel, hasWarning);
  const fuel = fuelStatus(dashboard, fuelViewModel, hasWarning);
  const training = trainingStatus(trainViewModel, hasWarning);
  const checkIn = buildCheckInModel({ fuel, readiness, training, warningActive: hasWarning });
  const trainingToday = buildTrainingTodayModel(trainViewModel, hasWarning, Boolean(onOpenTrainWorkout ?? onOpenTrain));
  const fuelToday = buildFuelTodayModel({ fuel: fuelViewModel, fuelStatus: fuel, warningActive: hasWarning, weightStatus: weight });
  const weekToday = buildWeekModel(planViewModel, asOfDate);
  const foodAction = onOpenFuelLog ?? onOpenFuel;
  const workoutAction = onOpenTrainWorkout ?? onOpenTrain;
  const warningText = fuelViewModel && weight.value === "Paused"
    ? "Cut paused. Eat and hydrate normally."
    : training.value === "Review"
      ? "Review needed before hard training."
      : "Hard training is not recommended today.";
  return (
    <>
      <LuminousScreen accent="blue" backgroundImage={tabScreenBackgrounds.today} testID="today-screen">
        <ScreenHeader {...tabHeroHeaders.today} />
        {hasWarning ? (
          <RiskBanner title="Review needed before hard training" message={warningText} statusLabel="Review needed" tone="critical">
            <View style={{ gap: spacing.sm }}>
              {warningLines(fuelViewModel, viewModel).map((risk, index) => <Text key={`today-risk:${index}`} style={screenStyles.body}>{risk}</Text>)}
              <TodayButton disabled={busy || !(onOpenFuelSafety ?? onOpenFuel)} icon="shield-checkmark-outline" label="Open Fuel review" onPress={onOpenFuelSafety ?? onOpenFuel} tone="red" />
            </View>
          </RiskBanner>
        ) : null}
        <TodayCheckInCard
          busy={busy}
          checkIn={checkIn}
          onCheckIn={() => openQuickCheck(checkIn.focus, "top")}
          onLogFood={foodAction}
          onStartWorkout={workoutAction}
        />
        <KeyStatusRow fuel={fuel} readiness={readiness} training={training} weight={weight} />
        <TrainingTodayCard busy={busy} model={trainingToday} onOpen={workoutAction} />
        <FuelTodayCard busy={busy} model={fuelToday} onOpenFuel={onOpenFuel ?? onOpenFuelLog} />
        <ThisWeekCard busy={busy} model={weekToday} onOpenPlan={onOpenPlan} />
        <QuickLogsCard busy={busy} onLogFood={foodAction} onOpenQuickCheck={openQuickCheck} />
        <TodayDetails
          cycleContext={cycleContext}
          cycleTrackingStatus={cycleTrackingStatus}
          dashboard={dashboard}
          hasWarning={hasWarning}
          onOpenBodyMass={() => openQuickCheck("body_mass", "body_mass_card")}
          onOpenReadiness={() => openQuickCheck("readiness", "readiness_card")}
          recentLogs={recentLogs}
          showCycleImpact={showCycleImpact}
        />
        {message ? (
          <EngineCard>
            <Text style={[screenStyles.subtle, { color: colors.amberCaution }]}>App note: {message}. Existing plan stays visible unless a review note changes it.</Text>
          </EngineCard>
        ) : null}
      </LuminousScreen>
      <TodayQuickCheckModal
        busy={busy}
        onClose={closeQuickCheck}
        quickCheck={quickCheck}
        quickLogs={quickLogs}
        recentLogs={recentLogs}
      />
    </>
  );
}
