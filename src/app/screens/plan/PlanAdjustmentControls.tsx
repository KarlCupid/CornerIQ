import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { ISODateString } from "../../../engine/core/types";
import type { TrainingPlanAdjustmentActions } from "../../../hooks/useTrainingPlanAdjustments";
import { spacing } from "../../../design/theme";
import { screenStyles } from "../screenStyles";

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
  const [message, setMessage] = useState<string | null>(null);

  async function runAdjustment(action: () => Promise<{ explanation: string }>): Promise<void> {
    if (!actions || busy) {
      return;
    }
    const result = await action();
    setMessage(result.explanation);
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={screenStyles.callout}>Engine-owned adjustment</Text>
      <View style={{ gap: spacing.sm }}>
        <Pressable disabled={!actions || busy} style={screenStyles.quietButton} onPress={() => void runAdjustment(() => actions!.protectDay(date))}>
          <Text style={screenStyles.quietButtonText}>Protect day</Text>
        </Pressable>
        <Pressable disabled={!actions || busy} style={screenStyles.quietButton} onPress={() => void runAdjustment(() => actions!.markUnavailable(date))}>
          <Text style={screenStyles.quietButtonText}>Mark unavailable</Text>
        </Pressable>
        <Pressable disabled={!actions || busy} style={screenStyles.quietButton} onPress={() => void runAdjustment(() => actions!.requestDeload(date, date))}>
          <Text style={screenStyles.quietButtonText}>Request deload</Text>
        </Pressable>
        <Pressable disabled={!actions || busy} style={screenStyles.quietButton} onPress={() => void runAdjustment(() => actions!.restoreEnginePlan(date))}>
          <Text style={screenStyles.quietButtonText}>Restore engine plan</Text>
        </Pressable>
      </View>
      {message ? <Text style={screenStyles.subtle}>{message}</Text> : null}
    </View>
  );
}
