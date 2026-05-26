import React from "react";
import { Pressable, Text, View } from "react-native";
import type {
  FightWeekFuelPlan,
  BodyMassTrajectoryViewModel,
  FuelHistoryViewModel,
  FuelCommandCenterState,
  NutritionSafetyReview,
  PersistedNutritionSafetyReview,
  RehydrationChecklist,
  TournamentFuelPlan,
  WeightClassStatus
} from "../../../engine/core/types";
import { EngineCard } from "../../../design/components/EngineCard";
import { colors, spacing } from "../../../design/theme";
import { screenStyles } from "../screenStyles";

function statusLabel(status: string): string {
  return status.replaceAll("_", " ");
}

function Lines({ items, tone = "subtle" }: { items: readonly string[]; tone?: "body" | "subtle" | "callout" }) {
  return (
    <>
      {items.map((item, index) => (
        <Text key={`line:${index}`} style={screenStyles[tone]}>
          {item}
        </Text>
      ))}
    </>
  );
}

export function FuelCommandCard({ command }: { command: FuelCommandCenterState }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Details / why</Text>
        <Text style={screenStyles.callout}>{command.primaryFuelAction}</Text>
        <Text style={screenStyles.body}>{command.bodyMassAction}</Text>
        <Text style={screenStyles.subtle}>Confidence: {command.confidence.level}</Text>
        {command.decisionStack.slice(0, 4).map((item, index) => (
          <View key={`fuel-decision:${index}`} style={{ gap: spacing.xs }}>
            <Text style={screenStyles.body}>{item.label}: {item.summary}</Text>
            <Text style={screenStyles.subtle}>{item.why}</Text>
          </View>
        ))}
      </View>
    </EngineCard>
  );
}

export function NutritionSafetyReviewCard({
  activeReviews,
  onAcknowledgeReview,
  onRequestReview,
  review
}: {
  activeReviews?: readonly PersistedNutritionSafetyReview[] | undefined;
  onAcknowledgeReview?: ((reviewId: string) => void | Promise<void>) | undefined;
  onRequestReview?: (() => void | Promise<void>) | undefined;
  review: NutritionSafetyReview;
}) {
  const activeReview = activeReviews?.[0] ?? review.activeReview ?? null;
  if (!review.required && !activeReview) {
    return null;
  }
  const reasons = activeReview?.reasons.length ? activeReview.reasons : review.reasons;
  const blockingFlags = activeReview?.blockingFlags.length ? activeReview.blockingFlags : review.blockingFlags;
  const suggestedNextSteps = activeReview?.suggestedNextSteps.length ? activeReview.suggestedNextSteps : review.suggestedNextSteps;
  const canAcknowledge = Boolean(activeReview && (activeReview.status === "requested" || activeReview.status === "blocked") && onAcknowledgeReview);
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={[screenStyles.sectionTitle, { color: colors.redCorner }]}>Safety review</Text>
        <Text style={screenStyles.callout}>{review.professionalReviewCopy}</Text>
        {activeReview ? <Text style={screenStyles.body}>Review {activeReview.id}: {statusLabel(activeReview.status)}.</Text> : null}
        {activeReview?.hardStop || review.blockingFlags.length > 0 ? <Text style={screenStyles.body}>Hard stop remains active.</Text> : null}
        <Text style={screenStyles.subtle}>You cannot self-clear nutrition hard stops.</Text>
        <Text style={screenStyles.subtle}>Reviewer-clear workflow is not in the app yet.</Text>
        <Text style={screenStyles.subtle}>For urgent symptoms or unsafe weight concerns, stop and seek qualified support.</Text>
        <Lines items={reasons.length > 0 ? reasons : ["Safety review is active."]} />
        {blockingFlags.length > 0 ? <Text style={screenStyles.body}>Blocking flags</Text> : null}
        <Lines items={blockingFlags} />
        <Lines items={suggestedNextSteps} tone="body" />
        {!activeReview && onRequestReview ? (
          <Pressable accessibilityRole="button" onPress={() => void onRequestReview()} style={screenStyles.button}>
            <Text style={screenStyles.buttonText}>Request safety review</Text>
          </Pressable>
        ) : null}
        {canAcknowledge && activeReview ? (
          <Pressable accessibilityRole="button" onPress={() => void onAcknowledgeReview?.(activeReview.id)} style={screenStyles.button}>
            <Text style={screenStyles.buttonText}>Acknowledge review status</Text>
          </Pressable>
        ) : null}
      </View>
    </EngineCard>
  );
}

export function BodyMassTrajectoryCard({ trajectory }: { trajectory: BodyMassTrajectoryViewModel }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Body-mass trajectory</Text>
        <Text style={screenStyles.callout}>{trajectory.status}</Text>
        <Text style={screenStyles.body}>{trajectory.nextSafeAction}</Text>
        <Text style={screenStyles.subtle}>{trajectory.latestWeight}</Text>
        <Text style={screenStyles.subtle}>{trajectory.logCount7Day}</Text>
        <Text style={screenStyles.subtle}>{trajectory.trend}</Text>
        <Text style={screenStyles.subtle}>{trajectory.target}</Text>
        <Text style={screenStyles.subtle}>{trajectory.daysToWeighIn}</Text>
        <Text style={screenStyles.subtle}>{trajectory.cycleNoiseNote}</Text>
        <Text style={screenStyles.subtle}>{trajectory.missingDataCopy}</Text>
        {trajectory.reviewActionVisible ? <Text style={screenStyles.body}>Review action is required before weight-class pressure continues.</Text> : null}
      </View>
    </EngineCard>
  );
}

