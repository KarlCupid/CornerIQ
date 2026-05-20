import React from "react";
import { Pressable, Text, View } from "react-native";
import { colors, spacing } from "../../../../design/theme";
import { screenStyles } from "../../screenStyles";
import type { OnboardingStepProps } from "./BoxerBasicsStep";

export function CycleSupportStep({ draft, updateDraft }: OnboardingStepProps) {
  return (
    <View style={{ gap: spacing.md }}>
      <Text style={screenStyles.sectionTitle}>Cycle support</Text>
      <Text style={screenStyles.subtle}>Optional and private. CornerIQ uses symptoms to adjust training and fueling context; it does not use fertility framing.</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {(["enabled", "disabled", "undecided"] as const).map((option) => (
          <Pressable
            accessibilityRole="button"
            key={option}
            onPress={() => updateDraft((current) => ({ ...current, cycleSupport: { preference: option } }))}
            style={[screenStyles.quietButton, draft.cycleSupport.preference === option ? { borderColor: colors.blueIQ } : null]}
          >
            <Text style={screenStyles.quietButtonText}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
