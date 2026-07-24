import React from "react";
import { View } from "react-native";
import { spacing } from "../../../../design/theme";
import { BOXING_EQUIPMENT_OPTIONS, toggleEquipmentSelection } from "../../equipmentOptions";
import type { OnboardingStepProps } from "./BoxerBasicsStep";
import { ChipButton, FieldGroup, SegmentedChoiceRow } from "./StepControls";

const availabilityOptions = [
  { accessibilityLabel: "Monday", label: "Mon", value: "monday" },
  { accessibilityLabel: "Tuesday", label: "Tue", value: "tuesday" },
  { accessibilityLabel: "Wednesday", label: "Wed", value: "wednesday" },
  { accessibilityLabel: "Thursday", label: "Thu", value: "thursday" },
  { accessibilityLabel: "Friday", label: "Fri", value: "friday" },
  { accessibilityLabel: "Saturday", label: "Sat", value: "saturday" },
  { accessibilityLabel: "Sunday", label: "Sun", value: "sunday" }
] as const;

export function TrainingAccessStep({ draft, updateDraft }: OnboardingStepProps) {
  const selectedEquipment = draft.trainingAccess.equipmentAccess;
  const selectedAvailability = draft.trainingAccess.scheduleAvailability;

  return (
    <View style={{ gap: spacing.md }}>
      <FieldGroup helper="Pick what you can reliably access." label="Equipment access">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {BOXING_EQUIPMENT_OPTIONS.map((option) => (
            <ChipButton
              active={selectedEquipment.includes(option.value)}
              icon={option.icon}
              key={option.value}
              label={option.label}
              onPress={() => updateDraft((current) => ({ ...current, trainingAccess: { ...current.trainingAccess, equipmentAccess: toggleEquipmentSelection(selectedEquipment, option.value) } }))}
            />
          ))}
        </View>
      </FieldGroup>
      <FieldGroup helper="Choose the days CornerIQ can place a workout." label="Available training days">
        <SegmentedChoiceRow
          onToggle={(value) => updateDraft((current) => ({ ...current, trainingAccess: { ...current.trainingAccess, scheduleAvailability: selectedAvailability.includes(value) ? selectedAvailability.filter((item) => item !== value) : [...selectedAvailability, value] } }))}
          options={availabilityOptions}
          selected={selectedAvailability}
        />
      </FieldGroup>
    </View>
  );
}
