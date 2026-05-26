import React from "react";
import { Pressable, Text, View } from "react-native";
import type { ISODateString, PlanViewModel } from "../../engine/core/types";
import { DisclosureCard } from "../../design/components/DisclosureCard";
import { EngineCard } from "../../design/components/EngineCard";
import { EmptyState } from "../../design/components/EmptyState";
import { accentColor, accentWash, LuminousScreen, MetricTile, ScreenHeader, type LuminousAccent } from "../../design/components/LuminousScreen";
import { RiskBanner } from "../../design/components/RiskBanner";
import { SectionTabs, type SectionTabItem } from "../../design/components/SectionTabs";
import { TimelineList } from "../../design/components/TimelineList";
import { TopActionCard } from "../../design/components/TopActionCard";
import { spacing } from "../../design/theme";
import type { NextWeekPreviewActions } from "../../hooks/useNextWeekPreviewActions";
import type { TrainingPlanAdjustmentActions } from "../../hooks/useTrainingPlanAdjustments";
import type { FightSetupDraft, TournamentSetupDraft } from "../../services/supabase/onboardingService";
import { FightSetupScreen } from "./fight/FightSetupScreen";
import { PlanAdjustmentControls } from "./plan/PlanAdjustmentControls";
import { TrainingBlockHistoryPanel } from "./plan/TrainingBlockHistoryPanel";
import { screenStyles } from "./screenStyles";

type PlanSection = "week" | "nextWeek" | "history" | "adjustments";

const planSections: readonly SectionTabItem<PlanSection>[] = [
  { key: "week", label: "Week" },
  { key: "nextWeek", label: "Next Week" },
  { key: "history", label: "History" },
  { key: "adjustments", label: "Adjustments" }
];

export interface PlanScreenProps {
  adjustmentActions?: TrainingPlanAdjustmentActions | undefined;
  adjustmentMessage?: string | null | undefined;
  asOfDate: ISODateString;
  busy: boolean;
  hasActiveFightOrTournament: boolean;
  isMinor: boolean;
  nextWeekPreviewActions?: NextWeekPreviewActions | undefined;
  onSaveFightSetup: (draft: FightSetupDraft) => Promise<void>;
  onSaveTournamentSetup: (draft: TournamentSetupDraft) => Promise<void>;
  viewModel: PlanViewModel;
}

function hasProtectedAnchors(value: string): boolean {
  return value !== "No protected anchors.";
}

function compactCount(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatDateLabel(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

function splitDayLabel(label: string): { date: string; weekday: string } {
  const [weekday, date] = label.split(", ");
  return { date: date ?? label, weekday: weekday ?? label };
}

function toneForMarker(marker: string): LuminousAccent {
  const normalized = marker.toLowerCase();
  if (normalized.includes("hard") || normalized.includes("sparring")) {
    return "orange";
  }
  if (normalized.includes("recovery") || normalized.includes("taper")) {
    return "green";
  }
  if (normalized.includes("tournament")) {
    return "gold";
  }
  return "blue";
}

function toneForFuelDemand(fuelDemand: string): LuminousAccent {
  const normalized = fuelDemand.toLowerCase();
  if (normalized.includes("high")) {
    return "orange";
  }
  if (normalized.includes("moderate")) {
    return "blue";
  }
  return "green";
}

function WeekStat({ label, tone, value }: { label: string; tone: LuminousAccent; value: string }) {
  return (
    <View
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.055)",
        borderColor: "rgba(255, 255, 255, 0.10)",
        borderRadius: 16,
        borderWidth: 1,
        flexBasis: 132,
        flexGrow: 1,
        gap: spacing.xs,
        minHeight: 54,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm
      }}
    >
      <Text numberOfLines={1} style={[screenStyles.fieldLabel, { color: accentColor[tone] }]}>{label}</Text>
      <Text numberOfLines={2} style={screenStyles.subtle}>{value}</Text>
    </View>
  );
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

function WeekRow({
  dateLabel,
  fuelDemand,
  marker,
  summary
}: {
  dateLabel: string;
  fuelDemand: string;
  marker: string;
  summary: string;
}) {
  const { date, weekday } = splitDayLabel(dateLabel);
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
      <View style={{ width: 54 }}>
        <Text numberOfLines={1} style={screenStyles.fieldLabel}>{weekday}</Text>
        <Text numberOfLines={1} style={screenStyles.subtle}>{date}</Text>
      </View>
      <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
        <SmallTag label={marker} tone={toneForMarker(marker)} />
        <Text numberOfLines={1} style={screenStyles.subtle}>{summary}</Text>
      </View>
      <SmallTag label={fuelDemand} tone={toneForFuelDemand(fuelDemand)} />
    </View>
  );
}

