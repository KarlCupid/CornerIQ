import React, { useState } from "react";
import { Text, View } from "react-native";
import { spacing } from "../../../../design/theme";
import { screenStyles } from "../../screenStyles";
import type { OnboardingStepProps } from "./BoxerBasicsStep";
import { ChipButton, FieldGroup, LabeledTextInput } from "./StepControls";

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
    return "Current body weight is required.";
  }
  if (positiveNumber(input.walkAroundText) === null) {
    return "Walk-around body weight is required.";
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
      <Text style={screenStyles.sectionTitle}>Body weight</Text>
      <Text style={screenStyles.subtle}>Used for conservative weight-class safety.</Text>
      <LabeledTextInput
        example="82"
        helper="Current scale value."
        keyboardType="decimal-pad"
        label="Current body weight (kg)"
        onChangeText={(value) => {
          setCurrentMassText(value);
          applyBodyMassUpdate("currentBodyMassKg", value, { currentMassText: value, heightText, walkAroundText });
        }}
        placeholder="Current body weight kg"
        value={currentMassText}
      />
      <LabeledTextInput
        example="84"
        helper="Normal training weight, not a target."
        keyboardType="decimal-pad"
        label="Typical walk-around body weight (kg)"
        onChangeText={(value) => {
          setWalkAroundText(value);
          applyBodyMassUpdate("typicalWalkAroundWeightKg", value, { currentMassText, heightText, walkAroundText: value });
        }}
        placeholder="Typical walk-around kg"
        value={walkAroundText}
      />
      <LabeledTextInput
        example="178"
        helper="Basic safety context."
        keyboardType="decimal-pad"
        label="Height (cm)"
        onChangeText={(value) => {
          setHeightText(value);
          applyBodyMassUpdate("heightCm", value, { currentMassText, heightText: value, walkAroundText });
        }}
        placeholder="Height cm"
        value={heightText}
      />
      <FieldGroup helper="Setup entry stays kg/cm; this saves display preference." label="Preferred display units">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {(["metric", "imperial"] as const).map((option) => (
            <ChipButton
              active={draft.bodyMass.preferredUnits === option}
              key={option}
              label={option === "metric" ? "Metric displays" : "Imperial displays"}
              onPress={() => {
                updateDraft((current) => ({ ...current, bodyMass: { ...current.bodyMass, preferredUnits: option } }));
                setStepError(bodyMassTextError({ currentMassText, heightText, walkAroundText }));
              }}
            />
          ))}
        </View>
      </FieldGroup>
    </View>
  );
}
