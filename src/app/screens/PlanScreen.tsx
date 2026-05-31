import React from "react";
import { Pressable, Text, View } from "react-native";
import type { ISODateString, PlanViewModel } from "../../engine/core/types";
import { EngineGeneratingCard, type EngineGenerationStatus } from "../components/EngineGeneratingCard";
import { DisclosureCard } from "../../design/components/DisclosureCard";
import { EngineCard } from "../../design/components/EngineCard";
import { accentColor, accentWash, LuminousScreen, ScreenHeader, type LuminousAccent } from "../../design/components/LuminousScreen";
import { RiskBanner } from "../../design/components/RiskBanner";
import { spacing } from "../../design/theme";
import type { NextWeekPreviewActions } from "../../hooks/useNextWeekPreviewActions";
import type { TrainingPlanAdjustmentActions } from "../../hooks/useTrainingPlanAdjustments";
import type { BuildGoalDraft, FightSetupDraft, ProtectedWorkoutDraft, RecurringProtectedWorkoutAnchorDraft, RecoveryGoalDraft, TournamentSetupDraft } from "../../services/supabase/onboardingService";
import { FixedBoxingScheduleCard } from "./plan/FixedBoxingScheduleCard";
import { PlanGoalFlowCard } from "./plan/PlanGoalFlowCard";
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
  onDeleteProtectedSession?: ((workoutId: string) => Promise<void>) | undefined;
  onSaveBuildGoal?: ((draft: BuildGoalDraft) => Promise<void>) | undefined;
  onSaveFightSetup: (draft: FightSetupDraft) => Promise<void>;
  onSaveProtectedSession?: ((workoutId: string | null, draft: ProtectedWorkoutDraft) => Promise<void>) | undefined;
  onSaveRecurringProtectedAnchor?: ((anchorId: string | null, draft: RecurringProtectedWorkoutAnchorDraft) => Promise<void>) | undefined;
  onSaveRecoveryGoal?: ((draft: RecoveryGoalDraft) => Promise<void>) | undefined;
  onSaveTournamentSetup: (draft: TournamentSetupDraft) => Promise<void>;
  viewModel: PlanViewModel;
}

function compactCount(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function friendlyAnchorText(value: string): string {
  return value === "No protected anchors." ? "None" : value;
}

function friendlySupportText(value: string): string {
  return value === "No generated support." ? "None" : value;
}

function toneForTag(tag: "Protected" | "Support" | "Recovery" | "Open"): LuminousAccent {
  if (tag === "Protected") {
    return "green";
  }
  if (tag === "Recovery") {
    return "gold";
  }
  if (tag === "Open") {
    return "purple";
  }
  return "blue";
}

function SmallTag({ label, tone = "blue" }: { label: string; tone?: LuminousAccent | undefined }) {
  return (
    <View
      style={{
        alignItems: "center",
        alignSelf: "flex-start",
        backgroundColor: accentWash[tone],
        borderColor: `${accentColor[tone]}55`,
        borderRadius: 999,
        borderWidth: 1,
        justifyContent: "center",
        minHeight: 26,
        paddingHorizontal: spacing.sm
      }}
    >
      <Text numberOfLines={1} style={{ color: accentColor[tone], fontSize: 12, fontWeight: "700", lineHeight: 16 }}>{label}</Text>
    </View>
  );
}

function WeekPreviewRow({ day }: { day: PlanViewModel["dayPlans"][number] }) {
  return (
    <View
      style={{
        alignItems: "center",
        borderTopColor: "rgba(255, 255, 255, 0.08)",
        borderTopWidth: 1,
        flexDirection: "row",
        gap: spacing.sm,
        minHeight: 52,
        paddingVertical: spacing.sm
      }}
    >
      <View style={{ width: 74 }}>
        <Text numberOfLines={1} style={screenStyles.fieldLabel}>{day.label.split(",")[0] ?? day.label}</Text>
        <Text numberOfLines={1} style={screenStyles.subtle}>{day.label.split(", ")[1] ?? day.date}</Text>
      </View>
      <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
        <Text numberOfLines={1} style={screenStyles.body}>{day.compactSummary}</Text>
        <SmallTag label={day.compactTag} tone={toneForTag(day.compactTag)} />
      </View>
      <Text numberOfLines={1} style={screenStyles.subtle}>{day.compactMetric}</Text>
    </View>
  );
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

function CurrentModeCard({
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
      <View style={{ gap: spacing.md }} testID="plan-current-mode-card">
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.sectionTitle}>Current mode</Text>
          <Text style={screenStyles.callout}>{viewModel.modeLabel}</Text>
          <Text style={screenStyles.body}>{viewModel.planLifecycleLabel}. {viewModel.goalSummary}</Text>
          <Text style={screenStyles.subtle}>Generated support days: {viewModel.scheduleAvailabilitySummary}</Text>
          <Text style={screenStyles.subtle}>Your boxing comes first.</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <Pressable accessibilityRole="button" disabled={busy} onPress={onChangeGoal} style={[screenStyles.button, { flexBasis: 150, flexGrow: 1 }]}>
            <Text style={screenStyles.buttonText}>Generate plan</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={onPreviewNextWeek} style={[screenStyles.quietButton, { flexBasis: 150, flexGrow: 1 }]}>
            <Text style={screenStyles.quietButtonText}>Preview next week</Text>
          </Pressable>
        </View>
      </View>
    </EngineCard>
  );
}

function CompactWeekPreviewCard({ viewModel }: { viewModel: PlanViewModel }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.md }} testID="plan-compact-week-preview-card">
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.sectionTitle}>This week</Text>
          <Text style={screenStyles.body}>{viewModel.weeklySummary}</Text>
        </View>
        <View>
          {viewModel.dayPlans.map((day) => <WeekPreviewRow day={day} key={`current-week-row:${day.date}`} />)}
        </View>
        <DetailsToggle>
          <Text style={screenStyles.body}>{viewModel.hardDaySummary}</Text>
          <Text style={screenStyles.body}>{viewModel.recoveryDaySummary}</Text>
          {viewModel.fightOrTournamentNote ? <Text style={screenStyles.body}>{viewModel.fightOrTournamentNote}</Text> : null}
          {viewModel.dayPlans.map((day) => (
            <View key={`week-detail:${day.date}`} style={{ gap: spacing.xs }}>
              <Text style={screenStyles.fieldLabel}>{day.label}</Text>
              <Text style={screenStyles.subtle}>Protected boxing: {friendlyAnchorText(day.protectedAnchors)}</Text>
              <Text style={screenStyles.subtle}>Support work: {friendlySupportText(day.generatedSupport)}</Text>
              {day.adjustmentNotes.map((note, index) => <Text key={`adjustment-note:${day.date}:${index}`} style={screenStyles.subtle}>{note}</Text>)}
              {day.warningSummary ? <Text style={screenStyles.subtle}>Review: {day.warningSummary}</Text> : null}
            </View>
          ))}
        </DetailsToggle>
      </View>
    </EngineCard>
  );
}