function DetailsToggle({
  children,
  summary
}: React.PropsWithChildren<{
  summary: string;
}>) {
  const [open, setOpen] = React.useState(false);
  return (
    <View style={{ gap: spacing.sm }}>
      <Pressable
        accessibilityLabel={open ? "Hide day details" : "Show day details"}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={screenStyles.quietButton}
      >
        <Text style={screenStyles.quietButtonText}>{open ? "Hide day details" : "Show day details"}</Text>
      </Pressable>
      <Text style={screenStyles.subtle}>{summary}</Text>
      {open ? <View style={{ gap: spacing.sm }}>{children}</View> : null}
    </View>
  );
}

function dayRowSummary(day: PlanViewModel["dayPlans"][number] | PlanViewModel["nextWeekPreview"]["dayPlanPreview"][number]): string {
  return hasProtectedAnchors(day.protectedAnchors) ? day.protectedAnchors : day.generatedSupport;
}

function ThisWeekCard({ protectedAnchorCount, viewModel }: { protectedAnchorCount: number; viewModel: PlanViewModel }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.md }} testID="plan-this-week-card">
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.sectionTitle}>This week</Text>
          <Text style={screenStyles.body}>{viewModel.blockPhase.replaceAll("_", " ")} / week {viewModel.weekIndex}</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <WeekStat label="Anchors" tone="green" value={viewModel.protectedAnchorSummary} />
          <WeekStat label="Support" tone="blue" value={compactCount(viewModel.generatedSupportDayCount, "day")} />
          <WeekStat label="Recovery" tone="gold" value={compactCount(viewModel.recoveryDayCount, "day")} />
        </View>
        {viewModel.fightOrTournamentNote ? <Text style={screenStyles.body}>{viewModel.fightOrTournamentNote}</Text> : null}
        <View>
          {viewModel.dayPlans.map((day, index) => (
            <WeekRow key={`week-row:${index}`} dateLabel={day.label} fuelDemand={day.fuelDemand} marker={day.marker} summary={dayRowSummary(day)} />
          ))}
        </View>
        <DetailsToggle summary={`${protectedAnchorCount} protected day${protectedAnchorCount === 1 ? "" : "s"}; details stay collapsed until needed.`}>
          <Text style={screenStyles.body}>{viewModel.blockGoal}</Text>
          <Text style={screenStyles.body}>{viewModel.hardDaySummary}</Text>
          {viewModel.supportWorkReason ? <Text style={screenStyles.subtle}>{viewModel.supportWorkReason}</Text> : null}
          <Text style={screenStyles.subtle}>{viewModel.blockPersistenceStatus}</Text>
          {viewModel.dayPlans.map((day, index) => (
            <View key={`week-detail:${index}`} style={{ gap: spacing.xs }}>
              <Text style={screenStyles.fieldLabel}>{day.label}</Text>
              <Text style={screenStyles.subtle}>Protected: {day.protectedAnchors}</Text>
              <Text style={screenStyles.subtle}>Support: {day.generatedSupport}</Text>
              <Text style={screenStyles.subtle}>{day.explanation}</Text>
              {day.adjustmentNotes.map((note, noteIndex) => <Text key={`day-adjustment:${index}:${noteIndex}`} style={screenStyles.subtle}>{note}</Text>)}
              {day.warningSummary ? <Text style={screenStyles.subtle}>Warning: {day.warningSummary}</Text> : null}
            </View>
          ))}
        </DetailsToggle>
      </View>
    </EngineCard>
  );
}

function recoveryPreviewCount(viewModel: PlanViewModel): number {
  return viewModel.nextWeekPreview.dayPlanPreview.filter((day) => day.marker === "Recovery" || day.marker === "Taper" || day.marker === "Tournament conservation").length;
}

