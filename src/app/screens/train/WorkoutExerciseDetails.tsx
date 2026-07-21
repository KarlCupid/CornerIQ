import React from "react";
import { Text as NativeText, View, type TextProps, type TextStyle } from "react-native";
import type { DetailedTrainingSession } from "../../../engine/core/types";
import { spacing } from "../../../design/theme";
import { fontFamilies } from "../../../design/typography";
import { plainSectionIntent, plainSectionName } from "../../../engine/presentation/trainingCopy";
import { screenStyles } from "../screenStyles";
import { ExercisePrescriptionCard } from "./ExercisePrescriptionCard";
import { trainPalette } from "./trainPalette";

function Text({ style, ...props }: TextProps) {
  const flattened = (Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean).map((item) => item && typeof item === "object" ? item : {})) : style) as TextStyle | undefined;
  const weight = flattened?.fontWeight;
  const fontFamily = weight === "800" || weight === "900" || weight === "bold" ? fontFamilies.bold : weight === "600" || weight === "700" ? fontFamilies.semibold : fontFamilies.regular;
  return <NativeText {...props} style={[style, { fontFamily }]} />;
}

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
        backgroundColor: "transparent",
        borderBottomColor: trainPalette.cardLine,
        borderBottomWidth: 1,
        gap: spacing.md,
        paddingVertical: spacing.lg
      }}
    >
      <View style={{ alignItems: "flex-start", flexDirection: "row", gap: spacing.md }}>
        <View
          style={{
            alignItems: "center",
            backgroundColor: "rgba(39, 206, 241, 0.08)",
            borderColor: trainPalette.actionFill,
            borderRadius: 4,
            borderWidth: 1,
            height: 40,
            justifyContent: "center",
            width: 40
          }}
        >
          <Text style={{ color: trainPalette.textPrimary, fontSize: 14, fontWeight: "800", lineHeight: 18 }}>{String(index + 1).padStart(2, "0")}</Text>
        </View>
        <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
          <Text style={{ color: trainPalette.textPrimary, fontSize: 18, fontWeight: "800", lineHeight: 24 }}>{plainSectionName(section.name)}</Text>
          <Text style={screenStyles.subtle}>{section.durationMinutes} min - {plainSectionIntent(section.intent)}</Text>
        </View>
      </View>
      <View style={{ gap: spacing.sm }}>
        {section.exercises.map((exercise) => (
          <ExercisePrescriptionCard
            exercise={exercise}
            key={exercise.exerciseId}
            sectionName={plainSectionName(section.name)}
          />
        ))}
      </View>
    </View>
  );
}

export function WorkoutExerciseDetails({ session, title = "Exercise details" }: { session: DetailedTrainingSession; title?: string | null | undefined }) {
  return (
    <View style={{ gap: spacing.md }} testID="workout-exercise-details">
      {title ? <Text style={screenStyles.sectionTitle}>{title}</Text> : null}
      {session.sections.map((section, index) => <WorkoutSectionCard index={index} key={`workout-section:${index}:${section.name}`} section={section} />)}
    </View>
  );
}
