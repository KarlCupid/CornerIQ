import React, { useState } from "react";
import { View } from "react-native";
import { spacing } from "../../../../design/theme";
import type { OnboardingStepProps } from "./BoxerBasicsStep";
import { BodyMassStep } from "./BodyMassStep";
import { ChipButton, FieldGroup, LabeledTextInput } from "./StepControls";

export function BasicInformationStep({ draft, setStepError, updateDraft }: OnboardingStepProps) {
  const [ageText, setAgeText] = useState(String(draft.basicInformation.ageYears));

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.md }}>
        <LabeledTextInput
          autoCapitalize="words"
          label="Preferred name"
          onChangeText={(preferredName) => {
            updateDraft((current) => ({ ...current, basicInformation: { ...current.basicInformation, preferredName } }));
            setStepError(preferredName.trim() ? null : "Preferred name is required.");
          }}
          placeholder="What should we call you?"
          value={draft.basicInformation.preferredName}
        />
        <LabeledTextInput
          keyboardType="number-pad"
          label="Age"
          onChangeText={(value) => {
            setAgeText(value);
            const ageYears = Number(value);
            if (Number.isInteger(ageYears) && ageYears > 0) {
              updateDraft((current) => ({ ...current, basicInformation: { ...current.basicInformation, ageYears } }));
            }
            setStepError(Number.isInteger(ageYears) && ageYears >= 18 ? null : "CornerIQ is currently available for boxers 18 or older.");
          }}
          placeholder="Age"
          value={ageText}
        />
        <FieldGroup helper="Used only where training and fuel calculations differ." label="Sex at birth">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {(["male", "female", "prefer_not_to_say"] as const).map((option) => (
              <ChipButton
                active={draft.basicInformation.sexAtBirth === option}
                key={option}
                label={option === "prefer_not_to_say" ? "Prefer not to say" : option === "male" ? "Male" : "Female"}
                onPress={() => updateDraft((current) => ({ ...current, basicInformation: { ...current.basicInformation, sexAtBirth: option } }))}
              />
            ))}
          </View>
        </FieldGroup>
      </View>
      <BodyMassStep draft={draft} setStepError={setStepError} updateDraft={updateDraft} />
    </View>
  );
}
