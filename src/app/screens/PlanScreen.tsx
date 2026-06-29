import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, useWindowDimensions, View, type ImageSourcePropType, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import agilityLadderIcon from "../../../assets/plan-calendar-icons/agility-ladder.png";
import barbellIcon from "../../../assets/plan-calendar-icons/barbell.png";
import boxingGlovesIcon from "../../../assets/plan-calendar-icons/boxing-gloves.png";
import coreIcon from "../../../assets/plan-calendar-icons/core.png";
import focusMittsIcon from "../../../assets/plan-calendar-icons/focus-mitts.png";
import heartRateIcon from "../../../assets/plan-calendar-icons/heart-rate.png";
import heavyBagIcon from "../../../assets/plan-calendar-icons/heavy-bag.png";
import highIntensityIcon from "../../../assets/plan-calendar-icons/high-intensity.png";
import hydrationIcon from "../../../assets/plan-calendar-icons/hydration.png";
import jumpRopeIcon from "../../../assets/plan-calendar-icons/jump-rope.png";
import kettlebellIcon from "../../../assets/plan-calendar-icons/kettlebell.png";
import mobilityIcon from "../../../assets/plan-calendar-icons/mobility.png";
import recoveryNightIcon from "../../../assets/plan-calendar-icons/recovery-night.png";
import runningShoeIcon from "../../../assets/plan-calendar-icons/running-shoe.png";
import sparringIcon from "../../../assets/plan-calendar-icons/sparring.png";
import stopwatchIcon from "../../../assets/plan-calendar-icons/stopwatch.png";
import type { ISODateString, PlanViewModel } from "../../engine/core/types";
import { EngineGeneratingCard, type EngineGenerationStatus } from "../components/EngineGeneratingCard";
import { EngineCard } from "../../design/components/EngineCard";
import { LuminousScreen, ScreenHeader } from "../../design/components/LuminousScreen";
import { PremiumCard } from "../../design/components/PremiumPrimitives";
import { RiskBanner } from "../../design/components/RiskBanner";
import { glassStyles } from "../../design/glass";
import { colors, radii, spacing } from "../../design/theme";
import type { NextWeekPreviewActions } from "../../hooks/useNextWeekPreviewActions";
import type { TrainingPlanAdjustmentActions } from "../../hooks/useTrainingPlanAdjustments";
import type { BuildGoalDraft, FightSetupDraft, ProtectedWorkoutDraft, RecurringProtectedWorkoutAnchorDraft, RecoveryGoalDraft, TournamentSetupDraft } from "../../services/supabase/onboardingService";
import { FixedBoxingScheduleCard } from "./plan/FixedBoxingScheduleCard";
import { PlanAdjustmentControls } from "./plan/PlanAdjustmentControls";
import { PlanGoalFlowCard } from "./plan/PlanGoalFlowCard";
import { planPalette, planTextStyles, planTint, planToneColors, type PlanTone } from "./plan/planPalette";
import { TrainingBlockHistoryPanel } from "./plan/TrainingBlockHistoryPanel";
import { screenStyles } from "./screenStyles";
import { tabHeroHeaders } from "./tabHeroConfig";

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
  | "block_history";

const ACTIVE_NEXT_WEEK_STATUS = "mater" + "ialized";

const planCalendarIcons = {
  agilityLadder: agilityLadderIcon,
  barbell: barbellIcon,
  boxingGloves: boxingGlovesIcon,
  core: coreIcon,
  focusMitts: focusMittsIcon,
  heartRate: heartRateIcon,
  heavyBag: heavyBagIcon,
  highIntensity: highIntensityIcon,
  hydration: hydrationIcon,
  jumpRope: jumpRopeIcon,
  kettlebell: kettlebellIcon,
  mobility: mobilityIcon,
  recoveryNight: recoveryNightIcon,
  runningShoe: runningShoeIcon,
  sparring: sparringIcon,
  stopwatch: stopwatchIcon
} satisfies Record<string, ImageSourcePropType>;

type PlanCalendarIconName = keyof typeof planCalendarIcons;

function friendlyAnchorText(value: string): string {
  return value === "No " + "protected " + "anchors." ? "None" : plainPlanCopy(value);
}

