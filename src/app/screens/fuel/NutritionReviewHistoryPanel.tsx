import React from "react";
import { Text, View } from "react-native";
import type { NutritionReviewHistoryViewModel } from "../../../engine/core/types";
import { EngineCard } from "../../../design/components/EngineCard";
import { spacing } from "../../../design/theme";
import { plainFuelCopy } from "../../../engine/presentation/fuelCopy";
import { screenStyles } from "../screenStyles";

function statusLabel(value: string): string {
  return warningCopy(value.replaceAll("_", " "));
}

function warningCopy(value: string): string {
  return plainFuelCopy(value)
    .replace(/\bsafety stops\b/gi, "cut warnings")
    .replace(/\bsafety stop\b/gi, "cut warning");
}

export function NutritionReviewHistoryPanel({ history }: { history: NutritionReviewHistoryViewModel }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>{history.title}</Text>
        <Text style={screenStyles.callout}>{warningCopy(history.latestReviewSummary)}</Text>
        <Text style={screenStyles.body}>
          Active reviews: {history.activeReviewCount}. Cut warnings: {history.hardStopReviewCount}.
        </Text>
        <Text style={screenStyles.subtle}>{warningCopy(history.safetyCopy)}</Text>
        <Text style={screenStyles.subtle}>{warningCopy(history.qualifiedSupportCopy)}</Text>
        <Text style={screenStyles.subtle}>{warningCopy(history.urgentSupportCopy)}</Text>
        {history.activeReviews.length > 0 ? (
          history.activeReviews.slice(0, 3).map((review) => (
            <View key={review.reviewId} style={{ gap: spacing.xs }}>
              <Text style={screenStyles.callout}>
                {review.reviewId}: {statusLabel(review.status)} {review.hardStop ? "- cut warning remains active" : ""}
              </Text>
              <Text style={screenStyles.subtle}>
                Type: {statusLabel(review.reviewType)}. Severity: {review.severity}. Athlete resolve in app: no.
              </Text>
              {review.reasons.slice(0, 3).map((reason, reasonIndex) => <Text key={`review-reason:${reasonIndex}`} style={screenStyles.subtle}>Reason: {warningCopy(reason)}</Text>)}
              {review.blockingFlags.slice(0, 3).map((flag, flagIndex) => <Text key={`review-flag:${flagIndex}`} style={screenStyles.subtle}>Health flag: {statusLabel(flag)}</Text>)}
              {review.suggestedNextSteps.slice(0, 3).map((step, stepIndex) => <Text key={`review-step:${stepIndex}`} style={screenStyles.subtle}>Next: {warningCopy(step)}</Text>)}
              <Text style={screenStyles.subtle}>This does not resolve the plan.</Text>
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
          <Text style={screenStyles.subtle}>{warningCopy(history.noHistoryCopy)}</Text>
        )}
      </View>
    </EngineCard>
  );
}
