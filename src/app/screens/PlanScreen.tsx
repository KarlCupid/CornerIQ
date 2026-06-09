import React from "react";
import { Pressable, Text, View } from "react-native";
import type { ISODateString, PlanViewModel } from "../../engine/core/types";
import { EngineGeneratingCard, type EngineGenerationStatus } from "../components/EngineGeneratingCard";
import { EngineCard } from "../../design/components/EngineCard";
import { accentColor, LuminousScreen, ScreenHeader } from "../../design/components/LuminousScreen";
import {
  BlockOverviewDots,
  DashboardCard,
  DashboardPill,
  DonutBreakdown,
  MiniBarChart,
  ModifierRow,
  TimelineStrip
} from "../../design/components/PerformanceVisuals";
import { RiskBanner } from "../../design/components/RiskBanner";
import { glassStyles } from "../../design/glass";
import { spacing } from "../../design/theme";
import { buildPlanDashboardVisual, type PlanDashboardVisual } from "../../engine/presentation/dashboardVisualData";
import type { NextWeekPreviewActions } from "../../hooks/useNextWeekPreviewActions";
import type { TrainingPlanAdjustmentActions } from "../../hooks/useTrainingPlanAdjustments";
import type { BuildGoalDraft, FightSetupDraft, ProtectedWorkoutDraft, RecurringProtectedWorkoutAnchorDraft, RecoveryGoalDraft, TournamentSetupDraft } from "../../services/supabase/onboardingService";
import { FixedBoxingScheduleCard } from "./plan/FixedBoxingScheduleCard";
import { PlanAdjustmentControls } from "./plan/PlanAdjustmentControls";
import { PlanGoalFlowCard } from "./plan/PlanGoalFlowCard";
import { TrainingBlockHistoryPanel } from "./plan/TrainingBlockHistoryPanel";
import { screenStyles } from "./screenStyles";

export interface PlanScreenProps {
  adjustmentActions?: TrainingPlanAdjustmentActions | undefined;
  adjustmentMessage?: string | null | undefined;
  asOfDate: ISODateString;
  busy: boolean;
  hasActiveFightOrTournament: boolean;
  isMinor: boolean;
  nextWeekPreviewActions?: NextWeekPreviewActions | undefined;
  generationStatus?: EngineGenerationStatus | undefined;
  onDeleteRecurringProtectedAnchor?: ((anchorId: string) => Promise<void>) | undefined;
  onDeleteProtectedSession?: ((workoutId: string) => Promise<void>) | undefined;
  onSaveBuildGoal?: ((draft: BuildGoalDraft) => Promise<void>) | undefined;
  onSaveFightSetup: (draft: FightSetupDraft) => Promise<void>;
  onSaveProtectedSession?: ((workoutId: string | null, draft: ProtectedWorkoutDraft) => Promise<void>) | undefined;
  onSaveRecurringProtectedAnchor?: ((anchorId: string | null, draft: RecurringProtectedWorkoutAnchorDraft) => Promise<void>) | undefined;
  onSaveRecoveryGoal?: ((draft: RecoveryGoalDraft) => Promise<void>) | undefined;
  onSaveTournamentSetup: (draft: TournamentSetupDraft) => Promise<void>;
  viewModel: PlanViewModel;
}

type PlanActiveWorkspace =
  | "overview"
  | "goal_wizard"
  | "next_week_preview"
  | "fixed_schedule"
  | "adjustments"
  | "block_history"
  | "plan_details";

