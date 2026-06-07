import React, { type PropsWithChildren } from "react";
import { Pressable, Text, View } from "react-native";
import type { FuelContextCard, FuelViewModel, RecentLogsViewModel } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
import { EmptyState } from "../../design/components/EmptyState";
import { LuminousProgressBar, LuminousScreen, ScreenHeader, type LuminousAccent } from "../../design/components/LuminousScreen";
import {
  DashboardCard,
  DashboardPill,
  MacroRing,
  MiniBarChart,
  ProgressMeter,
  RangeGauge,
  TrendLineChart
} from "../../design/components/PerformanceVisuals";
import { TopActionCard } from "../../design/components/TopActionCard";
import { colors, spacing } from "../../design/theme";
import { buildFuelDashboardVisual, type FuelDashboardVisual } from "../../engine/presentation/dashboardVisualData";
import type { QuickLogActions } from "../../hooks/useQuickLogs";
import {
  FightWeekFuelCard,
  BodyMassTrajectoryCard,
  FuelCommandCard,
  FuelHistoryCard,
  NutritionSafetyReviewCard,
  RehydrationChecklistCard,
  SessionFuelingCard,
  TournamentFuelCard,
  WeightClassStatusCard
} from "./fuel/FuelCommandCards";
import { BodyMassTrajectoryPanel } from "./fuel/BodyMassTrajectoryPanel";
import { FuelHistoryPanel } from "./fuel/FuelHistoryPanel";
import { NutritionReviewHistoryPanel } from "./fuel/NutritionReviewHistoryPanel";
import { FoodQuickLogCard, HydrationLogCard } from "./logging/LogCards";
import { screenStyles } from "./screenStyles";

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

function CollapsibleFuelSection({
  children,
  defaultOpen = false,
  summary,
  testID,
  title
}: PropsWithChildren<{
  defaultOpen?: boolean | undefined;
  summary: string;
  testID: string;
  title: string;
}>) {
  const [open, setOpen] = React.useState(defaultOpen);
  React.useEffect(() => {
    if (defaultOpen) {
      setOpen(true);
    }
  }, [defaultOpen]);
  return (
    <View style={{ gap: spacing.sm }}>
      <Pressable
        accessibilityHint={open ? `${title} is visible.` : `Open ${title}.`}
        accessibilityRole="button"
        accessibilityState={{ selected: open }}
        onPress={() => setOpen((value) => !value)}
        style={screenStyles.quietButton}
      >
        <Text style={screenStyles.quietButtonText}>{open ? `Hide ${title}` : `Show ${title}`}</Text>
      </Pressable>
      <Text style={screenStyles.subtle}>{summary}</Text>
      {open ? <View style={{ gap: spacing.lg }} testID={testID}>{children}</View> : null}
    </View>
  );
}

function progressRatio(logged: string, target: string): number {
  const loggedNumber = Number.parseFloat(logged.replace(/,/g, ""));
  const targetNumber = Number.parseFloat(target.replace(/,/g, ""));
  if (!Number.isFinite(loggedNumber) || !Number.isFinite(targetNumber) || targetNumber <= 0) {
    return 0.42;
  }
  return loggedNumber / targetNumber;
}

function macroAccent(label: string): LuminousAccent {
  if (/protein/i.test(label)) {
    return "green";
  }
  if (/carb|water/i.test(label)) {
    return "blue";
  }
  if (/fat|fiber/i.test(label)) {
    return "gold";
  }
  return "orange";
}

function plainFuelCopy(value: string): string {
  return value
    .replace(new RegExp("target " + "confidence", "gi"), "how sure we are")
    .replace(new RegExp("pro" + "visional", "gi"), "rough guide")
    .replace(new RegExp("under-" + "fueling evidence", "gi"), "too little food for the work")
    .replace(new RegExp("under-" + "fueling", "gi"), "too little food")
    .replace(new RegExp("body-" + "mass context", "gi"), "weight trend")
    .replace(new RegExp("hard " + "stop", "gi"), "safety stop");
}

function foodGuideSummary(viewModel: FuelViewModel, safetyReviewActive: boolean): string {
  if (safetyReviewActive) {
    return "Stopped for safety.";
  }
  if (viewModel.macroTargets.targetConfidence.missingInputs.length > 0 || viewModel.macroTargets.targetConfidence.status !== "confident") {
    return "Rough guide. Add weight/logs to improve it.";
  }
  return "Good enough for today.";
}

function loggedIsZero(value: string): boolean {
  const loggedNumber = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(loggedNumber) && loggedNumber === 0;
}

