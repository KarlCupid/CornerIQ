import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { colors, spacing } from "../../../../design/theme";
import { screenStyles } from "../../screenStyles";
import type { OnboardingStepProps } from "./BoxerBasicsStep";

function positiveOrInvalid(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Number.NaN;
}

export function BodyMassStep({ draft, updateDraft }: OnboardingStepProps) {
  const [currentMassText, setCurrentMassText] = useState(`${draft.bodyMass.currentBodyMassKg}`);
  const [walkAroundText, setWalkAroundText] = useState(`${draft.bodyMass.typicalWalkAroundWeightKg}`);
  const [heightText, setHeightText] = useState(`${draft.bodyMass.heightCm}`);

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={screenStyles.sectionTitle}>Body mass</Text>
      <Text style={screenStyles.subtle}>Required. These values keep weight-class decisions conservative; missing or invalid data stays unknown.</Text>
      <TextInput
        keyboardType="decimal-pad"
        onChangeText={(value) => {
          setCurrentMassText(value);
          updateDraft((current) => ({ ...current, bodyMass: { ...current.bodyMass, currentBodyMassKg: positiveOrInvalid(value) } }));
        }}
        placeholder="Current body mass kg"
        placeholderTextColor={colors.wrap}
        style={screenStyles.input}
        value={currentMassText}
      />
      <TextInput
        keyboardType="decimal-pad"
        onChangeText={(value) => {
          setWalkAroundText(value);
          updateDraft((current) => ({ ...current, bodyMass: { ...current.bodyMass, typicalWalkAroundWeightKg: positiveOrInvalid(value) } }));
        }}
        placeholder="Typical walk-around kg"
        placeholderTextColor={colors.wrap}
        style={screenStyles.input}
        value={walkAroundText}
      />
      <TextInput
        keyboardType="decimal-pad"
        onChangeText={(value) => {
          setHeightText(value);
          updateDraft((current) => ({ ...current, bodyMass: { ...current.bodyMass, heightCm: positiveOrInvalid(value) } }));
        }}
        placeholder="Height cm"
        placeholderTextColor={colors.wrap}
        style={screenStyles.input}
        value={heightText}
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
