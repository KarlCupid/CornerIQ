import React from "react";
import { Text, View } from "react-native";
import { spacing } from "../../../../design/theme";
import { screenStyles } from "../../screenStyles";
import type { OnboardingStepProps } from "./BoxerBasicsStep";
import { ChipButton, FieldGroup } from "./StepControls";

const equipmentOptions = [
  { label: "Bodyweight only", value: "bodyweight" },
  { label: "Jump rope", value: "jump_rope" },
  { label: "Dumbbells", value: "dumbbells" },
  { label: "Barbell", value: "barbell" },
  { label: "Pull-up bar", value: "pull_up_bar" },
  { label: "Heavy bag", value: "bag" },
  { label: "Full gym", value: "full_gym" }
] as const;

const availabilityOptions = [
  { label: "Monday", value: "monday" },
  { label: "Tuesday", value: "tuesday" },
  { label: "Wednesday", value: "wednesday" },
  { label: "Thursday", value: "thursday" },
  { label: "Friday", value: "friday" },
  { label: "Saturday", value: "saturday" },
  { label: "Sunday", value: "sunday" }
] as const;

function toggleValue(current: string[], value: string): string[] {
  if (value === "bodyweight") {
    return current.includes("bodyweight") ? [] : ["bodyweight"];
  }
  const withoutBodyweight = current.filter((item) => item !== "bodyweight");
  return withoutBodyweight.includes(value) ? withoutBodyweight.filter((item) => item !== value) : [...withoutBodyweight, value];
}

export function TrainingAccessStep({ draft, updateDraft }: OnboardingStepProps) {
  const selectedEquipment = draft.trainingAccess.equipmentAccess;
  const selectedAvailability = draft.trainingAccess.scheduleAvailability;

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={screenStyles.sectionTitle}>Available training days</Text>
      <FieldGroup helper="Pick what you can reliably access." label="Equipment access">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {equipmentOptions.map((option) => (
            <ChipButton
              active={selectedEquipment.includes(option.value)}
              key={option.value}
              label={option.label}
              onPress={() => updateDraft((current) => ({ ...current, trainingAccess: { ...current.trainingAccess, equipmentAccess: toggleValue([...selectedEquipment], option.value) } }))}
            />
          ))}
        </View>
      </FieldGroup>
      <FieldGroup helper="Choose the days CornerIQ can place a workout." label="Available training days">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {availabilityOptions.map((option) => (
            <ChipButton
              active={selectedAvailability.includes(option.value)}
              key={option.value}
              label={option.label}
              onPress={() => updateDraft((current) => ({ ...current, trainingAccess: { ...current.trainingAccess, scheduleAvailability: toggleValue([...selectedAvailability], option.value) } }))}
            />
          ))}
        </View>
      </FieldGroup>
    </View>
  );
}