function FuelStartHereCard({ viewModel }: { viewModel: FuelViewModel }) {
  return (
    <TopActionCard
      accent="orange"
      optional={viewModel.topAction.optional}
      primaryAction={viewModel.topAction.primaryAction}
      purpose={viewModel.topAction.purpose}
      testID="fuel-top-action-card"
      title={viewModel.topAction.title}
      why={viewModel.topAction.why}
    />
  );
}

function TodayFuelPriorityCard({ viewModel }: { viewModel: FuelViewModel }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }} testID="fuel-today-priority">
        <Text style={screenStyles.sectionTitle}>What to do now</Text>
        <Text style={screenStyles.callout}>{viewModel.commandCenter.primaryFuelAction}</Text>
        <Text style={screenStyles.body}>{viewModel.commandCenter.sessionFuelAction}</Text>
        {viewModel.trainingDemandHandoff.missingFoodLogAdvisory ? <Text style={screenStyles.subtle}>{viewModel.trainingDemandHandoff.missingFoodLogAdvisory}</Text> : null}
      </View>
    </EngineCard>
  );
}

function FuelContextCardView({ card }: { card: FuelContextCard }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>{card.title}</Text>
        <Text style={screenStyles.body}>{card.summary}</Text>
        {card.actions.map((item, index) => <Text key={`fuel-context-action:${index}`} style={screenStyles.subtle}>{item}</Text>)}
      </View>
    </EngineCard>
  );
}

function FuelMacroTargetsCard({ recentLogs, viewModel }: { recentLogs: RecentLogsViewModel; viewModel: FuelViewModel }) {
  const noFoodLogged = recentLogs.foodToday.entryCount === 0 || viewModel.macroTargets.progress.every((item) => loggedIsZero(item.logged));
  const statusLine = noFoodLogged ? "No food logged yet" : `How sure we are: ${viewModel.macroTargets.confidence}`;
  return (
    <EngineCard>
      <View style={{ gap: spacing.md }} testID="fuel-macro-target-card">
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.sectionTitle}>Food guide</Text>
          <Text style={screenStyles.fieldLabel}>Why</Text>
          <Text style={screenStyles.body}>{plainFuelCopy(viewModel.macroTargets.why)}</Text>
          <Text style={screenStyles.callout}>{foodGuideSummary(viewModel, false)}</Text>
          {viewModel.macroTargets.targetConfidence.reasons.slice(0, 3).map((reason, index) => <Text key={`fuel-target-reason:${index}`} style={screenStyles.subtle}>{plainFuelCopy(reason)}</Text>)}
          {viewModel.macroTargets.targetConfidence.missingInputs.length > 0 ? (
            <Text style={screenStyles.subtle}>Missing logs: {viewModel.macroTargets.targetConfidence.missingInputs.join(", ")}</Text>
          ) : null}
          <Text style={screenStyles.subtle}>Logs help compare what happened.</Text>
          <Text style={screenStyles.subtle}>{statusLine}. {plainFuelCopy(viewModel.macroTargets.logStatus)}</Text>
        </View>
        <View style={{ gap: spacing.md }}>
          {viewModel.macroTargets.progress.map((item, index) => (
            <View key={`fuel-progress:${index}`} style={{ gap: spacing.xs }}>
              <View style={{ alignItems: "flex-start", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }}>
                <Text style={[screenStyles.fieldLabel, { flexShrink: 1, minWidth: 0 }]}>{item.label}</Text>
                <Text style={[screenStyles.subtle, { color: colors.canvas, flexShrink: 1, minWidth: 0, textAlign: "right" }]}>{item.logged} / {item.target}</Text>
              </View>
              <LuminousProgressBar accent={macroAccent(item.label)} progress={progressRatio(item.logged, item.target)} />
            </View>
          ))}
        </View>
      </View>
    </EngineCard>
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
          <Text style={screenStyles.sectionTitle}>{viewModel.completionControls.statusTitle}</Text>
          <Text style={screenStyles.callout}>{viewModel.foodLogStatus.status.replaceAll("_", " ")}</Text>
          <Text style={screenStyles.body}>{viewModel.foodLogStatus.athleteFacingSummary}</Text>
          <Text style={screenStyles.subtle}>Logged so far: {viewModel.foodLogStatus.totalCaloriesLogged} kcal / {viewModel.calorieSummary}.</Text>
          <Text style={screenStyles.subtle}>Too little food for the work is only considered after you say the day is done.</Text>
        </View>
        <View style={{ gap: spacing.xs }}>
          {viewModel.completionControls.helperCopy.map((item, index) => <Text key={`fuel-completion-helper:${index}`} style={screenStyles.subtle}>{plainFuelCopy(item)}</Text>)}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {viewModel.completionControls.actions.map((action) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              key={`fuel-completion-action:${action.kind}`}
              onPress={() => run(action.kind)}
              style={[action.kind === "done_logging" ? screenStyles.button : screenStyles.quietButton, { flexBasis: 220, flexGrow: 1 }]}
            >
              <Text style={action.kind === "done_logging" ? screenStyles.buttonText : screenStyles.quietButtonText}>{action.label}</Text>
              <Text style={screenStyles.subtle}>{plainFuelCopy(action.summary)}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </EngineCard>
  );
}

function FuelLogActionSection({
  busy,
  primaryLog,
  quickLogs,
  recentLogs
}: {
  busy: boolean;
  primaryLog: "food" | "water";
  quickLogs: QuickLogActions;
  recentLogs: RecentLogsViewModel;
}) {
  const primaryCard = primaryLog === "food" ? (
    <FoodQuickLogCard actions={quickLogs} busy={busy} status={recentLogs.foodToday} />
  ) : (
    <HydrationLogCard actions={quickLogs} busy={busy} status={recentLogs.hydrationToday} />
  );
  const secondaryCard = primaryLog === "food" ? (
    <HydrationLogCard actions={quickLogs} busy={busy} status={recentLogs.hydrationToday} />
  ) : (
    <FoodQuickLogCard actions={quickLogs} busy={busy} status={recentLogs.foodToday} />
  );
  return (
    <View style={{ gap: spacing.lg }} testID="fuel-log-action-section">
      {primaryCard}
      {secondaryCard}
    </View>
  );
}

function ActualIntakeCard({ viewModel }: { viewModel: FuelViewModel }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>{viewModel.actualIntakeSummary.title}</Text>
        <Text style={screenStyles.body}>{viewModel.actualIntakeSummary.summary}</Text>
        <Text style={screenStyles.subtle}>How sure we are: {viewModel.actualIntakeSummary.confidence}. One day of food logging informs context only; the guide still comes from CornerIQ.</Text>
        {viewModel.actualIntakeSummary.rows.map((item, index) => <Text key={`actual-intake:${index}`} style={screenStyles.subtle}>{item}</Text>)}
      </View>
    </EngineCard>
  );
}