function compactCount(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function friendlyAnchorText(value: string): string {
  return value === "No " + "protected " + "anchors." ? "None" : plainPlanCopy(value);
}

function friendlySupportText(value: string): string {
  return value === "No generated support." || value === "No support workout." ? "None" : plainPlanCopy(value);
}

function plainPlanCopy(value: string): string {
  return value
    .replace(new RegExp("Generated " + "sessions", "g"), "Support workouts")
    .replace(new RegExp("Generated " + "training", "g"), "Support workouts")
    .replace(new RegExp("generated " + "training", "gi"), "support workouts")
    .replace(new RegExp("generated " + "sessions", "gi"), "support workouts")
    .replace(new RegExp("generated " + "support sessions", "gi"), "support workouts")
    .replace(new RegExp("generated support", "gi"), "support workouts")
    .replace(new RegExp("material" + "ized", "gi"), "saved")
    .replace(new RegExp("protected " + "anchors?", "gi"), "boxing sessions you added")
    .replace(new RegExp("protected " + "sessions", "gi"), "fixed boxing sessions")
    .replace(new RegExp("protected " + "boxing", "gi"), "fixed boxing")
    .replace(new RegExp("protected " + "work", "gi"), "boxing work")
    .replace(new RegExp("materi" + "alize", "gi"), "save")
    .replace(new RegExp("technical plan " + "audit", "gi"), "plan details")
    .replace(/Support workouts is/g, "Support workouts are")
    .replace(/support workouts is/g, "support workouts are");
}

function friendlyCompactTag(tag: "Protected" | "Support" | "Recovery" | "Open"): string {
  return tag === "Protected" ? "Boxing" : tag;
}

function compactPlanStructureTitle(title: string): string {
  if (/spar/i.test(title)) {
    return "Box";
  }
  if (/shadow|technical|skill|pads|mitt/i.test(title)) {
    return "Tech";
  }
  if (/strength|power|trunk|transfer/i.test(title)) {
    return "Str";
  }
  if (/road|run|bike|tempo|aerobic|conditioning/i.test(title)) {
    return "Cond";
  }
  if (/mobility|recovery|rest|no support/i.test(title)) {
    return "Rec";
  }
  return title.split(/\s+/).find((word) => word.length > 0)?.slice(0, 5) ?? "Plan";
}

function workspaceForGenerationStatus(status: EngineGenerationStatus): PlanActiveWorkspace | null {
  if (status === "saving_anchors") {
    return "fixed_schedule";
  }
  if (status === "generating_plan" || status === "amending_plan") {
    return "goal_wizard";
  }
  if (status === "previewing_next_week" || status === "materializing_next_week") {
    return "next_week_preview";
  }
  return null;
}

function DetailsToggle({
  children,
  closedLabel = "Show details",
  openLabel = "Hide details",
  startOpen = false
}: React.PropsWithChildren<{
  closedLabel?: string | undefined;
  openLabel?: string | undefined;
  startOpen?: boolean | undefined;
}>) {
  const [open, setOpen] = React.useState(startOpen);
  React.useEffect(() => {
    setOpen(startOpen);
  }, [startOpen]);
  return (
    <View style={{ gap: spacing.sm }}>
      <Pressable accessibilityLabel={open ? openLabel : closedLabel} accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((value) => !value)} style={screenStyles.quietButton}>
        <Text style={screenStyles.quietButtonText}>{open ? openLabel : closedLabel}</Text>
      </Pressable>
      {open ? <View style={{ gap: spacing.sm }}>{children}</View> : null}
    </View>
  );
}

