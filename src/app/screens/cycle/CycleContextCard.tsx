import React from "react";
import { Text, View } from "react-native";
import type { CycleViewModel } from "../../../engine/core/types";
import { EngineCard } from "../../../design/components/EngineCard";
import { spacing } from "../../../design/theme";
import { screenStyles } from "../screenStyles";

export function CycleContextCard({ cycleContext, minimal = false }: { cycleContext: CycleViewModel | null; minimal?: boolean | undefined }) {
  if (!cycleContext) {
    return minimal ? (
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Cycle context</Text>
          <Text style={screenStyles.body}>Cycle tracking is off or undecided. No cycle assumptions are applied.</Text>
        </View>
      </EngineCard>
    ) : null;
  }

  const contraceptionNote = cycleContext.estimatedPhase.includes("contraception")
    ? "Hormonal contraception context stays symptom-based; CornerIQ does not treat it as natural-cycle certainty."
    : null;

  return (
    <EngineCard>
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
        {cycleContext.safetyFlags.map((flag) => <Text key={flag} style={screenStyles.subtle}>Safety: {flag}</Text>)}
        {contraceptionNote ? <Text style={screenStyles.subtle}>{contraceptionNote}</Text> : null}
        <Text style={screenStyles.subtle}>{cycleContext.historySummary}</Text>
        <Text style={screenStyles.subtle}>{cycleContext.privacyReminder}</Text>
      </View>
    </EngineCard>
  );
}
