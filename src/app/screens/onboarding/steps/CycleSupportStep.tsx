import React from "react";
import { Text, View } from "react-native";
import { spacing } from "../../../../design/theme";
import { screenStyles } from "../../screenStyles";
import type { OnboardingStepProps } from "./BoxerBasicsStep";
import { ChipButton, FieldGroup } from "./StepControls";

export function CycleSupportStep({ draft, updateDraft }: OnboardingStepProps) {
  return (
    <View style={{ gap: spacing.md }}>
      <Text style={screenStyles.sectionTitle}>Cycle support</Text>
      <Text style={screenStyles.subtle}>Optional and private. Only answer what applies. This is for safety context, not judgment, and it is not fertility tracking.</Text>
      <FieldGroup helper="You can enable, skip, or decide later. Manual symptom logs are enough if you use this." label="Cycle support preference">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <ChipButton active={draft.cycleSupport.preference === "enabled"} label="Enable symptom-aware support" onPress={() => updateDraft((current) => ({ ...current, cycleSupport: { preference: "enabled" } }))} />
          <ChipButton active={draft.cycleSupport.preference === "disabled"} label="Do not use cycle context" onPress={() => updateDraft((current) => ({ ...current, cycleSupport: { preference: "disabled" } }))} />
          <ChipButton active={draft.cycleSupport.preference === "undecided"} label="Decide later" onPress={() => updateDraft((current) => ({ ...current, cycleSupport: { preference: "undecided" } }))} />
        </View>
      </FieldGroup>
    </View>
  );
}
