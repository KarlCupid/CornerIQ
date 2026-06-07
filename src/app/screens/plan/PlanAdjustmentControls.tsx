import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { ISODateString } from "../../../engine/core/types";
import { RiskBanner } from "../../../design/components/RiskBanner";
import type { TrainingPlanAdjustmentActions } from "../../../hooks/useTrainingPlanAdjustments";
import { spacing } from "../../../design/theme";
import { screenStyles } from "../screenStyles";

type PlanAdjustmentResultCopy = {
  explanation: string;
  safetyFlags: readonly string[];
  status: "applied" | "rejected" | "needs_review";
};

export interface PlanAdjustmentControlsProps {
  actions?: TrainingPlanAdjustmentActions | undefined;
  busy: boolean;
  date: ISODateString;
  generatedSessions: readonly {
    id: string;
    title: string;
    date: string;
  }[];
}

export function PlanAdjustmentControls({ actions, busy, date }: PlanAdjustmentControlsProps) {
  const [result, setResult] = useState<PlanAdjustmentResultCopy | null>(null);

  async function runAdjustment(action: () => Promise<PlanAdjustmentResultCopy>): Promise<void> {
    if (!actions || busy) {
      return;
    }
    const nextResult = await action();
    setResult(nextResult);
  }

  const disabled = !actions || busy;
  const rejected = result?.status === "rejected" || result?.status === "needs_review";

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={screenStyles.callout}>Plan change</Text>
      <Text style={screenStyles.subtle}>These buttons ask CornerIQ to update the plan while keeping boxing and safety first.</Text>
      {!actions ? <Text style={screenStyles.subtle}>Plan changes are available after setup finishes.</Text> : null}
      <View style={{ gap: spacing.sm }}>
        <Pressable accessibilityLabel="Keep for boxing" accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} style={screenStyles.quietButton} onPress={() => void runAdjustment(() => actions!.protectDay(date))}>
          <Text style={screenStyles.quietButtonText}>{busy ? "Requesting..." : "Keep for boxing"}</Text>
        </Pressable>
        <Pressable accessibilityLabel="Mark unavailable" accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} style={screenStyles.quietButton} onPress={() => void runAdjustment(() => actions!.markUnavailable(date))}>
          <Text style={screenStyles.quietButtonText}>{busy ? "Requesting..." : "Mark unavailable"}</Text>
        </Pressable>
        <Pressable accessibilityLabel="Request deload" accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} style={screenStyles.quietButton} onPress={() => void runAdjustment(() => actions!.requestDeload(date, date))}>
          <Text style={screenStyles.quietButtonText}>{busy ? "Requesting..." : "Request deload"}</Text>
        </Pressable>
        <Pressable accessibilityLabel="Restore plan" accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} style={screenStyles.quietButton} onPress={() => void runAdjustment(() => actions!.restoreEnginePlan(date))}>
          <Text style={screenStyles.quietButtonText}>{busy ? "Requesting..." : "Restore plan"}</Text>
        </Pressable>
      </View>
      {result && rejected ? (
        <RiskBanner title="Adjustment not applied" message={result.explanation} tone={result.status === "rejected" ? "critical" : "caution"}>
          {result.safetyFlags.map((flag, index) => <Text key={`plan-adjustment-safety:${index}`} style={screenStyles.subtle}>{flag}</Text>)}
        </RiskBanner>
      ) : null}
      {result && !rejected ? <Text style={screenStyles.subtle}>Plan updated: {result.explanation}</Text> : null}
    </View>
  );
}