function plainPlanCopy(value: string): string {
  return value
    .replace(/\bexact V2 prescriptions?\b/gi, "clear app-session targets")
    .replace(/\bV2 prescriptions?\b/gi, "app-session targets")
    .replace(/\bstructured prescriptions?\b/gi, "workout details")
    .replace(/\bV2 compiler\b/gi, "Plan")
    .replace(/\bcompiler-generated\b/gi, "planned")
    .replace(/\bcompiler-projected\b/gi, "planned")
    .replace(/\bcompiler\b/gi, "plan")
    .replace(/\bprescriptions?\b/gi, "workout details")
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
type PreviewPlanDay = PlanViewModel["nextWeekPreview"]["dayPlanPreview"][number];

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

function toneForPreviewPlanDay(day: PreviewPlanDay): PlanTone {
  const summary = `${day.compactSummary} ${day.marker}`.toLowerCase();
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

function planDayLoadWidth(compactTag: PlanDay["compactTag"], metric: string, fuelDemand?: "low" | "moderate" | "high" | undefined): ViewStyle["width"] {
  if (compactTag === "Open") {
    return "12%";
  }
  if (metric === "Hard" || fuelDemand === "high") {
    return "88%";
  }
  if (compactTag === "Recovery") {
    return "38%";
  }
  return "56%";
}

function calendarIconNameFromParts({
  compactTag,
  fuelDemand,
  summary
}: {
  compactTag: PlanDay["compactTag"];
  fuelDemand: "low" | "moderate" | "high";
  summary: string;
}): PlanCalendarIconName {
  const copy = summary.toLowerCase();
  if (/hydr|water/.test(copy)) {
    return "hydration";
  }
  if (/spar|fight|bout/.test(copy)) {
    return "sparring";
  }
  if (/mitt|pad/.test(copy)) {
    return "focusMitts";
  }
  if (/bag/.test(copy)) {
    return "heavyBag";
  }
  if (compactTag === "Protected") {
    return "boxingGloves";
  }
  if (/agility|ladder|footwork|coordination/.test(copy)) {
    return "agilityLadder";
  }
  if (/rope|skip/.test(copy)) {
    return "jumpRope";
  }
  if (/road|run|aerobic|tempo|condition|conditioning/.test(copy)) {
    return "runningShoe";
  }
  if (/core|trunk|brace|rotation|anti-rotation/.test(copy)) {
    return "core";
  }
  if (/kettle/.test(copy)) {
    return "kettlebell";
  }
  if (/strength|lift|squat|hinge|deadlift|press|pull/.test(copy)) {
    return "barbell";
  }
  if (fuelDemand === "high" || /hard|interval|power|speed/.test(copy)) {
    return "highIntensity";
  }
  if (/readiness|heart|pulse/.test(copy)) {
    return "heartRate";
  }
  if (/mobility|stretch|range/.test(copy)) {
    return "mobility";
  }
  if (compactTag === "Recovery") {
    return "recoveryNight";
  }
  if (compactTag === "Support") {
    return "stopwatch";
  }
  return "recoveryNight";
}

function iconForPlanDay(day: PlanDay): PlanCalendarIconName {
  return calendarIconNameFromParts({
    compactTag: day.compactTag,
    fuelDemand: day.fuelDemand,
    summary: [
      day.compactSummary,
      day.marker,
      day.workSummary?.title,
      day.workSummary?.detail,
      day.workSummary?.aim,
      day.protectedAnchors,
      day.generatedSupport
    ].filter(Boolean).join(" ")
  });
}

function iconForPreviewPlanDay(day: PreviewPlanDay): PlanCalendarIconName {
  return calendarIconNameFromParts({
    compactTag: day.compactTag,
    fuelDemand: day.fuelDemand,
    summary: [day.compactSummary, day.marker, day.protectedAnchors, day.generatedSupport, day.explanation].join(" ")
  });
}

function PlanCalendarIcon({
  color,
  name,
  size = 34
}: {
  color: string;
  name: PlanCalendarIconName;
  size?: number | undefined;
}) {
  return (
    <Image
      accessibilityIgnoresInvertColors
      resizeMode="contain"
      source={planCalendarIcons[name]}
      style={{ height: size, tintColor: color, width: size }}
    />
  );
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
          <NextWeekCalendarGrid viewModel={viewModel} />
        </DetailsToggle>
      </View>
    </EngineCard>
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

function PlanGoalWizardModal({
  busy,
  children,
  onClose,
  visible
}: React.PropsWithChildren<{
  busy: boolean;
  onClose: () => void;
  visible: boolean;
}>) {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  if (!visible) {
    return null;
  }

  const compact = width < 520;
  const modalPaddingBottom = Math.max(insets.bottom + spacing.md, spacing.lg);
  const modalPaddingTop = Math.max(insets.top + spacing.md, spacing.lg);
  const availablePanelHeight = Math.max(360, height - modalPaddingTop - modalPaddingBottom);
  const maxPanelHeight = Math.min(availablePanelHeight, 840);
  const closeIfReady = () => {
    if (!busy) {
      onClose();
    }
  };
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
      onRequestClose={closeIfReady}
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
          disabled={busy}
          importantForAccessibility="no-hide-descendants"
          onPress={closeIfReady}
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
          accessibilityLabel="Plan goal wizard popup"
          accessibilityViewIsModal
          style={[
            {
              ...glassStyles.cardDeep,
              backgroundColor: "rgba(12, 18, 35, 0.98)",
              borderColor: "rgba(255, 255, 255, 0.22)",
              borderRadius: compact ? 28 : radii.card,
              maxHeight: maxPanelHeight,
              maxWidth: 700,
              overflow: "hidden",
              padding: compact ? spacing.sm : spacing.lg,
              width: "100%"
            },
            modalShadowStyle
          ]}
          testID="plan-goal-wizard-modal"
        >
          <ScrollView
            contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.sm }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PlanTonePill({ label, tone: _tone = "green" }: { label: string; tone?: PlanTone | undefined }) {
  return (
    <Text
      accessibilityLabel={`Status: ${label}`}
      numberOfLines={2}
      style={{
        alignSelf: "flex-start",
        color: colors.wrap,
        fontSize: 12,
        fontWeight: "800",
        lineHeight: 16,
        maxWidth: 140,
        minHeight: 16,
        textAlign: "right"
      }}
    >
      {label}
    </Text>
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
  const iconColor = primary ? colors.cornerBlack : planPalette.textBody;
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
          flexBasis: primary ? 190 : 150,
          flexDirection: "row",
          flexGrow: 1,
          flexShrink: 1,
          gap: spacing.xs,
          minHeight: 52,
          minWidth: 0,
          opacity: disabled ? 0.55 : 1,
          paddingHorizontal: primary ? spacing.md : spacing.sm
        }
      ]}
    >
      {icon ? <Ionicons color={iconColor} name={icon} size={15} style={{ flexShrink: 0 }} /> : null}
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.78}
        numberOfLines={2}
        style={{ color: primary ? colors.cornerBlack : planPalette.textBody, flexShrink: 1, fontSize: 14, fontWeight: primary ? "900" : "700", lineHeight: 18, textAlign: "center" }}
      >
        {label}
      </Text>
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
        gap: 5,
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

function planUpcomingIcon(tone: PlanTone): keyof typeof Ionicons.glyphMap {
  if (tone === "gold") {
    return "shield-checkmark-outline";
  }
  if (tone === "green") {
    return "walk-outline";
  }
  if (tone === "orange" || tone === "red") {
    return "warning-outline";
  }
  return "barbell-outline";
}

function planUpcomingRows(viewModel: PlanViewModel): { icon: keyof typeof Ionicons.glyphMap; id: string; label: string; meta: string; title: string; tone: PlanTone }[] {
  const rows: { icon: keyof typeof Ionicons.glyphMap; id: string; label: string; meta: string; title: string; tone: PlanTone }[] = [];
  for (const day of sortedPlanDays(viewModel)) {
    const tone = toneForPlanDay(day);
    if (day.protectedAnchors && day.protectedAnchors !== "No boxing added.") {
      rows.push({
        icon: planUpcomingIcon("gold"),
        id: `boxing:${day.date}`,
        label: shortDateLabel(day.date),
        meta: day.compactMetric,
        title: friendlyAnchorText(day.protectedAnchors.split(",")[0]?.trim() || "Boxing"),
        tone: "gold"
      });
    }
    for (const session of day.generatedSessions) {
      rows.push({
        icon: planUpcomingIcon(tone),
        id: session.id,
        label: shortDateLabel(day.date),
        meta: day.compactMetric,
        title: plainPlanCopy(session.title),
        tone
      });
    }
    if (rows.length >= 3) {
      break;
    }
  }
  return rows.slice(0, 3);
}

function PlanObjectiveCard({
  busy,
  onPreviewNextWeek,
  viewModel
}: {
  busy: boolean;
  onPreviewNextWeek: () => void;
  viewModel: PlanViewModel;
}) {
  return (
    <PremiumCard accent="green" density="regular" testID="plan-objective-card">
      <View style={{ gap: spacing.md }}>
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md }}>
          <View
            style={{
              alignItems: "center",
              backgroundColor: planTint("green", "18"),
              borderColor: planTint("green", "42"),
              borderRadius: radii.pill,
              borderWidth: 1,
              height: 48,
              justifyContent: "center",
              width: 48
            }}
          >
            <Ionicons color={planPalette.toneGreen} name="locate-outline" size={24} />
          </View>
          <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
            <Text style={{ color: planPalette.toneGreen, fontSize: 12, fontWeight: "900", lineHeight: 16, textTransform: "uppercase" }}>
              Objective
            </Text>
            <Text style={{ color: planPalette.textPrimary, fontSize: 19, fontWeight: "800", lineHeight: 25 }}>
              {plainPlanCopy(viewModel.blockGoal)}
            </Text>
          </View>
        </View>
        <View style={{ backgroundColor: planPalette.cardLine, height: 1 }} />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={onPreviewNextWeek}
          style={({ pressed }) => ({
            alignItems: "center",
            flexDirection: "row",
            gap: spacing.md,
            minHeight: 44,
            opacity: busy ? 0.62 : pressed ? 0.82 : 1
          })}
        >
          <Ionicons color={planPalette.textMuted} name="calendar-outline" size={20} />
          <Text style={{ color: planPalette.textBody, flex: 1, fontSize: 16, fontWeight: "700", lineHeight: 22 }}>
            Preview next week
          </Text>
          <Ionicons color={planPalette.textMuted} name="chevron-forward" size={22} />
        </Pressable>
      </View>
    </PremiumCard>
  );
}