function GeneratedSupportSummaryCard({
  busy,
  nextWeekActionsAvailable,
  onAcceptPreview,
  onStartNextWeekPlan,
  onSecondaryAction,
  previewDetailsOpen,
  viewModel
}: {
  busy: boolean;
  nextWeekActionsAvailable: boolean;
  onAcceptPreview: () => void;
  onStartNextWeekPlan: () => void;
  onSecondaryAction: () => void;
  previewDetailsOpen: boolean;
  viewModel: PlanViewModel;
}) {
  const preview = viewModel.nextWeekPreview;
  return (
    <EngineCard>
      <View style={{ gap: spacing.md }} testID="plan-generated-support-summary-card">
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.sectionTitle}>Support workouts</Text>
          <Text style={screenStyles.callout}>{compactCount(viewModel.generatedSupportSessionCount, "support workout")}</Text>
          <Text style={screenStyles.body}>{plainPlanCopy(viewModel.athleteFacingWeekSummary)}</Text>
          <Text style={screenStyles.body}>Support workout days: {viewModel.scheduleAvailabilitySummary}</Text>
          <Text style={screenStyles.body}>{plainPlanCopy(viewModel.supportWorkReason ?? "CornerIQ adds support workouts around your boxing sessions, readiness, and safety.")}</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {preview.canAccept ? (
            <Pressable accessibilityLabel="Accept next week preview" accessibilityRole="button" accessibilityState={{ disabled: busy || !nextWeekActionsAvailable }} disabled={busy || !nextWeekActionsAvailable} onPress={onAcceptPreview} style={[screenStyles.button, { flexBasis: 150, flexGrow: 1 }]}>
              <Text style={screenStyles.buttonText}>Accept preview</Text>
            </Pressable>
          ) : null}
          {preview.showMaterializeAction ? (
            <Pressable accessibilityLabel="Start next week plan" accessibilityRole="button" accessibilityState={{ disabled: busy || !nextWeekActionsAvailable || preview.requiresReview }} disabled={busy || !nextWeekActionsAvailable || preview.requiresReview} onPress={onStartNextWeekPlan} style={[screenStyles.button, { flexBasis: 160, flexGrow: 1 }]}>
              <Text style={screenStyles.buttonText}>Start next week plan</Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" disabled={busy} onPress={onSecondaryAction} style={[screenStyles.quietButton, { flexBasis: 150, flexGrow: 1 }]}>
            <Text style={screenStyles.quietButtonText}>{preview.canAccept ? "Keep current plan" : "Preview next week"}</Text>
          </Pressable>
        </View>
        <DetailsToggle closedLabel="Preview next week" openLabel="Hide next week preview" startOpen={previewDetailsOpen}>
          <Text style={screenStyles.body}>{preview.goal}</Text>
          <Text style={screenStyles.subtle}>{viewModel.rollForwardMessage}</Text>
          {preview.requiresReview ? <Text style={screenStyles.subtle}>Review required before this plan can start.</Text> : null}
          {preview.dayPlanPreview.map((day) => (
            <View key={`next-preview:${day.date}`} style={{ gap: spacing.xs }}>
              <Text style={screenStyles.fieldLabel}>{day.date}</Text>
              <Text style={screenStyles.body}>{day.compactSummary}</Text>
              <Text style={screenStyles.subtle}>{friendlyCompactTag(day.compactTag)} / {day.compactMetric}</Text>
            </View>
          ))}
          {preview.safetyNotes.map((note, index) => <Text key={`next-week-safety:${index}`} style={screenStyles.subtle}>Review: {note}</Text>)}
          {preview.materializedGeneratedSessions.map((session) => (
            <Text key={session.id} style={screenStyles.subtle}>
              Active next week: {session.date} - {session.title} ({session.durationMinutes} min)
            </Text>
          ))}
        </DetailsToggle>
      </View>
    </EngineCard>
  );
}

function PlanReviewNotesContent({ viewModel }: { viewModel: PlanViewModel }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={screenStyles.sectionTitle}>Review notes</Text>
      <Text style={screenStyles.body}>{viewModel.rollForwardMessage}</Text>
      {viewModel.warnings.length > 0 ? viewModel.warnings.map((warning, index) => <Text key={`plan-warning:${index}`} style={screenStyles.subtle}>{warning}</Text>) : <Text style={screenStyles.subtle}>No active plan warnings.</Text>}
    </View>
  );
}

function PlanAdjustmentsContent({
  adjustmentActions,
  asOfDate,
  busy,
  viewModel
}: {
  adjustmentActions?: TrainingPlanAdjustmentActions | undefined;
  asOfDate: ISODateString;
  busy: boolean;
  viewModel: PlanViewModel;
}) {
  const dayPlan = viewModel.dayPlans.find((day) => day.date === asOfDate) ?? viewModel.dayPlans[0] ?? null;
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={screenStyles.sectionTitle}>More plan options</Text>
      <Text style={screenStyles.body}>{viewModel.adjustmentSummary}</Text>
      {viewModel.activeAdjustments.length > 0 ? viewModel.activeAdjustments.map((adjustment, index) => <Text key={`active-adjustment:${index}`} style={screenStyles.subtle}>{adjustment}</Text>) : <Text style={screenStyles.subtle}>No active plan adjustments.</Text>}
      <PlanAdjustmentControls
        actions={adjustmentActions}
        busy={busy}
        date={(dayPlan?.date ?? asOfDate) as ISODateString}
        generatedSessions={dayPlan?.generatedSessions ?? []}
      />
    </View>
  );
}

