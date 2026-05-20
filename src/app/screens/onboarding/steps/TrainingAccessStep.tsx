import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { colors, spacing } from "../../../../design/theme";
import { screenStyles } from "../../screenStyles";
import type { OnboardingStepProps } from "./BoxerBasicsStep";

function splitList(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function TrainingAccessStep({ draft, updateDraft }: OnboardingStepProps) {
  const [equipment, setEquipment] = useState(draft.trainingAccess.equipmentAccess.join(", "));
  const [availability, setAvailability] = useState(draft.trainingAccess.scheduleAvailability.join(", "));

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={screenStyles.sectionTitle}>Training access</Text>
      <Text style={screenStyles.subtle}>Required. Manual schedule input is enough. Use none/bodyweight if you train without equipment; wearables are never required.</Text>
      <TextInput
        onChangeText={(value) => {
          setEquipment(value);
          updateDraft((current) => ({ ...current, trainingAccess: { ...current.trainingAccess, equipmentAccess: splitList(value) } }));
        }}
        placeholder="Equipment, comma-separated"
        placeholderTextColor={colors.wrap}
        style={screenStyles.input}
        value={equipment}
      />
      <TextInput
        onChangeText={(value) => {
          setAvailability(value);
          updateDraft((current) => ({ ...current, trainingAccess: { ...current.trainingAccess, scheduleAvailability: splitList(value) } }));
        }}
        placeholder="Availability, comma-separated"
        placeholderTextColor={colors.wrap}
        style={screenStyles.input}
        value={availability}
      />
    </View>
  );
}
