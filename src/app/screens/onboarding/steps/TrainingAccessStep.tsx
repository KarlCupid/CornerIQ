import React from "react";
import { View } from "react-native";
import { spacing } from "../../../../design/theme";
import type { OnboardingStepProps } from "./BoxerBasicsStep";
import { ChipButton, FieldGroup, SegmentedChoiceRow } from "./StepControls";

const equipmentOptions = [
  { icon: "body-outline", label: "Bodyweight only", value: "bodyweight" },
  { icon: "sync-outline", label: "Jump rope", value: "jump_rope" },
  { icon: "barbell-outline", label: "Dumbbells", value: "dumbbells" },
  { icon: "barbell-outline", label: "Barbell", value: "barbell" },
  { icon: "remove-outline", label: "Pull-up bar", value: "pull_up_bar" },
  { icon: "shield-outline", label: "Heavy bag", value: "bag" },
  { icon: "fitness-outline", label: "Full gym", value: "full_gym" }
] as const;

const availabilityOptions = [
  { accessibilityLabel: "Monday", label: "Mon", value: "monday" },
  { accessibilityLabel: "Tuesday", label: "Tue", value: "tuesday" },
  { accessibilityLabel: "Wednesday", label: "Wed", value: "wednesday" },
  { accessibilityLabel: "Thursday", label: "Thu", value: "thursday" },
  { accessibilityLabel: "Friday", label: "Fri", value: "friday" },
  { accessibilityLabel: "Saturday", label: "Sat", value: "saturday" },
  { accessibilityLabel: "Sunday", label: "Sun", value: "sunday" }
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
      <FieldGroup helper="Pick what you can reliably access." label="Equipment access">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {equipmentOptions.map((option) => (
            <ChipButton
              active={selectedEquipment.includes(option.value)}
              icon={option.icon}
              key={option.value}
              label={option.label}
              onPress={() => updateDraft((current) => ({ ...current, trainingAccess: { ...current.trainingAccess, equipmentAccess: toggleValue([...selectedEquipment], option.value) } }))}
            />
          ))}
        </View>
      </FieldGroup>
      <FieldGroup helper="Choose the days CornerIQ can place a workout." label="Available training days">
        <SegmentedChoiceRow
          onToggle={(value) => updateDraft((current) => ({ ...current, trainingAccess: { ...current.trainingAccess, scheduleAvailability: toggleValue([...selectedAvailability], value) } }))}
          options={availabilityOptions}
          selected={selectedAvailability}
        />
      </FieldGroup>
    </View>
  );
}
