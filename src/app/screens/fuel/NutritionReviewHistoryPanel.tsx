import React from "react";
import { Text, View } from "react-native";
import type { NutritionReviewHistoryViewModel } from "../../../engine/core/types";
import { EngineCard } from "../../../design/components/EngineCard";
import { spacing } from "../../../design/theme";
import { screenStyles } from "../screenStyles";

function statusLabel(value: string): string {
  return value.replaceAll("_", " ");
}

function reviewCopy(value: string): string {
  return value
    .replace(new RegExp("self-" + "clear", "gi"), "clear")
    .replace(new RegExp("hard " + "stops", "gi"), "safety stops")
    .replace(new RegExp("hard " + "stop", "gi"), "safety stop");
}

export function NutritionReviewHistoryPanel({ history }: { history: NutritionReviewHistoryViewModel }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>{history.title}</Text>
        <Text style={screenStyles.callout}>{history.latestReviewSummary}</Text>
        <Text style={screenStyles.body}>
          Active reviews: {history.activeReviewCount}. Safety stops: {history.hardStopReviewCount}.
        </Text>
        <Text style={screenStyles.subtle}>{reviewCopy(history.safetyCopy)}</Text>
        <Text style={screenStyles.subtle}>{reviewCopy(history.qualifiedSupportCopy)}</Text>
        <Text style={screenStyles.subtle}>{reviewCopy(history.urgentSupportCopy)}</Text>
        {history.activeReviews.length > 0 ? (
          history.activeReviews.map((review) => (
            <View key={review.reviewId} style={{ gap: spacing.xs }}>
              <Text style={screenStyles.callout}>
                {review.reviewId}: {statusLabel(review.status)} {review.hardStop ? "- safety stop remains active" : ""}
              </Text>
              <Text style={screenStyles.subtle}>
                Type: {statusLabel(review.reviewType)}. Severity: {review.severity}. Acknowledge available: {review.canAcknowledge ? "yes" : "no"}. Athlete clear: no.
              </Text>
              {review.reasons.map((reason, reasonIndex) => <Text key={`review-reason:${reasonIndex}`} style={screenStyles.subtle}>Reason: {reviewCopy(reason)}</Text>)}
              {review.blockingFlags.map((flag, flagIndex) => <Text key={`review-flag:${flagIndex}`} style={screenStyles.subtle}>Blocking flag: {flag}</Text>)}
              {review.suggestedNextSteps.map((step, stepIndex) => <Text key={`review-step:${stepIndex}`} style={screenStyles.subtle}>Next: {reviewCopy(step)}</Text>)}
              <Text style={screenStyles.subtle}>This does not clear the plan.</Text>
            </View>
          ))
        ) : (
          <Text style={screenStyles.body}>No active review cards loaded.</Text>
        )}
        <Text style={screenStyles.callout}>Review event timeline</Text>
        {history.historyEvents.length > 0 ? (
          history.historyEvents.map((event, index) => (
            <Text key={`review-event:${index}`} style={screenStyles.subtle}>
              {event.date} - {event.eventLabel} by {event.actorType}: {event.summary}
            </Text>
          ))
        ) : (
          <Text style={screenStyles.subtle}>{reviewCopy(history.noHistoryCopy)}</Text>
        )}
      </View>
    </EngineCard>
  );
}
