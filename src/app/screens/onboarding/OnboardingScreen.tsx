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

function stepWhy(stepIndex: number): string {
  switch (stepIndex) {
    case 0:
      return "Required: boxing status, level, and training age help the engine avoid broad combat-sport defaults.";
    case 1:
      return "Required: body mass, walk-around weight, and height anchor weight-class safety without assuming missing data is safe.";
    case 2:
      return "Required: equipment and availability can be simple. none/bodyweight is valid if that is the setup.";
    case 3:
      return "Optional but recommended: protected anchors tell CornerIQ what boxing work must stay first.";
    case 4:
      return "Required choice, optional tracking: cycle support is private, symptom-aware, and not fertility tracking.";
    case 5:
      return "Required choice: manual-only is complete. Wearables only raise confidence when fresh and consistent.";
    case 6:
      return "Required: safety screening blocks unsafe weight pressure and flags professional-review needs.";
    default:
      return "Required: choose build, fight, tournament, or recovery so Today and Plan can explain their priorities.";
  }
}

function goalSummary(draft: OnboardingDraft): string {
  if (draft.goal.phase === "fight_known") {
    return `Summary: fight setup for ${draft.goal.fight.boutDate}, ${draft.goal.fight.contractedWeightKg} kg, weigh-in ${draft.goal.fight.weighInType.replace(/_/g, " ")}.`;
  }
  if (draft.goal.phase === "tournament_known") {
    return `Summary: tournament from ${draft.goal.tournament.tournamentStartDate} to ${draft.goal.tournament.tournamentEndDate}; strategy stays near weight.`;
  }
  if (draft.goal.phase === "maintenance_recovery") {
    return "Summary: recovery/maintenance phase. Safety and consistency stay ahead of pressure.";
  }
  return "Summary: build phase. The engine will protect boxing anchors and fill support work around them.";
}

export function OnboardingScreen({ asOfDate, busy, message, onComplete, onCreateDemoProfile }: OnboardingScreenProps) {
  const onboarding = useOnboardingDraft(asOfDate);
  const stepProps = { draft: onboarding.draft, setStepError: onboarding.setStepError, updateDraft: onboarding.updateDraft };
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
          <Text style={screenStyles.subtle}>{stepWhy(onboarding.stepIndex)}</Text>
          <Text style={screenStyles.subtle}>{onboarding.storageStatus}</Text>
          {message ? <Text style={[screenStyles.subtle, { color: colors.amberCaution }]}>{message}</Text> : null}
          {onboarding.stepError ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{onboarding.stepError}</Text> : null}
          {step}
          {onboarding.isLastStep ? <Text style={screenStyles.callout}>{goalSummary(onboarding.draft)}</Text> : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {!onboarding.isFirstStep ? (
              <Pressable accessibilityRole="button" disabled={busy} onPress={onboarding.back} style={screenStyles.quietButton}>
                <Text style={screenStyles.quietButtonText}>Back</Text>
              </Pressable>
            ) : null}
            {onboarding.isLastStep ? (
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => {
                  if (!onboarding.validateCurrentStep()) {
                    void onComplete(onboarding.draft);
                  }
                }}
                style={screenStyles.button}
              >
                <Text style={screenStyles.buttonText}>{busy ? "Saving..." : "Finish setup"}</Text>
              </Pressable>
            ) : (
              <Pressable accessibilityRole="button" disabled={busy} onPress={onboarding.next} style={screenStyles.button}>
                <Text style={screenStyles.buttonText}>Next</Text>
              </Pressable>
            )}
          </View>
          <Pressable accessibilityRole="button" disabled={busy} onPress={onCreateDemoProfile} style={screenStyles.quietButton}>
            <Text style={screenStyles.quietButtonText}>Development shortcut: create safe demo boxer</Text>
          </Pressable>
        </View>
      </EngineCard>
    </ScrollView>
  );
}
