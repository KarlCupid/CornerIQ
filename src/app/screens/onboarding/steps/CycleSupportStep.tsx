import React from "react";
import { View } from "react-native";
import { spacing } from "../../../../design/theme";
import type { OnboardingStepProps } from "./BoxerBasicsStep";
import { ChipButton, FieldGroup } from "./StepControls";

export function CycleSupportStep({ draft, updateDraft }: OnboardingStepProps) {
  return (
    <View style={{ gap: spacing.md }}>
      <FieldGroup
        helper="This can include cramps, low energy, or a missed period. CornerIQ may adjust training based on what you log. This is optional, private, and not fertility tracking."
        label="Should CornerIQ use period symptoms you log?"
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <ChipButton accessibilityLabel="Yes, use period symptoms" active={draft.cycleSupport.preference === "enabled"} label="Yes" onPress={() => updateDraft((current) => ({ ...current, cycleSupport: { preference: "enabled" } }))} />
          <ChipButton accessibilityLabel="No, do not use period symptoms" active={draft.cycleSupport.preference === "disabled"} label="No" onPress={() => updateDraft((current) => ({ ...current, cycleSupport: { preference: "disabled" } }))} />
          <ChipButton active={draft.cycleSupport.preference === "undecided"} label="Decide later" onPress={() => updateDraft((current) => ({ ...current, cycleSupport: { preference: "undecided" } }))} />
        </View>
      </FieldGroup>
    </View>
  );
}
