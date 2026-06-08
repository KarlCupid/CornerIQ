import React from "react";
import { Pressable, Text, View } from "react-native";
import type { NutritionSafetyReview, PersistedNutritionSafetyReview } from "../../../engine/core/types";
import { EngineCard } from "../../../design/components/EngineCard";
import { colors, spacing } from "../../../design/theme";
import { plainFuelCopy } from "../../../engine/presentation/fuelCopy";
import { screenStyles } from "../screenStyles";

function statusLabel(status: string): string {
  return plainFuelCopy(status.replaceAll("_", " "));
}

function Lines({ items, tone = "subtle" }: { items: readonly string[]; tone?: "body" | "subtle" | "callout" }) {
  return (
    <>
      {items.map((item, index) => (
        <Text key={`line:${index}`} style={screenStyles[tone]}>
          {plainFuelCopy(item)}
        </Text>
      ))}
    </>
  );
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
        <Text style={screenStyles.callout}>{plainFuelCopy(review.professionalReviewCopy)}</Text>
        {activeReview ? <Text style={screenStyles.body}>Review {activeReview.id}: {statusLabel(activeReview.status)}.</Text> : null}
        {activeReview?.hardStop || review.blockingFlags.length > 0 ? <Text style={screenStyles.body}>Safety stop remains active.</Text> : null}
        <Text style={screenStyles.subtle}>This cannot be cleared in the app. Use medical or nutrition support outside the app.</Text>
        <Text style={screenStyles.subtle}>For urgent symptoms or unsafe weight concerns, stop and get support now.</Text>
        <Lines items={reasons.length > 0 ? reasons.slice(0, 3) : ["Safety stop is active."]} />
        {blockingFlags.length > 0 ? <Text style={screenStyles.body}>Safety flags</Text> : null}
        <Lines items={blockingFlags.slice(0, 3).map((flag) => flag.replaceAll("_", " "))} />
        <Lines items={suggestedNextSteps.slice(0, 3)} tone="body" />
        {canAcknowledge && activeReview ? (
          <Pressable accessibilityRole="button" onPress={() => void onAcknowledgeReview?.(activeReview.id)} style={screenStyles.button}>
            <Text style={screenStyles.buttonText}>Acknowledge review status</Text>
          </Pressable>
        ) : null}
      </View>
    </EngineCard>
  );
}
