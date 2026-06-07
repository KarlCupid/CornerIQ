import React from "react";
import { Pressable, Text, View } from "react-native";
import type { CycleSymptom, CycleViewModel, RecentLogsViewModel, TodayViewModel } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
import { CollapsedDetailDisclosure, CompactStatusStrip, PrimaryTaskCard, QuickActionRow, type FastTaskAction } from "../../design/components/FastTask";
import { LuminousScreen, ScreenHeader } from "../../design/components/LuminousScreen";
import { RiskBanner } from "../../design/components/RiskBanner";
import { TopActionCard } from "../../design/components/TopActionCard";
import { colors, spacing } from "../../design/theme";
import type { QuickLogActions } from "../../hooks/useQuickLogs";
import { CycleContextCard } from "./cycle/CycleContextCard";
import { BodyMassLogCard, CycleLogCard, HydrationLogCard, ReadinessCheckInCard } from "./logging/LogCards";
import { screenStyles } from "./screenStyles";

export interface TodayScreenProps {
  viewModel: TodayViewModel;
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

function readinessMetric(recentLogs: RecentLogsViewModel) {
  return {
    accent: recentLogs.readinessToday.loggedToday ? "green" : "blue",
    meta: recentLogs.readinessToday.loggedToday ? "Fresh today" : "Safer defaults",
    value: recentLogs.readinessToday.loggedToday ? "Logged" : "Check in"
  } as const;
}

function fuelMetric(viewModel: TodayViewModel, recentLogs: RecentLogsViewModel) {
  if (recentLogs.foodToday.status === "not_tracking_today") {
    return { meta: "Not tracking", value: "Advisory" } as const;
  }
  if (recentLogs.foodToday.entryCount === 0) {
    return { meta: "Food unknown", value: "Fuel check" } as const;
  }
  if (/carb/i.test(viewModel.fuelPriority)) {
    return { meta: recentLogs.foodToday.statusLabel, value: "Carbs needed" } as const;
  }
  return { meta: recentLogs.foodToday.statusLabel, value: "On track" } as const;
}

function bodyMassMetric(recentLogs: RecentLogsViewModel) {
  return {
    meta: recentLogs.bodyMassToday.loggedToday ? "Today" : "Trend unknown",
    value: recentLogs.bodyMassToday.loggedToday ? "Logged" : "No log"
  } as const;
}

function TodayFastTaskCard({
  busy,
  onOpenFuel,
  onOpenFuelLog,
  onOpenQuickCheck,
  onOpenTrain,
  onOpenTrainWorkout,
  quickLogs,
  recentLogs,
  viewModel
}: {
  busy: boolean;
  onOpenFuel?: (() => void) | undefined;
  onOpenFuelLog?: (() => void) | undefined;
  onOpenQuickCheck: (focus: TodayQuickCheckFocus) => void;
  onOpenTrain?: (() => void) | undefined;
  onOpenTrainWorkout?: (() => void) | undefined;
  quickLogs: QuickLogActions;
  recentLogs: RecentLogsViewModel;
  viewModel: TodayViewModel;
}) {
  const openWorkout = onOpenTrainWorkout ?? onOpenTrain;
  const openFuel = onOpenFuelLog ?? onOpenFuel;
  const routePrimaryToFuel = /fuel|food|water|hydr/i.test(viewModel.mission.primaryAction);
  const primaryRoute =
    routePrimaryToFuel && openFuel
      ? { disabled: busy, label: "Open fuel", onPress: openFuel, summary: "Act or log" }
      : openWorkout
        ? { disabled: busy, label: "Open workout", onPress: openWorkout, summary: "Then log result" }
        : undefined;
  const actionHandlers: Record<TodaySecondaryAction, () => void> = {
    log_food: () => (onOpenFuelLog ?? onOpenFuel)?.(),
    log_readiness: () => onOpenQuickCheck("readiness"),
    mark_food_not_tracking: () => {
      void quickLogs.markFoodNotTrackingToday();
    },
    start_without_logging: () => (onOpenTrainWorkout ?? onOpenTrain)?.()
  };
  const actionPress = (action: TodaySecondaryAction) => actionHandlers[action]();
  const quickActions: FastTaskAction[] = [
    { disabled: busy, label: "Quick check-in", onPress: () => onOpenQuickCheck("readiness"), summary: recentLogs.readinessToday.loggedToday ? "Logged" : "60 sec" },
    ...(openFuel ? [{ disabled: busy, label: "Log food", onPress: openFuel, summary: recentLogs.foodToday.entryCount > 0 ? "Logged" : "Food/water" }] : []),
    ...(openWorkout ? [{ disabled: busy, label: "Open workout", onPress: openWorkout, summary: "Then log" }] : [])
  ];
  const shortcutActions = viewModel.secondaryActions
    .filter((action) => {
      if (action.action === "log_readiness") {
        return false;
      }
      if (action.action === "log_food") {
        return Boolean(openFuel);
      }
      if (action.action === "start_without_logging") {
        return Boolean(openWorkout);
      }
      return true;
    })
    .map((action) => ({
      disabled: busy,
      label: action.label,
      onPress: () => actionPress(action.action)
    }));
  return (
    <PrimaryTaskCard
      accent="blue"
      primaryAction={viewModel.dailyOperatingMode.primaryAction}
      primaryButton={primaryRoute}
      purpose={viewModel.dailyOperatingMode.athleteFacingSummary}
      secondaryActions={[{ disabled: busy, label: "Quick check-in", onPress: () => onOpenQuickCheck("readiness"), summary: "Readiness first" }]}
      testID="today-operating-mode-card"
      title="Do this now"
    >
      <QuickActionRow actions={quickActions} label="Log this if you have 30 seconds" testID="today-quick-action-row" />
      {shortcutActions.length > 0 ? (
        <CollapsedDetailDisclosure framed={false} title="More logs" summary="Extra logging shortcuts stay out of the first glance.">
          <QuickActionRow actions={shortcutActions} />
        </CollapsedDetailDisclosure>
      ) : null}
      <Text style={screenStyles.subtle}>Today's plan: {viewModel.dailyOperatingMode.title}. {recentLogs.foodToday.summary}</Text>
    </PrimaryTaskCard>
  );
}

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

function TodayPlanReasonDetails({
  hasRecentLogs,
  recentLogs,
  showCycleImpact,
  viewModel
}: {
  hasRecentLogs: boolean;
  recentLogs: RecentLogsViewModel;
  showCycleImpact: boolean;
  viewModel: TodayViewModel;
}) {
  return (
    <View style={{ gap: spacing.sm }} testID="today-plan-reason-card">
      <Text style={screenStyles.sectionTitle}>What changed</Text>
      <Text style={screenStyles.body}>{viewModel.whatChanged}</Text>
      <Text style={screenStyles.sectionTitle}>How to do it</Text>
      {viewModel.executionGuidance.map((item, index) => <Text key={`today-how-to:${index}`} style={screenStyles.body}>{item}</Text>)}
      <Text style={screenStyles.sectionTitle}>What we know</Text>
      <Text style={screenStyles.body}>Readiness: {viewModel.readinessContext}</Text>
      <Text style={screenStyles.body}>Fuel: {viewModel.fuelPriority}</Text>
      <Text style={screenStyles.body}>Weight trend: {viewModel.bodyMassStatus}</Text>
      {showCycleImpact && viewModel.cycleContext ? <Text style={screenStyles.body}>Cycle: {viewModel.cycleContext}</Text> : null}
      <Text style={screenStyles.sectionTitle}>Missing logs</Text>
      <Text style={screenStyles.subtle}>{recentLogs.bodyMassToday.statusLabel}; {recentLogs.readinessToday.statusLabel}; {recentLogs.hydrationToday.statusLabel}.</Text>
      <Text style={screenStyles.subtle}>Add only the true logs you have. Missing logs make the plan less certain; they are never permission to push harder.</Text>
      <Text style={screenStyles.sectionTitle}>Recent summary</Text>
      {hasRecentLogs ? (
        recentLogs.today.map((item, index) => <Text key={`today-recent-log:${index}`} style={screenStyles.body}>{item}</Text>)
      ) : (
        <Text style={screenStyles.body}>No logs yet today. Start with the smallest true log.</Text>
      )}
      <Text style={screenStyles.sectionTitle}>Why</Text>
      <Text style={screenStyles.body}>{viewModel.why}</Text>
      <Text style={screenStyles.subtle}>{viewModel.whyThisMatters}</Text>
    </View>
  );
}

export function TodayScreen({
  viewModel,
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
  onOpenTrain,
  onOpenTrainWorkout
}: TodayScreenProps) {
  const [quickCheckOpen, setQuickCheckOpen] = React.useState(false);
  const [quickCheckFocus, setQuickCheckFocus] = React.useState<TodayQuickCheckFocus>("readiness");
  const hasRisk = viewModel.riskSummary.length > 0;
  const hasRecentLogs = recentLogs.today.length > 0;
  const readiness = readinessMetric(recentLogs);
  const fuel = fuelMetric(viewModel, recentLogs);
  const bodyMass = bodyMassMetric(recentLogs);
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
  return (
    <LuminousScreen testID="today-screen">
      <ScreenHeader eyebrow="CornerIQ" title={viewModel.title} />
      <TopActionCard
        accent="blue"
        optional={viewModel.mission.optional}
        primaryAction={viewModel.mission.primaryAction}
        purpose={viewModel.mission.purpose}
        testID="today-mission-card"
        title={viewModel.mission.title}
        why={viewModel.mission.why}
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
      <CompactStatusStrip
        items={[
          { accent: readiness.accent, label: "Readiness", meta: readiness.meta, value: readiness.value },
          { accent: "orange", label: "Fuel", meta: fuel.meta, value: fuel.value },
          { accent: "blue", label: "Weight", meta: bodyMass.meta, value: bodyMass.value }
        ]}
        testID="today-compact-status-strip"
      />
      <TodayFastTaskCard
        busy={busy}
        onOpenFuel={onOpenFuel}
        onOpenFuelLog={onOpenFuelLog}
        onOpenQuickCheck={openQuickCheck}
        onOpenTrain={onOpenTrain}
        onOpenTrainWorkout={onOpenTrainWorkout}
        quickLogs={quickLogs}
        recentLogs={recentLogs}
        viewModel={viewModel}
      />
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
      <CollapsedDetailDisclosure
        title="Why this plan?"
        summary={
          hasRecentLogs
            ? `${recentLogs.today.length} recent item${recentLogs.today.length === 1 ? "" : "s"}, missing logs, and the short why.`
            : "What changed, missing logs, and the short why."
        }
      >
        <TodayPlanReasonDetails hasRecentLogs={hasRecentLogs} recentLogs={recentLogs} showCycleImpact={showCycleImpact} viewModel={viewModel} />
      </CollapsedDetailDisclosure>
    </LuminousScreen>
  );
}