function HydrationContextCard({ viewModel }: { viewModel: FuelViewModel }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Hydration target context</Text>
        <Text style={screenStyles.body}>{viewModel.commandCenter.hydrationAction}</Text>
        <Text style={screenStyles.subtle}>{viewModel.hydrationSummary}</Text>
      </View>
    </EngineCard>
  );
}

function RecentFuelLogsCard({ recentLogs }: { recentLogs: RecentLogsViewModel }) {
  if (recentLogs.fuel.length === 0) {
    return <EmptyState title="No recent fuel logs" message="Food or hydration history is missing. It matters because Fuel confidence is lower without real intake context. Log food or water when you have it; targets stay engine-led." />;
  }
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Recent fuel logs</Text>
        <Text style={screenStyles.body}>{recentLogs.foodLogCountToday}</Text>
        {recentLogs.fuel.map((item, index) => <Text key={`recent-fuel:${index}`} style={screenStyles.subtle}>{item}</Text>)}
      </View>
    </EngineCard>
  );
}

function FuelRiskCard({ message, viewModel }: { message: string | null; viewModel: FuelViewModel }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Risks and why</Text>
        {viewModel.riskSummary.length > 0 ? viewModel.riskSummary.map((risk, index) => <Text key={`fuel-risk:${index}`} style={screenStyles.body}>{risk}</Text>) : <Text style={screenStyles.body}>No active fuel risk.</Text>}
        <Text style={screenStyles.subtle}>{viewModel.why}</Text>
        {message ? <Text style={screenStyles.subtle}>{message}</Text> : null}
      </View>
    </EngineCard>
  );
}

function FuelSafetyReviewSection({
  message,
  onAcknowledgeNutritionSafetyReview,
  viewModel
}: {
  message: string | null;
  onAcknowledgeNutritionSafetyReview?: ((reviewId: string) => void | Promise<void>) | undefined;
  viewModel: FuelViewModel;
}) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.lg }} testID="fuel-reviews-section">
        <View style={{ gap: spacing.xs }}>
          <Text style={[screenStyles.sectionTitle, { color: colors.redCorner }]}>Safety stop</Text>
          <Text style={screenStyles.body}>Safety is active. Keep regular food and fluids steady, and use qualified support outside the app.</Text>
        </View>
      <NutritionSafetyReviewCard
        activeReviews={viewModel.activeNutritionSafetyReviews}
        onAcknowledgeReview={onAcknowledgeNutritionSafetyReview}
        review={viewModel.nutritionSafetyReview}
      />
      <NutritionReviewHistoryPanel history={viewModel.nutritionReviewHistory} />
      <FuelRiskCard message={message} viewModel={viewModel} />
      </View>
    </EngineCard>
  );
}

