import React from "react";
import { Pressable, Text, View } from "react-native";
import { EngineCard } from "../../../design/components/EngineCard";
import { LuminousProgressBar, LuminousScreen } from "../../../design/components/LuminousScreen";
import { colors, radii, spacing } from "../../../design/theme";
import type { ISODateString } from "../../../engine/core/types";
import { useOnboardingDraft } from "../../../hooks/useOnboardingDraft";
import type { OnboardingCompletionResult, OnboardingDraft } from "../../../services/supabase/onboardingService";
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
  onComplete: (draft: OnboardingDraft) => Promise<OnboardingCompletionResult>;
  onCreateDemoProfile: () => void;
  onSignOut: () => Promise<void>;
  userId: string;
}

function stepWhy(stepIndex: number): string {
  switch (stepIndex) {
    case 0:
      return "Boxing status, level, and ring age keep training boxing-specific.";
    case 1:
      return "Body data anchors safety. Missing values stay unknown.";
    case 2:
      return "Equipment and availability can be simple. Bodyweight-only is valid.";
    case 3:
      return "Add fixed boxing sessions so support work stays second.";
    case 4:
      return "Cycle support is optional, private, and symptom-aware.";
    case 5:
      return "Manual-only is complete. Fresh wearables only raise confidence.";
    case 6:
      return "Safety screening blocks unsafe weight pressure.";
    default:
      return "Choose the phase Today and Plan should prioritize.";
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

function OnboardingHeader({
  stepIndex,
  stepLabel,
  stepTotal
}: {
  stepIndex: number;
  stepLabel: string;
  stepTotal: number;
}) {
  return (
    <View style={{ gap: spacing.sm, paddingTop: spacing.xs }}>
      <View style={{ alignItems: "flex-start", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }}>
        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <Text style={{ color: colors.mutedText, fontSize: 11, fontWeight: "900", lineHeight: 15 }}>
            BOXER SETUP
          </Text>
          <Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={1} style={{ color: colors.canvas, fontSize: 30, fontWeight: "900", lineHeight: 36 }}>
            Boxer setup
          </Text>
        </View>
        <Text style={{ color: colors.mutedText, fontSize: 12, fontWeight: "800", lineHeight: 16, paddingTop: 3 }}>
          {stepIndex + 1}/{stepTotal}
        </Text>
      </View>
      <LuminousProgressBar accent="neutral" progress={(stepIndex + 1) / stepTotal} />
      <View
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.055)",
          borderColor: "rgba(169, 185, 207, 0.16)",
          borderRadius: radii.tile,
          borderWidth: 1,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm
        }}
      >
        <Text style={{ color: colors.wrap, fontSize: 13, fontWeight: "700", lineHeight: 18 }}>
          {stepLabel}
        </Text>
      </View>
    </View>
  );
}

export function OnboardingScreen({ asOfDate, busy, demoShortcutEnabled = false, message, onComplete, onCreateDemoProfile, onSignOut, userId }: OnboardingScreenProps) {
  const onboarding = useOnboardingDraft(asOfDate, userId);
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
  const showStorageStatus = /resume setup|unavailable/i.test(onboarding.storageStatus);

  return (
    <LuminousScreen accent="neutral" bottomInset="none" testID="onboarding-screen">
      <OnboardingHeader stepIndex={onboarding.stepIndex} stepLabel={onboarding.stepLabel ?? "Boxer basics"} stepTotal={onboarding.stepTotal} />
      <EngineCard>
        <View style={{ gap: spacing.md }}>
          <Text style={screenStyles.subtle}>{stepWhy(onboarding.stepIndex)}</Text>
          {showStorageStatus ? <Text style={screenStyles.subtle}>{onboarding.storageStatus}</Text> : null}
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
                  const error = onboarding.validateCurrentStep();
                  if (!error) {
                    void (async () => {
                      try {
                        const result = await onComplete(onboarding.draft);
                        if (result.status === "saved") {
                          await onboarding.clearDraft();
                          return;
                        }
                        onboarding.setStepError(result.message);
                      } catch (failure) {
                        onboarding.setStepError(failure instanceof Error ? failure.message : "Onboarding failed.");
                      }
                    })();
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
          <Pressable accessibilityLabel="Sign out of onboarding" accessibilityRole="button" disabled={busy} onPress={() => void onSignOut()} style={screenStyles.quietButton}>
            <Text style={screenStyles.quietButtonText}>Sign out</Text>
          </Pressable>
        </View>
      </EngineCard>
    </LuminousScreen>
  );
}
