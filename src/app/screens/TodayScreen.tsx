import React from "react";
import { Pressable, Text, View } from "react-native";
import type { CycleSymptom, CycleViewModel, RecentLogsViewModel, TodayViewModel } from "../../engine/core/types";
import { ActionCard } from "../../design/components/ActionCard";
import { DisclosureCard } from "../../design/components/DisclosureCard";
import { EngineCard } from "../../design/components/EngineCard";
import { EmptyState } from "../../design/components/EmptyState";
import { LuminousScreen, MetricTile, ScreenHeader } from "../../design/components/LuminousScreen";
import { MetricRow } from "../../design/components/MetricRow";
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
  onOpenTrain?: (() => void) | undefined;
}

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

function TodayContextCard({ recentLogs, viewModel }: { recentLogs: RecentLogsViewModel; viewModel: TodayViewModel }) {
  return (
    <EngineCard>
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
    </EngineCard>
  );
}

function DailyOperatingModeCard({
  busy,
  onOpenFuel,
  onOpenTrain,
  quickLogs,
  recentLogs,
  viewModel
}: {
  busy: boolean;
  onOpenFuel?: (() => void) | undefined;
  onOpenTrain?: (() => void) | undefined;
  quickLogs: QuickLogActions;
  recentLogs: RecentLogsViewModel;
  viewModel: TodayViewModel;
}) {
  const actionPress = (action: TodayViewModel["secondaryActions"][number]["action"]) => {
    if (action === "start_without_logging") {
      onOpenTrain?.();
      return;
    }
    if (action === "log_food") {
      onOpenFuel?.();
      return;
    }
    if (action === "mark_food_not_tracking") {
      void quickLogs.markFoodNotTrackingToday();
    }
  };
  return (
    <EngineCard>
      <View style={{ gap: spacing.md }} testID="today-operating-mode-card">
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.sectionTitle}>Daily Check-In / Daily Operating Mode</Text>
          <Text style={screenStyles.callout}>{viewModel.dailyOperatingMode.title}</Text>
          <Text style={screenStyles.body}>{viewModel.dailyOperatingMode.athleteFacingSummary}</Text>
          <Text style={screenStyles.subtle}>Readiness: {viewModel.statusSnapshot.readinessStatus}. Fuel log: {viewModel.statusSnapshot.fuelLogStatus}. Hydration: {viewModel.statusSnapshot.hydrationStatus}.</Text>
        </View>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => undefined} style={screenStyles.button}>
          <Text style={screenStyles.buttonText}>Do 60-sec check-in</Text>
        </Pressable>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {viewModel.secondaryActions.map((action) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              key={`today-secondary:${action.action}`}
              onPress={() => actionPress(action.action)}
              style={[screenStyles.quietButton, { flexBasis: 180, flexGrow: 1 }]}
            >
              <Text style={screenStyles.quietButtonText}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={screenStyles.subtle}>{recentLogs.foodToday.summary}</Text>
      </View>
    </EngineCard>
  );
}

function ExecutionGuidanceCard({ viewModel }: { viewModel: TodayViewModel }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }} testID="today-execution-guidance-card">
        <Text style={screenStyles.sectionTitle}>Execution Guidance</Text>
        {viewModel.executionGuidance.map((item, index) => <Text key={`today-execution:${index}`} style={screenStyles.body}>{item}</Text>)}
        <Text style={screenStyles.sectionTitle}>Why This Matters</Text>
        <Text style={screenStyles.subtle}>{viewModel.whyThisMatters}</Text>
      </View>
    </EngineCard>
  );
}

