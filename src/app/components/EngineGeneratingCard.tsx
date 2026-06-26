import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { EngineCard } from "../../design/components/EngineCard";
import { useLuminousScreenTheme } from "../../design/components/LuminousScreen";
import { spacing } from "../../design/theme";
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
    title: "Saving fixed boxing sessions",
    lines: ["Checking weekday or date, duration, intensity, and fixed boxing priority.", "Fixed boxing stays in place before support workouts are added."],
    testID: "plan-generation-pending"
  },
  generating_plan: {
    title: "Generating your new plan...",
    lines: ["Rebuilding this week from your new goal, support days, and fixed boxing schedule.", "Checking readiness and safety before the board changes."],
    testID: "plan-generation-pending"
  },
  amending_plan: {
    title: "Updating your plan...",
    lines: ["Rebuilding this week from your updated goal, support days, and fixed boxing schedule.", "Keeping the current week index unless you start a new plan."],
    testID: "plan-generation-pending"
  },
  previewing_next_week: {
    title: "Previewing next week",
    lines: ["Checking fixed boxing, availability, readiness, and safety.", "Building a conservative preview before anything is accepted."],
    testID: "plan-generation-pending"
  },
  materializing_next_week: {
    title: "Starting next week",
    lines: ["Placing support workouts around fixed boxing.", "Saving future day plans without bypassing safety."],
    testID: "plan-generation-pending"
  },
  generating_workout: {
    title: "Building today's workout",
    lines: ["Building a conservative session from what we know today.", "Readiness and safety still decide the workout."],
    testID: "workout-generation-pending"
  }
};

export function EngineGeneratingCard({ status }: { status: EngineGenerationStatus }) {
  const theme = useLuminousScreenTheme();
  if (status === "idle") {
    return null;
  }
  const copy = copyByStatus[status];
  return (
    <EngineCard>
      <View accessibilityRole="alert" style={{ gap: spacing.sm }} testID="engine-generating-card">
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }} testID={copy.testID}>
          <ActivityIndicator color={theme.accentColor} />
          <Text style={screenStyles.sectionTitle}>{copy.title}</Text>
        </View>
        {copy.lines.map((line) => (
          <Text key={line} style={screenStyles.subtle}>{line}</Text>
        ))}
      </View>
    </EngineCard>
  );
}