function PlanAuditDetailsContent({ viewModel }: { viewModel: PlanViewModel }) {
  const audit = viewModel.generationAudit;
  return (
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Plan details</Text>
        {audit ? (
          <>
            <Text style={screenStyles.body}>
              Current week: {audit.actualGeneratedSupportCount}/{audit.targetGeneratedSupportCount} support workout{audit.actualGeneratedSupportCount === 1 ? "" : "s"}.
            </Text>
            <Text style={screenStyles.subtle}>Dates: {audit.generatedSessionDates.length > 0 ? audit.generatedSessionDates.join(", ") : "None"}</Text>
            <Text style={screenStyles.subtle}>Titles: {audit.generatedSessionTitles.length > 0 ? audit.generatedSessionTitles.join(", ") : "None"}</Text>
            <Text style={screenStyles.subtle}>Families: {audit.generatedSessionFamilies.length > 0 ? audit.generatedSessionFamilies.join(", ") : "None"}</Text>
            {typeof audit.targetRequiredAddOnBlocks === "number" ? (
              <Text style={screenStyles.subtle}>
                Required add-ons: {audit.actualRequiredAddOnBlocks ?? 0}/{audit.targetRequiredAddOnBlocks}; recommended: {audit.actualRecommendedAddOnBlocks ?? 0}/{audit.targetRecommendedAddOnBlocks ?? 0}.
              </Text>
            ) : null}
            {typeof audit.targetAthleteQualityCheckpoints === "number" ? (
              <Text style={screenStyles.subtle}>Quality checkpoints: {audit.actualAthleteQualityCheckpoints ?? 0}/{audit.targetAthleteQualityCheckpoints}.</Text>
            ) : null}
            {audit.athleteFacingThemePurpose ? <Text style={screenStyles.subtle}>{audit.athleteFacingThemePurpose}</Text> : null}
            {typeof audit.targetHardDayCount === "number" ? (
              <Text style={screenStyles.subtle}>
                Target hard days: {audit.targetHardDayCount}, actual: {audit.actualHardDayCount ?? 0}
                {typeof audit.protectedHardDayCount === "number" ? ` (${audit.protectedHardDayCount} boxing, ${audit.generatedHardDayCount ?? 0} support)` : ""}.
              </Text>
            ) : null}
            {typeof audit.targetWeeklyGeneratedMinutes === "number" ? (
              <Text style={screenStyles.subtle}>Support weekly minutes: {audit.actualWeeklyGeneratedMinutes ?? 0}/{audit.targetWeeklyGeneratedMinutes} target.</Text>
            ) : null}
            {audit.baselinePrescriptionTargets ? (
              <Text style={screenStyles.subtle}>
                Baseline plan: {audit.baselinePrescriptionTargets.targetGeneratedSupportCount} sessions, {audit.baselinePrescriptionTargets.targetHardDayCount} hard days, {audit.baselinePrescriptionTargets.targetWeeklyGeneratedMinutes} support minutes.
              </Text>
            ) : null}
            {audit.plannedVsFinalTrainingDelta ? (
              <Text style={screenStyles.subtle}>
                Final delta: {audit.plannedVsFinalTrainingDelta.actualGeneratedSupportCount}/{audit.plannedVsFinalTrainingDelta.targetGeneratedSupportCount} sessions, {audit.plannedVsFinalTrainingDelta.actualHardDayCount}/{audit.plannedVsFinalTrainingDelta.targetHardDayCount} hard days.
              </Text>
            ) : null}
            <Text style={screenStyles.subtle}>
              Readiness impact: {audit.readinessGenerationImpact ?? "unknown"}; nutrition impact: {audit.nutritionGenerationImpact ?? "unknown"}; hydration impact: {audit.hydrationGenerationImpact ?? "unknown"}.
            </Text>
            {audit.missingLogsAffectedExecutionOnly ? <Text style={screenStyles.subtle}>Missing logs affected how-to notes only; the planned workout stayed available.</Text> : null}
            {(audit.executionAdjustmentsApplied ?? []).slice(0, 3).map((adjustment, index) => (
              <Text key={`execution-adjustment:${index}`} style={screenStyles.subtle}>Execution: {adjustment}</Text>
            ))}
            {(audit.evidenceBasedOverridesApplied ?? []).slice(0, 3).map((override, index) => (
              <Text key={`evidence-override:${index}`} style={screenStyles.subtle}>Override: {override}</Text>
            ))}
            {(audit.unmetPrescriptionTargets ?? []).map((target, index) => <Text key={`unmet-prescription:${index}`} style={screenStyles.subtle}>Prescription note: {target}</Text>)}
            {(audit.blockedGenerationReasons ?? []).map((reason, index) => <Text key={`generation-reason:${index}`} style={screenStyles.subtle}>Plan note: {reason}</Text>)}
            {(audit.whyHardDaysWereReduced ?? []).map((reason, index) => <Text key={`hard-day-reduced:${index}`} style={screenStyles.subtle}>Hard work note: {reason}</Text>)}
            {(audit.whyVolumeWasReduced ?? []).map((reason, index) => <Text key={`volume-reduced:${index}`} style={screenStyles.subtle}>Volume note: {reason}</Text>)}
            <Text style={screenStyles.subtle}>Selected days: {audit.selectedSupportDays.length > 0 ? audit.selectedSupportDays.join(", ") : "None"}</Text>
            <Text style={screenStyles.subtle}>Dose: {audit.selectedTrainingDose ?? "unknown"}; allowed days: {audit.candidateAllowedDays}; over-60 sessions: {audit.sessionsOver60Minutes ?? 0}.</Text>
            {audit.targetSessionCountReason ? <Text style={screenStyles.subtle}>Target reason: {audit.targetSessionCountReason}</Text> : null}
            {(audit.unusedAvailableDays ?? []).length > 0 ? <Text style={screenStyles.subtle}>Unused available days: {(audit.unusedAvailableDays ?? []).join(", ")}</Text> : null}
            {(audit.repairActionsApplied ?? []).map((repair, index) => <Text key={`repair-action:${index}`} style={screenStyles.subtle}>Repair: {repair}</Text>)}
            {(audit.whyOnlyFourSessionsIfSixDaysAvailable ?? []).map((reason, index) => <Text key={`four-session-reason:${index}`} style={screenStyles.subtle}>Four-session note: {reason}</Text>)}
            {(audit.whyOnlyTwoHardDaysIfTargetWasThree ?? []).map((reason, index) => <Text key={`two-hard-reason:${index}`} style={screenStyles.subtle}>Hard-day shortfall note: {reason}</Text>)}
            {(audit.whyAllSessionsUnder60IfSeriousOrHigh ?? []).map((reason, index) => <Text key={`under-sixty-reason:${index}`} style={screenStyles.subtle}>Duration note: {reason}</Text>)}
            <Text style={screenStyles.subtle}>Persisted considered: {audit.persistedGeneratedSessionsConsidered.length}; ignored: {audit.persistedGeneratedSessionsIgnored.length}</Text>
            {audit.persistedGeneratedSessionsIgnored.slice(0, 3).map((session) => (
              <Text key={`ignored-generated-session:${session.id}`} style={screenStyles.subtle}>
                Ignored persisted: {session.title} - {session.reason}
              </Text>
            ))}
            <Text style={screenStyles.subtle}>
              As of {audit.asOfDate}, starts {audit.planStartDate}, support workouts {audit.actualGeneratedSupportCount}/{audit.targetGeneratedSupportCount}.
            </Text>
          </>
        ) : (
          <Text style={screenStyles.subtle}>No support workout detail was produced for this plan.</Text>
        )}
      </View>
  );
}

