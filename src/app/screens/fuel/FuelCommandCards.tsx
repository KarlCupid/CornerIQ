import React from "react";
import { Pressable, Text, View } from "react-native";
import type {
  FightWeekFuelPlan,
  FuelCommandCenterState,
  NutritionSafetyReview,
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
      {items.map((item) => (
        <Text key={item} style={screenStyles[tone]}>
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
        <Text style={screenStyles.sectionTitle}>Fuel command</Text>
        <Text style={screenStyles.callout}>{command.primaryFuelAction}</Text>
        <Text style={screenStyles.body}>{command.bodyMassAction}</Text>
        <Text style={screenStyles.subtle}>Confidence: {command.confidence.level}</Text>
        {command.decisionStack.slice(0, 4).map((item) => (
          <View key={item.label} style={{ gap: spacing.xs }}>
            <Text style={screenStyles.body}>{item.label}: {item.summary}</Text>
            <Text style={screenStyles.subtle}>{item.why}</Text>
          </View>
        ))}
      </View>
    </EngineCard>
  );
}

export function NutritionSafetyReviewCard({
  onRequestReview,
  review
}: {
  onRequestReview?: (() => void | Promise<void>) | undefined;
  review: NutritionSafetyReview;
}) {
  if (!review.required) {
    return null;
  }
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={[screenStyles.sectionTitle, { color: colors.redCorner }]}>Safety review</Text>
        <Text style={screenStyles.callout}>{review.professionalReviewCopy}</Text>
        <Lines items={review.reasons.length > 0 ? review.reasons : ["Safety review is active."]} />
        <Lines items={review.suggestedNextSteps} tone="body" />
        {onRequestReview ? (
          <Pressable accessibilityRole="button" onPress={() => void onRequestReview()} style={screenStyles.button}>
            <Text style={screenStyles.buttonText}>Acknowledge / log review needed</Text>
          </Pressable>
        ) : null}
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
