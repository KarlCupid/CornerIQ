import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { colors, spacing } from "../../../../design/theme";
import { screenStyles } from "../../screenStyles";
import type { OnboardingStepProps } from "./BoxerBasicsStep";
import { FieldGroup, LabeledTextInput } from "./StepControls";

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
      <Text style={screenStyles.subtle}>Required. These values keep weight-class decisions conservative; missing or invalid data stays unknown, not safe.</Text>
      <LabeledTextInput
        example="82"
        helper="Your current scale value. Enter kilograms during setup."
        keyboardType="decimal-pad"
        label="Current body mass (kg)"
        onChangeText={(value) => {
          setCurrentMassText(value);
          applyBodyMassUpdate("currentBodyMassKg", value, { currentMassText: value, heightText, walkAroundText });
        }}
        placeholder="Current body mass kg"
        value={currentMassText}
      />
      <LabeledTextInput
        example="84"
        helper="Your normal training weight when not trying to make a class. This is not a target."
        keyboardType="decimal-pad"
        label="Typical walk-around body mass (kg)"
        onChangeText={(value) => {
          setWalkAroundText(value);
          applyBodyMassUpdate("typicalWalkAroundWeightKg", value, { currentMassText, heightText, walkAroundText: value });
        }}
        placeholder="Typical walk-around kg"
        value={walkAroundText}
      />
      <LabeledTextInput
        example="178"
        helper="Used only as basic profile context for safety checks."
        keyboardType="decimal-pad"
        label="Height (cm)"
        onChangeText={(value) => {
          setHeightText(value);
          applyBodyMassUpdate("heightCm", value, { currentMassText, heightText: value, walkAroundText });
        }}
        placeholder="Height cm"
        value={heightText}
      />
      <FieldGroup helper="Setup entry stays kg/cm for now. This choice saves the display preference for later screens." label="Preferred display units">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {(["metric", "imperial"] as const).map((option) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: draft.bodyMass.preferredUnits === option }}
              key={option}
              onPress={() => {
                updateDraft((current) => ({ ...current, bodyMass: { ...current.bodyMass, preferredUnits: option } }));
                setStepError(bodyMassTextError({ currentMassText, heightText, walkAroundText }));
              }}
              style={[screenStyles.quietButton, draft.bodyMass.preferredUnits === option ? { borderColor: colors.blueIQ } : null]}
            >
              <Text style={screenStyles.quietButtonText}>{option === "metric" ? "Metric displays" : "Imperial displays"}</Text>
            </Pressable>
          ))}
        </View>
      </FieldGroup>
    </View>
  );
}
