import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { colors, spacing } from "../../../../design/theme";
import { screenStyles } from "../../screenStyles";
import type { OnboardingStepProps } from "./BoxerBasicsStep";

type BodyMassField = "currentBodyMassKg" | "typicalWalkAroundWeightKg" | "heightCm";

function positiveNumber(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function bodyMassTextError(input: { currentMassText: string; heightText: string; walkAroundText: string }): string | null {
  if (positiveNumber(input.heightText) === null) {
    return "Height is required.";
  }
  if (positiveNumber(input.currentMassText) === null) {
    return "Current body mass is required.";
  }
  if (positiveNumber(input.walkAroundText) === null) {
    return "Walk-around body mass is required.";
  }
  return null;
}

export function BodyMassStep({ draft, setStepError, updateDraft }: OnboardingStepProps) {
  const [currentMassText, setCurrentMassText] = useState(`${draft.bodyMass.currentBodyMassKg}`);
  const [walkAroundText, setWalkAroundText] = useState(`${draft.bodyMass.typicalWalkAroundWeightKg}`);
  const [heightText, setHeightText] = useState(`${draft.bodyMass.heightCm}`);
  const applyBodyMassUpdate = (field: BodyMassField, value: string, nextTexts: { currentMassText: string; heightText: string; walkAroundText: string }) => {
    const parsed = positiveNumber(value);
    if (parsed !== null) {
      updateDraft((current) => ({ ...current, bodyMass: { ...current.bodyMass, [field]: parsed } }));
    }
    setStepError(bodyMassTextError(nextTexts));
  };

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={screenStyles.sectionTitle}>Body mass</Text>
      <Text style={screenStyles.subtle}>Required. These values keep weight-class decisions conservative; missing or invalid data stays unknown.</Text>
      <TextInput
        keyboardType="decimal-pad"
        onChangeText={(value) => {
          setCurrentMassText(value);
          applyBodyMassUpdate("currentBodyMassKg", value, { currentMassText: value, heightText, walkAroundText });
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
          applyBodyMassUpdate("typicalWalkAroundWeightKg", value, { currentMassText, heightText, walkAroundText: value });
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
          applyBodyMassUpdate("heightCm", value, { currentMassText, heightText: value, walkAroundText });
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
            onPress={() => {
              updateDraft((current) => ({ ...current, bodyMass: { ...current.bodyMass, preferredUnits: option } }));
              setStepError(bodyMassTextError({ currentMassText, heightText, walkAroundText }));
            }}
            style={[screenStyles.quietButton, draft.bodyMass.preferredUnits === option ? { borderColor: colors.blueIQ } : null]}
          >
            <Text style={screenStyles.quietButtonText}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