function PlanActionLink({
  busy,
  label,
  onPress
}: {
  busy: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        flexDirection: "row",
        flexShrink: 0,
        gap: spacing.xs,
        justifyContent: "center",
        minHeight: 48,
        opacity: busy ? 0.62 : pressed ? 0.82 : 1,
        width: 132
      })}
    >
      <Ionicons color={planPalette.toneGreen} name="options-outline" size={20} />
      <Text numberOfLines={1} style={{ color: planPalette.toneGreen, flexShrink: 1, fontSize: 14, fontWeight: "800", lineHeight: 19 }}>
        {label}
      </Text>
      <Ionicons color={planPalette.toneGreen} name="chevron-forward" size={20} />
    </Pressable>
  );
}

function PlanWeekSummaryCard({
  busy,
  onChangeGoal,
  viewModel
}: {
  busy: boolean;
  onChangeGoal: () => void;
  viewModel: PlanViewModel;
}) {
  const modeSummary = viewModel.modeLabel === "Tournament mode" || viewModel.modeLabel === "Recovery"
    ? plainPlanCopy(viewModel.fightOrTournamentNote ?? viewModel.athleteFacingWeekSummary)
    : null;
  return (
    <PremiumCard accent="green" density="regular">
      <View style={{ gap: spacing.md }} testID="plan-hero-card">
        <View style={{ alignItems: "center", flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1, gap: 2, minWidth: 120 }}>
            <Text numberOfLines={2} style={{ color: planPalette.toneGreen, fontSize: 13, fontWeight: "900", lineHeight: 16 }}>
              {viewModel.modeLabel}
            </Text>
            <Text numberOfLines={1} style={{ color: planPalette.textPrimary, fontSize: 23, fontWeight: "900", lineHeight: 28 }}>
              Week {viewModel.blockProgress.currentWeek}
            </Text>
            <Text numberOfLines={2} style={{ color: planPalette.textMuted, fontSize: 14, fontWeight: "600", lineHeight: 18 }}>
              {viewModel.blockProgress.currentWeek} of {viewModel.blockProgress.totalWeeks} weeks
            </Text>
          </View>
          <View style={{ backgroundColor: planPalette.cardLine, height: 72, width: 1 }} />
          <PlanActionLink busy={busy} label="Adjust plan" onPress={onChangeGoal} />
        </View>
        {modeSummary ? (
          <Text style={{ color: planPalette.textBody, fontSize: 14, fontWeight: "600", lineHeight: 20 }}>
            {modeSummary}
          </Text>
        ) : null}
      </View>
    </PremiumCard>
  );
}

