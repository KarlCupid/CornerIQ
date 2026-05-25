import React from "react";
import { Text, View } from "react-native";
import type { NutritionReviewHistoryViewModel } from "../../../engine/core/types";
import { EngineCard } from "../../../design/components/EngineCard";
import { spacing } from "../../../design/theme";
import { screenStyles } from "../screenStyles";

function statusLabel(value: string): string {
  return value.replaceAll("_", " ");
}

export function NutritionReviewHistoryPanel({ history }: { history: NutritionReviewHistoryViewModel }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>{history.title}</Text>
        <Text style={screenStyles.callout}>{history.latestReviewSummary}</Text>
        <Text style={screenStyles.body}>
          Active reviews: {history.activeReviewCount}. Hard stops: {history.hardStopReviewCount}.
        </Text>
        <Text style={screenStyles.subtle}>{history.safetyCopy}</Text>
        <Text style={screenStyles.subtle}>{history.reviewerFutureCopy}</Text>
        <Text style={screenStyles.subtle}>{history.urgentSupportCopy}</Text>
        {history.activeReviews.length > 0 ? (
          history.activeReviews.map((review) => (
            <View key={review.reviewId} style={{ gap: spacing.xs }}>
              <Text style={screenStyles.callout}>
                {review.reviewId}: {statusLabel(review.status)} {review.hardStop ? "- hard stop remains active" : ""}
              </Text>
              <Text style={screenStyles.subtle}>
                Type: {statusLabel(review.reviewType)}. Severity: {review.severity}. Acknowledge available: {review.canAcknowledge ? "yes" : "no"}. Self-clear: no.
              </Text>
              {review.reasons.map((reason) => <Text key={`${review.reviewId}:reason:${reason}`} style={screenStyles.subtle}>Reason: {reason}</Text>)}
              {review.blockingFlags.map((flag) => <Text key={`${review.reviewId}:flag:${flag}`} style={screenStyles.subtle}>Blocking flag: {flag}</Text>)}
              {review.suggestedNextSteps.map((step) => <Text key={`${review.reviewId}:step:${step}`} style={screenStyles.subtle}>Next: {step}</Text>)}
              <Text style={screenStyles.subtle}>This does not clear the plan.</Text>
            </View>
          ))
        ) : (
          <Text style={screenStyles.body}>No active review cards loaded.</Text>
        )}
        <Text style={screenStyles.callout}>Review event timeline</Text>
        {history.historyEvents.length > 0 ? (
          history.historyEvents.map((event) => (
            <Text key={`${event.date}:${event.eventType}:${event.summary}`} style={screenStyles.subtle}>
              {event.date} - {statusLabel(event.eventType)} by {event.actorType}: {event.summary}
            </Text>
          ))
        ) : (
          <Text style={screenStyles.subtle}>{history.noHistoryCopy}</Text>
        )}
      </View>
    </EngineCard>
  );
}
