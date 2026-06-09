import React from "react";
import { Text, View } from "react-native";
import type { DetailedTrainingSession } from "../../../engine/core/types";
import { glassStyles } from "../../../design/glass";
import { colors, spacing } from "../../../design/theme";
import { plainSectionIntent, plainSectionName } from "../../../engine/presentation/trainingCopy";
import { screenStyles } from "../screenStyles";
import { ExercisePrescriptionCard } from "./ExercisePrescriptionCard";

function WorkoutSectionCard({
  index,
  section
}: {
  index: number;
  section: DetailedTrainingSession["sections"][number];
}) {
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
            backgroundColor: "rgba(39, 206, 241, 0.12)",
            borderColor: "rgba(39, 206, 241, 0.36)",
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
          <Text style={screenStyles.subtle}>{plainSectionIntent(section.intent)}</Text>
        </View>
      </View>
      <View style={{ gap: spacing.sm }}>
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
  return (
    <View style={{ gap: spacing.md }} testID="workout-exercise-details">
      {title ? <Text style={screenStyles.sectionTitle}>{title}</Text> : null}
      {session.sections.map((section, index) => (
        <WorkoutSectionCard index={index} key={`workout-section:${index}`} section={section} />
      ))}
    </View>
  );
}
