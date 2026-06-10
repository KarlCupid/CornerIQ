import React from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, useWindowDimensions, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CycleSymptom, CycleViewModel, FuelViewModel, PlanViewModel, RecentLogsViewModel, TodayViewModel, TrainViewModel } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
import { CompactStatusStrip, PrimaryTaskCard, type FastTaskAction } from "../../design/components/FastTask";
import { LuminousScreen, ScreenHeader } from "../../design/components/LuminousScreen";
import {
  DashboardCard,
  DashboardPill,
  MetricRing,
  ModifierRow,
  ProgressMeter,
  SemiGauge,
  TimelineStrip,
  TrendLineChart,
  VisualMetricTile,
  WeeklyLoadBars
} from "../../design/components/PerformanceVisuals";
import { RiskBanner } from "../../design/components/RiskBanner";
import { glassStyles } from "../../design/glass";
import { colors, radii, spacing } from "../../design/theme";
import { buildTodayDashboardVisual, type TodayDashboardVisual, type VisualTone } from "../../engine/presentation/dashboardVisualData";
import type { QuickLogActions } from "../../hooks/useQuickLogs";
import { CycleContextCard } from "./cycle/CycleContextCard";
import { BodyMassLogCard, HydrationLogCard, ReadinessCheckInCard } from "./logging/LogCards";
import { screenStyles } from "./screenStyles";

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
type TodayQuickCheckPlacement = "top" | "readiness_card" | "body_mass_card" | "manual" | "dashboard_primary";

function plainTodayCopy(value: string): string {
  return value
    .replace(new RegExp("Generated support", "g"), "Support work")
    .replace(new RegExp("generated support", "gi"), "support work")
    .replace(new RegExp("hard " + "stops", "gi"), "safety stops")
    .replace(new RegExp("hard " + "stop", "gi"), "safety stop");
}

