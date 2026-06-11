import React from "react";
import { Text, View } from "react-native";
import { spacing } from "../../../../design/theme";
import type { OnboardingDraft } from "../../../../services/supabase/onboardingService";
import { screenStyles } from "../../screenStyles";
import { ChipButton, FieldGroup } from "./StepControls";

export interface OnboardingStepProps {
  draft: OnboardingDraft;
  setStepError: (error: string | null) => void;
  updateDraft: (updater: (current: OnboardingDraft) => OnboardingDraft) => void;
}

const boxingLevels: Array<{ description: string; label: string; value: OnboardingDraft["boxing"]["boxingLevel"] }> = [
  { label: "Aspiring boxer", value: "aspiring_boxer", description: "Training for boxing, not competing yet." },
  { label: "Novice amateur", value: "amateur_novice", description: "Early amateur; limited sanctioned bouts." },
  { label: "Open amateur", value: "amateur_open", description: "Active amateur with multiple bouts." },
  { label: "Elite amateur", value: "amateur_elite", description: "High-level amateur or regional/national level." },
  { label: "Developing pro", value: "pro_development", description: "Preparing for or early in pro boxing." },
  { label: "Pro, 4-6 rounds", value: "pro_4_6_round", description: "Currently fighting short pro bouts." },
  { label: "Pro, 8-10 rounds", value: "pro_8_10_round", description: "Currently fighting longer pro bouts." },
  { label: "Pro, 12 rounds", value: "pro_12_round", description: "Championship-distance pro context." }
];

const trainingAgeOptions = [
  { label: "0", value: 0 },
  { label: "1", value: 1 },
  { label: "2", value: 2 },
  { label: "3-5", value: 4 },
  { label: "6+", value: 6 }
] as const;

function trainingAgeActive(current: number, option: (typeof trainingAgeOptions)[number]): boolean {
  if (option.label === "3-5") {
    return current >= 3 && current <= 5;
  }
  if (option.label === "6+") {
    return current >= 6;
  }
  return current === option.value;
}

export function BoxerBasicsStep({ draft, setStepError, updateDraft }: OnboardingStepProps) {
  const updateBoxing = (updater: (current: OnboardingDraft) => OnboardingDraft) => {
    updateDraft(updater);
    setStepError(null);
  };

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={screenStyles.sectionTitle}>Boxing identity</Text>
      <Text style={screenStyles.subtle}>Boxer-first across amateur and pro contexts.</Text>
      <FieldGroup helper="Choose your current lane." label="Boxing status">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <ChipButton active={draft.boxing.amateurOrPro === "amateur"} label="Amateur boxer" onPress={() => updateBoxing((current) => ({ ...current, boxing: { ...current.boxing, amateurOrPro: "amateur" } }))} />
          <ChipButton active={draft.boxing.amateurOrPro === "pro"} label="Professional boxer" onPress={() => updateBoxing((current) => ({ ...current, boxing: { ...current.boxing, amateurOrPro: "pro" } }))} />
        </View>
      </FieldGroup>
      <FieldGroup helper="Pick the closest current level." label="Current boxing level">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {boxingLevels.map((option) => (
            <ChipButton
              active={draft.boxing.boxingLevel === option.value}
              description={option.description}
              key={option.value}
              label={option.label}
              onPress={() => updateBoxing((current) => ({ ...current, boxing: { ...current.boxing, boxingLevel: option.value } }))}
            />
          ))}
        </View>
      </FieldGroup>
      <FieldGroup example="Use 0 if brand new." helper="Choose the closest option." label="Training age">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {trainingAgeOptions.map((option) => (
            <ChipButton
              active={trainingAgeActive(draft.boxing.trainingAgeYears, option)}
              key={`training-age:${option.value}`}
              label={option.label}
              onPress={() => updateBoxing((current) => ({ ...current, boxing: { ...current.boxing, trainingAgeYears: option.value } }))}
            />
          ))}
        </View>
      </FieldGroup>
      <FieldGroup helper="Optional. Unknown is fine." label="Stance">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {(["orthodox", "southpaw", "switch", "unknown"] as const).map((option) => (
            <ChipButton active={draft.boxing.stance === option} key={option} label={option === "unknown" ? "Not sure yet" : option} onPress={() => updateBoxing((current) => ({ ...current, boxing: { ...current.boxing, stance: option } }))} />
          ))}
        </View>
      </FieldGroup>
    </View>
  );
}
