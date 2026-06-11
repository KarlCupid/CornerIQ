import React from "react";
import { Pressable, Text, View } from "react-native";
import { EngineCard } from "../../../design/components/EngineCard";
import { LuminousProgressBar, LuminousScreen, ScreenHeader } from "../../../design/components/LuminousScreen";
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
  demoShortcutEnabled?: boolean | undefined;
  message: string | null;
  onComplete: (draft: OnboardingDraft) => Promise<void>;
  onCreateDemoProfile: () => void;
}

function stepWhy(stepIndex: number): string {
  switch (stepIndex) {
    case 0:
      return "Required: boxing status, level, and training age help the engine avoid broad combat-sport defaults.";
    case 1:
      return "Required: body weight, walk-around weight, and height anchor weight-class safety without treating missing data as safe.";
    case 2:
      return "Required: equipment and availability can be simple. none/bodyweight is valid if that is the setup.";
    case 3:
      return "Optional but recommended: boxing sessions you add tell CornerIQ what work must stay first.";
    case 4:
      return "Required choice, optional tracking: cycle support is private, symptom-aware, and not fertility tracking.";
    case 5:
      return "Required choice: manual-only is complete. Wearables only raise confidence when fresh and consistent.";
    case 6:
      return "Required: safety screening blocks unsafe weight pressure and flags outside-support needs.";
    default:
      return "Required: choose build, fight, tournament, or recovery so Today and Plan can explain their priorities.";
  }
}

function goalSummary(draft: OnboardingDraft): string {
  if (draft.goal.phase === "fight_known") {
    return `Finishing setup will save a tentative fight context for ${draft.goal.fight.boutDate} at ${draft.goal.fight.contractedWeightKg} kg. Weigh-in timing: ${draft.goal.fight.weighInType.replace(/_/g, " ")}.`;
  }
  if (draft.goal.phase === "tournament_known") {
    return `Finishing setup will save tournament context from ${draft.goal.tournament.tournamentStartDate} to ${draft.goal.tournament.tournamentEndDate}. The strategy stays conservative until real details are known.`;
  }
  if (draft.goal.phase === "maintenance_recovery") {
    return "Finishing setup will start a maintenance/recovery phase. Safety and consistency stay ahead of performance or weight-class pressure.";
  }
  return "Finishing setup will start a build phase. CornerIQ will protect boxing sessions and place support workouts around them.";
}

export function OnboardingScreen({ asOfDate, busy, demoShortcutEnabled = false, message, onComplete, onCreateDemoProfile }: OnboardingScreenProps) {
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
    <LuminousScreen bottomInset="none" testID="onboarding-screen">
      <ScreenHeader title="Boxer setup" />
      <View style={{ gap: spacing.sm }}>
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md }}>
          <View style={screenStyles.headerPill}>
            <Text style={screenStyles.headerPillText}>STEP {onboarding.stepIndex + 1} OF {onboarding.stepTotal}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <LuminousProgressBar progress={(onboarding.stepIndex + 1) / onboarding.stepTotal} />
          </View>
        </View>
      </View>
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
              <Pressable accessibilityLabel="Back to previous setup step" accessibilityRole="button" disabled={busy} onPress={onboarding.back} style={screenStyles.quietButton}>
                <Text style={screenStyles.quietButtonText}>Back</Text>
              </Pressable>
            ) : null}
            {onboarding.isLastStep ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Finish boxer setup"
                disabled={busy}
                onPress={() => {
                  if (!onboarding.validateCurrentStep()) {
                    void onComplete(onboarding.draft).then(onboarding.clearDraft);
                  }
                }}
                style={screenStyles.button}
              >
                <Text style={screenStyles.buttonText}>{busy ? "Saving..." : "Finish setup"}</Text>
              </Pressable>
            ) : (
              <Pressable accessibilityLabel="Next setup step" accessibilityRole="button" disabled={busy} onPress={onboarding.next} style={screenStyles.button}>
                <Text style={screenStyles.buttonText}>Next</Text>
              </Pressable>
            )}
          </View>
          {demoShortcutEnabled ? (
            <Pressable accessibilityLabel="Create safe demo boxer" accessibilityRole="button" disabled={busy} onPress={onCreateDemoProfile} style={screenStyles.quietButton}>
              <Text style={screenStyles.quietButtonText}>Development shortcut: create safe demo boxer</Text>
            </Pressable>
          ) : null}
        </View>
      </EngineCard>
    </LuminousScreen>
  );
}
