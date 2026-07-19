import React, { useState } from "react";
import { Text, View } from "react-native";
import { spacing } from "../../../../design/theme";
import { cmToIn, inToCm, kgToLb, lbToKg } from "../../../../engine/core/units";
import { onboardingStyles } from "../onboardingTheme";
import type { OnboardingStepProps } from "./BoxerBasicsStep";
import { ChipButton, FieldGroup, LabeledTextInput } from "./StepControls";

type BodyMassField = "currentBodyMassKg" | "typicalWalkAroundWeightKg" | "heightCm";
type BodyMassUnits = OnboardingStepProps["draft"]["bodyMass"]["preferredUnits"];

const bodyMassUnitCopy: Record<
  BodyMassUnits,
  {
    currentExample: string;
    heightExample: string;
    heightUnit: string;
    massUnit: string;
    walkAroundExample: string;
  }
> = {
  imperial: {
    currentExample: "180",
    heightExample: "70",
    heightUnit: "in",
    massUnit: "lb",
    walkAroundExample: "185"
  },
  metric: {
    currentExample: "82",
    heightExample: "178",
    heightUnit: "cm",
    massUnit: "kg",
    walkAroundExample: "84"
  }
};

function formatMeasurement(value: number): string {
  return Number(value.toFixed(1)).toString();
}

function displayMassText(kg: number, units: BodyMassUnits): string {
  return formatMeasurement(units === "imperial" ? kgToLb(kg) : kg);
}

function displayHeightText(cm: number, units: BodyMassUnits): string {
  return formatMeasurement(units === "imperial" ? cmToIn(cm) : cm);
}

function canonicalMassValue(value: number, units: BodyMassUnits): number {
  return units === "imperial" ? lbToKg(value) : value;
}

function canonicalHeightValue(value: number, units: BodyMassUnits): number {
  return units === "imperial" ? inToCm(value) : value;
}

function bodyMassTextsFromDraft(draft: OnboardingStepProps["draft"]["bodyMass"], units: BodyMassUnits) {
  return {
    currentMassText: displayMassText(draft.currentBodyMassKg, units),
    heightText: displayHeightText(draft.heightCm, units),
    walkAroundText: displayMassText(draft.typicalWalkAroundWeightKg, units)
  };
}

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
  const [currentMassText, setCurrentMassText] = useState(() => displayMassText(draft.bodyMass.currentBodyMassKg, draft.bodyMass.preferredUnits));
  const [walkAroundText, setWalkAroundText] = useState(() => displayMassText(draft.bodyMass.typicalWalkAroundWeightKg, draft.bodyMass.preferredUnits));
  const [heightText, setHeightText] = useState(() => displayHeightText(draft.bodyMass.heightCm, draft.bodyMass.preferredUnits));
  const unitCopy = bodyMassUnitCopy[draft.bodyMass.preferredUnits];
  const applyBodyMassUpdate = (field: BodyMassField, value: string, nextTexts: { currentMassText: string; heightText: string; walkAroundText: string }) => {
    const parsed = positiveNumber(value);
    if (parsed !== null) {
      const canonicalValue = field === "heightCm" ? canonicalHeightValue(parsed, draft.bodyMass.preferredUnits) : canonicalMassValue(parsed, draft.bodyMass.preferredUnits);
      updateDraft((current) => ({ ...current, bodyMass: { ...current.bodyMass, [field]: canonicalValue } }));
    }
    setStepError(bodyMassTextError(nextTexts));
  };
  const changePreferredUnits = (preferredUnits: BodyMassUnits) => {
    const nextTexts = bodyMassTextsFromDraft(draft.bodyMass, preferredUnits);
    setCurrentMassText(nextTexts.currentMassText);
    setWalkAroundText(nextTexts.walkAroundText);
    setHeightText(nextTexts.heightText);
    updateDraft((current) => ({ ...current, bodyMass: { ...current.bodyMass, preferredUnits } }));
    setStepError(bodyMassTextError(nextTexts));
  };

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={onboardingStyles.sectionTitle}>Measurements</Text>
      <LabeledTextInput
        example={unitCopy.currentExample}
        helper="Current scale value."
        keyboardType="decimal-pad"
        label={`Current body weight (${unitCopy.massUnit})`}
        onChangeText={(value) => {
          setCurrentMassText(value);
          applyBodyMassUpdate("currentBodyMassKg", value, { currentMassText: value, heightText, walkAroundText });
        }}
        placeholder={`Current body weight ${unitCopy.massUnit}`}
        value={currentMassText}
      />
      <LabeledTextInput
        example={unitCopy.walkAroundExample}
        helper="Normal training weight, not a target."
        keyboardType="decimal-pad"
        label={`Typical walk-around body weight (${unitCopy.massUnit})`}
        onChangeText={(value) => {
          setWalkAroundText(value);
          applyBodyMassUpdate("typicalWalkAroundWeightKg", value, { currentMassText, heightText, walkAroundText: value });
        }}
        placeholder={`Typical walk-around ${unitCopy.massUnit}`}
        value={walkAroundText}
      />
      <LabeledTextInput
        example={unitCopy.heightExample}
        helper="Basic safety context."
        keyboardType="decimal-pad"
        label={`Height (${unitCopy.heightUnit})`}
        onChangeText={(value) => {
          setHeightText(value);
          applyBodyMassUpdate("heightCm", value, { currentMassText, heightText: value, walkAroundText });
        }}
        placeholder={`Height ${unitCopy.heightUnit}`}
        value={heightText}
      />
      <FieldGroup helper="Use the units you want for setup and future display. CornerIQ stores the engine values safely behind the scenes." label="Preferred display units">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {(["metric", "imperial"] as const).map((option) => (
            <ChipButton
              active={draft.bodyMass.preferredUnits === option}
              key={option}
              label={option === "metric" ? "Metric displays" : "Imperial displays"}
              onPress={() => changePreferredUnits(option)}
            />
          ))}
        </View>
      </FieldGroup>
    </View>
  );
}