function PlanUpcomingSessionsCard({ viewModel }: { viewModel: PlanViewModel }) {
  const rows = planUpcomingRows(viewModel);
  return (
    <PremiumCard accent="green" density="compact" testID="plan-upcoming-sessions-card">
      <View style={{ gap: spacing.sm }}>
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }}>
          <Text style={{ color: planPalette.textPrimary, fontSize: 17, fontWeight: "900", lineHeight: 22 }}>
            Upcoming sessions
          </Text>
          <PlanTonePill label={`${rows.length} shown`} tone={rows.length > 0 ? "green" : "muted"} />
        </View>
        {rows.length > 0 ? (
          <View style={{ gap: 0 }}>
            {rows.map((row, index) => (
              <View
                key={row.id}
                style={{
                  alignItems: "stretch",
                  flexDirection: "row",
                  gap: spacing.md,
                  minHeight: 66,
                  paddingBottom: index === rows.length - 1 ? 0 : spacing.sm,
                  paddingTop: index === 0 ? 0 : spacing.sm
                }}
              >
                <View style={{ alignItems: "center", width: 42 }}>
                  <View
                    style={{
                      alignItems: "center",
                      backgroundColor: planTint(row.tone, "18"),
                      borderColor: planTint(row.tone, "70"),
                      borderRadius: radii.pill,
                      borderWidth: 1,
                      height: 36,
                      justifyContent: "center",
                      width: 36
                    }}
                  >
                    <Ionicons color={planToneColors[row.tone]} name={row.icon} size={18} />
                  </View>
                  {index < rows.length - 1 ? <View style={{ backgroundColor: planPalette.cardLine, flex: 1, marginTop: spacing.xs, width: 1 }} /> : null}
                </View>
                <View style={{ borderBottomColor: index === rows.length - 1 ? "transparent" : planPalette.cardLine, borderBottomWidth: 1, flex: 1, gap: 4, minWidth: 0, paddingBottom: spacing.sm }}>
                  <Text style={{ color: planToneColors[row.tone], fontSize: 11, fontWeight: "900", lineHeight: 15, textTransform: "uppercase" }}>{row.label}</Text>
                  <Text numberOfLines={2} style={{ color: planPalette.textPrimary, fontSize: 16, fontWeight: "900", lineHeight: 20 }}>{row.title}</Text>
                  <Text numberOfLines={1} style={{ color: planPalette.textMuted, fontSize: 12, fontWeight: "700", lineHeight: 16 }}>{row.meta}</Text>
                </View>
                <View style={{ alignItems: "center", justifyContent: "center", paddingBottom: spacing.sm }}>
                  <Ionicons color={planPalette.textMuted} name="chevron-forward" size={21} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={planTextStyles.subtle}>No app sessions are forced this week. Fixed boxing and manual updates still drive the plan.</Text>
        )}
      </View>
    </PremiumCard>
  );
}

function ThisWeeksPlanCard({
  busy,
  calendarOpen,
  nextWeekActionsAvailable,
  onAcceptPreview,
  onChangeGoal,
  onPreviewNextWeek,
  onStartNextWeekPlan,
  onToggleCalendar,
  viewModel
}: {
  busy: boolean;
  calendarOpen: boolean;
  nextWeekActionsAvailable: boolean;
  onAcceptPreview: () => void;
  onChangeGoal: () => void;
  onPreviewNextWeek: () => void;
  onStartNextWeekPlan: () => void;
  onToggleCalendar: () => void;
  viewModel: PlanViewModel;
}) {
  return (
    <View style={{ gap: spacing.md }}>
      <PlanWeekSummaryCard busy={busy} onChangeGoal={onChangeGoal} viewModel={viewModel} />
      <WeekReviewStrip viewModel={viewModel} />
      <PlanObjectiveCard busy={busy} onPreviewNextWeek={onPreviewNextWeek} viewModel={viewModel} />
      <PlanUpcomingSessionsCard viewModel={viewModel} />
      <PlanWeekTicker
        busy={busy}
        calendarOpen={calendarOpen}
        nextWeekActionsAvailable={nextWeekActionsAvailable}
        onAcceptPreview={onAcceptPreview}
        onPreviewNextWeek={onPreviewNextWeek}
        onStartNextWeekPlan={onStartNextWeekPlan}
        onToggleCalendar={onToggleCalendar}
        viewModel={viewModel}
      />
    </View>
  );
}

function WeekAtAGlanceContent({ viewModel }: { viewModel: PlanViewModel }) {
  const days = sortedPlanDays(viewModel).slice(0, 7);
  return (
    <View style={{ alignItems: "stretch", flexDirection: "row", gap: 5 }}>
      {days.map((day) => {
        const tone = toneForPlanDay(day);
        const color = planToneColors[tone];
        const metric = dayMetricLabel(day);
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
              minHeight: 98,
              minWidth: 0,
              paddingHorizontal: 5,
              paddingVertical: spacing.sm
            }}
          >
            <Text numberOfLines={1} style={{ color, fontSize: 10, fontWeight: "900", lineHeight: 13, textAlign: "center" }}>
              {weekdayLabelFromDate(day.date, day.label)}
            </Text>
            <View
              accessibilityLabel={`${weekdayLabelFromDate(day.date, day.label)} ${dayTypeLabel(day)} ${metric}`}
              style={{
                alignItems: "center",
                backgroundColor: tone === "muted" ? "rgba(255, 255, 255, 0.06)" : planTint(tone, "18"),
                borderColor: tone === "muted" ? planPalette.controlLine : planTint(tone, "36"),
                borderRadius: radii.pill,
                borderWidth: 1,
                height: 38,
                justifyContent: "center",
                width: "100%"
              }}
            >
              <PlanCalendarIcon color={color} name={iconForPlanDay(day)} size={27} />
            </View>
            <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={[planTextStyles.subtle, { fontSize: 10, lineHeight: 12, textAlign: "center" }]}>
              {metric}
            </Text>
            <View style={{ backgroundColor: planPalette.controlLine, borderRadius: radii.pill, height: 6, overflow: "hidden" }}>
              <View style={{ backgroundColor: color, height: "100%", width: planDayLoadWidth(day.compactTag, metric, day.fuelDemand) }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function PlanCalendarDayTile({
  date,
  detail,
  iconName,
  loadWidth,
  metric,
  summary,
  tone,
  typeLabel
}: {
  date: string;
  detail: string;
  iconName: PlanCalendarIconName;
  loadWidth: ViewStyle["width"];
  metric: string;
  summary: string;
  tone: PlanTone;
  typeLabel: string;
}) {
  const color = planToneColors[tone];
  return (
    <View
      style={{
        backgroundColor: tone === "muted" ? planPalette.controlFill : planTint(tone, "10"),
        borderColor: tone === "muted" ? planPalette.controlLine : planTint(tone, "3D"),
        borderRadius: radii.tile,
        borderWidth: 1,
        flexBasis: 132,
        flexGrow: 1,
        gap: spacing.sm,
        minHeight: 142,
        padding: spacing.md
      }}
    >
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.xs, justifyContent: "space-between" }}>
        <Text numberOfLines={1} style={{ color, flex: 1, fontSize: 12, fontWeight: "900", lineHeight: 16 }}>
          {date}
        </Text>
        <View
          accessibilityLabel={`${date} ${typeLabel} ${metric}`}
          style={{
            alignItems: "center",
            backgroundColor: tone === "muted" ? "rgba(255, 255, 255, 0.06)" : planTint(tone, "18"),
            borderColor: tone === "muted" ? planPalette.controlLine : planTint(tone, "3D"),
            borderRadius: radii.pill,
            borderWidth: 1,
            height: 46,
            justifyContent: "center",
            width: 46
          }}
        >
          <PlanCalendarIcon color={color} name={iconName} size={32} />
        </View>
      </View>
      <Text numberOfLines={2} style={{ color: planPalette.textPrimary, fontSize: 15, fontWeight: "900", lineHeight: 19 }}>
        {summary}
      </Text>
      <Text numberOfLines={2} style={planTextStyles.subtle}>
        {detail}
      </Text>
      <View style={{ backgroundColor: planPalette.controlLine, borderRadius: radii.pill, height: 7, marginTop: "auto", overflow: "hidden" }}>
        <View style={{ backgroundColor: color, height: "100%", width: loadWidth }} />
      </View>
    </View>
  );
}

function ThisWeekCalendarGrid({ viewModel }: { viewModel: PlanViewModel }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }} testID="plan-calendar-this-week">
      {sortedPlanDays(viewModel).slice(0, 7).map((day) => {
        const tone = toneForPlanDay(day);
        return (
          <PlanCalendarDayTile
            key={`calendar-this-week:${day.date}`}
            date={shortDateLabel(day.date)}
            detail={plainPlanCopy(day.workSummary?.detail ?? `${friendlyCompactTag(day.compactTag)} / ${dayMetricLabel(day)}`)}
            iconName={iconForPlanDay(day)}
            loadWidth={planDayLoadWidth(day.compactTag, dayMetricLabel(day), day.fuelDemand)}
            metric={dayMetricLabel(day)}
            summary={plainPlanCopy(day.workSummary?.title ?? day.compactSummary)}
            tone={tone}
            typeLabel={dayTypeLabel(day)}
          />
        );
      })}
    </View>
  );
}