export function FuelHistoryCard({ history }: { history: FuelHistoryViewModel }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Recent fuel history</Text>
        <Text style={screenStyles.callout}>{history.todaySummary}</Text>
        <Text style={screenStyles.subtle}>Confidence: {history.loggingConfidence}</Text>
        <Text style={screenStyles.body}>Recent meals</Text>
        <Lines items={history.recentMeals} />
        <Text style={screenStyles.body}>7-day macros</Text>
        <Lines items={history.macroTrend7Day} />
        <Text style={screenStyles.body}>Hydration and electrolytes</Text>
        <Lines items={history.hydrationTrend7Day} />
        <Text style={screenStyles.subtle}>{history.electrolyteSummary}</Text>
        <Text style={screenStyles.body}>Fiber and sodium</Text>
        <Text style={screenStyles.subtle}>{history.fiberSodiumSummary}</Text>
        <Text style={screenStyles.subtle}>{history.missingDataCopy}</Text>
        <Lines items={history.warnings} />
      </View>
    </EngineCard>
  );
}

export function WeightClassStatusCard({ status }: { status: WeightClassStatus }) {
  if (status.status === "no_active_weight_target") {
    return null;
  }
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Weight-class status</Text>
        <Text style={screenStyles.callout}>{statusLabel(status.status)}</Text>
        <Text style={screenStyles.body}>{status.nextAction}</Text>
        <Text style={screenStyles.subtle}>{status.trendSummary}</Text>
        <Text style={screenStyles.subtle}>{status.targetSummary}</Text>
        <Text style={screenStyles.subtle}>{status.projectedReadiness}</Text>
        <Lines items={status.safetyFlags} />
      </View>
    </EngineCard>
  );
}

export function SessionFuelingCard({ command, hitTheseFirst }: { command: FuelCommandCenterState; hitTheseFirst: readonly string[] }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Session fueling</Text>
        <Text style={screenStyles.body}>{command.sessionFuelAction}</Text>
        <Lines items={hitTheseFirst} tone="callout" />
      </View>
    </EngineCard>
  );
}

export function FightWeekFuelCard({ plan }: { plan: FightWeekFuelPlan }) {
  if (plan.status === "not_applicable" || plan.status === "build_phase" || plan.status === "camp_phase") {
    return null;
  }
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Fight-week fuel</Text>
        <Text style={screenStyles.callout}>{statusLabel(plan.status)}</Text>
        <Text style={screenStyles.body}>{plan.explanation}</Text>
        <Text style={screenStyles.subtle}>{plan.carbohydrateGuidance}</Text>
        <Text style={screenStyles.subtle}>{plan.hydrationGuidance}</Text>
        <Text style={screenStyles.subtle}>{plan.fiberGuidance}</Text>
        <Text style={screenStyles.subtle}>{plan.sodiumGuidance}</Text>
        <Text style={screenStyles.subtle}>{plan.gutComfortGuidance}</Text>
        <Lines items={[...plan.blockedReasons, ...plan.reviewReasons, ...plan.safeActions]} />
      </View>
    </EngineCard>
  );
}

export function RehydrationChecklistCard({ checklist }: { checklist: RehydrationChecklist }) {
  if (checklist.status === "not_applicable") {
    return null;
  }
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Rehydration checklist</Text>
        <Text style={screenStyles.callout}>{statusLabel(checklist.status)}</Text>
        {checklist.timeWindowHours !== null ? <Text style={screenStyles.body}>{checklist.timeWindowHours} hour window</Text> : null}
        <Lines items={checklist.immediateActions} tone="body" />
        {checklist.firstMeal ? <Text style={screenStyles.subtle}>First meal: {checklist.firstMeal}</Text> : null}
        {checklist.nextMeal ? <Text style={screenStyles.subtle}>Next meal: {checklist.nextMeal}</Text> : null}
        {checklist.fluidsAndElectrolytes ? <Text style={screenStyles.subtle}>Fluids/electrolytes: {checklist.fluidsAndElectrolytes}</Text> : null}
        {checklist.carbPriority ? <Text style={screenStyles.subtle}>Carb priority: {checklist.carbPriority}</Text> : null}
        <Lines items={checklist.gutComfortRules} />
        <Text style={screenStyles.body}>Warning symptoms</Text>
        <Lines items={checklist.warningSymptoms} />
      </View>
    </EngineCard>
  );
}

export function TournamentFuelCard({ plan }: { plan: TournamentFuelPlan }) {
  if (plan.status === "not_applicable") {
    return null;
  }
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Tournament fuel</Text>
        <Text style={screenStyles.callout}>{statusLabel(plan.status)}</Text>
        <Text style={screenStyles.body}>{plan.stayNearWeightStrategy}</Text>
        <Text style={screenStyles.subtle}>{plan.explanation}</Text>
        <Text style={screenStyles.body}>Daily weigh-in priorities</Text>
        <Lines items={plan.dailyWeighInPriorities} />
        <Text style={screenStyles.body}>Between bouts</Text>
        <Lines items={plan.betweenBoutPriorities} />
        <Text style={screenStyles.subtle}>{plan.eveningMealGuidance}</Text>
        <Text style={screenStyles.subtle}>{plan.travelFoodGuidance}</Text>
        <Lines items={plan.warningFlags} />
      </View>
    </EngineCard>
  );
}