function FuelVisualDashboard({
  dashboard,
  onLogHydration,
  onLogMeal
}: {
  dashboard: FuelDashboardVisual;
  onLogHydration: () => void;
  onLogMeal: () => void;
}) {
  return (
    <View style={{ gap: spacing.md }} testID="fuel-visual-dashboard">
      <DashboardCard testID="fuel-macro-summary" title="Macro summary">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "space-between" }}>
          {dashboard.macros.map((item) => <MacroRing item={item} key={`fuel-macro-ring:${item.label}`} />)}
        </View>
      </DashboardCard>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
        <View style={{ flexBasis: 240, flexGrow: 1 }}>
          <DashboardCard headerRight={<DashboardPill label={dashboard.hydration.stateLabel ?? "Today"} tone={dashboard.hydration.tone} />} title="Hydration">
            <ProgressMeter item={dashboard.hydration} />
          </DashboardCard>
        </View>
        <View style={{ flexBasis: 240, flexGrow: 1 }}>
          <DashboardCard headerRight={<DashboardPill label={dashboard.sodium.stateLabel ?? "Today"} tone={dashboard.sodium.tone} />} title="Sodium">
            <ProgressMeter item={dashboard.sodium} />
          </DashboardCard>
        </View>
      </View>

      <DashboardCard
        headerRight={<DashboardPill label={dashboard.mealReferenceLabel} tone={dashboard.meals.some((item) => item.value > 0) ? "blue" : "orange"} />}
        testID="fuel-meal-distribution"
        title="Meal distribution"
      >
        <MiniBarChart bars={dashboard.meals} height={112} referenceLabel="Target context" />
      </DashboardCard>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
        <View style={{ flexBasis: 280, flexGrow: 1 }}>
          <DashboardCard title="Body mass and fueling trend">
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.subtle}>Body mass</Text>
              <TrendLineChart accent="blue" points={dashboard.trend.bodyMass} width={230} />
              <Text style={screenStyles.subtle}>Carbs</Text>
              <TrendLineChart accent="orange" points={dashboard.trend.carbs} width={230} />
            </View>
          </DashboardCard>
        </View>
        <View style={{ flexBasis: 280, flexGrow: 1 }}>
          <DashboardCard title={dashboard.bodyMassRange.title}>
            <RangeGauge
              current={dashboard.bodyMassRange.current}
              currentLabel={dashboard.bodyMassRange.currentLabel}
              max={dashboard.bodyMassRange.max}
              min={dashboard.bodyMassRange.min}
              target={dashboard.bodyMassRange.target}
              targetLabel={dashboard.bodyMassRange.targetLabel}
            />
            <Text style={screenStyles.subtle}>{dashboard.bodyMass.deltaLabel}</Text>
          </DashboardCard>
        </View>
      </View>

      <DashboardCard title="Recovery support">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
          {dashboard.recovery.map((item) => (
            <View key={`fuel-recovery:${item.label}`} style={{ flexBasis: 140, flexGrow: 1 }}>
              <ProgressMeter compact item={item} />
            </View>
          ))}
        </View>
      </DashboardCard>

      <DashboardCard headerRight={<DashboardPill label={dashboard.recommendation.label} tone={dashboard.recommendation.tone} />} title="Today's recommendation">
        <Text style={{ color: colors.canvas, fontSize: 18, fontWeight: "900", lineHeight: 24 }}>{dashboard.recommendation.body}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <Pressable accessibilityLabel="Log meal" accessibilityRole="button" onPress={onLogMeal} style={[screenStyles.button, { flexBasis: 160, flexGrow: 1 }]}>
            <Text style={screenStyles.buttonText}>Log meal</Text>
          </Pressable>
          <Pressable accessibilityLabel="Log hydration" accessibilityRole="button" onPress={onLogHydration} style={[screenStyles.quietButton, { flexBasis: 160, flexGrow: 1 }]}>
            <Text style={screenStyles.quietButtonText}>Add water</Text>
          </Pressable>
        </View>
      </DashboardCard>
    </View>
  );
}

