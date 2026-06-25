import React from "react";
import { Text, View } from "react-native";
import type { ExercisePrescription } from "../../../engine/core/types";
import { movementTeachingForExercise } from "../../../engine/presentation/workoutMovementTeaching";
import { plainTrainingCopy, plainWorkoutTitle } from "../../../engine/presentation/trainingCopy";
import { CollapsedDetailDisclosure } from "../../../design/components/FastTask";
import { colors, spacing } from "../../../design/theme";
import { screenStyles } from "../screenStyles";

function setCountLabel(count: number): string {
  return `${count} set${count === 1 ? "" : "s"}`;
}

function doseText(exercise: ExercisePrescription): string {
  const pieces = [
    exercise.sets.length > 0 ? setCountLabel(exercise.sets.length) : null,
    exercise.repsText,
    exercise.durationText,
    exercise.rpeTarget ? `RPE ${exercise.rpeTarget}` : null,
    exercise.rirTarget ? `RIR ${exercise.rirTarget}` : null
  ].filter((item): item is string => Boolean(item));
  return pieces.length > 0 ? pieces.join(" - ") : "Follow the listed work.";
}

function Badge({ label, tone }: { label: string; tone: "blue" | "orange" }) {
  const color = tone === "orange" ? colors.amberCaution : colors.blueIQ;
  return (
    <View
      style={{
        backgroundColor: tone === "orange" ? "rgba(255, 148, 72, 0.12)" : "rgba(39, 206, 241, 0.12)",
        borderColor: tone === "orange" ? "rgba(255, 148, 72, 0.38)" : "rgba(39, 206, 241, 0.38)",
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4
      }}
    >
      <Text style={{ color, fontSize: 11, fontWeight: "900", lineHeight: 15 }}>{label}</Text>
    </View>
  );
}

function TeachingList({ items }: { items: readonly string[] }) {
  return (
    <View style={{ gap: spacing.xs }}>
      {items.map((item, index) => <Text key={`teaching-item:${index}`} style={screenStyles.body}>{index + 1}. {plainTrainingCopy(item)}</Text>)}
    </View>
  );
}

export function ExercisePrescriptionCard({
  defaultHelpOpen,
  defaultHowToOpen,
  exercise,
  sectionName
}: {
  defaultHelpOpen?: boolean | undefined;
  defaultHowToOpen?: boolean | undefined;
  exercise: ExercisePrescription;
  sectionName: string;
}) {
  const teaching = movementTeachingForExercise(exercise);
  const familiarity = exercise.movementFamiliarity ?? "new";
  const howToOpen = defaultHowToOpen ?? familiarity === "new";
  const helpOpen = defaultHelpOpen ?? familiarity === "needs_support";
  return (
    <View
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.045)",
        borderColor: colors.line,
        borderRadius: 16,
        borderWidth: 1,
        gap: spacing.sm,
        padding: spacing.md
      }}
      testID={`exercise-prescription-card:${exercise.exerciseId}`}
    >
      <View style={{ alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "space-between" }}>
        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <Text style={screenStyles.callout}>{plainWorkoutTitle(exercise.name)}</Text>
          <Text style={screenStyles.subtle}>{sectionName}</Text>
        </View>
        {familiarity === "new" ? <Badge label="New movement" tone="blue" /> : null}
        {familiarity === "needs_support" ? <Badge label="Easier option recommended" tone="orange" /> : null}
      </View>
      <Text style={screenStyles.subtle}>{doseText(exercise)} - Rest {plainTrainingCopy(exercise.restText)}</Text>
      <Text style={screenStyles.body}>{plainTrainingCopy(teaching.actionSentence)}</Text>
      <Text style={{ color: colors.readyGreen, fontSize: 13, fontWeight: "900", lineHeight: 18 }}>Cue: {plainTrainingCopy(teaching.liveCue)}</Text>
      <CollapsedDetailDisclosure defaultOpen={howToOpen} framed={false} summary="Setup, movement steps, and breathing." title="How to" testID={`exercise-how-to:${exercise.exerciseId}`}>
        {teaching.setupSteps.length > 0 ? (
          <View style={{ gap: spacing.xs }}>
            <Text style={screenStyles.fieldLabel}>Setup</Text>
            <TeachingList items={teaching.setupSteps} />
          </View>
        ) : null}
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.fieldLabel}>Execution</Text>
          <TeachingList items={teaching.executionSteps} />
        </View>
        {teaching.breathing ? <Text style={screenStyles.subtle}>Breathing: {plainTrainingCopy(teaching.breathing)}</Text> : null}
        {teaching.demoAssetKey ? <Text style={screenStyles.subtle}>Demo available: {teaching.demoAssetKey}</Text> : null}
      </CollapsedDetailDisclosure>
      <CollapsedDetailDisclosure defaultOpen={helpOpen} framed={false} summary="Correction, easier option, feel checks, and stop rule." title="Need help?" testID={`exercise-need-help:${exercise.exerciseId}`}>
        <Text style={screenStyles.body}>Common mistake: {plainTrainingCopy(teaching.commonMistake.problem)}</Text>
        <Text style={screenStyles.body}>Fix: {plainTrainingCopy(teaching.commonMistake.fix)}</Text>
        <Text style={screenStyles.body}>Easier: {plainWorkoutTitle(teaching.easierOption.label)} - {plainTrainingCopy(teaching.easierOption.instruction)}</Text>
        {teaching.shouldFeel ? <Text style={screenStyles.subtle}>Should feel: {plainTrainingCopy(teaching.shouldFeel)}</Text> : null}
        {teaching.shouldNotFeel ? <Text style={screenStyles.subtle}>Should not feel: {plainTrainingCopy(teaching.shouldNotFeel)}</Text> : null}
        <Text style={[screenStyles.subtle, { color: colors.amberCaution }]}>Stop: {plainTrainingCopy(teaching.safetyStop)}</Text>
      </CollapsedDetailDisclosure>
    </View>
  );
}