function PlanDetailsWorkspace({
  adjustmentActions,
  asOfDate,
  busy,
  viewModel
}: {
  adjustmentActions?: TrainingPlanAdjustmentActions | undefined;
  asOfDate: ISODateString;
  busy: boolean;
  viewModel: PlanViewModel;
}) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.lg }} testID="plan-details-workspace">
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>This week details</Text>
          <Text style={screenStyles.body}>{viewModel.hardDaySummary}</Text>
          <Text style={screenStyles.body}>{viewModel.recoveryDaySummary}</Text>
          {viewModel.fightOrTournamentNote ? <Text style={screenStyles.body}>{viewModel.fightOrTournamentNote}</Text> : null}
          {viewModel.dayPlans.map((day) => (
            <View key={`week-detail:${day.date}`} style={{ gap: spacing.xs }}>
              <Text style={screenStyles.fieldLabel}>{day.label}</Text>
              <Text style={screenStyles.subtle}>Boxing: {friendlyAnchorText(day.protectedAnchors)}</Text>
              <Text style={screenStyles.subtle}>Support workouts: {friendlySupportText(day.generatedSupport)}</Text>
              {day.adjustmentNotes.map((note, index) => <Text key={`adjustment-note:${day.date}:${index}`} style={screenStyles.subtle}>{note}</Text>)}
              {day.warningSummary ? <Text style={screenStyles.subtle}>Review: {day.warningSummary}</Text> : null}
            </View>
          ))}
        </View>
        <PlanReviewNotesContent viewModel={viewModel} />
        <PlanAdjustmentsContent adjustmentActions={adjustmentActions} asOfDate={asOfDate} busy={busy} viewModel={viewModel} />
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Block history</Text>
          <TrainingBlockHistoryPanel history={viewModel.blockHistoryDetail} />
        </View>
        <PlanAuditDetailsContent viewModel={viewModel} />
      </View>
    </EngineCard>
  );
}

function PlanAdjustmentsWorkspace({
  adjustmentActions,
  asOfDate,
  busy,
  viewModel
}: {
  adjustmentActions?: TrainingPlanAdjustmentActions | undefined;
  asOfDate: ISODateString;
  busy: boolean;
  viewModel: PlanViewModel;
}) {
  return (
    <EngineCard>
      <View testID="plan-adjustments-workspace">
        <PlanAdjustmentsContent adjustmentActions={adjustmentActions} asOfDate={asOfDate} busy={busy} viewModel={viewModel} />
      </View>
    </EngineCard>
  );
}

