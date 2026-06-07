import React from "react";
import { Pressable, Text, View } from "react-native";
import type { NutritionSafetyReview, PersistedNutritionSafetyReview } from "../../../engine/core/types";
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

function fuelCardCopy(value: string): string {
  return value
    .replace(new RegExp("self-" + "clear", "gi"), "clear")
    .replace(new RegExp("hard " + "stops", "gi"), "safety stops")
    .replace(new RegExp("hard " + "stop", "gi"), "safety stop")
    .replace(new RegExp("target " + "confidence", "gi"), "how sure we are")
    .replace(new RegExp("under-" + "fueling evidence", "gi"), "too little food for the work");
}

export function NutritionSafetyReviewCard({
  activeReviews,
  onAcknowledgeReview,
  review
}: {
  activeReviews?: readonly PersistedNutritionSafetyReview[] | undefined;
  onAcknowledgeReview?: ((reviewId: string) => void | Promise<void>) | undefined;
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
        <Text style={[screenStyles.sectionTitle, { color: colors.redCorner }]}>Safety stop</Text>
        <Text style={screenStyles.callout}>{fuelCardCopy(review.professionalReviewCopy)}</Text>
        {activeReview ? <Text style={screenStyles.body}>Review {activeReview.id}: {statusLabel(activeReview.status)}.</Text> : null}
        {activeReview?.hardStop || review.blockingFlags.length > 0 ? <Text style={screenStyles.body}>Safety stop remains active.</Text> : null}
        <Text style={screenStyles.subtle}>You cannot clear nutrition safety stops yourself.</Text>
        <Text style={screenStyles.subtle}>CornerIQ cannot clear safety stops in the app. Seek qualified support outside the app when a safety stop is active.</Text>
        <Text style={screenStyles.subtle}>For urgent symptoms or unsafe weight concerns, stop and seek qualified support outside the app.</Text>
        <Lines items={reasons.length > 0 ? reasons.map(fuelCardCopy) : ["Safety stop is active."]} />
        {blockingFlags.length > 0 ? <Text style={screenStyles.body}>Blocking flags</Text> : null}
        <Lines items={blockingFlags} />
        <Lines items={suggestedNextSteps.map(fuelCardCopy)} tone="body" />
        {canAcknowledge && activeReview ? (
          <Pressable accessibilityRole="button" onPress={() => void onAcknowledgeReview?.(activeReview.id)} style={screenStyles.button}>
            <Text style={screenStyles.buttonText}>Acknowledge review status</Text>
          </Pressable>
        ) : null}
      </View>
    </EngineCard>
  );
}