export function FuelScreen({ busy, focusIntent, message, onAcknowledgeNutritionSafetyReview, onFocusIntentApplied, quickLogs, recentLogs, viewModel }: FuelScreenProps) {
  const [appliedFocusIntent, setAppliedFocusIntent] = React.useState<FuelFocusIntent | null>(null);
  React.useEffect(() => {
    if (!focusIntent) {
      return;
    }
    setAppliedFocusIntent(focusIntent);
    onFocusIntentApplied?.();
  }, [focusIntent, onFocusIntentApplied]);
  const safetyReviewActive = viewModel.nutritionSafetyReview.required || viewModel.activeNutritionSafetyReviews.length > 0 || viewModel.nutritionReviewHistory.activeReviewCount > 0;
  const primaryLog =
    appliedFocusIntent === "log_hydration" || focusIntent === "log_hydration"
      ? "water"
      : appliedFocusIntent === "log_food" || focusIntent === "log_food" || recentLogs.foodToday.entryCount === 0 || recentLogs.hydrationToday.loggedToday
        ? "food"
        : "water";
  const logSection = <FuelLogActionSection busy={busy} primaryLog={primaryLog} quickLogs={quickLogs} recentLogs={recentLogs} />;
  const targetsDefaultOpen = safetyReviewActive || Boolean(viewModel.underFuelingRisk);
  const dashboard = buildFuelDashboardVisual(viewModel, recentLogs);
  return (
    <LuminousScreen testID="fuel-screen">
      <ScreenHeader eyebrow="Today" title="Fuel" />
      <Text style={screenStyles.subtle}>{viewModel.title}</Text>
      <View style={{ gap: spacing.lg }} testID="fuel-command-section">
        <FuelStartHereCard viewModel={viewModel} />
        <FuelVisualDashboard
          dashboard={dashboard}
          onLogHydration={() => setAppliedFocusIntent("log_hydration")}
          onLogMeal={() => setAppliedFocusIntent("log_food")}
        />
        {safetyReviewActive ? (
          <FuelSafetyReviewSection
            message={message}
            onAcknowledgeNutritionSafetyReview={onAcknowledgeNutritionSafetyReview}
            viewModel={viewModel}
          />
        ) : null}
        {appliedFocusIntent === "log_food" || appliedFocusIntent === "log_hydration" || focusIntent === "log_food" || focusIntent === "log_hydration" ? logSection : null}
        {appliedFocusIntent === "log_food" || appliedFocusIntent === "log_hydration" || focusIntent === "log_food" || focusIntent === "log_hydration" ? null : <TodayFuelPriorityCard viewModel={viewModel} />}
        {appliedFocusIntent === "log_food" || appliedFocusIntent === "log_hydration" || focusIntent === "log_food" || focusIntent === "log_hydration" ? null : logSection}
        {appliedFocusIntent === "log_food" || appliedFocusIntent === "log_hydration" || focusIntent === "log_food" || focusIntent === "log_hydration" ? <TodayFuelPriorityCard viewModel={viewModel} /> : null}
        <CollapsibleFuelSection
          defaultOpen={targetsDefaultOpen}
          summary={foodGuideSummary(viewModel, safetyReviewActive)}
          testID="fuel-targets-section"
          title="Food guide"
        >
          <FuelMacroTargetsCard recentLogs={recentLogs} viewModel={viewModel} />
        </CollapsibleFuelSection>
      </View>
      <CollapsibleFuelSection
        summary="Recent logs, weight trend, and fight-week details stay out of the first action."
        testID="fuel-command-detail-section"
        title="More fuel info"
      >
        <FuelCommandCard command={viewModel.commandCenter} />
        <SessionFuelingCard command={viewModel.commandCenter} hitTheseFirst={viewModel.hitTheseFirst} />
        {viewModel.underFuelingRisk ? <FuelContextCardView card={viewModel.underFuelingRisk} /> : null}
        <FightWeekFuelCard plan={viewModel.fightWeekFuelPlan} />
        <RehydrationChecklistCard checklist={viewModel.rehydrationChecklist} />
        <TournamentFuelCard plan={viewModel.tournamentFuelPlan} />
        <FoodLogStatusCard busy={busy} quickLogs={quickLogs} viewModel={viewModel} />
        <ActualIntakeCard viewModel={viewModel} />
        <FuelHistoryCard history={viewModel.fuelHistory} />
        <FuelHistoryPanel history={viewModel.fuelHistory} />
        <HydrationContextCard viewModel={viewModel} />
        <RecentFuelLogsCard recentLogs={recentLogs} />
        <BodyMassTrajectoryCard trajectory={viewModel.bodyMassTrajectory} />
        <BodyMassTrajectoryPanel trajectory={viewModel.bodyMassTrajectory} />
        <WeightClassStatusCard status={viewModel.weightClassStatus} />
      </CollapsibleFuelSection>
    </LuminousScreen>
  );
}
