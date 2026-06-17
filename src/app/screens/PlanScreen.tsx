import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";
import type { ISODateString, PlanViewModel } from "../../engine/core/types";
import { EngineGeneratingCard, type EngineGenerationStatus } from "../components/EngineGeneratingCard";
import { EngineCard } from "../../design/components/EngineCard";
import { LuminousScreen, ScreenHeader } from "../../design/components/LuminousScreen";
import { RiskBanner } from "../../design/components/RiskBanner";
import { glassStyles } from "../../design/glass";
import { radii, spacing } from "../../design/theme";
import type { NextWeekPreviewActions } from "../../hooks/useNextWeekPreviewActions";
import type { TrainingPlanAdjustmentActions } from "../../hooks/useTrainingPlanAdjustments";
import type { BuildGoalDraft, FightSetupDraft, ProtectedWorkoutDraft, RecurringProtectedWorkoutAnchorDraft, RecoveryGoalDraft, TournamentSetupDraft } from "../../services/supabase/onboardingService";
import { FixedBoxingScheduleCard } from "./plan/FixedBoxingScheduleCard";
import { PlanAdjustmentControls } from "./plan/PlanAdjustmentControls";
import { PlanGoalFlowCard } from "./plan/PlanGoalFlowCard";
import { planPalette, planTextStyles, planTint, planToneColors, type PlanTone } from "./plan/planPalette";
import { TrainingBlockHistoryPanel } from "./plan/TrainingBlockHistoryPanel";
import { screenStyles } from "./screenStyles";
import { tabHeroHeaders, tabScreenBackgrounds } from "./tabHeroConfig";

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

const ACTIVE_NEXT_WEEK_STATUS = "mater" + "ialized";

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
    .replace(new RegExp("support generation", "gi"), "planning")
    .replace(new RegExp("support-generation", "gi"), "planning")
    .replace(new RegExp("Generated " + "sessions", "g"), "App sessions")
    .replace(new RegExp("Generated " + "training", "g"), "App sessions")
    .replace(new RegExp("generated " + "training", "gi"), "app sessions")
    .replace(new RegExp("generated " + "sessions", "gi"), "app sessions")
    .replace(new RegExp("generated " + "support sessions", "gi"), "app sessions")
    .replace(new RegExp("generated support", "gi"), "app sessions")
    .replace(/\bgenerated work\b/gi, "app work")
    .replace(new RegExp("material" + "ized", "gi"), "saved")
    .replace(new RegExp("material" + "ization", "gi"), "saving next week")
    .replace(new RegExp("protected " + "anchors?", "gi"), "boxing sessions you added")
    .replace(new RegExp("protected " + "sparring", "gi"), "fixed sparring")
    .replace(new RegExp("protected " + "sessions", "gi"), "fixed boxing sessions")
    .replace(new RegExp("protected " + "boxing", "gi"), "fixed boxing")
    .replace(new RegExp("protected " + "work", "gi"), "boxing work")
    .replace(/fixed anchor/gi, "fixed boxing session")
    .replace(new RegExp("materi" + "alize", "gi"), "save")
    .replace(new RegExp("technical plan " + "audit", "gi"), "plan details")
    .replace(/engine-owned/gi, "saved")
    .replace(/execution readiness/gi, "readiness")
    .replace(/training demand/gi, "training load")
    .replace(/hard-day cap/gi, "hard training limit")
    .replace(/roll forward/gi, "start next week")
    .replace(/roll-forward/gi, "next-week")
    .replace(/\bSupport workouts\b/g, "App sessions")
    .replace(/\bsupport workouts\b/g, "app sessions")
    .replace(/\bsupport workout\b/g, "app session")
    .replace(/\bSupport work\b/g, "App work")
    .replace(/\bsupport work\b/g, "app work")
    .replace(/App sessions is/g, "App sessions are")
    .replace(/app sessions is/g, "app sessions are");
}

function plainPlanRiskCopy(value: string): string {
  return plainPlanCopy(value)
    .replace(/\bsafety capped\b/gi, "health review capped")
    .replace(/\bsafety stops\b/gi, "health warnings")
    .replace(/\bsafety stop\b/gi, "health warning")
    .replace(/\bhard stops\b/gi, "health warnings")
    .replace(/\bhard stop\b/gi, "health warning")
    .replace(/\breview domain\b/gi, "review area")
    .replace(/\bblocked\b/gi, "paused");
}

function friendlyCompactTag(tag: "Protected" | "Support" | "Recovery" | "Open"): string {
  return tag === "Protected" ? "Boxing" : tag;
}

type PlanDay = PlanViewModel["dayPlans"][number];
type PlanGeneratedSession = PlanDay["generatedSessions"][number];

function titleCaseWords(value: string): string {
  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function firstSentence(value: string | null | undefined): string {
  const copy = plainPlanRiskCopy(value ?? "").trim();
  const match = copy.match(/^.+?[.!?](?:\s|$)/);
  return (match?.[0] ?? copy).trim();
}

function generatedSupportPreviewSummary(viewModel: PlanViewModel): { summary: string } {
  const preview = viewModel.nextWeekPreview;
  return {
    summary: plainPlanCopy(`${preview.persistedStatusLabel} ${preview.actionCopy}`.trim())
  };
}

function sortedPlanDays(viewModel: PlanViewModel): PlanDay[] {
  return [...viewModel.dayPlans].sort((left, right) => left.date.localeCompare(right.date));
}

function shortDateLabel(date: string, asOfDate?: string | undefined): string {
  if (date === asOfDate) {
    return "Today";
  }
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return parsed.toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "UTC", weekday: "short" });
}

