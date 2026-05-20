import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
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

export function PlanAdjustmentControls({ actions, busy, date, generatedSessions }: PlanAdjustmentControlsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [moveTargetDate, setMoveTargetDate] = useState(date);

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
      {generatedSessions.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <TextInput
            accessibilityLabel="Move target date"
            autoCapitalize="none"
            editable={!busy}
            onChangeText={setMoveTargetDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#8A8F98"
            style={screenStyles.input}
            value={moveTargetDate}
          />
          {generatedSessions.map((session) => (
            <Pressable
              disabled={!actions || busy}
              key={session.id}
              style={screenStyles.quietButton}
              onPress={() => void runAdjustment(() => actions!.moveGeneratedSession(session.id, session.date as ISODateString, moveTargetDate as ISODateString))}
            >
              <Text style={screenStyles.quietButtonText}>Apply move: {session.title}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {message ? <Text style={screenStyles.subtle}>{message}</Text> : null}
    </View>
  );
}
