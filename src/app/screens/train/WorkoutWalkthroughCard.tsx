import React from "react";
import { Pressable, Text, View } from "react-native";
import type { DetailedTrainingSession, WorkoutWalkthroughStep } from "../../../engine/core/types";
import { colors, spacing } from "../../../design/theme";
import { plainTrainingCopy } from "../../../engine/presentation/trainingCopy";
import { screenStyles } from "../screenStyles";

function BulletLine({ label, text }: { label?: string | undefined; text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: spacing.sm }}>
      <Text style={{ color: colors.blueIQ, fontSize: 13, fontWeight: "900", lineHeight: 19 }}>{label ?? "-"}</Text>
      <Text style={[screenStyles.body, { flex: 1 }]}>{plainTrainingCopy(text)}</Text>
    </View>
  );
}

function StepShell({
  children,
  onPress,
  step
}: {
  children: React.ReactNode;
  onPress?: ((step: WorkoutWalkthroughStep, index: number) => void) | undefined;
  step: WorkoutWalkthroughStep;
}) {
  const content = (
    <View
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.055)",
        borderColor: colors.line,
        borderRadius: 18,
        borderWidth: 1,
        gap: spacing.sm,
        padding: spacing.md
      }}
    >
      {children}
    </View>
  );

  if (!onPress) {
    return content;
  }

  const index = Number(step.label.replace(/\D+/g, "")) - 1;
  return (
    <Pressable accessibilityLabel={`Open ${step.title}`} accessibilityRole="button" onPress={() => onPress(step, Math.max(0, index))}>
      {content}
    </Pressable>
  );
}

function WalkthroughStep({
  compact,
  onPress,
  step
}: {
  compact: boolean;
  onPress?: ((step: WorkoutWalkthroughStep, index: number) => void) | undefined;
  step: WorkoutWalkthroughStep;
}) {
  const items = compact ? step.items.slice(0, 2) : step.items;
  return (
    <StepShell onPress={onPress} step={step}>
      <View style={{ gap: spacing.xs }}>
        <Text style={screenStyles.fieldLabel}>{step.label} - {step.durationMinutes} min</Text>
        <Text style={{ color: colors.canvas, fontSize: 17, fontWeight: "900", lineHeight: 23 }}>{step.title}</Text>
        <Text style={screenStyles.body}>{plainTrainingCopy(step.instruction)}</Text>
      </View>
      <View style={{ gap: spacing.sm }}>
        {items.map((item, index) => (
          <View key={item.exerciseId} style={{ borderTopColor: colors.line, borderTopWidth: index === 0 ? 0 : 1, gap: spacing.xs, paddingTop: index === 0 ? 0 : spacing.sm }}>
            <Text style={{ color: colors.canvas, fontSize: 15, fontWeight: "900", lineHeight: 20 }}>{item.title}</Text>
            <Text style={screenStyles.body}>Do: {plainTrainingCopy(item.dose)}</Text>
            <Text style={screenStyles.subtle}>How: {plainTrainingCopy(item.instruction)}</Text>
            <Text style={screenStyles.subtle}>Rest: {plainTrainingCopy(item.rest)}</Text>
            <Text style={screenStyles.subtle}>Cue: {plainTrainingCopy(item.cue)}</Text>
          </View>
        ))}
        {compact && step.items.length > items.length ? <Text style={screenStyles.subtle}>Open walkthrough for {step.items.length - items.length} more exercise(s).</Text> : null}
      </View>
      <View style={{ backgroundColor: "rgba(56, 226, 138, 0.1)", borderColor: "rgba(56, 226, 138, 0.3)", borderRadius: 14, borderWidth: 1, padding: spacing.sm }}>
        <Text style={{ color: colors.readyGreen, fontSize: 12, fontWeight: "900", lineHeight: 16 }}>CHECKPOINT</Text>
        <Text style={screenStyles.subtle}>{plainTrainingCopy(step.checkpoint)}</Text>
      </View>
    </StepShell>
  );
}

export function WorkoutWalkthroughCard({
  compact = false,
  onStepPress,
  session
}: {
  compact?: boolean | undefined;
  onStepPress?: ((step: WorkoutWalkthroughStep, index: number) => void) | undefined;
  session: DetailedTrainingSession;
}) {
  const walkthrough = session.walkthrough;
  const steps = compact ? walkthrough.steps.slice(0, 2) : walkthrough.steps;
  return (
    <View style={{ gap: spacing.md }} testID="workout-walkthrough-card">
      <View style={{ gap: spacing.xs }}>
        <Text style={screenStyles.sectionTitle}>{walkthrough.title}</Text>
        <Text style={screenStyles.body}>{plainTrainingCopy(walkthrough.summary)}</Text>
      </View>

      <View style={{ gap: spacing.xs }}>
        <Text style={screenStyles.fieldLabel}>Before you start</Text>
        {walkthrough.beforeYouStart.map((item, index) => <BulletLine key={`before:${index}`} label={`${index + 1}`} text={item} />)}
      </View>

      {walkthrough.roundPlan ? (
        <View
          style={{
            backgroundColor: "rgba(39, 206, 241, 0.1)",
            borderColor: "rgba(39, 206, 241, 0.34)",
            borderRadius: 18,
            borderWidth: 1,
            gap: spacing.sm,
            padding: spacing.md
          }}
        >
          <Text style={{ color: colors.blueIQ, fontSize: 12, fontWeight: "900", lineHeight: 16 }}>ROUND PLAN</Text>
          <Text style={{ color: colors.canvas, fontSize: 16, fontWeight: "900", lineHeight: 22 }}>{plainTrainingCopy(walkthrough.roundPlan.format)}</Text>
          {walkthrough.roundPlan.instructions.map((item, index) => <BulletLine key={`round:${index}`} text={item} />)}
        </View>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        {steps.map((step) => <WalkthroughStep compact={compact} key={step.id} onPress={onStepPress} step={step} />)}
        {compact && walkthrough.steps.length > steps.length ? <Text style={screenStyles.subtle}>Open full workout plan for every block.</Text> : null}
      </View>

      {!compact ? (
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.fieldLabel}>Finish</Text>
          <Text style={screenStyles.body}>{plainTrainingCopy(walkthrough.finish)}</Text>
          {walkthrough.safety.slice(0, 4).map((item, index) => <BulletLine key={`safety:${index}`} text={item} />)}
        </View>
      ) : null}
    </View>
  );
}