function weekdayLabelFromDate(date: string, fallback: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return fallback.slice(0, 3);
  }
  return parsed.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short" });
}

function planPhaseLabel(viewModel: PlanViewModel): string {
  if (viewModel.blockPhase === "fight_week_taper") {
    return "Fight week";
  }
  if (viewModel.blockPhase === "tournament_week") {
    return "Tournament mode";
  }
  if (viewModel.blockPhase === "recovery_deload" || viewModel.blockPhase === "maintenance") {
    return "Recovery";
  }
  return viewModel.modeLabel;
}

function toneForPlanDay(day: PlanDay): PlanTone {
  const summary = `${day.compactSummary} ${day.marker}`.toLowerCase();
  if (day.warningSummary) {
    return "red";
  }
  if (/fight|bout|competition|hard/.test(summary) || day.fuelDemand === "high") {
    return "orange";
  }
  if (day.compactTag === "Protected") {
    return "gold";
  }
  if (day.compactTag === "Support") {
    return "purple";
  }
  if (day.compactTag === "Recovery") {
    return "green";
  }
  return "muted";
}

function dayTypeLabel(day: PlanDay): string {
  const summary = `${day.compactSummary} ${day.marker}`.toLowerCase();
  if (/weigh/.test(summary)) {
    return "Weigh-in";
  }
  if (/fight|bout|competition/.test(summary)) {
    return "Fight";
  }
  if (day.compactTag === "Protected") {
    return "Boxing";
  }
  if (day.compactTag === "Recovery") {
    return "Recovery";
  }
  if (day.compactTag === "Open") {
    return "Open";
  }
  if (/strength|lift|trunk|durability/.test(summary)) {
    return "Strength";
  }
  if (/condition|roadwork|round|tempo|aerobic/.test(summary)) {
    return "Conditioning";
  }
  if (/footwork|shadow|jab|technical|skill|bag/.test(summary)) {
    return "Train";
  }
  return "Train";
}

function dayMetricLabel(day: PlanDay): string {
  if (day.compactTag === "Recovery") {
    return "Rest";
  }
  if (day.compactTag === "Open") {
    return "No session";
  }
  if (day.marker === "Hard day" || day.fuelDemand === "high") {
    return "Hard";
  }
  return day.compactMetric;
}

function sessionIntensityLabel(day: PlanDay): string {
  if (day.marker === "Hard day" || day.fuelDemand === "high") {
    return "Hard";
  }
  if (day.compactTag === "Recovery") {
    return "Easy";
  }
  if (day.fuelDemand === "low") {
    return "Easy";
  }
  return "Moderate";
}

function sessionTypeLabel(session: PlanGeneratedSession | null, day: PlanDay): string {
  if (session?.sessionTypeLabel) {
    return plainPlanCopy(session.sessionTypeLabel);
  }
  if (session?.trainingStimulus) {
    return titleCaseWords(session.trainingStimulus);
  }
  return dayTypeLabel(day);
}

function trainingAim(viewModel: PlanViewModel): string {
  const audit = viewModel.generationAudit;
  const theme = audit?.athleteFacingThemePurpose ?? audit?.boxingDevelopmentTheme ?? viewModel.weekDevelopmentTheme;
  const copy = firstSentence(theme || viewModel.athleteFacingWeekSummary || viewModel.weeklySummary);
  if (copy) {
    return copy.replace(/^main focus:\s*/i, "");
  }
  if (viewModel.modeLabel === "Recovery") {
    return "Reduce fatigue while keeping skill work sharp.";
  }
  if (viewModel.modeLabel === "Fight camp") {
    return "Improve repeatable conditioning without losing shape.";
  }
  return "Keep strength work useful without crowding boxing.";
}

