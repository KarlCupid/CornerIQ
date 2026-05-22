import React from "react";
import { Text, View } from "react-native";
import { spacing } from "../../../../design/theme";
import { screenStyles } from "../../screenStyles";
import type { OnboardingStepProps } from "./BoxerBasicsStep";
import { ChipButton, FieldGroup } from "./StepControls";

export function WearablePreferenceStep({ draft, updateDraft }: OnboardingStepProps) {
  return (
    <View style={{ gap: spacing.md }}>
      <Text style={screenStyles.sectionTitle}>Wearable preference</Text>
      <Text style={screenStyles.subtle}>Required choice. Manual-only is a complete setup. Wearables can increase confidence later when data is fresh and consistent.</Text>
      <FieldGroup helper="Pick how you want CornerIQ to treat wearable data during beta. Manual input remains first-class either way." label="Wearable setup">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <ChipButton active={draft.wearablePreference.preference === "manual_only"} label="Manual only" onPress={() => updateDraft((current) => ({ ...current, wearablePreference: { preference: "manual_only" } }))} />
          <ChipButton active={draft.wearablePreference.preference === "wearable_connected"} label="Connect later" onPress={() => updateDraft((current) => ({ ...current, wearablePreference: { preference: "wearable_connected" } }))} />
          <ChipButton active={draft.wearablePreference.preference === "undecided"} label="Decide later" onPress={() => updateDraft((current) => ({ ...current, wearablePreference: { preference: "undecided" } }))} />
        </View>
      </FieldGroup>
    </View>
  );
}
