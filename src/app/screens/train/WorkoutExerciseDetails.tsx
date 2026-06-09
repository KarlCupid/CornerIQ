import React from "react";
import { Text, View } from "react-native";
import type { DetailedTrainingSession } from "../../../engine/core/types";
import { accentColor, accentWash } from "../../../design/components/LuminousScreen";
import { glassStyles } from "../../../design/glass";
import { colors, spacing } from "../../../design/theme";
import { plainSectionIntent, plainSectionName } from "../../../engine/presentation/trainingCopy";
import { buildWorkoutPlayerTimeline } from "../../../engine/presentation/workoutPlayerTimeline";
import { screenStyles } from "../screenStyles";
import { ExercisePrescriptionCard } from "./ExercisePrescriptionCard";

function WorkoutSectionCard({
  index,
  section,
  steps
}: {
  index: number;
  section: DetailedTrainingSession["sections"][number];
  steps: ReturnType<typeof buildWorkoutPlayerTimeline>["steps"];
}) {
  const blockAccent = steps[0]?.blockAccent ?? "blue";
  const blockColor = accentColor[blockAccent];
  const blockWash = accentWash[blockAccent];
  return (
    <View
      style={{
        ...glassStyles.card,
        borderRadius: 20,
        gap: spacing.md,
        padding: spacing.md
      }}
    >
      <View style={{ alignItems: "flex-start", flexDirection: "row", gap: spacing.md }}>
        <View
          style={{
            alignItems: "center",
            backgroundColor: blockWash,
            borderColor: `${blockColor}66`,
            borderRadius: 14,
            borderWidth: 1,
            height: 40,
            justifyContent: "center",
            width: 40
          }}
        >
          <Text style={{ color: colors.canvas, fontSize: 14, fontWeight: "800", lineHeight: 18 }}>{String(index + 1).padStart(2, "0")}</Text>
        </View>
        <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
          <Text style={{ color: colors.canvas, fontSize: 18, fontWeight: "800", lineHeight: 24 }}>{plainSectionName(section.name)}</Text>
          <Text style={screenStyles.subtle}>WHY: {plainSectionIntent(section.intent)}</Text>
        </View>
      </View>
      <View style={{ gap: spacing.sm }}>
        {steps.map((step) => (
          <View
            key={step.id}
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.055)",
              borderColor: colors.line,
              borderRadius: 16,
              borderWidth: 1,
              gap: spacing.xs,
              padding: spacing.md
            }}
          >
            <View style={{ alignItems: "flex-start", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }}>
              <Text style={[screenStyles.callout, { flex: 1, minWidth: 0 }]}>{step.title}</Text>
              <Text style={{ color: blockColor, fontSize: 12, fontVariant: ["tabular-nums"], fontWeight: "900", lineHeight: 16 }}>{step.durationLabel}</Text>
            </View>
            <Text style={screenStyles.subtle}>TIMER: {step.durationLabel}</Text>
            <Text style={screenStyles.body}>DO THIS: {step.instruction}</Text>
            <Text style={screenStyles.subtle}>COACH CUE: {step.cue}</Text>
            {step.microCues?.length ? <Text style={screenStyles.subtle}>MICRO-CUES: {step.microCues.join(" ")}</Text> : null}
          </View>
        ))}
      </View>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.fieldLabel}>Exercise prescriptions</Text>
        {section.exercises.map((exercise, exerciseIndex) => (
          <View
            key={exercise.exerciseId}
            style={{
              borderTopColor: colors.line,
              borderTopWidth: 1,
              gap: spacing.sm,
              paddingTop: spacing.sm
            }}
          >
            <View style={{ alignItems: "flex-start", flexDirection: "row", gap: spacing.sm }}>
              <View
                style={{
                  alignItems: "center",
                  backgroundColor: colors.panelRaised,
                  borderColor: colors.line,
                  borderRadius: 12,
                  borderWidth: 1,
                  height: 32,
                  justifyContent: "center",
                  width: 32
                }}
              >
                <Text style={{ color: colors.wrap, fontSize: 12, fontWeight: "800", lineHeight: 16 }}>{exerciseIndex + 1}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <ExercisePrescriptionCard exercise={exercise} sectionName={plainSectionName(section.name)} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function WorkoutExerciseDetails({ session, title = "Exercise details" }: { session: DetailedTrainingSession; title?: string | null | undefined }) {
  const timeline = React.useMemo(() => buildWorkoutPlayerTimeline(session), [session]);
  return (
    <View style={{ gap: spacing.md }} testID="workout-exercise-details">
      {title ? <Text style={screenStyles.sectionTitle}>{title}</Text> : null}
      {session.sections.map((section, index) => {
        const steps = timeline.steps.filter((step) => step.sectionIndex === index);
        return <WorkoutSectionCard index={index} key={`workout-section:${index}`} section={section} steps={steps} />;
      })}
    </View>
  );
}