function weekPlanSentence(viewModel: PlanViewModel): string {
  if (viewModel.rollForwardStatus === "blocked" || viewModel.warnings.length > 0) {
    return "This week stays conservative until the review notes clear.";
  }
  if (viewModel.fightOrTournamentNote) {
    return firstSentence(viewModel.fightOrTournamentNote);
  }
  const summary = firstSentence(viewModel.athleteFacingWeekSummary);
  return summary || "This week builds boxing quality around your fixed sessions and current fuel context.";
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
      <Pressable
        accessibilityLabel={open ? openLabel : closedLabel}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [
          screenStyles.quietButton,
          {
            backgroundColor: pressed ? planPalette.controlFillPressed : planPalette.controlFill,
            borderColor: planPalette.controlLine
          }
        ]}
      >
        <Text style={{ color: planPalette.textBody, fontSize: 15, fontWeight: "700", lineHeight: 20, textAlign: "center" }}>{open ? openLabel : closedLabel}</Text>
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
          <Text style={planTextStyles.sectionTitle}>Next Week</Text>
          <Text style={planTextStyles.callout}>{generatedSupportPreviewSummary(viewModel).summary}</Text>
          <Text style={planTextStyles.body}>{plainPlanCopy(viewModel.athleteFacingWeekSummary)}</Text>
          <Text style={planTextStyles.subtle}>Available days: {viewModel.scheduleAvailabilitySummary}</Text>
          <Text style={planTextStyles.subtle}>{plainPlanRiskCopy(viewModel.supportWorkReason ?? "App sessions sit around boxing, readiness, and review notes.")}</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {preview.canAccept ? (
            <Pressable
              accessibilityLabel="Accept next week preview"
              accessibilityRole="button"
              accessibilityState={{ disabled: busy || !nextWeekActionsAvailable }}
              disabled={busy || !nextWeekActionsAvailable}
              onPress={onAcceptPreview}
              style={({ pressed }) => [
                screenStyles.button,
                {
                  backgroundColor: pressed ? planPalette.actionFillPressed : planPalette.actionFill,
                  borderColor: planPalette.actionBorder,
                  boxShadow: `0 12px 28px ${planPalette.actionShadow}`,
                  flexBasis: 150,
                  flexGrow: 1
                }
              ]}
            >
              <Text style={{ color: planPalette.textPrimary, fontSize: 15, fontWeight: "800", lineHeight: 20, textAlign: "center" }}>Accept preview</Text>
            </Pressable>
          ) : null}
          {preview.showMaterializeAction ? (
            <Pressable
              accessibilityLabel="Start next week plan"
              accessibilityRole="button"
              accessibilityState={{ disabled: busy || !nextWeekActionsAvailable || preview.requiresReview }}
              disabled={busy || !nextWeekActionsAvailable || preview.requiresReview}
              onPress={onStartNextWeekPlan}
              style={({ pressed }) => [
                screenStyles.button,
                {
                  backgroundColor: pressed ? planPalette.actionFillPressed : planPalette.actionFill,
                  borderColor: planPalette.actionBorder,
                  boxShadow: `0 12px 28px ${planPalette.actionShadow}`,
                  flexBasis: 160,
                  flexGrow: 1,
                  opacity: busy || !nextWeekActionsAvailable || preview.requiresReview ? 0.55 : 1
                }
              ]}
            >
              <Text style={{ color: planPalette.textPrimary, fontSize: 15, fontWeight: "800", lineHeight: 20, textAlign: "center" }}>Start next week plan</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={onSecondaryAction}
            style={({ pressed }) => [
              screenStyles.quietButton,
              {
                backgroundColor: pressed ? planPalette.controlFillPressed : planPalette.controlFill,
                borderColor: planPalette.controlLine,
                flexBasis: 150,
                flexGrow: 1,
                opacity: busy ? 0.55 : 1
              }
            ]}
          >
            <Text style={{ color: planPalette.textBody, fontSize: 15, fontWeight: "700", lineHeight: 20, textAlign: "center" }}>{preview.canAccept ? "Keep current plan" : "Preview next week"}</Text>
          </Pressable>
        </View>
        <DetailsToggle closedLabel="Preview next week" openLabel="Hide next week preview" startOpen={previewDetailsOpen}>
          <Text style={planTextStyles.body}>{preview.goal}</Text>
          <Text style={planTextStyles.subtle}>{plainPlanRiskCopy(viewModel.rollForwardMessage)}</Text>
          {preview.requiresReview ? <Text style={planTextStyles.subtle}>Health warnings need review before this plan can start.</Text> : null}
          {preview.dayPlanPreview.map((day) => (
            <View key={`next-preview:${day.date}`} style={{ gap: spacing.xs }}>
              <Text style={planTextStyles.fieldLabel}>{day.date}</Text>
              <Text style={planTextStyles.body}>{day.compactSummary}</Text>
              <Text style={planTextStyles.subtle}>{friendlyCompactTag(day.compactTag)} / {day.compactMetric}</Text>
            </View>
          ))}
          {preview.safetyNotes.map((note, index) => <Text key={`next-week-safety:${index}`} style={planTextStyles.subtle}>Review: {plainPlanRiskCopy(note)}</Text>)}
          {preview.materializedGeneratedSessions.map((session) => (
            <Text key={session.id} style={planTextStyles.subtle}>
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
      <Text style={planTextStyles.sectionTitle}>Review Notes</Text>
      <Text style={planTextStyles.body}>{plainPlanRiskCopy(viewModel.rollForwardMessage)}</Text>
      {viewModel.warnings.length > 0 ? viewModel.warnings.map((warning, index) => <Text key={`plan-warning:${index}`} style={planTextStyles.subtle}>{plainPlanRiskCopy(warning)}</Text>) : <Text style={planTextStyles.subtle}>No active plan warnings.</Text>}
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
      <Text style={planTextStyles.sectionTitle}>Plan Changes</Text>
      <Text style={planTextStyles.body}>{plainPlanCopy(viewModel.adjustmentSummary)}</Text>
      {viewModel.activeAdjustments.length > 0 ? viewModel.activeAdjustments.map((adjustment, index) => <Text key={`active-adjustment:${index}`} style={planTextStyles.subtle}>{plainPlanCopy(adjustment)}</Text>) : <Text style={planTextStyles.subtle}>No active plan changes.</Text>}
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
  const planNotes = audit
    ? [
        ...(audit.blockedGenerationReasons ?? []).slice(0, 2),
        ...(audit.whyHardDaysWereReduced ?? []).slice(0, 1),
        ...(audit.whyVolumeWasReduced ?? []).slice(0, 1)
      ]
    : [];
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={planTextStyles.sectionTitle}>Planning Notes</Text>
      {audit ? (
        <>
          <Text style={planTextStyles.body}>
            App sessions: {audit.actualGeneratedSupportCount}/{audit.targetGeneratedSupportCount} planned this week.
          </Text>
          <Text style={planTextStyles.subtle}>Available days: {audit.selectedSupportDays.length > 0 ? audit.selectedSupportDays.join(", ") : "None selected"}</Text>
          {typeof audit.targetHardDayCount === "number" ? (
            <Text style={planTextStyles.subtle}>
              Hard work: {audit.actualHardDayCount ?? 0}/{audit.targetHardDayCount}
              {typeof audit.protectedHardDayCount === "number" ? ` (${audit.protectedHardDayCount} boxing, ${audit.generatedHardDayCount ?? 0} app)` : ""}.
            </Text>
          ) : null}
          {typeof audit.targetWeeklyGeneratedMinutes === "number" ? (
            <Text style={planTextStyles.subtle}>Planned app minutes: {audit.actualWeeklyGeneratedMinutes ?? 0}/{audit.targetWeeklyGeneratedMinutes}.</Text>
          ) : null}
          <Text style={planTextStyles.subtle}>
            Readiness {audit.readinessGenerationImpact ?? "unknown"}; nutrition {audit.nutritionGenerationImpact ?? "unknown"}; hydration {audit.hydrationGenerationImpact ?? "unknown"}.
          </Text>
          {audit.missingLogsAffectedExecutionOnly ? <Text style={planTextStyles.subtle}>Missing logs affected how-to notes only; the workout stayed available.</Text> : null}
          {planNotes.map((note, index) => <Text key={`plan-diagnostic-note:${index}`} style={planTextStyles.subtle}>Note: {plainPlanRiskCopy(note)}</Text>)}
        </>
      ) : (
        <Text style={planTextStyles.subtle}>No deeper review notes were produced for this plan.</Text>
      )}
    </View>
  );
}

function PlanDetailsWorkspace({
  viewModel
}: {
  viewModel: PlanViewModel;
}) {
  return (
    <View style={{ gap: spacing.sm }} testID="plan-details-workspace">
      <PlanDetailRows startOpen viewModel={viewModel} />
    </View>
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
        <Text style={planTextStyles.sectionTitle}>Block history</Text>
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

function PlanTonePill({ label, tone = "green" }: { label: string; tone?: PlanTone | undefined }) {
  const color = planToneColors[tone];
  return (
    <View
      accessibilityLabel={`Status: ${label}`}
      style={{
        alignItems: "center",
        alignSelf: "flex-start",
        backgroundColor: planTint(tone, "16"),
        borderColor: planTint(tone, "44"),
        borderRadius: radii.pill,
        borderWidth: 1,
        flexDirection: "row",
        gap: spacing.xs,
        minHeight: 28,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3
      }}
    >
      <View style={{ backgroundColor: color, borderRadius: 4, height: 7, width: 7 }} />
      <Text numberOfLines={1} style={{ color, fontSize: 12, fontWeight: "800", lineHeight: 16 }}>
        {label}
      </Text>
    </View>
  );
}

function PlanButton({
  disabled,
  icon,
  label,
  onPress,
  primary = false
}: {
  disabled?: boolean | undefined;
  icon?: keyof typeof Ionicons.glyphMap | undefined;
  label: string;
  onPress: () => void;
  primary?: boolean | undefined;
}) {
  const iconColor = primary ? planPalette.textPrimary : planPalette.textBody;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        primary ? screenStyles.button : screenStyles.quietButton,
        {
          backgroundColor: primary ? (pressed ? planPalette.actionFillPressed : planPalette.actionFill) : pressed ? planPalette.controlFillPressed : planPalette.controlFill,
          borderColor: primary ? planPalette.actionBorder : planPalette.controlLine,
          boxShadow: disabled ? "none" : primary ? `0 12px 28px ${planPalette.actionShadow}` : "none",
          flexBasis: primary ? 190 : 160,
          flexDirection: "row",
          flexGrow: 1,
          gap: spacing.xs,
          opacity: disabled ? 0.55 : 1
        }
      ]}
    >
      {icon ? <Ionicons color={iconColor} name={icon} size={16} /> : null}
      <Text style={{ color: primary ? planPalette.textPrimary : planPalette.textBody, fontSize: 15, fontWeight: primary ? "800" : "700", lineHeight: 20, textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

function WeekReviewStrip({ viewModel }: { viewModel: PlanViewModel }) {
  if (viewModel.rollForwardStatus !== "blocked" && viewModel.warnings.length === 0) {
    return null;
  }
  const tone: PlanTone = viewModel.rollForwardRiskTone === "critical" ? "red" : "orange";
  return (
    <View
      style={{
        backgroundColor: planTint(tone, "12"),
        borderColor: planTint(tone, "42"),
        borderRadius: radii.tile,
        borderWidth: 1,
        gap: spacing.xs,
        padding: spacing.md
      }}
      testID="plan-review-strip"
    >
      <Text style={{ color: planToneColors[tone], fontSize: 12, fontWeight: "900", lineHeight: 16 }}>
        {viewModel.rollForwardStatus === "blocked" ? "Plan needs review before next week starts." : "Review notes are active this week."}
      </Text>
      <Text style={planTextStyles.subtle}>
        {viewModel.warnings[0] ? plainPlanRiskCopy(viewModel.warnings[0]) : plainPlanRiskCopy(viewModel.rollForwardMessage)}
      </Text>
    </View>
  );
}

function ThisWeeksPlanCard({
  busy,
  onChangeGoal,
  onPreviewNextWeek,
  viewModel
}: {
  busy: boolean;
  onChangeGoal: () => void;
  onPreviewNextWeek: () => void;
  viewModel: PlanViewModel;
}) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.md }} testID="plan-this-weeks-plan-card">
        <View style={{ alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "space-between" }}>
          <View style={{ flexBasis: 230, flexGrow: 1, gap: spacing.xs, minWidth: 0 }}>
            <Text style={{ color: planPalette.textPrimary, fontSize: 22, fontWeight: "900", letterSpacing: 0, lineHeight: 27 }}>
              This Week's Plan
            </Text>
            <Text style={planTextStyles.body}>{weekPlanSentence(viewModel)}</Text>
          </View>
          <View style={{ alignItems: "flex-start", gap: spacing.xs }}>
            <PlanTonePill label={planPhaseLabel(viewModel)} tone={viewModel.rollForwardStatus === "blocked" ? "orange" : "green"} />
            <Text style={{ color: planPalette.toneGreen, fontSize: 12, fontWeight: "900", lineHeight: 16 }}>
              Week {viewModel.weekIndex}
            </Text>
          </View>
        </View>
        <WeekReviewStrip viewModel={viewModel} />
        <View
          style={{
            backgroundColor: planTint("green", "12"),
            borderColor: planTint("green", "3D"),
            borderRadius: radii.tile,
            borderWidth: 1,
            gap: spacing.xs,
            padding: spacing.md
          }}
        >
          <Text style={{ color: planPalette.toneGreen, fontSize: 12, fontWeight: "900", letterSpacing: 0, lineHeight: 16, textTransform: "uppercase" }}>
            This week's job
          </Text>
          <Text style={{ color: planPalette.textPrimary, fontSize: 18, fontWeight: "900", lineHeight: 24 }}>
            {trainingAim(viewModel)}
          </Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <PlanButton disabled={busy} icon="create-outline" label="Change goal or schedule" onPress={onChangeGoal} primary />
          <PlanButton disabled={busy} icon="calendar-outline" label="Preview next week" onPress={onPreviewNextWeek} />
        </View>
      </View>
    </EngineCard>
  );
}

function WeekAtAGlanceContent({ viewModel }: { viewModel: PlanViewModel }) {
  const days = sortedPlanDays(viewModel).slice(0, 7);
  return (
    <View style={{ alignItems: "stretch", flexDirection: "row", gap: 5 }}>
      {days.map((day) => {
        const tone = toneForPlanDay(day);
        const color = planToneColors[tone];
        return (
          <View
            key={`plan-week-day:${day.date}`}
            style={{
              ...glassStyles.tile,
              backgroundColor: tone === "muted" ? planPalette.controlFill : planTint(tone, "10"),
              borderColor: tone === "muted" ? planPalette.controlLine : planTint(tone, "44"),
              flex: 1,
              gap: spacing.xs,
              justifyContent: "space-between",
              minHeight: 88,
              minWidth: 0,
              paddingHorizontal: 5,
              paddingVertical: spacing.sm
            }}
          >
            <Text numberOfLines={1} style={{ color, fontSize: 10, fontWeight: "900", lineHeight: 13, textAlign: "center" }}>
              {weekdayLabelFromDate(day.date, day.label)}
            </Text>
            <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={{ color: planPalette.textPrimary, fontSize: 10, fontWeight: "900", lineHeight: 13, textAlign: "center" }}>
              {dayTypeLabel(day)}
            </Text>
            <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={[planTextStyles.subtle, { fontSize: 10, lineHeight: 12, textAlign: "center" }]}>
              {dayMetricLabel(day)}
            </Text>
            <View style={{ backgroundColor: planPalette.controlLine, borderRadius: radii.pill, height: 6, overflow: "hidden" }}>
              <View style={{ backgroundColor: color, height: "100%", width: day.compactTag === "Open" ? "12%" : dayMetricLabel(day) === "Hard" ? "88%" : "56%" }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function builtAroundRows(viewModel: PlanViewModel): { detail: string; label: string; tone: PlanTone }[] {
  const boxingCount = viewModel.weeklyAnchors.length + viewModel.fixedSchedule.length;
  const fuelRisk = viewModel.generationAudit?.fuelRiskClassification;
  const fuelCopy =
    fuelRisk === "severe_fueling_risk" || fuelRisk === "underfueling_evidence"
      ? "health warnings keep the week conservative."
      : fuelRisk === "missing_data" || fuelRisk === "low_confidence"
        ? "missing fuel or weight data stays unknown."
        : "no extra work just to chase weight.";
  return [
    {
      detail: boxingCount > 0 ? `${compactCount(boxingCount, "boxing session")} stays first.` : "Add boxing sessions when your week changes.",
      label: "Boxing schedule",
      tone: "green"
    },
    {
      detail: fuelCopy,
      label: "Fuel and weight",
      tone: fuelRisk === "severe_fueling_risk" || fuelRisk === "underfueling_evidence" ? "orange" : "gold"
    },
    {
      detail: viewModel.recoveryDayCount > 0 ? `${compactCount(viewModel.recoveryDayCount, "easier day")} protects the work.` : "recovery stays available if warnings appear.",
      label: "Recovery",
      tone: "blue"
    },
    {
      detail: viewModel.generatedSupportSessionCount > 0 ? `${compactCount(viewModel.generatedSupportSessionCount, "app session")} fits around boxing.` : "no extra app work is forced this week.",
      label: "Strength / conditioning",
      tone: "purple"
    }
  ];
}

function BuiltAroundContent({ viewModel }: { viewModel: PlanViewModel }) {
  return (
    <>
      {builtAroundRows(viewModel).map((row) => (
        <View key={`built-around:${row.label}`} style={{ alignItems: "center", flexDirection: "row", gap: spacing.md, minHeight: 42 }}>
          <View style={{ backgroundColor: planToneColors[row.tone], borderRadius: radii.pill, height: 8, width: 8 }} />
          <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
            <Text style={{ color: planPalette.textPrimary, fontSize: 14, fontWeight: "900", lineHeight: 18 }}>{row.label}</Text>
            <Text style={planTextStyles.subtle}>{row.detail}</Text>
          </View>
        </View>
      ))}
    </>
  );
}

type UpcomingPlanSession = {
  aim: string;
  date: string;
  id: string;
  intensity: string;
  title: string;
  tone: PlanTone;
  type: string;
};

function upcomingPlanSessions(viewModel: PlanViewModel, asOfDate: ISODateString): UpcomingPlanSession[] {
  const rows: UpcomingPlanSession[] = [];
  for (const day of sortedPlanDays(viewModel)) {
    if (day.date < asOfDate) {
      continue;
    }
    if (friendlyAnchorText(day.protectedAnchors) !== "None") {
      rows.push({
        aim: firstSentence(day.explanation) || "Keep boxing quality first.",
        date: shortDateLabel(day.date, asOfDate),
        id: `boxing:${day.date}`,
        intensity: sessionIntensityLabel(day),
        title: friendlyAnchorText(day.protectedAnchors).split(",")[0]?.trim() || day.compactSummary,
        tone: toneForPlanDay(day),
        type: `Boxing - ${day.compactMetric}`
      });
    }
    for (const session of day.generatedSessions) {
      rows.push({
        aim: firstSentence(session.boxingSkillTheme ?? session.technicalEmphasis?.[0] ?? day.explanation) || "Keep the work useful for boxing.",
        date: shortDateLabel(day.date, asOfDate),
        id: session.id,
        intensity: sessionIntensityLabel(day),
        title: plainPlanCopy(session.title),
        tone: toneForPlanDay(day),
        type: `${sessionTypeLabel(session, day)} - ${day.compactMetric}`
      });
    }
  }
  return rows.slice(0, 4);
}

function UpcomingSessionsCard({ asOfDate, viewModel }: { asOfDate: ISODateString; viewModel: PlanViewModel }) {
  const sessions = upcomingPlanSessions(viewModel, asOfDate);
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }} testID="plan-upcoming-sessions-card">
        <Text style={planTextStyles.sectionTitle}>Upcoming Sessions</Text>
        {sessions.length > 0 ? sessions.map((session) => (
          <View
            key={`upcoming:${session.id}`}
            style={{
              backgroundColor: planTint(session.tone, "10"),
              borderColor: planTint(session.tone, "3D"),
              borderRadius: radii.tile,
              borderWidth: 1,
              gap: spacing.xs,
              padding: spacing.md
            }}
          >
            <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }}>
              <Text style={{ color: planPalette.textPrimary, flex: 1, fontSize: 15, fontWeight: "900", lineHeight: 20 }}>{session.date} - {session.title}</Text>
              <PlanTonePill label={session.intensity} tone={session.tone} />
            </View>
            <Text style={planTextStyles.subtle}>{session.type}</Text>
            <Text style={planTextStyles.body}>Aim: {plainPlanRiskCopy(session.aim)}</Text>
          </View>
        )) : (
          <Text style={planTextStyles.subtle}>No upcoming app sessions are scheduled. Keep boxing logs manual if training happens outside the app.</Text>
        )}
      </View>
    </EngineCard>
  );
}

function previewStatusCopy(viewModel: PlanViewModel): { label: string; summary: string; tone: PlanTone } {
  const preview = viewModel.nextWeekPreview;
  if (viewModel.rollForwardStatus === ACTIVE_NEXT_WEEK_STATUS) {
    return { label: "Active", summary: "Next week plan is active.", tone: "green" };
  }
  if (viewModel.rollForwardStatus === "accepted_waiting") {
    return { label: "Accepted", summary: `Accepted preview starts ${preview.weekStartDate} if readiness allows.`, tone: "green" };
  }
  if (viewModel.rollForwardStatus === "blocked" || preview.requiresReview) {
    return { label: "Paused", summary: "Next week is paused until health warnings clear.", tone: "orange" };
  }
  if (preview.canAccept) {
    return { label: "Ready", summary: "Review before saving.", tone: "green" };
  }
  return { label: "Preview", summary: "Next week preview is ready.", tone: "blue" };
}

function nextWeekAction(viewModel: PlanViewModel): { label: string; kind: "accept" | "preview" | "start" } {
  if (viewModel.nextWeekPreview.canAccept) {
    return { kind: "accept", label: "Accept preview" };
  }
  if (viewModel.nextWeekPreview.showMaterializeAction) {
    return { kind: "start", label: "Start next week plan" };
  }
  return { kind: "preview", label: "Preview next week" };
}

function NextWeekCard({
  busy,
  nextWeekActionsAvailable,
  onAcceptPreview,
  onPreviewNextWeek,
  onStartNextWeekPlan,
  viewModel
}: {
  busy: boolean;
  nextWeekActionsAvailable: boolean;
  onAcceptPreview: () => void;
  onPreviewNextWeek: () => void;
  onStartNextWeekPlan: () => void;
  viewModel: PlanViewModel;
}) {
  const status = previewStatusCopy(viewModel);
  const action = nextWeekAction(viewModel);
  const actionDisabled = busy || (action.kind !== "preview" && !nextWeekActionsAvailable) || (action.kind === "start" && viewModel.nextWeekPreview.requiresReview);
  const onPress = action.kind === "accept" ? onAcceptPreview : action.kind === "start" ? onStartNextWeekPlan : onPreviewNextWeek;
  return (
    <EngineCard>
      <View style={{ gap: spacing.md }} testID="plan-next-week-card">
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }}>
          <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
            <Text style={planTextStyles.sectionTitle}>Next Week</Text>
            <Text style={planTextStyles.body}>{status.summary}</Text>
          </View>
          <PlanTonePill label={status.label} tone={status.tone} />
        </View>
        <Text style={planTextStyles.subtle}>{plainPlanRiskCopy(viewModel.rollForwardMessage)}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <PlanButton disabled={actionDisabled} icon={action.kind === "accept" ? "checkmark-outline" : "calendar-outline"} label={action.label} onPress={onPress} primary={action.kind !== "preview"} />
          {action.kind !== "preview" ? <PlanButton disabled={busy} icon="eye-outline" label="Preview next week" onPress={onPreviewNextWeek} /> : null}
        </View>
      </View>
    </EngineCard>
  );
}

function ChangePlanCard({
  busy,
  onOpenWorkspace
}: {
  busy: boolean;
  onOpenWorkspace: (workspace: PlanActiveWorkspace) => void;
}) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.md }} testID="plan-change-plan-card">
        <View style={{ gap: spacing.xs }}>
          <Text style={planTextStyles.sectionTitle}>Change Plan</Text>
          <Text style={planTextStyles.body}>Update the goal, boxing schedule, or plan changes when real life moves the week.</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <PlanButton disabled={busy} icon="create-outline" label="Change goal or schedule" onPress={() => onOpenWorkspace("goal_wizard")} primary />
          <PlanButton disabled={busy} icon="calendar-outline" label="Edit boxing schedule" onPress={() => onOpenWorkspace("fixed_schedule")} />
          <PlanButton disabled={busy} icon="options-outline" label="Plan changes" onPress={() => onOpenWorkspace("adjustments")} />
          <PlanButton disabled={busy} icon="list-outline" label="Plan details" onPress={() => onOpenWorkspace("plan_details")} />
        </View>
      </View>
    </EngineCard>
  );
}

