import React, { useState } from "react";
import { Text, View } from "react-native";
import { spacing } from "../../../../design/theme";
import { screenStyles } from "../../screenStyles";
import type { OnboardingStepProps } from "./BoxerBasicsStep";
import { ChipButton, FieldGroup, LabeledTextInput } from "./StepControls";

const equipmentOptions = [
  { label: "Bodyweight only", value: "bodyweight_only" },
  { label: "Jump rope", value: "jump_rope" },
  { label: "Dumbbells", value: "dumbbells" },
  { label: "Barbell", value: "barbell" },
  { label: "Pull-up bar", value: "pull_up_bar" },
  { label: "Heavy bag", value: "heavy_bag" },
  { label: "Full gym", value: "full_gym" },
  { label: "None", value: "none" }
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

const equipmentValues = new Set<string>(equipmentOptions.map((option) => option.value));
const availabilityValues = new Set<string>(availabilityOptions.map((option) => option.value));

function splitList(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function knownValues(list: string[], values: Set<string>): string[] {
  return list.filter((item) => values.has(item));
}

function customValues(list: string[], values: Set<string>): string[] {
  return list.filter((item) => !values.has(item));
}

function toggleValue(current: string[], value: string): string[] {
  if (value === "none") {
    return current.includes("none") ? [] : ["none"];
  }
  const withoutNone = current.filter((item) => item !== "none");
  return withoutNone.includes(value) ? withoutNone.filter((item) => item !== value) : [...withoutNone, value];
}

export function TrainingAccessStep({ draft, updateDraft }: OnboardingStepProps) {
  const [customEquipment, setCustomEquipment] = useState(customValues(draft.trainingAccess.equipmentAccess, equipmentValues).join(", "));
  const [customAvailability, setCustomAvailability] = useState(customValues(draft.trainingAccess.scheduleAvailability, availabilityValues).join(", "));
  const selectedEquipment = knownValues(draft.trainingAccess.equipmentAccess, equipmentValues);
  const selectedAvailability = knownValues(draft.trainingAccess.scheduleAvailability, availabilityValues);
  const writeEquipment = (presets: string[], customText: string) => {
    updateDraft((current) => ({ ...current, trainingAccess: { ...current.trainingAccess, equipmentAccess: [...presets, ...splitList(customText)] } }));
  };
  const writeAvailability = (presets: string[], customText: string) => {
    updateDraft((current) => ({ ...current, trainingAccess: { ...current.trainingAccess, scheduleAvailability: [...presets, ...splitList(customText)] } }));
  };

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={screenStyles.sectionTitle}>Training access</Text>
      <Text style={screenStyles.subtle}>Required. Manual schedule input is enough. Use none/bodyweight if you train without equipment; wearables are never required.</Text>
      <FieldGroup helper="Pick everything you can reliably access. These are presets, not magic engine strings you need to memorize." label="Equipment access">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {equipmentOptions.map((option) => (
            <ChipButton
              active={selectedEquipment.includes(option.value)}
              key={option.value}
              label={option.label}
              onPress={() => writeEquipment(toggleValue(selectedEquipment, option.value), customEquipment)}
            />
          ))}
        </View>
      </FieldGroup>
      <LabeledTextInput
        helper="Optional. Add anything not covered above, separated by commas."
        label="Optional equipment notes"
        onChangeText={(value) => {
          setCustomEquipment(value);
          writeEquipment(selectedEquipment, value);
        }}
        placeholder="Equipment notes optional"
        value={customEquipment}
      />
      <FieldGroup helper="Pick the days you can usually train. This helps CornerIQ place generated training around boxing." label="Training availability">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {availabilityOptions.map((option) => (
            <ChipButton
              active={selectedAvailability.includes(option.value)}
              key={option.value}
              label={option.label}
              onPress={() => writeAvailability(toggleValue(selectedAvailability, option.value), customAvailability)}
            />
          ))}
        </View>
      </FieldGroup>
      <LabeledTextInput
        helper="Optional. Use this for constraints like school, work travel, or a gym closing time."
        label="Optional availability notes"
        onChangeText={(value) => {
          setCustomAvailability(value);
          writeAvailability(selectedAvailability, value);
        }}
        placeholder="Availability notes optional"
        value={customAvailability}
      />
    </View>
  );
}
