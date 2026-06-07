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
    return { meta: "Food unknown", value: "Fuel gate" } as const;
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

function TodayContextDetails({ recentLogs, viewModel }: { recentLogs: RecentLogsViewModel; viewModel: TodayViewModel }) {
  return (
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Today's context</Text>
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.fieldLabel}>Readiness</Text>
          <Text style={screenStyles.body}>{viewModel.readinessContext}</Text>
          <Text style={screenStyles.subtle}>{recentLogs.readinessToday.summary}</Text>
        </View>
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.fieldLabel}>Fuel</Text>
          <Text style={screenStyles.body}>{viewModel.fuelPriority}</Text>
          <Text style={screenStyles.subtle}>{recentLogs.foodToday.summary}</Text>
        </View>
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.fieldLabel}>Body mass</Text>
          <Text style={screenStyles.body}>{viewModel.bodyMassStatus}</Text>
          <Text style={screenStyles.subtle}>{recentLogs.bodyMassToday.summary}</Text>
        </View>
      </View>
  );
}

function TodayFastTaskCard({
  busy,
  cycleQuickLogEnabled,
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
  cycleQuickLogEnabled: boolean;
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
    { disabled: busy, label: "Readiness", onPress: () => onOpenQuickCheck("readiness"), summary: recentLogs.readinessToday.loggedToday ? "Logged" : "Check" },
    { disabled: busy, label: "Body mass", onPress: () => onOpenQuickCheck("body_mass"), summary: recentLogs.bodyMassToday.loggedToday ? "Logged" : "Optional" },
    { disabled: busy, label: "Water", onPress: () => onOpenQuickCheck("hydration"), summary: recentLogs.hydrationToday.loggedToday ? "Logged" : "Add" },
    ...(openFuel ? [{ disabled: busy, label: "Food", onPress: openFuel, summary: recentLogs.foodToday.entryCount > 0 ? "Logged" : "Log" }] : []),
    ...(openWorkout ? [{ disabled: busy, label: "Training result", onPress: openWorkout, summary: "Workout" }] : []),
    ...(cycleQuickLogEnabled ? [{ disabled: busy, label: "Cycle symptoms", onPress: () => onOpenQuickCheck("readiness"), summary: "Optional" }] : [])
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
      secondaryActions={[{ disabled: busy, label: "Do 60-sec check-in", onPress: () => onOpenQuickCheck("readiness"), summary: "Readiness first" }]}
      testID="today-operating-mode-card"
      title="Do this now"
    >
      <QuickActionRow actions={quickActions} label="Log this if you have 30 seconds" testID="today-quick-action-row" />
      <CollapsedDetailDisclosure framed={false} title="More manual shortcuts" summary="Food, readiness, and skip-ahead options stay out of the first glance.">
        <QuickActionRow actions={shortcutActions} />
      </CollapsedDetailDisclosure>
      <Text style={screenStyles.subtle}>Mode: {viewModel.dailyOperatingMode.title}. {recentLogs.foodToday.summary}</Text>
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
        ? "Body-mass context first"
        : "Hydration first";
  return (
    <View style={{ gap: spacing.lg }} testID="today-quick-check-section">
      <EngineCard>
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.sectionTitle}>Quick check</Text>
          <Text style={screenStyles.callout}>{focusCopy}</Text>
          <Text style={screenStyles.subtle}>Manual inputs improve confidence; missing data stays unknown, not safe.</Text>
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

function ExecutionGuidanceDetails({ viewModel }: { viewModel: TodayViewModel }) {
  return (
      <View style={{ gap: spacing.sm }} testID="today-execution-guidance-card">
        <Text style={screenStyles.sectionTitle}>Execution Guidance</Text>
        {viewModel.executionGuidance.map((item, index) => <Text key={`today-execution:${index}`} style={screenStyles.body}>{item}</Text>)}
        <Text style={screenStyles.sectionTitle}>Why This Matters</Text>
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
        <RiskBanner title="Safety check" message="The engine is surfacing this before normal guidance because missing or risky data is unknown, not safe." tone="critical">
          <View style={{ gap: spacing.sm }}>
            {viewModel.riskSummary.map((risk, index) => <Text key={`today-risk:${index}`} style={screenStyles.body}>{risk}</Text>)}
            <Pressable accessibilityLabel="Inspect safety review in Fuel" accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => (onOpenFuelSafety ?? onOpenFuel)?.()} style={screenStyles.quietButton}>
              <Text style={screenStyles.quietButtonText}>Inspect safety review in Fuel</Text>
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
        cycleQuickLogEnabled={cycleQuickLogEnabled}
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
          <Text style={[screenStyles.subtle, { color: colors.amberCaution }]}>App note: {message}. Existing engine state stays visible unless a hard stop says otherwise.</Text>
        </EngineCard>
      ) : null}
      <CollapsedDetailDisclosure title="Execution guidance" summary="Open for training execution notes after the first action.">
        <ExecutionGuidanceDetails viewModel={viewModel} />
      </CollapsedDetailDisclosure>
      <CollapsedDetailDisclosure title="Today's context" summary="Readiness, fuel, and body-mass context stay available without crowding the command center.">
        <TodayContextDetails recentLogs={recentLogs} viewModel={viewModel} />
      </CollapsedDetailDisclosure>
      <CollapsedDetailDisclosure title="Training call" summary={`Confidence: ${viewModel.confidenceLabel}. Missing data remains unknown.`}>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Training call</Text>
          <Text style={screenStyles.callout}>{viewModel.primaryAction}</Text>
          <Text style={screenStyles.body}>{viewModel.whatChanged}</Text>
          <Text style={screenStyles.fieldLabel}>Training</Text>
          <Text style={screenStyles.body}>{viewModel.trainingPriority}</Text>
          <Text style={screenStyles.subtle}>{recentLogs.trainingRecentSummary}</Text>
          <Text style={screenStyles.fieldLabel}>Fuel</Text>
          <Text style={screenStyles.body}>{viewModel.fuelPriority}</Text>
          <Text style={screenStyles.subtle}>{recentLogs.foodLogCountToday}</Text>
        </View>
      </CollapsedDetailDisclosure>
      <CollapsedDetailDisclosure
        title="Missing and optional context"
        summary={`${recentLogs.bodyMassToday.statusLabel}; ${recentLogs.readinessToday.statusLabel}; ${recentLogs.hydrationToday.statusLabel}. Manual input is first-class.`}
      >
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Missing and optional context</Text>
          <Text style={screenStyles.body}>Add only the true manual logs you have.</Text>
          <Text style={screenStyles.subtle}>No-shame logging: missing entries lower confidence; they are never treated as failure or permission to push harder.</Text>
          <Text style={screenStyles.body}>Body mass: {viewModel.bodyMassStatus}</Text>
          <Text style={screenStyles.body}>Readiness: {viewModel.readinessContext}</Text>
          {viewModel.cycleContext ? <Text style={screenStyles.body}>Cycle: {viewModel.cycleContext}</Text> : null}
          {viewModel.quickLogs.map((item, index) => <Text key={`today-quick-log:${index}`} style={screenStyles.subtle}>Optional log: {item}</Text>)}
        </View>
      </CollapsedDetailDisclosure>
      {cycleContext || cycleTrackingStatus === "undecided" ? (
        <CollapsedDetailDisclosure title="Cycle context" summary="Optional private symptom-aware context stays collapsed unless enabled or undecided.">
          <CycleContextCard cycleContext={cycleContext} framed={false} trackingStatus={cycleTrackingStatus} />
        </CollapsedDetailDisclosure>
      ) : null}
      <CollapsedDetailDisclosure title="engine detail" summary="Optional rationale, confidence, and safety context.">
        <View style={{ gap: spacing.sm }}>
          {viewModel.decisionStack.map((item, index) => (
            <View key={`decision-stack:${index}`} style={{ gap: spacing.xs }}>
              <Text style={screenStyles.callout}>{item.label}: {item.summary}</Text>
              <Text style={screenStyles.subtle}>Why: {item.why} Confidence: {item.confidence}</Text>
            </View>
          ))}
        </View>
      </CollapsedDetailDisclosure>
      <CollapsedDetailDisclosure title="why this decision" summary="Open this when you want the engine rationale without crowding the first action.">
        <Text style={screenStyles.body}>{viewModel.why}</Text>
      </CollapsedDetailDisclosure>
      <CollapsedDetailDisclosure
        title="Recent summary"
        summary={
          hasRecentLogs
            ? `${recentLogs.today.length} recent item${recentLogs.today.length === 1 ? "" : "s"} hidden until needed.`
            : "No logs yet today. Start with the smallest true manual log; missing data stays unknown, not safe."
        }
      >
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Recent summary</Text>
          {hasRecentLogs ? (
            recentLogs.today.map((item, index) => <Text key={`today-recent-log:${index}`} style={screenStyles.body}>{item}</Text>)
          ) : (
            <Text style={screenStyles.body}>Readiness, body mass, food, water, or training history is missing. That lowers confidence because the engine has less context.</Text>
          )}
        </View>
      </CollapsedDetailDisclosure>
    </LuminousScreen>
  );
}