function NextWeekCalendarGrid({ viewModel }: { viewModel: PlanViewModel }) {
  const preview = viewModel.nextWeekPreview;
  return (
    <View style={{ gap: spacing.sm }} testID="plan-calendar-next-week">
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }}>
        <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
          <Text style={planTextStyles.sectionTitle}>Next week preview</Text>
          <Text style={planTextStyles.body}>{plainPlanCopy(preview.goal)}</Text>
        </View>
        <PlanTonePill label={previewStatusCopy(viewModel).label} tone={previewStatusCopy(viewModel).tone} />
      </View>
      <Text style={planTextStyles.subtle}>{plainPlanRiskCopy(previewStatusCopy(viewModel).summary)}</Text>
      {preview.actionCopy ? <Text style={planTextStyles.subtle}>{plainPlanRiskCopy(preview.actionCopy)}</Text> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {preview.dayPlanPreview.map((day) => {
          const tone = toneForPreviewPlanDay(day);
          const typeLabel = friendlyCompactTag(day.compactTag);
          return (
            <PlanCalendarDayTile
              key={`calendar-next-week:${day.date}`}
              date={shortDateLabel(day.date, preview.weekStartDate)}
              detail={`${typeLabel} / ${plainPlanCopy(day.compactMetric)}`}
              iconName={iconForPreviewPlanDay(day)}
              loadWidth={planDayLoadWidth(day.compactTag, day.compactMetric, day.fuelDemand)}
              metric={day.compactMetric}
              summary={plainPlanCopy(day.compactSummary)}
              tone={tone}
              typeLabel={typeLabel}
            />
          );
        })}
      </View>
      <Text style={planTextStyles.subtle}>{plainPlanRiskCopy(viewModel.rollForwardMessage)}</Text>
      {preview.requiresReview ? <Text style={planTextStyles.subtle}>Health warnings need review before this plan can start.</Text> : null}
      {preview.safetyNotes.map((note, index) => <Text key={`next-week-calendar-safety:${index}`} style={planTextStyles.subtle}>Review: {plainPlanRiskCopy(note)}</Text>)}
      {preview.materializedGeneratedSessions.map((session) => (
        <Text key={session.id} style={planTextStyles.subtle}>
          Active next week: {shortDateLabel(session.date, preview.weekStartDate)} - {plainPlanCopy(session.title)} ({session.durationMinutes} min)
        </Text>
      ))}
    </View>
  );
}

