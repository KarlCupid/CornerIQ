import React from "react";
import { Text, View } from "react-native";
import type { CycleViewModel } from "../../../engine/core/types";
import { EngineCard } from "../../../design/components/EngineCard";
import { spacing } from "../../../design/theme";
import { screenStyles } from "../screenStyles";

export function CycleContextCard({
  cycleContext,
  framed = true,
  minimal = false,
  trackingStatus
}: {
  cycleContext: CycleViewModel | null;
  framed?: boolean | undefined;
  minimal?: boolean | undefined;
  trackingStatus?: "enabled" | "disabled" | "undecided" | string | undefined;
}) {
  const frame = (children: React.ReactElement) => (framed ? <EngineCard>{children}</EngineCard> : children);
  if (!cycleContext) {
    if (trackingStatus === "undecided") {
      return frame(
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Cycle context</Text>
          <Text style={screenStyles.body}>Cycle support is optional and private. You can decide later; no cycle assumptions are applied.</Text>
        </View>
      );
    }
    return minimal
      ? frame(
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Cycle context</Text>
          <Text style={screenStyles.body}>Cycle tracking is off. No cycle assumptions are applied.</Text>
        </View>
      )
      : null;
  }

  const contraceptionNote = cycleContext.estimatedPhase.includes("contraception")
    ? "Hormonal contraception context stays symptom-based; CornerIQ does not treat it as natural-cycle certainty."
    : null;

  return frame(
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Cycle context</Text>
        <Text style={screenStyles.body}>Tracking: {cycleContext.trackingStatus}</Text>
        <Text style={screenStyles.body}>Phase/context: {cycleContext.estimatedPhase}</Text>
        <Text style={screenStyles.body}>Confidence: {cycleContext.confidence}</Text>
        <Text style={screenStyles.body}>Symptoms: {cycleContext.symptomBurden}</Text>
        <Text style={screenStyles.callout}>What changes today</Text>
        <Text style={screenStyles.body}>Training: {cycleContext.trainingAdjustment}</Text>
        <Text style={screenStyles.body}>Nutrition: {cycleContext.nutritionAdjustment}</Text>
        <Text style={screenStyles.body}>Scale: {cycleContext.scaleNoiseNote}</Text>
        <Text style={screenStyles.callout}>Longitudinal support</Text>
        <Text style={screenStyles.body}>{cycleContext.trendSummary}</Text>
        <Text style={screenStyles.subtle}>{cycleContext.symptomTrend}</Text>
        <Text style={screenStyles.subtle}>{cycleContext.trainingAdjustmentHistorySummary}</Text>
        <Text style={screenStyles.subtle}>{cycleContext.uncertaintyCopy}</Text>
        {cycleContext.safetyFlags.map((flag, index) => <Text key={`cycle-safety:${index}`} style={screenStyles.subtle}>Safety: {flag}</Text>)}
        {contraceptionNote ? <Text style={screenStyles.subtle}>{contraceptionNote}</Text> : null}
        <Text style={screenStyles.subtle}>{cycleContext.historySummary}</Text>
        <Text style={screenStyles.subtle}>{cycleContext.privacyReminder}</Text>
      </View>
  );
}
