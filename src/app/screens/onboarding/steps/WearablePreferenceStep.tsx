import React from "react";
import { Pressable, Text, View } from "react-native";
import { colors, spacing } from "../../../../design/theme";
import { screenStyles } from "../../screenStyles";
import type { OnboardingStepProps } from "./BoxerBasicsStep";

export function WearablePreferenceStep({ draft, updateDraft }: OnboardingStepProps) {
  return (
    <View style={{ gap: spacing.md }}>
      <Text style={screenStyles.sectionTitle}>Wearable preference</Text>
      <Text style={screenStyles.subtle}>Manual only is a complete setup. Wearables can increase confidence later when data is fresh and consistent.</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {(["manual_only", "wearable_connected", "undecided"] as const).map((option) => (
          <Pressable
            accessibilityRole="button"
            key={option}
            onPress={() => updateDraft((current) => ({ ...current, wearablePreference: { preference: option } }))}
            style={[screenStyles.quietButton, draft.wearablePreference.preference === option ? { borderColor: colors.blueIQ } : null]}
          >
            <Text style={screenStyles.quietButtonText}>{option.replace(/_/g, " ")}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