function PlanWeekColorLegend() {
  const items: { label: string; tone: PlanTone }[] = [
    { label: "Boxing", tone: "gold" },
    { label: "App", tone: "purple" },
    { label: "Recovery", tone: "green" },
    { label: "Hard", tone: "orange" },
    { label: "Open", tone: "muted" }
  ];
  return (
    <View
      accessibilityLabel="Plan color legend"
      style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}
      testID="plan-week-color-legend"
    >
      {items.map((item) => (
        <View key={`plan-color-legend:${item.label}`} style={{ alignItems: "center", flexDirection: "row", gap: 4, minHeight: 18 }}>
          <View
            style={{
              backgroundColor: planToneColors[item.tone],
              borderRadius: radii.pill,
              height: 7,
              opacity: item.tone === "muted" ? 0.62 : 1,
              width: 7
            }}
          />
          <Text style={{ color: planPalette.textMuted, fontSize: 10, fontWeight: "800", lineHeight: 13 }}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function PlanWeekTicker({
  busy,
  calendarOpen,
  nextWeekActionsAvailable,
  onAcceptPreview,
  onPreviewNextWeek,
  onStartNextWeekPlan,
  onToggleCalendar,
  viewModel
}: {
  busy: boolean;
  calendarOpen: boolean;
  nextWeekActionsAvailable: boolean;
  onAcceptPreview: () => void;
  onPreviewNextWeek: () => void;
  onStartNextWeekPlan: () => void;
  onToggleCalendar: () => void;
  viewModel: PlanViewModel;
}) {
  const status = previewStatusCopy(viewModel);
  const action = nextWeekAction(viewModel);
  const actionDisabled = busy || (action.kind !== "preview" && !nextWeekActionsAvailable) || (action.kind === "start" && viewModel.nextWeekPreview.requiresReview);
  const onNextWeekAction = action.kind === "accept" ? onAcceptPreview : action.kind === "start" ? onStartNextWeekPlan : onPreviewNextWeek;
  return (
    <View
      style={{
        backgroundColor: planPalette.controlFill,
        borderColor: planPalette.controlLine,
        borderRadius: radii.card,
        borderWidth: 1,
        gap: spacing.md,
        padding: spacing.md
      }}
      testID="plan-week-strip-card"
    >
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }}>
        <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
          <Text style={planTextStyles.sectionTitle}>This week</Text>
          <Text style={planTextStyles.subtle}>Tap the calendar to see what is already planned next.</Text>
        </View>
        <Pressable
          accessibilityLabel={calendarOpen ? "Hide plan calendar" : "Show plan calendar"}
          accessibilityRole="button"
          accessibilityState={{ expanded: calendarOpen }}
          onPress={onToggleCalendar}
          style={({ pressed }) => [
            screenStyles.quietButton,
            {
              backgroundColor: pressed ? planPalette.controlFillPressed : planPalette.controlFill,
              borderColor: planPalette.controlLine,
              flexBasis: 132,
              flexGrow: 0,
              gap: spacing.xs,
              minHeight: 44
            }
          ]}
          testID="plan-week-ticker-toggle"
        >
          <Ionicons color={planPalette.textBody} name={calendarOpen ? "chevron-up" : "calendar-outline"} size={16} />
          <Text style={{ color: planPalette.textBody, fontSize: 14, fontWeight: "800", lineHeight: 18, textAlign: "center" }}>
            {calendarOpen ? "Hide calendar" : "Show calendar"}
          </Text>
        </Pressable>
      </View>
      <WeekAtAGlanceContent viewModel={viewModel} />
      <PlanWeekColorLegend />
      {calendarOpen ? (
        <View style={{ gap: spacing.md }} testID="plan-calendar-expanded">
          <View style={{ gap: spacing.xs }}>
            <Text style={planTextStyles.sectionTitle}>Calendar</Text>
            <Text style={planTextStyles.body}>This week and the next planned week, in one view.</Text>
          </View>
          <ThisWeekCalendarGrid viewModel={viewModel} />
          <NextWeekCalendarGrid viewModel={viewModel} />
          <View style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "space-between" }}>
            <View style={{ flexBasis: 190, flexGrow: 1, gap: spacing.xs, minWidth: 0 }}>
              <Text style={planTextStyles.sectionTitle}>Next week</Text>
              <Text style={planTextStyles.subtle}>{plainPlanRiskCopy(status.summary)}</Text>
            </View>
            <PlanButton
              disabled={actionDisabled}
              icon={action.kind === "accept" ? "checkmark-outline" : action.kind === "start" ? "play-outline" : "calendar-outline"}
              label={action.label}
              onPress={onNextWeekAction}
              primary={action.kind !== "preview"}
            />
          </View>
        </View>
      ) : null}
    </View>
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
  if (viewModel.nextWeekPreview.showMaterializeAction) {
    return { kind: "start", label: "Start next week plan" };
  }
  if (viewModel.nextWeekPreview.canAccept) {
    return { kind: "accept", label: "Accept preview" };
  }
  return { kind: "preview", label: "Preview next week" };
}

function CollapsedPlanDetails({
  busy,
  onOpenWorkspace,
  viewModel: _viewModel
}: {
  busy: boolean;
  onOpenWorkspace: (workspace: PlanActiveWorkspace) => void;
  viewModel: PlanViewModel;
}) {
  return (
    <View style={{ gap: spacing.sm }} testID="plan-details-collapsed">
      <EngineCard>
        <View style={{ gap: spacing.md }}>
          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: planPalette.textPrimary, fontSize: 15, fontWeight: "900", lineHeight: 20 }}>Plan tools</Text>
            <Text style={{ color: planPalette.textMuted, fontSize: 12, fontWeight: "700", lineHeight: 16 }}>
              Schedule edits, plan changes, and history stay one tap away without expanding week details.
            </Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <PlanButton disabled={busy} icon="calendar-outline" label="Edit boxing schedule" onPress={() => onOpenWorkspace("fixed_schedule")} />
            <PlanButton disabled={busy} icon="options-outline" label="Plan changes" onPress={() => onOpenWorkspace("adjustments")} />
            <PlanButton disabled={busy} icon="time-outline" label="Plan history" onPress={() => onOpenWorkspace("block_history")} />
          </View>
        </View>
      </EngineCard>
    </View>
  );
}

