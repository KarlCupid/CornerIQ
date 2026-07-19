import React from "react";
import { View } from "react-native";
import { spacing } from "../../../../design/theme";
import type { OnboardingStepProps } from "./BoxerBasicsStep";
import { ChipButton, FieldGroup } from "./StepControls";

export function CycleSupportStep({ draft, updateDraft }: OnboardingStepProps) {
  return (
    <View style={{ gap: spacing.md }}>
      <FieldGroup helper="Optional, private, symptom-aware, and not fertility tracking. You can change this later." label="Cycle support preference">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <ChipButton active={draft.cycleSupport.preference === "enabled"} label="Enable symptom-aware support" onPress={() => updateDraft((current) => ({ ...current, cycleSupport: { preference: "enabled" } }))} />
          <ChipButton active={draft.cycleSupport.preference === "disabled"} label="Do not use cycle context" onPress={() => updateDraft((current) => ({ ...current, cycleSupport: { preference: "disabled" } }))} />
          <ChipButton active={draft.cycleSupport.preference === "undecided"} label="Decide later" onPress={() => updateDraft((current) => ({ ...current, cycleSupport: { preference: "undecided" } }))} />
        </View>
      </FieldGroup>
    </View>
  );
}
