import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { colors, spacing } from "../../../../design/theme";
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

export function SafetyScreeningStep({ draft, updateDraft }: OnboardingStepProps) {
  const [medicalFlags, setMedicalFlags] = useState(draft.safety.medicalFlags.join(", "));
  const [medications, setMedications] = useState(draft.safety.medications.join(", "));
  const [adverseEvents, setAdverseEvents] = useState(draft.safety.priorWeightCutAdverseEvents.join(", "));

  const updateAge = (value: string) => {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      updateDraft((current) => ({ ...current, safety: { ...current.safety, ageYears: Math.round(parsed) } }));
    }
  };

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={screenStyles.sectionTitle}>Safety screening</Text>
      <Text style={screenStyles.subtle}>Missing safety data is unknown, not safe. Safety beats performance and weight-class pressure.</Text>
      <TextInput keyboardType="number-pad" onChangeText={updateAge} placeholder="Age" placeholderTextColor={colors.wrap} style={screenStyles.input} value={`${draft.safety.ageYears}`} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {(["female", "male", "intersex", "prefer_not_to_say"] as const).map((option) => (
          <Toggle active={draft.safety.sexAtBirth === option} key={option} label={option.replace(/_/g, " ")} onPress={() => updateDraft((current) => ({ ...current, safety: { ...current.safety, sexAtBirth: option } }))} />
        ))}
      </View>
      <TextInput
        onChangeText={(value) => {
          setMedicalFlags(value);
          updateDraft((current) => ({ ...current, safety: { ...current.safety, medicalFlags: splitList(value) } }));
        }}
        placeholder="Medical flags, comma-separated"
        placeholderTextColor={colors.wrap}
        style={screenStyles.input}
        value={medicalFlags}
      />
      <TextInput
        onChangeText={(value) => {
          setMedications(value);
          updateDraft((current) => ({ ...current, safety: { ...current.safety, medications: splitList(value) } }));
        }}
        placeholder="Medications optional, comma-separated"
        placeholderTextColor={colors.wrap}
        style={screenStyles.input}
        value={medications}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {(["not_pregnant", "possible", "confirmed", "unknown"] as const).map((option) => (
          <Toggle active={draft.safety.pregnancyStatus === option} key={option} label={option.replace(/_/g, " ")} onPress={() => updateDraft((current) => ({ ...current, safety: { ...current.safety, pregnancyStatus: option } }))} />
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        <Toggle
          active={draft.safety.eatingDisorderRisk.activeConcern}
          label="Eating-disorder concern"
          onPress={() => updateDraft((current) => ({ ...current, safety: { ...current.safety, eatingDisorderRisk: { ...current.safety.eatingDisorderRisk, activeConcern: !current.safety.eatingDisorderRisk.activeConcern } } }))}
        />
        <Toggle
          active={draft.safety.eatingDisorderRisk.severeRestrictionHistory}
          label="Severe restriction history"
          onPress={() => updateDraft((current) => ({ ...current, safety: { ...current.safety, eatingDisorderRisk: { ...current.safety.eatingDisorderRisk, severeRestrictionHistory: !current.safety.eatingDisorderRisk.severeRestrictionHistory } } }))}
        />
        <Toggle
          active={draft.safety.eatingDisorderRisk.rapidWeightLossConcern}
          label="Rapid loss concern"
          onPress={() => updateDraft((current) => ({ ...current, safety: { ...current.safety, eatingDisorderRisk: { ...current.safety.eatingDisorderRisk, rapidWeightLossConcern: !current.safety.eatingDisorderRisk.rapidWeightLossConcern } } }))}
        />
      </View>
      <TextInput
        onChangeText={(value) => {
          setAdverseEvents(value);
          updateDraft((current) => ({ ...current, safety: { ...current.safety, priorWeightCutAdverseEvents: splitList(value) } }));
        }}
        placeholder="Prior adverse weight-cut events"
        placeholderTextColor={colors.wrap}
        style={screenStyles.input}
        value={adverseEvents}
      />
    </View>
  );
}
