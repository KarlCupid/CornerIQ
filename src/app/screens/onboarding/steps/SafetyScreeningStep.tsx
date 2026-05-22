import React, { useState } from "react";
import { Text, View } from "react-native";
import { spacing } from "../../../../design/theme";
import type { OnboardingDraft } from "../../../../services/supabase/onboardingService";
import { screenStyles } from "../../screenStyles";
import type { OnboardingStepProps } from "./BoxerBasicsStep";
import { ChipButton, FieldGroup, LabeledTextInput } from "./StepControls";

const safetyRestrictionOptions = [
  { label: "Clinician told me to avoid dehydration or weight cuts", value: "clinician_avoid_dehydration_or_weight_cuts" },
  { label: "Recent concussion or head injury concern", value: "recent_concussion_or_head_injury_concern" },
  { label: "Heart/breathing condition relevant to hard training", value: "heart_breathing_condition_hard_training" },
  { label: "Other clinician safety restriction", value: "other_clinician_safety_restriction" }
] as const;

const safetyRestrictionValues = new Set<string>(safetyRestrictionOptions.map((option) => option.value));

function splitList(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
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
  const [adverseEvents, setAdverseEvents] = useState(draft.safety.priorWeightCutAdverseEvents.join(", "));
  const selectedSafetyRestrictions = draft.safety.medicalFlags.filter((flag) => safetyRestrictionValues.has(flag));

  const updateAge = (value: string) => {
    setAgeText(value);
    const parsed = parseAge(value);
    if (parsed === null) {
      setStepError("Age is required for safety screening.");
      return;
    }
    updateDraft((current) => ({ ...current, safety: { ...current.safety, ageYears: parsed, medications: [] } }));
    setStepError(null);
  };
  const updateSafety = (updater: (current: OnboardingDraft) => OnboardingDraft) => {
    updateDraft((current) => {
      const next = updater(current);
      return { ...next, safety: { ...next.safety, medications: [] } };
    });
    setStepError(parseAge(ageText) === null ? "Age is required for safety screening." : null);
  };
  const toggleSafetyRestriction = (value: string) => {
    const nextFlags = selectedSafetyRestrictions.includes(value) ? selectedSafetyRestrictions.filter((item) => item !== value) : [...selectedSafetyRestrictions, value];
    updateSafety((current) => ({ ...current, safety: { ...current.safety, medicalFlags: nextFlags } }));
  };
  const selectSexAtBirth = (sexAtBirth: NonNullable<OnboardingDraft["safety"]["sexAtBirth"]>) => {
    updateSafety((current) => ({
      ...current,
      safety: {
        ...current.safety,
        sexAtBirth,
        pregnancyStatus: sexAtBirth === "male" ? undefined : current.safety.pregnancyStatus ?? "unknown"
      }
    }));
  };
  const showPregnancyChoices = draft.safety.sexAtBirth !== "male";

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={screenStyles.sectionTitle}>Safety screening</Text>
      <Text style={screenStyles.subtle}>Only answer what applies. This is for safety context, not judgment. Missing safety data is unknown, not safe.</Text>
      <LabeledTextInput
        example="25"
        helper="Used for youth and masters safety rules."
        keyboardType="number-pad"
        label="Age"
        onChangeText={updateAge}
        placeholder="Age"
        value={ageText}
      />
      <FieldGroup helper="Used only for safety rules that depend on sex-at-birth context. Prefer not to say is valid." label="Sex at birth">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {(["female", "male", "intersex", "prefer_not_to_say"] as const).map((option) => (
            <ChipButton active={draft.safety.sexAtBirth === option} key={option} label={option === "prefer_not_to_say" ? "Prefer not to say" : option} onPress={() => selectSexAtBirth(option)} />
          ))}
        </View>
      </FieldGroup>
      <FieldGroup helper="Only add safety restrictions that should make the engine more conservative." label="Medical safety restrictions">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {safetyRestrictionOptions.map((option) => (
            <ChipButton active={selectedSafetyRestrictions.includes(option.value)} key={option.value} label={option.label} onPress={() => toggleSafetyRestriction(option.value)} />
          ))}
        </View>
      </FieldGroup>
      {showPregnancyChoices ? (
        <FieldGroup helper="Optional. Choose unknown if it does not apply or you do not want to answer." label="Pregnancy safety context">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {(["not_pregnant", "possible", "confirmed", "unknown"] as const).map((option) => (
              <ChipButton active={draft.safety.pregnancyStatus === option} key={option} label={option.replace(/_/g, " ")} onPress={() => updateSafety((current) => ({ ...current, safety: { ...current.safety, pregnancyStatus: option } }))} />
            ))}
          </View>
        </FieldGroup>
      ) : (
        <Text style={screenStyles.subtle}>Pregnancy-specific choices are hidden for male sex-at-birth selection. Change the sex-at-birth selection if that safety context applies.</Text>
      )}
      <FieldGroup helper="Optional safety flags. These never create weight-class pressure; they only make the engine more conservative." label="Eating and weight-cut risk context">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <ChipButton
            active={draft.safety.eatingDisorderRisk.activeConcern}
            label="Active eating concern"
            onPress={() => updateSafety((current) => ({ ...current, safety: { ...current.safety, eatingDisorderRisk: { ...current.safety.eatingDisorderRisk, activeConcern: !current.safety.eatingDisorderRisk.activeConcern } } }))}
          />
          <ChipButton
            active={draft.safety.eatingDisorderRisk.severeRestrictionHistory}
            label="Severe restriction history"
            onPress={() => updateSafety((current) => ({ ...current, safety: { ...current.safety, eatingDisorderRisk: { ...current.safety.eatingDisorderRisk, severeRestrictionHistory: !current.safety.eatingDisorderRisk.severeRestrictionHistory } } }))}
          />
          <ChipButton
            active={draft.safety.eatingDisorderRisk.rapidWeightLossConcern}
            label="Rapid loss concern"
            onPress={() => updateSafety((current) => ({ ...current, safety: { ...current.safety, eatingDisorderRisk: { ...current.safety.eatingDisorderRisk, rapidWeightLossConcern: !current.safety.eatingDisorderRisk.rapidWeightLossConcern } } }))}
          />
        </View>
      </FieldGroup>
      <LabeledTextInput
        helper="Optional. Note past fainting, dizziness, illness, or other adverse reactions during a previous cut."
        label="Prior adverse weight-cut events (optional notes)"
        onChangeText={(value) => {
          setAdverseEvents(value);
          updateSafety((current) => ({ ...current, safety: { ...current.safety, priorWeightCutAdverseEvents: splitList(value) } }));
        }}
        placeholder="Prior adverse weight-cut events"
        value={adverseEvents}
      />
    </View>
  );
}
