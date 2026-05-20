import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { colors, spacing } from "../../../../design/theme";
import type { OnboardingDraft } from "../../../../services/supabase/onboardingService";
import { screenStyles } from "../../screenStyles";

export interface OnboardingStepProps {
  draft: OnboardingDraft;
  updateDraft: (updater: (current: OnboardingDraft) => OnboardingDraft) => void;
}

function OptionButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[screenStyles.quietButton, active ? { borderColor: colors.blueIQ } : null]}>
      <Text style={screenStyles.quietButtonText}>{label}</Text>
    </Pressable>
  );
}

export function BoxerBasicsStep({ draft, updateDraft }: OnboardingStepProps) {
  const updateTrainingAge = (value: string) => {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      updateDraft((current) => ({ ...current, boxing: { ...current.boxing, trainingAgeYears: parsed } }));
    }
  };

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={screenStyles.sectionTitle}>Boxing identity</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {(["amateur", "pro"] as const).map((option) => (
          <OptionButton active={draft.boxing.amateurOrPro === option} key={option} label={option} onPress={() => updateDraft((current) => ({ ...current, boxing: { ...current.boxing, amateurOrPro: option } }))} />
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {(["aspiring_boxer", "amateur_novice", "amateur_open", "amateur_elite", "pro_development", "pro_4_6_round", "pro_8_10_round", "pro_12_round"] as const).map((option) => (
          <OptionButton active={draft.boxing.boxingLevel === option} key={option} label={option.replace(/_/g, " ")} onPress={() => updateDraft((current) => ({ ...current, boxing: { ...current.boxing, boxingLevel: option } }))} />
        ))}
      </View>
      <TextInput keyboardType="decimal-pad" onChangeText={updateTrainingAge} placeholder="Training age years" placeholderTextColor={colors.wrap} style={screenStyles.input} value={`${draft.boxing.trainingAgeYears}`} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {(["orthodox", "southpaw", "switch", "unknown"] as const).map((option) => (
          <OptionButton active={draft.boxing.stance === option} key={option} label={option} onPress={() => updateDraft((current) => ({ ...current, boxing: { ...current.boxing, stance: option } }))} />
        ))}
      </View>
    </View>
  );
}
