import React from "react";
import { Pressable, Text, View } from "react-native";
import type { CycleSymptom, CycleViewModel, FuelViewModel, PlanViewModel, RecentLogsViewModel, TodayViewModel, TrainViewModel } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
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
import { colors, spacing } from "../../design/theme";
import { buildTodayDashboardVisual, type TodayDashboardVisual } from "../../engine/presentation/dashboardVisualData";
import type { QuickLogActions } from "../../hooks/useQuickLogs";
import { CycleContextCard } from "./cycle/CycleContextCard";
import { BodyMassLogCard, CycleLogCard, HydrationLogCard, ReadinessCheckInCard } from "./logging/LogCards";
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

function plainTodayCopy(value: string): string {
  return value
    .replace(new RegExp("hard " + "stops", "gi"), "safety stops")
    .replace(new RegExp("hard " + "stop", "gi"), "safety stop");
}

export const handledTodaySecondaryActions: Record<TodaySecondaryAction, true> = {
  log_food: true,
  log_readiness: true,
  mark_food_not_tracking: true,
  start_without_logging: true
};

function TodayQuickCheckSection({
  busy,
  cycleQuickLogEnabled,
  cycleSymptomOptions,
  focus,
  quickLogs,
  recentLogs
}: {
  busy: boolean;
  cycleQuickLogEnabled: boolean;
  cycleSymptomOptions: readonly CycleSymptom[];
  focus: TodayQuickCheckFocus;
  quickLogs: QuickLogActions;
  recentLogs: RecentLogsViewModel;
}) {
  const focusCopy =
    focus === "readiness"
      ? "Readiness first"
    : focus === "body_mass"
        ? "Weight trend first"
        : "Hydration first";
  return (
    <View style={{ gap: spacing.lg }} testID="today-quick-check-section">
      <EngineCard>
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.sectionTitle}>Quick check</Text>
          <Text style={screenStyles.callout}>{focusCopy}</Text>
          <Text style={screenStyles.subtle}>Logging helps the plan. Missing logs make the plan less certain.</Text>
        </View>
      </EngineCard>
      {focus === "hydration" ? (
        <>
          <HydrationLogCard actions={quickLogs} busy={busy} status={recentLogs.hydrationToday} />
          <ReadinessCheckInCard actions={quickLogs} busy={busy} status={recentLogs.readinessToday} />
          <BodyMassLogCard actions={quickLogs} busy={busy} status={recentLogs.bodyMassToday} />
        </>
      ) : focus === "body_mass" ? (
        <>
          <BodyMassLogCard actions={quickLogs} busy={busy} status={recentLogs.bodyMassToday} />
          <ReadinessCheckInCard actions={quickLogs} busy={busy} status={recentLogs.readinessToday} />
          <HydrationLogCard actions={quickLogs} busy={busy} status={recentLogs.hydrationToday} />
        </>
      ) : (
        <>
          <ReadinessCheckInCard actions={quickLogs} busy={busy} status={recentLogs.readinessToday} />
          <BodyMassLogCard actions={quickLogs} busy={busy} status={recentLogs.bodyMassToday} />
          <HydrationLogCard actions={quickLogs} busy={busy} status={recentLogs.hydrationToday} />
        </>
      )}
      {cycleQuickLogEnabled ? <CycleLogCard actions={quickLogs} busy={busy} cycleSymptomOptions={cycleSymptomOptions} /> : null}
    </View>
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
  onOpenQuickCheck: (focus: TodayQuickCheckFocus) => void;
  onPrimaryAction: () => void;
}) {
  const actionButtonStyle = [screenStyles.quietButton, { flexBasis: 148, flexGrow: 1 }];
  return (
    <View style={{ gap: spacing.md }} testID="today-visual-dashboard">
      <DashboardCard
        headerRight={<DashboardPill label={dashboard.readiness.statusLabel} tone={dashboard.readiness.tone} />}
        testID="today-readiness-gauge"
        title="Readiness score"
      >
        <View style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.lg }}>
          <MetricRing
            label="Readiness score"
            subLabel={dashboard.readiness.score === null ? "readiness" : "/100"}
            tone={dashboard.readiness.tone}
            value={dashboard.readiness.score}
          />
          <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, minWidth: 220 }}>
            {dashboard.readiness.metrics.map((item) => <VisualMetricTile item={item} key={`today-readiness-metric:${item.label}`} />)}
          </View>
        </View>
        {dashboard.readiness.emptyActionLabel ? (
          <Pressable
            accessibilityLabel="Log readiness"
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={() => onOpenQuickCheck("readiness")}
            style={screenStyles.quietButton}
          >
            <Text style={screenStyles.quietButtonText}>{dashboard.readiness.emptyActionLabel}</Text>
          </Pressable>
        ) : null}
      </DashboardCard>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
        <View style={{ flexBasis: 280, flexGrow: 1 }}>
          <DashboardCard
            headerRight={<DashboardPill label={dashboard.loadStateLabel} tone={dashboard.loadStateLabel === "High" ? "red" : dashboard.loadStateLabel === "Watch" ? "orange" : "green"} />}
            testID="today-weekly-load-chart"
            title="Weekly training load"
          >
            <Text style={screenStyles.subtle}>ACWR {dashboard.acwrLabel}</Text>
            <WeeklyLoadBars bars={dashboard.weeklyLoad} />
          </DashboardCard>
        </View>
        <View style={{ flexBasis: 280, flexGrow: 1 }}>
          <DashboardCard
            headerRight={onOpenFuel ? <DashboardPill label="Details" tone="blue" /> : null}
            testID="today-fuel-status-bars"
            title="Fuel status"
          >
            <View style={{ gap: spacing.sm }}>
              {dashboard.fuel.map((item) => <ProgressMeter compact item={item} key={`today-fuel:${item.label}`} />)}
            </View>
          </DashboardCard>
        </View>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
        <View style={{ flexBasis: 280, flexGrow: 1 }}>
          <DashboardCard title="Body mass trend">
            <View style={{ gap: spacing.sm }}>
              <View style={{ alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: colors.canvas, fontSize: 28, fontWeight: "900", lineHeight: 34 }}>{dashboard.bodyMass.currentLabel}</Text>
                <Text style={{ color: dashboard.bodyMass.tone === "green" ? colors.readyGreen : colors.amberCaution, fontSize: 13, fontWeight: "900", lineHeight: 17 }}>
                  {dashboard.bodyMass.deltaLabel}
                </Text>
              </View>
              <TrendLineChart accent="blue" points={dashboard.bodyMass.points} width={230} />
              {dashboard.bodyMass.points.length === 0 ? <Text style={screenStyles.subtle}>{dashboard.bodyMass.emptyLabel}</Text> : null}
            </View>
          </DashboardCard>
        </View>
        <View style={{ flexBasis: 280, flexGrow: 1 }}>
          <DashboardCard testID="today-training-decision-meter" title="Today's training decision">
            <View style={{ gap: spacing.sm }}>
              <Text style={{ color: colors.canvas, fontSize: 22, fontWeight: "900", lineHeight: 28 }}>{dashboard.decision.title}</Text>
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

      <DashboardCard title="Today's schedule">
        <TimelineStrip items={dashboard.schedule} />
      </DashboardCard>

      <DashboardCard testID="today-manual-actions" title="Manual inputs">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <Pressable
            accessibilityLabel="Quick check-in"
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={() => onOpenQuickCheck("readiness")}
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
        onPress={onPrimaryAction}
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
  cycleQuickLogEnabled,
  cycleTrackingStatus,
  cycleSymptomOptions,
  busy,
  message,
  onOpenFuel,
  onOpenFuelLog,
  onOpenFuelSafety,
  onOpenPlan,
  onOpenTrain,
  onOpenTrainWorkout
}: TodayScreenProps) {
  const [quickCheckOpen, setQuickCheckOpen] = React.useState(false);
  const [quickCheckFocus, setQuickCheckFocus] = React.useState<TodayQuickCheckFocus>("readiness");
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
  const openQuickCheck = (focus: TodayQuickCheckFocus) => {
    setQuickCheckFocus(focus);
    setQuickCheckOpen(true);
  };
  const dashboard = buildTodayDashboardVisual({
    asOfDate,
    fuel: fuelViewModel,
    plan: planViewModel,
    recentLogs,
    today: viewModel,
    train: trainViewModel
  });
  const runDashboardPrimaryAction = () => {
    if (/fuel/i.test(dashboard.ctaLabel)) {
      (onOpenFuelLog ?? onOpenFuel)?.();
      return;
    }
    if (/readiness/i.test(dashboard.ctaLabel)) {
      openQuickCheck("readiness");
      return;
    }
    if (/adjust/i.test(dashboard.ctaLabel)) {
      (onOpenPlan ?? onOpenTrain)?.();
      return;
    }
    (onOpenTrainWorkout ?? onOpenTrain)?.();
  };
  return (
    <LuminousScreen testID="today-screen">
      <ScreenHeader eyebrow="Daily mission" title="Today" />
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
      {quickCheckOpen ? (
        <TodayQuickCheckSection
          busy={busy}
          cycleQuickLogEnabled={cycleQuickLogEnabled}
          cycleSymptomOptions={cycleSymptomOptions}
          focus={quickCheckFocus}
          quickLogs={quickLogs}
          recentLogs={recentLogs}
        />
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
  );
}
