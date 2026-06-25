import React from "react";
import { Text, View } from "react-native";
import type { DetailedTrainingSession } from "../../../engine/core/types";
import { accentColor, accentWash, useLuminousScreenTheme } from "../../../design/components/LuminousScreen";
import { glassStyles } from "../../../design/glass";
import { colors, spacing } from "../../../design/theme";
import { plainSectionIntent, plainSectionName } from "../../../engine/presentation/trainingCopy";
import { screenStyles } from "../screenStyles";
import { ExercisePrescriptionCard } from "./ExercisePrescriptionCard";

function accentForSection(section: DetailedTrainingSession["sections"][number]): keyof typeof accentColor {
  const searchable = `${section.name} ${section.intent} ${section.exercises.map((exercise) => `${exercise.name} ${exercise.category}`).join(" ")}`.toLowerCase();
  if (/\b(warm|prep)\b/.test(searchable)) {
    return "blue";
  }
  if (/\b(cooldown|reset|recovery|breathing)\b/.test(searchable)) {
    return "green";
  }
  if (/\b(boxing|round|jab|guard|stance|footwork|ringcraft)\b/.test(searchable)) {
    return "red";
  }
  if (/\b(mobility|range)\b/.test(searchable)) {
    return "purple";
  }
  if (/\b(strength|support|power|durability)\b/.test(searchable)) {
    return "orange";
  }
  return "blue";
}

function WorkoutSectionCard({
  index,
  section
}: {
  index: number;
  section: DetailedTrainingSession["sections"][number];
}) {
  const theme = useLuminousScreenTheme();
  const accent = accentForSection(section);
  const blockColor = accentColor[accent];
  const blockWash = accentWash[accent];
  return (
    <View
      style={{
        ...glassStyles.card,
        backgroundColor: theme.card,
        borderColor: theme.cardBorder,
        borderRadius: 20,
        boxShadow: `0 18px 40px rgba(0, 0, 0, 0.34), 0 0 18px ${theme.strongGlow}`,
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