function NextWeekPreviewCard({
  busy,
  nextWeekPreviewActions,
  viewModel
}: {
  busy: boolean;
  nextWeekPreviewActions?: NextWeekPreviewActions | undefined;
  viewModel: PlanViewModel;
}) {
  const preview = viewModel.nextWeekPreview;
  return (
    <EngineCard>
      <View style={{ gap: spacing.md }} testID="plan-next-week-summary-card">
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.sectionTitle}>Next week preview</Text>
          <Text style={screenStyles.body}>{preview.goal}</Text>
          <Text style={screenStyles.subtle}>{preview.persistedStatusLabel}</Text>
          <Text style={screenStyles.subtle}>{viewModel.rollForwardMessage}</Text>
          {preview.requiresReview ? <Text style={screenStyles.subtle}>Review required before materializing.</Text> : null}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <WeekStat label="Planned support" tone="blue" value={compactCount(preview.plannedSupportCount, "day")} />
          <WeekStat label="Anchors" tone="green" value={preview.protectedAnchorSummary} />
          <WeekStat label="Recovery" tone="gold" value={compactCount(recoveryPreviewCount(viewModel), "day")} />
        </View>
        <View>
          {preview.dayPlanPreview.map((day, index) => (
            <WeekRow key={`next-week-row:${index}`} dateLabel={formatDateLabel(day.date)} fuelDemand={day.fuelDemand} marker={day.marker} summary={dayRowSummary(day)} />
          ))}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {preview.canAccept ? (
            <Pressable accessibilityLabel="Accept next week preview" accessibilityRole="button" accessibilityState={{ disabled: busy || !nextWeekPreviewActions }} disabled={busy || !nextWeekPreviewActions} style={[screenStyles.quietButton, { flexBasis: 160, flexGrow: 1 }]} onPress={() => void nextWeekPreviewActions?.acceptPreview(preview.previewId ?? undefined)}>
              <Text style={screenStyles.quietButtonText}>Accept preview</Text>
            </Pressable>
          ) : null}
          {preview.showMaterializeAction ? (
            <Pressable accessibilityLabel="Materialize next week" accessibilityRole="button" accessibilityState={{ disabled: busy || !nextWeekPreviewActions || preview.requiresReview }} disabled={busy || !nextWeekPreviewActions || preview.requiresReview} style={[screenStyles.quietButton, { flexBasis: 180, flexGrow: 1 }]} onPress={() => void nextWeekPreviewActions?.materializeNextWeek(preview.previewId ?? undefined)}>
              <Text style={screenStyles.quietButtonText}>Materialize next week</Text>
            </Pressable>
          ) : null}
        </View>
        <DetailsToggle summary="Daily notes, safety notes, and materialized rows are collapsed until needed.">
          <Text style={screenStyles.body}>{preview.weekStartDate} to {preview.weekEndDate}</Text>
          <Text style={screenStyles.body}>{preview.volumeStrategy.replaceAll("_", " ")} / hard day cap {preview.hardDayCap}</Text>
          <Text style={screenStyles.subtle}>Support bias: {preview.supportBias.replaceAll("_", " ")}</Text>
          <Text style={screenStyles.subtle}>{preview.actionCopy}</Text>
          <Text style={screenStyles.subtle}>{preview.explanation}</Text>
          {preview.materializedGeneratedSessions.map((session, index) => (
            <Text key={`materialized-session:${index}`} style={screenStyles.subtle}>
              Materialized: {session.date} - {session.title} ({session.intensity}, {session.durationMinutes} min, fuel {session.fuelDemand})
            </Text>
          ))}
          {preview.safetyNotes.map((note, index) => <Text key={`next-week-safety:${index}`} style={screenStyles.subtle}>Safety: {note}</Text>)}
          {preview.dayPlanPreview.map((day, index) => (
            <View key={`next-week-detail:${index}`} style={{ gap: spacing.xs }}>
              <Text style={screenStyles.fieldLabel}>{formatDateLabel(day.date)}</Text>
              <Text style={screenStyles.subtle}>Protected: {day.protectedAnchors}</Text>
              <Text style={screenStyles.subtle}>Support: {day.generatedSupport}</Text>
              <Text style={screenStyles.subtle}>{day.explanation}</Text>
            </View>
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

export function PlanScreen({ adjustmentActions, adjustmentMessage, asOfDate, busy, hasActiveFightOrTournament, isMinor, nextWeekPreviewActions, onSaveFightSetup, onSaveTournamentSetup, viewModel }: PlanScreenProps) {
  const [section, setSection] = React.useState<PlanSection>("week");
  const showCriticalPlanRisk = viewModel.rollForwardStatus === "blocked" && viewModel.rollForwardRiskTone === "critical";
  const protectedAnchorCount = viewModel.dayPlans.filter((day) => hasProtectedAnchors(day.protectedAnchors)).length;
  return (
    <LuminousScreen testID="plan-screen">
      <ScreenHeader eyebrow={`Week ${viewModel.weekIndex}`} title={viewModel.title} />
      <SectionTabs items={planSections} value={section} onChange={setSection} />
      {showCriticalPlanRisk ? (
        <RiskBanner title="Plan safety check" message={viewModel.rollForwardMessage} statusLabel={viewModel.rollForwardRiskLabel} tone={viewModel.rollForwardRiskTone}>
          <View style={{ gap: spacing.xs }}>
            {viewModel.warnings.map((warning, index) => <Text key={`critical-plan-warning:${index}`} style={screenStyles.body}>{warning}</Text>)}
          </View>
        </RiskBanner>
      ) : null}
      {viewModel.lastAutoRollForwardMessage ? (
        <RiskBanner title="Week boundary update" message={viewModel.lastAutoRollForwardMessage} tone="info" />
      ) : null}
      {section === "week" ? (
        <View style={{ gap: spacing.lg }} testID="plan-week-section">
          <TopActionCard
            accent="green"
            optional={viewModel.topAction.optional}
            primaryAction={viewModel.topAction.primaryAction}
            purpose={viewModel.topAction.purpose}
            testID="plan-top-action-card"
            title={viewModel.topAction.title}
            why={viewModel.topAction.why}
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
            <MetricTile accent="green" label="Boxing anchors" meta="Protected first" value={compactCount(protectedAnchorCount, "anchor")} />
            <MetricTile accent="blue" label="Support days" meta="Generated work" value={compactCount(viewModel.generatedSupportDayCount, "support day", "support days")} />
            <MetricTile accent="gold" label="Recovery" meta="Rest/easy" value={compactCount(viewModel.recoveryDayCount, "recovery", "recovery")} />
          </View>
          <ThisWeekCard protectedAnchorCount={protectedAnchorCount} viewModel={viewModel} />
          <PlanReviewNotes viewModel={viewModel} />
          <FightSetupScreen
            asOfDate={asOfDate}
            busy={busy}
            hasActiveFightOrTournament={hasActiveFightOrTournament}
            isMinor={isMinor}
            onSaveFight={onSaveFightSetup}
            onSaveTournament={onSaveTournamentSetup}
          />
        </View>
      ) : null}
      {section === "nextWeek" ? (
        <View style={{ gap: spacing.lg }} testID="plan-next-week-section">
          <NextWeekPreviewCard busy={busy} nextWeekPreviewActions={nextWeekPreviewActions} viewModel={viewModel} />
        </View>
      ) : null}
      {section === "history" ? (
        <View style={{ gap: spacing.lg }} testID="plan-history-section">
          <EngineCard>
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.sectionTitle}>Block timeline</Text>
              <Text style={screenStyles.body}>History weeks: {viewModel.blockHistorySummary.activeBlockHistoryCount}</Text>
              {viewModel.latestProgressionDecision ? <Text style={screenStyles.body}>{viewModel.latestProgressionDecision}</Text> : <Text style={screenStyles.body}>No persisted progression decision yet.</Text>}
              {viewModel.currentWeekSummary ? (
                <View style={{ gap: spacing.sm }}>
                  <Text style={screenStyles.callout}>{viewModel.currentWeekSummary.title}</Text>
                  <Text style={screenStyles.body}>{viewModel.currentWeekSummary.summary}</Text>
                  {viewModel.currentWeekSummary.rows.map((row, index) => <Text key={`current-week-row:${index}`} style={screenStyles.subtle}>{row}</Text>)}
                </View>
              ) : (
                <Text style={screenStyles.body}>Current week summary is pending persistence.</Text>
              )}
              <TimelineList
                emptyCopy="No block timeline events yet."
                items={viewModel.timelineEvents.map((event, index) => ({
                  id: `${event.eventType}:${event.eventDate}:${event.title}:${index}`,
                  title: `${event.eventDate} - ${event.title}`,
                  body: event.summary,
                  meta: event.eventType.replaceAll("_", " ")
                }))}
              />
            </View>
          </EngineCard>
          <EngineCard>
            <TrainingBlockHistoryPanel history={viewModel.blockHistoryDetail} />
          </EngineCard>
        </View>
      ) : null}
      {section === "adjustments" ? (
        <View style={{ gap: spacing.lg }} testID="plan-adjustments-section">
          <EngineCard>
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.sectionTitle}>Adjustment audit</Text>
              <Text style={screenStyles.body}>{viewModel.adjustmentSummary}</Text>
              {viewModel.activeAdjustments.length > 0 ? viewModel.activeAdjustments.map((adjustment, index) => <Text key={`active-adjustment:${index}`} style={screenStyles.subtle}>{adjustment}</Text>) : <Text style={screenStyles.subtle}>No active manual adjustment is changing this plan.</Text>}
              {adjustmentMessage ? <Text style={screenStyles.subtle}>{adjustmentMessage}</Text> : null}
            </View>
          </EngineCard>
          {viewModel.dayPlans.length > 0 ? viewModel.dayPlans.map((day) => (
            <EngineCard key={day.date}>
              <View style={{ gap: spacing.sm }}>
                <Text style={screenStyles.sectionTitle}>{day.label}</Text>
                <Text style={screenStyles.body}>Service-owned controls for this day. Screens request changes; the engine decides what applies.</Text>
                {day.adjustmentNotes.map((note, index) => <Text key={`adjustment-day-note:${index}`} style={screenStyles.subtle}>{note}</Text>)}
                <PlanAdjustmentControls actions={adjustmentActions} busy={busy} date={day.date as ISODateString} generatedSessions={day.generatedSessions} />
              </View>
            </EngineCard>
          )) : (
            <EmptyState title="No day plans loaded" message="The week projection is missing, so adjustment controls cannot target real days yet. Refresh engine state or complete setup; missing plan data stays unknown." />
          )}
        </View>
      ) : null}
    </LuminousScreen>
  );
}