function BlockHistoryWorkspace({ viewModel }: { viewModel: PlanViewModel }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }} testID="plan-block-history-workspace">
        <Text style={screenStyles.sectionTitle}>Block history</Text>
        <TrainingBlockHistoryPanel history={viewModel.blockHistoryDetail} />
      </View>
    </EngineCard>
  );
}

function PlanActiveWorkspaceFrame({ children, generationStatus }: React.PropsWithChildren<{ generationStatus: EngineGenerationStatus }>) {
  if (generationStatus === "idle" && !children) {
    return null;
  }
  return (
    <View style={{ gap: spacing.md }} testID="plan-active-workspace">
      <EngineGeneratingCard status={generationStatus} />
      {children}
    </View>
  );
}

function PlanVisualDashboard({
  dashboard,
  onAdjustPlan,
  viewModel
}: {
  dashboard: PlanDashboardVisual;
  onAdjustPlan: () => void;
  viewModel: PlanViewModel;
}) {
  return (
    <View style={{ gap: spacing.md }} testID="plan-visual-dashboard">
      <DashboardCard
        headerRight={<DashboardPill label={`${viewModel.modeLabel} · Week ${viewModel.weekIndex}`} tone="blue" />}
        testID="plan-weekly-structure"
        title="Weekly structure"
      >
        <View style={{ alignItems: "stretch", flexDirection: "row", gap: 5 }}>
          {dashboard.weeklyStructure.map((day) => (
            <View
              key={`plan-structure:${day.day}`}
              style={{
                ...glassStyles.tile,
                flex: 1,
                gap: spacing.xs,
                justifyContent: "space-between",
                minHeight: 96,
                minWidth: 0,
                paddingHorizontal: 5,
                paddingVertical: spacing.sm
              }}
            >
              <Text numberOfLines={1} style={{ color: accentColor[day.tone === "muted" ? "blue" : day.tone], fontSize: 10, fontWeight: "900", lineHeight: 13, textAlign: "center" }}>
                {day.day}
              </Text>
              <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={{ color: "white", fontSize: 10, fontWeight: "900", lineHeight: 13, textAlign: "center" }}>
                {compactPlanStructureTitle(day.title)}
              </Text>
              <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={[screenStyles.subtle, { fontSize: 10, lineHeight: 12, textAlign: "center" }]}>{day.subtitle}</Text>
              <View style={{ backgroundColor: "rgba(255, 255, 255, 0.13)", borderRadius: 999, height: 7, overflow: "hidden" }}>
                <View style={{ backgroundColor: accentColor[day.tone === "muted" ? "blue" : day.tone], height: "100%", width: `${Math.max(8, day.intensityRatio * 100)}%` }} />
              </View>
            </View>
          ))}
        </View>
      </DashboardCard>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
        <View style={{ flexBasis: 280, flexGrow: 1 }}>
          <DashboardCard testID="plan-load-balance" title="Weekly load balance">
            <MiniBarChart bars={dashboard.loadBalance} height={128} referenceLabel="Planned load" />
          </DashboardCard>
        </View>
        <View style={{ flexBasis: 280, flexGrow: 1 }}>
          <DashboardCard title="Energy systems mix">
            <DonutBreakdown items={dashboard.energyMix} label="100%" size={128} />
          </DashboardCard>
        </View>
      </View>

      <DashboardCard testID="plan-anchor-timeline" title="Anchored sessions">
        <TimelineStrip items={dashboard.anchors} />
      </DashboardCard>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
        <View style={{ flexBasis: 280, flexGrow: 1 }}>
          <DashboardCard title="Progressive overload">
            <View style={{ gap: spacing.xs }}>
              {dashboard.overload.map((item) => <ModifierRow item={item} key={`plan-overload:${item.label}`} />)}
            </View>
          </DashboardCard>
        </View>
      </View>

      <DashboardCard testID="plan-block-overview" title="Block overview (next 4 weeks)">
        <BlockOverviewDots weeks={dashboard.blockOverview} />
      </DashboardCard>

      <Pressable accessibilityLabel="Adjust plan" accessibilityRole="button" onPress={onAdjustPlan} style={[screenStyles.button, { minHeight: 56 }]}>
        <Text style={[screenStyles.buttonText, { fontSize: 17 }]}>Adjust plan</Text>
      </Pressable>
    </View>
  );
}