export function TodayScreen({ viewModel, recentLogs, cycleContext, quickLogs, cycleQuickLogEnabled, cycleTrackingStatus, cycleSymptomOptions, busy, message, onOpenFuel, onOpenTrain }: TodayScreenProps) {
  const hasRisk = viewModel.riskSummary.length > 0;
  const hasRecentLogs = recentLogs.today.length > 0;
  const readiness = readinessMetric(recentLogs);
  const fuel = fuelMetric(viewModel, recentLogs);
  const bodyMass = bodyMassMetric(recentLogs);
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
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
        <MetricTile accent={readiness.accent} label="Readiness" meta={readiness.meta} value={readiness.value} />
        <MetricTile accent="orange" label="Fuel" meta={fuel.meta} value={fuel.value} />
        <MetricTile accent="blue" label="Weight" meta={bodyMass.meta} value={bodyMass.value} />
      </View>
      <DailyOperatingModeCard busy={busy} onOpenFuel={onOpenFuel} onOpenTrain={onOpenTrain} quickLogs={quickLogs} recentLogs={recentLogs} viewModel={viewModel} />
      <ExecutionGuidanceCard viewModel={viewModel} />
      <TodayContextCard recentLogs={recentLogs} viewModel={viewModel} />
      {hasRisk ? (
        <RiskBanner title="Safety check" message="The engine is surfacing this before logs because missing or risky data is unknown, not safe." tone="critical">
          <View style={{ gap: spacing.xs }}>
            {viewModel.riskSummary.map((risk, index) => <Text key={`today-risk:${index}`} style={screenStyles.body}>{risk}</Text>)}
          </View>
        </RiskBanner>
      ) : null}
      <ReadinessCheckInCard actions={quickLogs} busy={busy} status={recentLogs.readinessToday} />
      <BodyMassLogCard actions={quickLogs} busy={busy} status={recentLogs.bodyMassToday} />
      <HydrationLogCard actions={quickLogs} busy={busy} status={recentLogs.hydrationToday} />
      {cycleQuickLogEnabled ? <CycleLogCard actions={quickLogs} busy={busy} cycleSymptomOptions={cycleSymptomOptions} /> : null}
      {message ? (
        <EngineCard>
          <Text style={[screenStyles.subtle, { color: colors.amberCaution }]}>App note: {message}. Existing engine state stays visible unless a hard stop says otherwise.</Text>
        </EngineCard>
      ) : null}
      <ActionCard
        action={viewModel.primaryAction}
        detailLabel="today snapshot"
        detailSummary="Open for the training/fuel snapshot after the daily logs."
        status={`Confidence: ${viewModel.confidenceLabel}. Missing data remains unknown.`}
        title="Training call"
        why={viewModel.whatChanged}
      >
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.fieldLabel}>Training</Text>
          <Text style={screenStyles.body}>{viewModel.trainingPriority}</Text>
          <Text style={screenStyles.subtle}>{recentLogs.trainingRecentSummary}</Text>
          <Text style={screenStyles.fieldLabel}>Fuel</Text>
          <Text style={screenStyles.body}>{viewModel.fuelPriority}</Text>
          <Text style={screenStyles.subtle}>{recentLogs.foodLogCountToday}</Text>
        </View>
      </ActionCard>
      <ActionCard
        action="Add only the true manual logs you have."
        detailLabel="optional context"
        detailSummary="Manual input is first-class. Wearables only increase confidence when fresh and consistent."
        status={`${recentLogs.bodyMassToday.statusLabel}; ${recentLogs.readinessToday.statusLabel}; ${recentLogs.hydrationToday.statusLabel}.`}
        title="Missing and optional context"
        why="No-shame logging: missing entries lower confidence; they are never treated as failure or permission to push harder."
      >
        <View style={{ gap: spacing.sm }}>
          <MetricRow label="Body mass" value={viewModel.bodyMassStatus} />
          <MetricRow label="Readiness" value={viewModel.readinessContext} />
          {viewModel.cycleContext ? <MetricRow label="Cycle" value={viewModel.cycleContext} /> : null}
          {viewModel.quickLogs.map((item, index) => <Text key={`today-quick-log:${index}`} style={screenStyles.subtle}>Optional log: {item}</Text>)}
        </View>
      </ActionCard>
      <CycleContextCard cycleContext={cycleContext} trackingStatus={cycleTrackingStatus} />
      <DisclosureCard title="engine detail" summary="Optional rationale, confidence, and safety context.">
        <View style={{ gap: spacing.sm }}>
          {viewModel.decisionStack.map((item, index) => (
            <View key={`decision-stack:${index}`} style={{ gap: spacing.xs }}>
              <Text style={screenStyles.callout}>{item.label}: {item.summary}</Text>
              <Text style={screenStyles.subtle}>Why: {item.why} Confidence: {item.confidence}</Text>
            </View>
          ))}
        </View>
      </DisclosureCard>
      <DisclosureCard title="why this decision" summary="Open this when you want the engine rationale without crowding the first action.">
        <Text style={screenStyles.body}>{viewModel.why}</Text>
      </DisclosureCard>
      {hasRecentLogs ? (
        <EngineCard>
          <View style={{ gap: spacing.sm }}>
            <Text style={screenStyles.sectionTitle}>Recent summary</Text>
            {recentLogs.today.map((item, index) => <Text key={`today-recent-log:${index}`} style={screenStyles.body}>{item}</Text>)}
          </View>
        </EngineCard>
      ) : (
        <EmptyState title="No logs yet today" message="Readiness, body mass, food, water, or training history is missing. That lowers confidence because the engine has less context. Start with the smallest true manual log; missing data stays unknown, not safe." />
      )}
    </LuminousScreen>
  );
}
