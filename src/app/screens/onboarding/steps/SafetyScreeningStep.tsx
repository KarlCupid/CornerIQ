import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { colors, spacing } from "../../../../design/theme";
import type { OnboardingDraft } from "../../../../services/supabase/onboardingService";
import { screenStyles } from "../../screenStyles";
import type { OnboardingStepProps } from "./BoxerBasicsStep";

function splitList(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function Toggle({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[screenStyles.quietButton, active ? { borderColor: colors.blueIQ } : null]}>
      <Text style={screenStyles.quietButtonText}>{label}</Text>
    </Pressable>
  );
}

function parseAge(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  const rounded = Math.round(parsed);
  return rounded >= 5 && rounded <= 80 ? rounded : null;
}

export function SafetyScreeningStep({ draft, setStepError, updateDraft }: OnboardingStepProps) {
  const [ageText, setAgeText] = useState(`${draft.safety.ageYears}`);
  const [medicalFlags, setMedicalFlags] = useState(draft.safety.medicalFlags.join(", "));
  const [medications, setMedications] = useState(draft.safety.medications.join(", "));
  const [adverseEvents, setAdverseEvents] = useState(draft.safety.priorWeightCutAdverseEvents.join(", "));

  const updateAge = (value: string) => {
    setAgeText(value);
    const parsed = parseAge(value);
    if (parsed === null) {
      setStepError("Age is required for safety screening.");
      return;
    }
    updateDraft((current) => ({ ...current, safety: { ...current.safety, ageYears: parsed } }));
    setStepError(null);
  };
  const updateSafety = (updater: (current: OnboardingDraft) => OnboardingDraft) => {
    updateDraft(updater);
    setStepError(parseAge(ageText) === null ? "Age is required for safety screening." : null);
  };

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={screenStyles.sectionTitle}>Safety screening</Text>
      <Text style={screenStyles.subtle}>Missing safety data is unknown, not safe. Safety beats performance and weight-class pressure.</Text>
      <TextInput keyboardType="number-pad" onChangeText={updateAge} placeholder="Age" placeholderTextColor={colors.wrap} style={screenStyles.input} value={ageText} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {(["female", "male", "intersex", "prefer_not_to_say"] as const).map((option) => (
          <Toggle active={draft.safety.sexAtBirth === option} key={option} label={option.replace(/_/g, " ")} onPress={() => updateSafety((current) => ({ ...current, safety: { ...current.safety, sexAtBirth: option } }))} />
        ))}
      </View>
      <TextInput
        onChangeText={(value) => {
          setMedicalFlags(value);
          updateSafety((current) => ({ ...current, safety: { ...current.safety, medicalFlags: splitList(value) } }));
        }}
        placeholder="Medical flags, comma-separated"
        placeholderTextColor={colors.wrap}
        style={screenStyles.input}
        value={medicalFlags}
      />
      <TextInput
        onChangeText={(value) => {
          setMedications(value);
          updateSafety((current) => ({ ...current, safety: { ...current.safety, medications: splitList(value) } }));
        }}
        placeholder="Medications optional, comma-separated"
        placeholderTextColor={colors.wrap}
        style={screenStyles.input}
        value={medications}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {(["not_pregnant", "possible", "confirmed", "unknown"] as const).map((option) => (
          <Toggle active={draft.safety.pregnancyStatus === option} key={option} label={option.replace(/_/g, " ")} onPress={() => updateSafety((current) => ({ ...current, safety: { ...current.safety, pregnancyStatus: option } }))} />
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        <Toggle
          active={draft.safety.eatingDisorderRisk.activeConcern}
          label="Eating-disorder concern"
          onPress={() => updateSafety((current) => ({ ...current, safety: { ...current.safety, eatingDisorderRisk: { ...current.safety.eatingDisorderRisk, activeConcern: !current.safety.eatingDisorderRisk.activeConcern } } }))}
        />
        <Toggle
          active={draft.safety.eatingDisorderRisk.severeRestrictionHistory}
          label="Severe restriction history"
          onPress={() => updateSafety((current) => ({ ...current, safety: { ...current.safety, eatingDisorderRisk: { ...current.safety.eatingDisorderRisk, severeRestrictionHistory: !current.safety.eatingDisorderRisk.severeRestrictionHistory } } }))}
        />
        <Toggle
          active={draft.safety.eatingDisorderRisk.rapidWeightLossConcern}
          label="Rapid loss concern"
          onPress={() => updateSafety((current) => ({ ...current, safety: { ...current.safety, eatingDisorderRisk: { ...current.safety.eatingDisorderRisk, rapidWeightLossConcern: !current.safety.eatingDisorderRisk.rapidWeightLossConcern } } }))}
        />
      </View>
      <TextInput
        onChangeText={(value) => {
          setAdverseEvents(value);
          updateSafety((current) => ({ ...current, safety: { ...current.safety, priorWeightCutAdverseEvents: splitList(value) } }));
        }}
        placeholder="Prior adverse weight-cut events"
        placeholderTextColor={colors.wrap}
        style={screenStyles.input}
        value={adverseEvents}
      />
    </View>
  );
}