function PlanActionCard({
  busy,
  onOpenWorkspace,
  viewModel
}: {
  busy: boolean;
  onOpenWorkspace: (workspace: PlanActiveWorkspace) => void;
  viewModel: PlanViewModel;
}) {
  return (
    <DashboardCard
      headerRight={<DashboardPill label={`${viewModel.modeLabel} - Week ${viewModel.weekIndex}`} tone="blue" />}
      testID="plan-action-card"
      title="Plan actions"
    >
      <Text style={screenStyles.body}>{plainPlanCopy(viewModel.athleteFacingWeekSummary)}</Text>
      {viewModel.fightOrTournamentNote ? <Text style={screenStyles.subtle}>{plainPlanCopy(viewModel.fightOrTournamentNote)}</Text> : null}
      <Text style={screenStyles.subtle}>{viewModel.warnings.length > 0 ? compactCount(viewModel.warnings.length, "review note") : "No active plan warnings."}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => onOpenWorkspace("goal_wizard")} style={[screenStyles.button, { flexBasis: 180, flexGrow: 1 }]}>
          <Text style={screenStyles.buttonText}>Change goal or schedule</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => onOpenWorkspace("next_week_preview")} style={[screenStyles.quietButton, { flexBasis: 160, flexGrow: 1 }]}>
          <Text style={screenStyles.quietButtonText}>Preview next week</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => onOpenWorkspace("fixed_schedule")} style={[screenStyles.quietButton, { flexBasis: 160, flexGrow: 1 }]}>
          <Text style={screenStyles.quietButtonText}>Edit fixed schedule</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => onOpenWorkspace("adjustments")} style={[screenStyles.quietButton, { flexBasis: 140, flexGrow: 1 }]}>
          <Text style={screenStyles.quietButtonText}>Plan changes</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => onOpenWorkspace("plan_details")} style={[screenStyles.quietButton, { flexBasis: 140, flexGrow: 1 }]}>
          <Text style={screenStyles.quietButtonText}>Plan details</Text>
        </Pressable>
      </View>
    </DashboardCard>
  );
}

