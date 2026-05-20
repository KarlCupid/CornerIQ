import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { colors, spacing } from "../../../../design/theme";
import { screenStyles } from "../../screenStyles";
import type { OnboardingStepProps } from "./BoxerBasicsStep";

function updatePositiveNumber(value: string, onValid: (value: number) => void) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    onValid(parsed);
  }
}

export function BodyMassStep({ draft, updateDraft }: OnboardingStepProps) {
  return (
    <View style={{ gap: spacing.md }}>
      <Text style={screenStyles.sectionTitle}>Body mass</Text>
      <TextInput
        keyboardType="decimal-pad"
        onChangeText={(value) => updatePositiveNumber(value, (currentBodyMassKg) => updateDraft((current) => ({ ...current, bodyMass: { ...current.bodyMass, currentBodyMassKg } })))}
        placeholder="Current body mass kg"
        placeholderTextColor={colors.wrap}
        style={screenStyles.input}
        value={`${draft.bodyMass.currentBodyMassKg}`}
      />
      <TextInput
        keyboardType="decimal-pad"
        onChangeText={(value) => updatePositiveNumber(value, (typicalWalkAroundWeightKg) => updateDraft((current) => ({ ...current, bodyMass: { ...current.bodyMass, typicalWalkAroundWeightKg } })))}
        placeholder="Typical walk-around kg"
        placeholderTextColor={colors.wrap}
        style={screenStyles.input}
        value={`${draft.bodyMass.typicalWalkAroundWeightKg}`}
      />
      <TextInput
        keyboardType="decimal-pad"
        onChangeText={(value) => updatePositiveNumber(value, (heightCm) => updateDraft((current) => ({ ...current, bodyMass: { ...current.bodyMass, heightCm } })))}
        placeholder="Height cm"
        placeholderTextColor={colors.wrap}
        style={screenStyles.input}
        value={`${draft.bodyMass.heightCm}`}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {(["metric", "imperial"] as const).map((option) => (
          <Pressable
            accessibilityRole="button"
            key={option}
            onPress={() => updateDraft((current) => ({ ...current, bodyMass: { ...current.bodyMass, preferredUnits: option } }))}
            style={[screenStyles.quietButton, draft.bodyMass.preferredUnits === option ? { borderColor: colors.blueIQ } : null]}
          >
            <Text style={screenStyles.quietButtonText}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
