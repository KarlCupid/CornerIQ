import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { EngineCard } from "../../../design/components/EngineCard";
import { colors, spacing } from "../../../design/theme";
import type { ISODateString } from "../../../engine/core/types";
import { useOnboardingDraft } from "../../../hooks/useOnboardingDraft";
import type { OnboardingDraft } from "../../../services/supabase/onboardingService";
import { screenStyles } from "../screenStyles";
import { BodyMassStep } from "./steps/BodyMassStep";
import { BoxerBasicsStep } from "./steps/BoxerBasicsStep";
import { CycleSupportStep } from "./steps/CycleSupportStep";
import { GoalPhaseStep } from "./steps/GoalPhaseStep";
import { ProtectedScheduleStep } from "./steps/ProtectedScheduleStep";
import { SafetyScreeningStep } from "./steps/SafetyScreeningStep";
import { TrainingAccessStep } from "./steps/TrainingAccessStep";
import { WearablePreferenceStep } from "./steps/WearablePreferenceStep";

export interface OnboardingScreenProps {
  asOfDate: ISODateString;
  busy: boolean;
  message: string | null;
  onComplete: (draft: OnboardingDraft) => Promise<void>;
  onCreateDemoProfile: () => void;
}

export function OnboardingScreen({ asOfDate, busy, message, onComplete, onCreateDemoProfile }: OnboardingScreenProps) {
  const onboarding = useOnboardingDraft(asOfDate);
  const stepProps = { draft: onboarding.draft, updateDraft: onboarding.updateDraft };
  const step = (() => {
    switch (onboarding.stepIndex) {
      case 0:
        return <BoxerBasicsStep {...stepProps} />;
      case 1:
        return <BodyMassStep {...stepProps} />;
      case 2:
        return <TrainingAccessStep {...stepProps} />;
      case 3:
        return <ProtectedScheduleStep {...stepProps} />;
      case 4:
        return <CycleSupportStep {...stepProps} />;
      case 5:
        return <WearablePreferenceStep {...stepProps} />;
      case 6:
        return <SafetyScreeningStep {...stepProps} />;
      default:
        return <GoalPhaseStep {...stepProps} />;
    }
  })();

  return (
    <ScrollView style={screenStyles.screen} contentContainerStyle={screenStyles.content}>
      <Text style={screenStyles.title}>Boxer setup</Text>
      <EngineCard>
        <View style={{ gap: spacing.md }}>
          <Text style={screenStyles.callout}>
            Step {onboarding.stepIndex + 1} of {onboarding.stepTotal}: {onboarding.stepLabel}
          </Text>
          {message ? <Text style={[screenStyles.subtle, { color: colors.amberCaution }]}>{message}</Text> : null}
          {step}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {!onboarding.isFirstStep ? (
              <Pressable accessibilityRole="button" disabled={busy} onPress={onboarding.back} style={screenStyles.quietButton}>
                <Text style={screenStyles.quietButtonText}>Back</Text>
              </Pressable>
            ) : null}
            {onboarding.isLastStep ? (
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => void onComplete(onboarding.draft)} style={screenStyles.button}>
                <Text style={screenStyles.buttonText}>{busy ? "Saving..." : "Finish setup"}</Text>
              </Pressable>
            ) : (
              <Pressable accessibilityRole="button" disabled={busy} onPress={onboarding.next} style={screenStyles.button}>
                <Text style={screenStyles.buttonText}>Next</Text>
              </Pressable>
            )}
          </View>
          <Pressable accessibilityRole="button" disabled={busy} onPress={onCreateDemoProfile} style={screenStyles.quietButton}>
            <Text style={screenStyles.quietButtonText}>Create safe demo boxer profile</Text>
          </Pressable>
        </View>
      </EngineCard>
    </ScrollView>
  );
}