function WeekDetailsContent({ viewModel }: { viewModel: PlanViewModel }) {
  return (
    <View style={{ gap: spacing.sm }}>
      {sortedPlanDays(viewModel).map((day) => (
        <View key={`week-detail:${day.date}`} style={{ gap: spacing.xs }}>
          <Text style={planTextStyles.fieldLabel}>{day.label}</Text>
          <Text style={planTextStyles.subtle}>Boxing: {friendlyAnchorText(day.protectedAnchors)}</Text>
          <Text style={planTextStyles.subtle}>App sessions: {friendlySupportText(day.generatedSupport)}</Text>
          {day.adjustmentNotes.map((note, index) => <Text key={`adjustment-note:${day.date}:${index}`} style={planTextStyles.subtle}>{plainPlanCopy(note)}</Text>)}
          {day.warningSummary ? <Text style={planTextStyles.subtle}>Review: {plainPlanRiskCopy(day.warningSummary)}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function PlanDetailRow({
  children,
  defaultOpen = false,
  icon,
  summary,
  testID,
  title,
  tone = "green"
}: React.PropsWithChildren<{
  defaultOpen?: boolean | undefined;
  icon: keyof typeof Ionicons.glyphMap;
  summary: string;
  testID?: string | undefined;
  title: string;
  tone?: PlanTone | undefined;
}>) {
  const [open, setOpen] = React.useState(defaultOpen);
  React.useEffect(() => {
    if (defaultOpen) {
      setOpen(true);
    }
  }, [defaultOpen]);
  const color = planToneColors[tone];
  return (
    <EngineCard>
      <View style={{ gap: open ? spacing.md : 0 }} testID={testID}>
        <Pressable
          accessibilityLabel={open ? `Hide ${title}` : title}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((value) => !value)}
          style={{ alignItems: "center", flexDirection: "row", gap: spacing.md, minHeight: 54 }}
        >
          <View
            style={{
              alignItems: "center",
              backgroundColor: planTint(tone, "16"),
              borderColor: planTint(tone, "42"),
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
            <Text style={{ color: planPalette.textPrimary, fontSize: 15, fontWeight: "900", lineHeight: 20 }}>{title}</Text>
            <Text numberOfLines={1} style={{ color: planPalette.textMuted, fontSize: 12, fontWeight: "700", lineHeight: 16 }}>{summary}</Text>
          </View>
          <Ionicons color={planPalette.textBody} name={open ? "chevron-up" : "chevron-down"} size={18} />
        </Pressable>
        {open ? <View style={{ gap: spacing.sm }}>{children}</View> : null}
      </View>
    </EngineCard>
  );
}

function PlanDetailRows({
  startOpen = false,
  viewModel
}: {
  startOpen?: boolean | undefined;
  viewModel: PlanViewModel;
}) {
  const hasReview = viewModel.warnings.length > 0 || viewModel.rollForwardStatus === "blocked";
  const reviewOpen = startOpen;
  return (
    <View style={{ gap: spacing.sm }} testID="plan-detail-rows">
      <PlanDetailRow defaultOpen={startOpen} icon="calendar-outline" summary={`${viewModel.dayPlans.length} days, ${viewModel.generatedSupportSessionCount} app session${viewModel.generatedSupportSessionCount === 1 ? "" : "s"}.`} testID="plan-week-details-row" title="Week Details" tone="green">
        <WeekDetailsContent viewModel={viewModel} />
      </PlanDetailRow>
      <PlanDetailRow defaultOpen={reviewOpen} icon="shield-checkmark-outline" summary={viewModel.warnings.length > 0 ? `${compactCount(viewModel.warnings.length, "review note")}.` : "No active plan warnings."} testID="plan-review-notes-row" title="Review Notes" tone={hasReview ? "orange" : "blue"}>
        <PlanReviewNotesContent viewModel={viewModel} />
        <PlanAuditDetailsContent viewModel={viewModel} />
      </PlanDetailRow>
      <PlanDetailRow icon="grid-outline" summary="Seven-day shape and what the week is built around." testID="plan-week-shape-row" title="Week Shape" tone="green">
        <WeekAtAGlanceContent viewModel={viewModel} />
        <BuiltAroundContent viewModel={viewModel} />
      </PlanDetailRow>
      <PlanDetailRow icon="time-outline" summary="Block history, previous changes, and saved decisions." testID="plan-history-row" title="Plan History" tone="purple">
        <TrainingBlockHistoryPanel history={viewModel.blockHistoryDetail} />
      </PlanDetailRow>
    </View>
  );
}

function PlanRoadmap({
  asOfDate,
  busy,
  nextWeekActionsAvailable,
  onAcceptPreview,
  onOpenWorkspace,
  onPreviewNextWeek,
  onStartNextWeekPlan,
  viewModel
}: {
  asOfDate: ISODateString;
  busy: boolean;
  nextWeekActionsAvailable: boolean;
  onAcceptPreview: () => void;
  onOpenWorkspace: (workspace: PlanActiveWorkspace) => void;
  onPreviewNextWeek: () => void;
  onStartNextWeekPlan: () => void;
  viewModel: PlanViewModel;
}) {
  return (
    <View style={{ gap: spacing.md }} testID="plan-roadmap">
      <ThisWeeksPlanCard busy={busy} onChangeGoal={() => onOpenWorkspace("goal_wizard")} onPreviewNextWeek={onPreviewNextWeek} viewModel={viewModel} />
      <UpcomingSessionsCard asOfDate={asOfDate} viewModel={viewModel} />
      <NextWeekCard
        busy={busy}
        nextWeekActionsAvailable={nextWeekActionsAvailable}
        onAcceptPreview={onAcceptPreview}
        onPreviewNextWeek={onPreviewNextWeek}
        onStartNextWeekPlan={onStartNextWeekPlan}
        viewModel={viewModel}
      />
      <ChangePlanCard busy={busy} onOpenWorkspace={onOpenWorkspace} />
    </View>
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
    activeWorkspaceContent = <PlanDetailsWorkspace viewModel={viewModel} />;
  }

  return (
    <LuminousScreen accent="green" backgroundImage={tabScreenBackgrounds.plan} testID="plan-screen">
      <ScreenHeader {...tabHeroHeaders.plan} />
      {showCriticalPlanRisk ? (
        <RiskBanner title="Plan needs review" message={plainPlanRiskCopy(viewModel.rollForwardMessage)} statusLabel={plainPlanRiskCopy(viewModel.rollForwardRiskLabel)} tone={viewModel.rollForwardRiskTone}>
          <View style={{ gap: spacing.xs }}>
            {viewModel.warnings.map((warning, index) => <Text key={`critical-plan-warning:${index}`} style={planTextStyles.body}>{plainPlanRiskCopy(warning)}</Text>)}
          </View>
        </RiskBanner>
      ) : null}
      {viewModel.lastAutoRollForwardMessage ? <RiskBanner title="Week boundary update" message={plainPlanRiskCopy(viewModel.lastAutoRollForwardMessage)} tone="info" /> : null}
      {adjustmentMessage ? <RiskBanner title="Plan update" message={plainPlanRiskCopy(adjustmentMessage)} tone="info" /> : null}
      <PlanRoadmap
        asOfDate={asOfDate}
        busy={busy}
        nextWeekActionsAvailable={nextWeekActionsAvailable}
        onAcceptPreview={acceptNextWeekPreview}
        onOpenWorkspace={openWorkspace}
        onPreviewNextWeek={openNextWeekPreview}
        onStartNextWeekPlan={startNextWeekPlan}
        viewModel={viewModel}
      />
      <PlanActiveWorkspaceFrame generationStatus={generationStatus}>{activeWorkspaceContent}</PlanActiveWorkspaceFrame>
      <PlanDetailRows viewModel={viewModel} />
    </LuminousScreen>
  );
}