function GeneratedSupportSummaryCard({
  busy,
  nextWeekPreviewActions,
  onSecondaryAction,
  previewDetailsOpen,
  viewModel
}: {
  busy: boolean;
  nextWeekPreviewActions?: NextWeekPreviewActions | undefined;
  onSecondaryAction: () => void;
  previewDetailsOpen: boolean;
  viewModel: PlanViewModel;
}) {
  const preview = viewModel.nextWeekPreview;
  return (
    <EngineCard>
      <View style={{ gap: spacing.md }} testID="plan-generated-support-summary-card">
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.sectionTitle}>Generated support</Text>
          <Text style={screenStyles.callout}>{compactCount(viewModel.generatedSupportSessionCount, "support session")}</Text>
          <Text style={screenStyles.body}>Generated support days: {viewModel.scheduleAvailabilitySummary}</Text>
          <Text style={screenStyles.body}>{viewModel.supportWorkReason ?? "CornerIQ adds support work around your protected boxing anchors, readiness, and safety."}</Text>
          <Text style={screenStyles.subtle}>Generated support will only be placed on selected available days.</Text>
          <Text style={screenStyles.subtle}>Weekly anchors and one-off sessions remain protected.</Text>
          <Text style={screenStyles.subtle}>Readiness, safety, and phase rules still gate the final plan.</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {preview.canAccept ? (
            <Pressable accessibilityLabel="Accept next week preview" accessibilityRole="button" accessibilityState={{ disabled: busy || !nextWeekPreviewActions }} disabled={busy || !nextWeekPreviewActions} onPress={() => void nextWeekPreviewActions?.acceptPreview(preview.previewId ?? undefined)} style={[screenStyles.button, { flexBasis: 150, flexGrow: 1 }]}>
              <Text style={screenStyles.buttonText}>Accept preview</Text>
            </Pressable>
          ) : null}
          {preview.showMaterializeAction ? (
            <Pressable accessibilityLabel="Start next week plan" accessibilityRole="button" accessibilityState={{ disabled: busy || !nextWeekPreviewActions || preview.requiresReview }} disabled={busy || !nextWeekPreviewActions || preview.requiresReview} onPress={() => void nextWeekPreviewActions?.materializeNextWeek(preview.previewId ?? undefined)} style={[screenStyles.button, { flexBasis: 160, flexGrow: 1 }]}>
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
              <Text style={screenStyles.subtle}>{day.compactTag} / {day.compactMetric}</Text>
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

function PlanReviewNotes({ viewModel }: { viewModel: PlanViewModel }) {
  return (
    <DisclosureCard title="Plan review notes" summary={viewModel.warnings.length > 0 ? `${viewModel.warnings.length} review note${viewModel.warnings.length === 1 ? "" : "s"} hidden until needed.` : "No active plan review notes."}>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.body}>{viewModel.rollForwardMessage}</Text>
        {viewModel.warnings.length > 0 ? viewModel.warnings.map((warning, index) => <Text key={`plan-warning:${index}`} style={screenStyles.subtle}>{warning}</Text>) : <Text style={screenStyles.subtle}>No active plan warnings.</Text>}
      </View>
    </DisclosureCard>
  );
}

export function PlanScreen({
  adjustmentMessage,
  asOfDate,
  busy,
  generationStatus = "idle",
  isMinor,
  nextWeekPreviewActions,
  onDeleteProtectedSession,
  onSaveBuildGoal,
  onSaveFightSetup,
  onSaveProtectedSession,
  onSaveRecurringProtectedAnchor,
  onSaveRecoveryGoal,
  onSaveTournamentSetup,
  viewModel
}: PlanScreenProps) {
  const [goalFlowOpen, setGoalFlowOpen] = React.useState(false);
  const [previewDetailsOpen, setPreviewDetailsOpen] = React.useState(false);
  const showCriticalPlanRisk = viewModel.rollForwardStatus === "blocked" && viewModel.rollForwardRiskTone === "critical";
  const scheduleBusy = busy || !onSaveProtectedSession || !onDeleteProtectedSession;
  const goalBusy = busy || !onSaveBuildGoal || !onSaveRecoveryGoal;
  return (
    <LuminousScreen testID="plan-screen">
      <ScreenHeader eyebrow={viewModel.planLifecycleLabel} title={viewModel.title} />
      <EngineGeneratingCard status={generationStatus} />
      {showCriticalPlanRisk ? (
        <RiskBanner title="Plan safety check" message={viewModel.rollForwardMessage} statusLabel={viewModel.rollForwardRiskLabel} tone={viewModel.rollForwardRiskTone}>
          <View style={{ gap: spacing.xs }}>
            {viewModel.warnings.map((warning, index) => <Text key={`critical-plan-warning:${index}`} style={screenStyles.body}>{warning}</Text>)}
          </View>
        </RiskBanner>
      ) : null}
      {viewModel.lastAutoRollForwardMessage ? <RiskBanner title="Week boundary update" message={viewModel.lastAutoRollForwardMessage} tone="info" /> : null}
      {adjustmentMessage ? <RiskBanner title="Plan update" message={adjustmentMessage} tone="info" /> : null}
      <CurrentModeCard
        busy={busy}
        onChangeGoal={() => setGoalFlowOpen(true)}
        onPreviewNextWeek={() => setPreviewDetailsOpen(true)}
        viewModel={viewModel}
      />
      {goalFlowOpen ? (
        <PlanGoalFlowCard
          asOfDate={asOfDate}
          busy={goalBusy}
          currentModeLabel={viewModel.modeLabel}
          existingFixedSchedule={viewModel.fixedSchedule}
          existingWeeklyAnchors={viewModel.weeklyAnchors}
          initialAvailableDays={viewModel.generatedSupportAvailability.selectedDays}
          isMinor={isMinor}
          onCancel={() => setGoalFlowOpen(false)}
          onSaveBuildGoal={onSaveBuildGoal ?? (async () => undefined)}
          onSaveFightSetup={onSaveFightSetup}
          onSaveProtectedSession={onSaveProtectedSession}
          onSaveRecurringProtectedAnchor={onSaveRecurringProtectedAnchor}
          onSaveRecoveryGoal={onSaveRecoveryGoal ?? (async () => undefined)}
          onSaveTournamentSetup={onSaveTournamentSetup}
        />
      ) : null}
      <CompactWeekPreviewCard viewModel={viewModel} />
      <FixedBoxingScheduleCard
        asOfDate={asOfDate}
        busy={scheduleBusy}
        onDelete={onDeleteProtectedSession ?? (async () => undefined)}
        onSave={onSaveProtectedSession ?? (async () => undefined)}
        weeklyAnchors={viewModel.weeklyAnchors}
        sessions={viewModel.fixedSchedule}
      />
      <GeneratedSupportSummaryCard
        busy={busy}
        nextWeekPreviewActions={nextWeekPreviewActions}
        onSecondaryAction={() => setPreviewDetailsOpen(viewModel.nextWeekPreview.canAccept ? false : true)}
        previewDetailsOpen={previewDetailsOpen}
        viewModel={viewModel}
      />
      <PlanReviewNotes viewModel={viewModel} />
    </LuminousScreen>
  );
}
