import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { EngineCard } from "../../design/components/EngineCard";
import { colors, spacing } from "../../design/theme";
import { screenStyles } from "../screens/screenStyles";

export type EngineGenerationStatus =
  | "idle"
  | "saving_anchors"
  | "generating_plan"
  | "amending_plan"
  | "previewing_next_week"
  | "materializing_next_week"
  | "generating_workout";

const copyByStatus: Record<Exclude<EngineGenerationStatus, "idle">, { title: string; lines: readonly string[]; testID: string }> = {
  saving_anchors: {
    title: "Saving protected anchors",
    lines: ["Checking weekday or date, duration, intensity, and protected boxing priority.", "Protected boxing stays fixed before generated support is placed."],
    testID: "plan-generation-pending"
  },
  generating_plan: {
    title: "Generating your plan",
    lines: ["Checking anchors, availability, readiness, and safety.", "Placing generated support around protected boxing."],
    testID: "plan-generation-pending"
  },
  amending_plan: {
    title: "Amending your plan",
    lines: ["Checking anchors, availability, readiness, and safety.", "Keeping the current week index unless you start a new plan."],
    testID: "plan-generation-pending"
  },
  previewing_next_week: {
    title: "Previewing next week",
    lines: ["Checking anchors, availability, readiness, and safety.", "Building a conservative preview before anything is accepted."],
    testID: "plan-generation-pending"
  },
  materializing_next_week: {
    title: "Starting next week",
    lines: ["Placing generated support around protected boxing.", "Persisting future day plans without bypassing safety."],
    testID: "plan-generation-pending"
  },
  generating_workout: {
    title: "Generating today's workout",
    lines: ["Building a conservative session from today's context.", "Readiness and safety still gate the final work."],
    testID: "workout-generation-pending"
  }
};

export function EngineGeneratingCard({ status }: { status: EngineGenerationStatus }) {
  if (status === "idle") {
    return null;
  }
  const copy = copyByStatus[status];
  return (
    <EngineCard>
      <View accessibilityRole="alert" style={{ gap: spacing.sm }} testID="engine-generating-card">
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }} testID={copy.testID}>
          <ActivityIndicator color={colors.blueIQ} />
          <Text style={screenStyles.sectionTitle}>{copy.title}</Text>
        </View>
        {copy.lines.map((line) => (
          <Text key={line} style={screenStyles.subtle}>{line}</Text>
        ))}
      </View>
    </EngineCard>
  );
}