export function PlanScreen({
  adjustmentActions,
  adjustmentMessage,
  asOfDate,
  busy,
  generationStatus = "idle",
  isMinor,
  nextWeekPreviewActions,
  onDeleteRecurringProtectedAnchor,
  onDeleteProtectedSession,
  onSaveBuildGoal,
  onSaveFightSetup,
  onSaveProtectedSession,
  onSaveRecurringProtectedAnchor,
  onSaveRecoveryGoal,
  onSaveTournamentSetup,
  viewModel
}: PlanScreenProps) {
  const [activeWorkspace, setActiveWorkspace] = React.useState<PlanActiveWorkspace>("overview");
  const [previewDetailsOpen, setPreviewDetailsOpen] = React.useState(false);
  const showCriticalPlanRisk = viewModel.rollForwardStatus === "blocked" && viewModel.rollForwardRiskTone === "critical";
  const scheduleBusy = busy || !onSaveProtectedSession || !onDeleteProtectedSession || !onSaveRecurringProtectedAnchor || !onDeleteRecurringProtectedAnchor;
  const goalBusy = busy || !onSaveBuildGoal || !onSaveRecoveryGoal;
  const effectiveWorkspace = workspaceForGenerationStatus(generationStatus) ?? activeWorkspace;
  const nextWeekActionsAvailable = Boolean(nextWeekPreviewActions);

  const openWorkspace = (workspace: PlanActiveWorkspace) => {
    setActiveWorkspace(workspace);
    if (workspace === "next_week_preview") {
      setPreviewDetailsOpen(true);
    }
  };

  const openNextWeekPreview = () => openWorkspace("next_week_preview");

  const closeActiveWorkspace = () => {
    setActiveWorkspace("overview");
    setPreviewDetailsOpen(false);
  };

  const acceptNextWeekPreview = () => {
    openNextWeekPreview();
    void nextWeekPreviewActions?.acceptPreview(viewModel.nextWeekPreview.previewId ?? undefined);
  };

  const startNextWeekPlan = () => {
    openNextWeekPreview();
    void nextWeekPreviewActions?.materializeNextWeek(viewModel.nextWeekPreview.previewId ?? undefined);
  };

  const renderNextWeekPreview = (forceDetailsOpen: boolean) => (
    <GeneratedSupportSummaryCard
      busy={busy}
      nextWeekActionsAvailable={nextWeekActionsAvailable}
      onAcceptPreview={acceptNextWeekPreview}
      onStartNextWeekPlan={startNextWeekPlan}
      onSecondaryAction={viewModel.nextWeekPreview.canAccept ? closeActiveWorkspace : openNextWeekPreview}
      previewDetailsOpen={forceDetailsOpen || previewDetailsOpen}
      viewModel={viewModel}
    />
  );

  let activeWorkspaceContent: React.ReactNode = null;
  if (effectiveWorkspace === "goal_wizard") {
    activeWorkspaceContent = (
      <PlanGoalFlowCard
        asOfDate={asOfDate}
        busy={goalBusy}
        currentModeLabel={viewModel.modeLabel}
        existingFixedSchedule={viewModel.fixedSchedule}
        existingWeeklyAnchors={viewModel.weeklyAnchors}
        initialAvailableDays={viewModel.generatedSupportAvailability.selectedDays}
        isMinor={isMinor}
        onCancel={closeActiveWorkspace}
        onSaveBuildGoal={onSaveBuildGoal ?? (async () => undefined)}
        onSaveFightSetup={onSaveFightSetup}
        onSaveProtectedSession={onSaveProtectedSession}
        onSaveRecurringProtectedAnchor={onSaveRecurringProtectedAnchor}
        onSaveRecoveryGoal={onSaveRecoveryGoal ?? (async () => undefined)}
        onSaveTournamentSetup={onSaveTournamentSetup}
      />
    );
  } else if (effectiveWorkspace === "next_week_preview") {
    activeWorkspaceContent = renderNextWeekPreview(true);
  } else if (effectiveWorkspace === "fixed_schedule") {
    activeWorkspaceContent = (
      <FixedBoxingScheduleCard
        asOfDate={asOfDate}
        busy={scheduleBusy}
        initialIntent={null}
        onDelete={onDeleteProtectedSession ?? (async () => undefined)}
        onDeleteWeeklyAnchor={onDeleteRecurringProtectedAnchor ?? (async () => undefined)}
        onSave={onSaveProtectedSession ?? (async () => undefined)}
        onSaveWeeklyAnchor={onSaveRecurringProtectedAnchor ?? (async () => undefined)}
        weeklyAnchors={viewModel.weeklyAnchors}
        sessions={viewModel.fixedSchedule}
      />
    );
  } else if (effectiveWorkspace === "adjustments") {
    activeWorkspaceContent = <PlanAdjustmentsWorkspace adjustmentActions={adjustmentActions} asOfDate={asOfDate} busy={busy} viewModel={viewModel} />;
  } else if (effectiveWorkspace === "block_history") {
    activeWorkspaceContent = <BlockHistoryWorkspace viewModel={viewModel} />;
  } else if (effectiveWorkspace === "plan_details") {
    activeWorkspaceContent = <PlanDetailsWorkspace adjustmentActions={adjustmentActions} asOfDate={asOfDate} busy={busy} viewModel={viewModel} />;
  }
  const dashboard = buildPlanDashboardVisual(viewModel);

  return (
    <LuminousScreen testID="plan-screen">
      <ScreenHeader eyebrow="Current block" title="Plan" />
      {showCriticalPlanRisk ? (
        <RiskBanner title="Plan safety check" message={plainPlanCopy(viewModel.rollForwardMessage)} statusLabel={plainPlanCopy(viewModel.rollForwardRiskLabel)} tone={viewModel.rollForwardRiskTone}>
          <View style={{ gap: spacing.xs }}>
            {viewModel.warnings.map((warning, index) => <Text key={`critical-plan-warning:${index}`} style={screenStyles.body}>{warning}</Text>)}
          </View>
        </RiskBanner>
      ) : null}
      {viewModel.lastAutoRollForwardMessage ? <RiskBanner title="Week boundary update" message={plainPlanCopy(viewModel.lastAutoRollForwardMessage)} tone="info" /> : null}
      {adjustmentMessage ? <RiskBanner title="Plan update" message={plainPlanCopy(adjustmentMessage)} tone="info" /> : null}
      <PlanActionCard busy={busy} onOpenWorkspace={openWorkspace} viewModel={viewModel} />
      <PlanActiveWorkspaceFrame generationStatus={generationStatus}>{activeWorkspaceContent}</PlanActiveWorkspaceFrame>
      <PlanVisualDashboard dashboard={dashboard} onAdjustPlan={() => openWorkspace("goal_wizard")} viewModel={viewModel} />
    </LuminousScreen>
  );
}