function accentForTone(tone: VisualTone): "blue" | "green" | "orange" | "purple" | "gold" | "red" {
  return tone === "muted" ? "blue" : tone;
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
        ? "Weight trend first"
        : "Hydration first";
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

function TodayDashboardSection({
  busy,
  dashboard,
  onOpenFuel,
  onOpenTrainWorkout,
  onOpenQuickCheck,
  onPrimaryAction
}: {
  busy: boolean;
  dashboard: TodayDashboardVisual;
  onOpenFuel?: (() => void) | undefined;
  onOpenTrainWorkout?: (() => void) | undefined;
  onOpenQuickCheck: (focus: TodayQuickCheckFocus, placement: TodayQuickCheckPlacement) => void;
  onPrimaryAction: (placement: TodayQuickCheckPlacement) => void;
}) {
  const actionButtonStyle = [screenStyles.quietButton, { flexBasis: 148, flexGrow: 1 }];
  const hasBodyMassLine = dashboard.bodyMass.points.length >= 2;
  const latestBodyMassPoint = dashboard.bodyMass.points[dashboard.bodyMass.points.length - 1];
  return (
    <View style={{ gap: spacing.md }} testID="today-visual-dashboard">
      <DashboardCard
        density="compact"
        headerRight={<DashboardPill label={dashboard.readiness.statusLabel} tone={dashboard.readiness.tone} />}
        testID="today-readiness-gauge"
        title="Readiness score"
        titleVariant="quiet"
      >
        <View style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
          <MetricRing
            label="Readiness score"
            size={118}
            subLabel={dashboard.readiness.score === null ? "readiness" : "/100"}
            tone={dashboard.readiness.tone}
            value={dashboard.readiness.score}
          />
          <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, minWidth: 216 }}>
            {dashboard.readiness.metrics.map((item) => <VisualMetricTile item={item} key={`today-readiness-metric:${item.label}`} variant="quiet" />)}
          </View>
        </View>
        {dashboard.readiness.emptyActionLabel ? (
          <Pressable
            accessibilityLabel="Log readiness"
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={() => onOpenQuickCheck("readiness", "readiness_card")}
            style={screenStyles.quietButton}
          >
            <Text style={screenStyles.quietButtonText}>{dashboard.readiness.emptyActionLabel}</Text>
          </Pressable>
        ) : null}
      </DashboardCard>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
        <View style={{ flexBasis: 280, flexGrow: 1 }}>
          <DashboardCard
            density="compact"
            headerRight={<DashboardPill label={dashboard.loadStateLabel} tone={dashboard.loadStateLabel === "High" ? "red" : dashboard.loadStateLabel === "Watch" ? "orange" : "green"} />}
            testID="today-weekly-load-chart"
            title="Weekly training load"
            titleVariant="quiet"
          >
            <Text style={screenStyles.subtle}>ACWR {dashboard.acwrLabel}</Text>
            <WeeklyLoadBars bars={dashboard.weeklyLoad} />
          </DashboardCard>
        </View>
        <View style={{ flexBasis: 280, flexGrow: 1 }}>
          <DashboardCard
            density="compact"
            headerRight={onOpenFuel ? <DashboardPill label="Details" tone="blue" /> : null}
            testID="today-fuel-status-bars"
            title="Fuel status"
            titleVariant="quiet"
          >
            <View style={{ gap: spacing.sm }}>
              {dashboard.fuel.map((item) => <ProgressMeter compact item={item} key={`today-fuel:${item.label}`} />)}
            </View>
          </DashboardCard>
        </View>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
        <View style={{ flexBasis: 280, flexGrow: 1 }}>
          <DashboardCard density="compact" testID="today-body-mass-trend-card" title="Body weight trend" titleVariant="quiet">
            <View style={{ gap: spacing.sm }}>
              <View style={{ alignItems: "flex-end", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "space-between" }}>
                <Text numberOfLines={1} style={{ color: colors.canvas, flexShrink: 1, fontSize: 28, fontWeight: "900", lineHeight: 34, minWidth: 0 }}>
                  {dashboard.bodyMass.currentLabel}
                </Text>
                <Text numberOfLines={1} style={{ color: dashboard.bodyMass.tone === "green" ? colors.readyGreen : colors.amberCaution, flexShrink: 1, fontSize: 13, fontWeight: "900", lineHeight: 17 }}>
                  {dashboard.bodyMass.deltaLabel}
                </Text>
              </View>
              {hasBodyMassLine ? (
                <TrendLineChart accent="blue" height={72} points={dashboard.bodyMass.points} />
              ) : (
                <View
                  style={{
                    alignItems: "center",
                    borderColor: colors.line,
                    borderRadius: radii.tile,
                    borderWidth: 1,
                    gap: spacing.xs,
                    justifyContent: "center",
                    minHeight: 76,
                    padding: spacing.md
                  }}
                >
                  <Text style={{ color: colors.blueIQ, fontSize: 13, fontWeight: "900", lineHeight: 17 }}>
                    {latestBodyMassPoint ? "Latest log only" : "Trend unknown"}
                  </Text>
                  <Text style={[screenStyles.subtle, { textAlign: "center" }]}>
                    {latestBodyMassPoint ? "One more scale log makes this a trend." : dashboard.bodyMass.emptyLabel}
                  </Text>
                </View>
              )}
              <Pressable
                accessibilityLabel={busy ? "Saving body weight log" : "Open trend body weight input"}
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={() => onOpenQuickCheck("body_mass", "body_mass_card")}
                style={screenStyles.quietButton}
              >
                <Text style={screenStyles.quietButtonText}>{/no body (mass|weight)|unknown/i.test(dashboard.bodyMass.currentLabel) ? "Log body weight" : "Update body weight"}</Text>
              </Pressable>
            </View>
          </DashboardCard>
        </View>
        <View style={{ flexBasis: 280, flexGrow: 1 }}>
          <DashboardCard density="compact" testID="today-training-decision-meter" title="Today's training decision" titleVariant="quiet">
            <View style={{ gap: spacing.sm }}>
              <Text style={{ color: colors.canvas, fontSize: 21, fontWeight: "800", lineHeight: 27 }}>{dashboard.decision.title}</Text>
              <Text numberOfLines={2} style={screenStyles.subtle}>{dashboard.decision.subtitle}</Text>
              <View style={{ alignItems: "center" }}>
                <SemiGauge label={dashboard.decision.title} score={dashboard.decision.score} tone={dashboard.decision.tone} />
              </View>
              <View style={{ gap: spacing.xs }}>
                {dashboard.decision.tags.map((item) => <ModifierRow item={item} key={`today-decision:${item.label}`} />)}
              </View>
            </View>
          </DashboardCard>
        </View>
      </View>

      <DashboardCard density="compact" title="Today's schedule" titleVariant="quiet">
        <TimelineStrip items={dashboard.schedule} />
      </DashboardCard>

      <DashboardCard density="compact" testID="today-manual-actions" title="Manual inputs" titleVariant="quiet">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <Pressable
            accessibilityLabel="Quick check-in"
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={() => onOpenQuickCheck("readiness", "manual")}
            style={actionButtonStyle}
          >
            <Text style={screenStyles.quietButtonText}>Quick check-in</Text>
          </Pressable>
          {onOpenFuel ? (
            <Pressable
              accessibilityLabel="Log food"
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={onOpenFuel}
              style={actionButtonStyle}
            >
              <Text style={screenStyles.quietButtonText}>Log food</Text>
            </Pressable>
          ) : null}
          {onOpenTrainWorkout ? (
            <Pressable
              accessibilityLabel="Open workout"
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={onOpenTrainWorkout}
              style={actionButtonStyle}
            >
              <Text style={screenStyles.quietButtonText}>Open workout</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={screenStyles.subtle}>Add only true manual logs. Missing data stays unknown, not safe.</Text>
      </DashboardCard>

      <Pressable
        accessibilityLabel={dashboard.ctaLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={() => onPrimaryAction("dashboard_primary")}
        style={[screenStyles.button, { minHeight: 56 }]}
        testID="today-primary-dashboard-action"
      >
        <Text style={[screenStyles.buttonText, { fontSize: 17 }]}>{dashboard.ctaLabel}</Text>
      </Pressable>
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
  const hasRisk = viewModel.riskSummary.length > 0;
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
  const runDashboardPrimaryAction = (quickCheckPlacement: TodayQuickCheckPlacement = "top") => {
    if (/fuel/i.test(dashboard.ctaLabel)) {
      (onOpenFuelLog ?? onOpenFuel)?.();
      return;
    }
    if (/readiness/i.test(dashboard.ctaLabel)) {
      openQuickCheck("readiness", quickCheckPlacement);
      return;
    }
    if (/adjust/i.test(dashboard.ctaLabel)) {
      (onOpenPlan ?? onOpenTrain)?.();
      return;
    }
    (onOpenTrainWorkout ?? onOpenTrain)?.();
  };
  const primaryTaskLabel =
    dashboard.ctaLabel === "Open Fuel"
      ? "Log food"
      : dashboard.ctaLabel === "Open training"
        ? "Open workout"
        : dashboard.ctaLabel;
  const primaryButton: FastTaskAction = {
    disabled: busy,
    label: primaryTaskLabel,
    onPress: () => runDashboardPrimaryAction("top"),
    testID: "today-primary-task-action"
  };
  const secondaryActions: FastTaskAction[] = [
    {
      disabled: busy,
      label: "Quick check-in",
      onPress: () => openQuickCheck("readiness", "top"),
      summary: "30 sec"
    },
    ...((onOpenFuelLog ?? onOpenFuel)
      ? [{
          disabled: busy,
          label: "Log food",
          onPress: () => (onOpenFuelLog ?? onOpenFuel)?.(),
          summary: "If useful"
        }]
      : []),
    ...((onOpenTrainWorkout ?? onOpenTrain)
      ? [{
          disabled: busy,
          label: "Open workout",
          onPress: () => (onOpenTrainWorkout ?? onOpenTrain)?.(),
          summary: "Follow plan"
        }]
      : [])
  ].filter((action) => action.label !== primaryButton.label);
  return (
    <>
      <LuminousScreen testID="today-screen">
        <ScreenHeader eyebrow="Daily mission" title="Today" />
        <PrimaryTaskCard
          accent={accentForTone(dashboard.decision.tone)}
          actionLayout="primary-led"
          primaryAction={plainTodayCopy(dashboard.decision.title)}
          primaryButton={primaryButton}
          purpose={plainTodayCopy(dashboard.topSummary)}
          secondaryActions={secondaryActions}
          testID="today-primary-task"
          title="Do now"
        >
          <CompactStatusStrip
            items={[
              {
                accent: accentForTone(dashboard.readiness.tone),
                label: "Readiness",
                meta: dashboard.readiness.statusLabel,
                value: dashboard.readiness.score === null ? "Unknown" : dashboard.readiness.scoreLabel
              },
              {
                accent: accentForTone(dashboard.decision.tone),
                label: "Training",
                meta: `ACWR ${dashboard.acwrLabel}`,
                value: dashboard.loadStateLabel
              },
              {
                accent: accentForTone(dashboard.fuel[0]?.tone ?? "muted"),
                label: "Fuel",
                meta: "Optional",
                value: dashboard.fuel.length > 0 ? dashboard.fuel[0]?.valueLabel ?? "Unknown" : "Unknown"
              }
            ]}
            variant="quiet"
          />
        </PrimaryTaskCard>
        <TodayDashboardSection
          busy={busy}
          dashboard={dashboard}
          onOpenFuel={onOpenFuelLog ?? onOpenFuel}
          onOpenTrainWorkout={onOpenTrainWorkout ?? onOpenTrain}
          onOpenQuickCheck={openQuickCheck}
          onPrimaryAction={runDashboardPrimaryAction}
        />
        {hasRisk ? (
          <RiskBanner title="Safety stop" message="Safety comes before the plan. Missing or risky logs are unknown, not permission to push." tone="critical">
            <View style={{ gap: spacing.sm }}>
              {viewModel.riskSummary.map((risk, index) => <Text key={`today-risk:${index}`} style={screenStyles.body}>{plainTodayCopy(risk)}</Text>)}
              <Pressable accessibilityLabel="Open safety in Fuel" accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => (onOpenFuelSafety ?? onOpenFuel)?.()} style={screenStyles.quietButton}>
                <Text style={screenStyles.quietButtonText}>Open safety in Fuel</Text>
              </Pressable>
            </View>
          </RiskBanner>
        ) : null}
        {message ? (
          <EngineCard>
            <Text style={[screenStyles.subtle, { color: colors.amberCaution }]}>App note: {message}. Existing plan stays visible unless safety says otherwise.</Text>
          </EngineCard>
        ) : null}
        {showCycleImpact && (cycleContext || cycleTrackingStatus === "undecided") ? (
          <EngineCard>
            <CycleContextCard cycleContext={cycleContext} framed={false} trackingStatus={cycleTrackingStatus} />
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