function PlanRoadmap({
  busy,
  onOpenWorkspace,
  viewModel
}: {
  busy: boolean;
  onOpenWorkspace: (workspace: PlanActiveWorkspace) => void;
  viewModel: PlanViewModel;
}) {
  return (
    <View style={{ gap: spacing.md }} testID="plan-roadmap">
      <CollapsedPlanDetails busy={busy} onOpenWorkspace={onOpenWorkspace} viewModel={viewModel} />
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
  const [planCalendarOpen, setPlanCalendarOpen] = React.useState(false);
  const showCriticalPlanRisk = viewModel.rollForwardStatus === "blocked" && viewModel.rollForwardRiskTone === "critical";
  const scheduleBusy = busy || !onSaveProtectedSession || !onDeleteProtectedSession || !onSaveRecurringProtectedAnchor || !onDeleteRecurringProtectedAnchor;
  const goalBusy = busy || !onSaveBuildGoal || !onSaveRecoveryGoal;
  const effectiveWorkspace = workspaceForGenerationStatus(generationStatus) ?? (viewModel.requiresPlanGeneration ? "goal_wizard" : activeWorkspace);
  const goalWizardOpen = effectiveWorkspace === "goal_wizard";
  const nextWeekActionsAvailable = Boolean(nextWeekPreviewActions);

  const openWorkspace = (workspace: PlanActiveWorkspace) => {
    setActiveWorkspace(workspace);
    if (workspace === "next_week_preview") {
      setPreviewDetailsOpen(true);
    }
  };

  const openNextWeekPreview = () => {
    setPlanCalendarOpen(true);
    setPreviewDetailsOpen(true);
    if (activeWorkspace === "next_week_preview") {
      setActiveWorkspace("overview");
    }
  };

  const togglePlanCalendar = () => {
    setPlanCalendarOpen((open) => !open);
  };

  const closeActiveWorkspace = () => {
    setActiveWorkspace("overview");
    setPreviewDetailsOpen(false);
  };

  const acceptNextWeekPreview = () => {
    setPlanCalendarOpen(true);
    setPreviewDetailsOpen(true);
    void nextWeekPreviewActions?.acceptPreview(viewModel.nextWeekPreview.previewId ?? undefined);
  };

  const startNextWeekPlan = () => {
    setPlanCalendarOpen(true);
    setPreviewDetailsOpen(true);
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

  const goalWizardContent = goalWizardOpen ? (
    <PlanGoalFlowCard
      asOfDate={asOfDate}
      busy={goalBusy}
      currentModeLabel={viewModel.modeLabel}
      existingFixedSchedule={viewModel.fixedSchedule}
      existingWeeklyAnchors={viewModel.weeklyAnchors}
      framed={false}
      initialAvailableDays={viewModel.generatedSupportAvailability.selectedDays}
      isMinor={isMinor}
      onCancel={closeActiveWorkspace}
      onSaveBuildGoal={onSaveBuildGoal ?? (async () => undefined)}
      onSaveFightSetup={onSaveFightSetup}
      onSaveProtectedSession={onSaveProtectedSession}
      onSaveRecurringProtectedAnchor={onSaveRecurringProtectedAnchor}
      onSaveRecoveryGoal={onSaveRecoveryGoal ?? (async () => undefined)}
      onSaveTournamentSetup={onSaveTournamentSetup}
      showCloseButton
    />
  ) : null;

  let activeWorkspaceContent: React.ReactNode = null;
  if (effectiveWorkspace === "next_week_preview") {
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
  }

  return (
    <LuminousScreen accent="green" testID="plan-screen">
      <ScreenHeader {...tabHeroHeaders.plan} />
      <ThisWeeksPlanCard
        busy={busy}
        calendarOpen={planCalendarOpen}
        nextWeekActionsAvailable={nextWeekActionsAvailable}
        onAcceptPreview={acceptNextWeekPreview}
        onChangeGoal={() => openWorkspace("goal_wizard")}
        onPreviewNextWeek={openNextWeekPreview}
        onStartNextWeekPlan={startNextWeekPlan}
        onToggleCalendar={togglePlanCalendar}
        viewModel={viewModel}
      />
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
        busy={busy}
        onOpenWorkspace={openWorkspace}
        viewModel={viewModel}
      />
      <PlanActiveWorkspaceFrame generationStatus={generationStatus}>{activeWorkspaceContent}</PlanActiveWorkspaceFrame>
      <PlanGoalWizardModal busy={goalBusy} onClose={closeActiveWorkspace} visible={goalWizardOpen}>
        {goalWizardContent}
      </PlanGoalWizardModal>
    </LuminousScreen>
  );
}
