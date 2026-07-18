import React from "react";
import { Text, View } from "react-native";
import { LuminousProgressBar, LuminousScreen } from "../../../design/components/LuminousScreen";
import { PremiumButton, PremiumCard, PremiumIconBadge } from "../../../design/components/PremiumPrimitives";
import { colors, radii, spacing } from "../../../design/theme";
import { fontFamilies } from "../../../design/typography";
import type { ISODateString } from "../../../engine/core/types";
import { useOnboardingDraft } from "../../../hooks/useOnboardingDraft";
import type { OnboardingCompletionResult, OnboardingDraft } from "../../../services/supabase/onboardingService";
import { screenStyles } from "../screenStyles";
import { BasicInformationStep } from "./steps/BasicInformationStep";
import { BoxerBasicsStep } from "./steps/BoxerBasicsStep";
import { CycleSupportStep } from "./steps/CycleSupportStep";
import { GoalPhaseStep } from "./steps/GoalPhaseStep";
import { ProtectedScheduleStep } from "./steps/ProtectedScheduleStep";
import { TrainingAccessStep } from "./steps/TrainingAccessStep";

export interface OnboardingScreenProps {
  asOfDate: ISODateString;
  busy: boolean;
  demoShortcutEnabled?: boolean | undefined;
  message: string | null;
  onComplete: (draft: OnboardingDraft) => Promise<OnboardingCompletionResult>;
  onCreateDemoProfile?: (() => void) | undefined;
  onSignOut: () => Promise<void>;
  userId: string;
}

function stepWhy(stepIndex: number): string {
  switch (stepIndex) {
    case 0:
      return "Start with the information CornerIQ uses in training and fuel calculations.";
    case 1:
      return "Tell us where you are in boxing right now.";
    case 2:
      return "Choose the days and equipment CornerIQ can use.";
    case 3:
      return "Add workouts already set by you, your coach, or your gym.";
    case 4:
      return "Cycle support is optional and can be changed later.";
    default:
      return "Choose what CornerIQ should plan for first.";
  }
}

function goalSummary(draft: OnboardingDraft): string {
  if (draft.goal.phase === "fight_known") {
    return `Finishing setup will save a tentative fight context for ${draft.goal.fight.boutDate} at ${draft.goal.fight.contractedWeightKg} kg. Weigh-in timing: ${draft.goal.fight.weighInType.replace(/_/g, " ")}.`;
  }
  if (draft.goal.phase === "tournament_known") {
    return `Finishing setup will save tournament context from ${draft.goal.tournament.tournamentStartDate} to ${draft.goal.tournament.tournamentEndDate}. The strategy stays conservative until real details are known.`;
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
    <PremiumCard accent="neutral" density="spacious" testID="onboarding-setup-header">
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md }}>
        <PremiumIconBadge icon="shield-checkmark-outline" tone="neutral" />
        <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
          <Text style={{ color: colors.mutedText, fontFamily: fontFamilies.black, fontSize: 11, fontWeight: "900", lineHeight: 15, textTransform: "uppercase" }}>
            Setup
          </Text>
          <Text adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={1} style={{ color: colors.canvas, fontFamily: fontFamilies.extraBold, fontSize: 30, fontWeight: "800", lineHeight: 35 }}>
            CornerIQ setup
          </Text>
        </View>
        <View
          accessibilityLabel={`Setup step ${stepIndex + 1} of ${stepTotal}`}
          style={{
            alignItems: "center",
            backgroundColor: "rgba(169, 185, 207, 0.1)",
            borderColor: "rgba(232, 240, 255, 0.16)",
            borderRadius: radii.pill,
            borderWidth: 1,
            justifyContent: "center",
            minHeight: 34,
            minWidth: 58,
            paddingHorizontal: spacing.sm
          }}
        >
          <Text style={{ color: colors.wrap, fontFamily: fontFamilies.bold, fontSize: 12, fontWeight: "700", lineHeight: 16 }}>
            {stepIndex + 1}/{stepTotal}
          </Text>
        </View>
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
    </PremiumCard>
  );
}

export function OnboardingScreen({ asOfDate, busy, demoShortcutEnabled = false, message, onComplete, onCreateDemoProfile, onSignOut, userId }: OnboardingScreenProps) {
  const onboarding = useOnboardingDraft(asOfDate, userId);
  const stepProps = { draft: onboarding.draft, setStepError: onboarding.setStepError, updateDraft: onboarding.updateDraft };
  const step = (() => {
    switch (onboarding.stepIndex) {
      case 0:
        return <BasicInformationStep {...stepProps} />;
      case 1:
        return <BoxerBasicsStep {...stepProps} />;
      case 2:
        return <TrainingAccessStep {...stepProps} />;
      case 3:
        return <ProtectedScheduleStep {...stepProps} />;
      case 4:
        return <CycleSupportStep {...stepProps} />;
      default:
        return <GoalPhaseStep {...stepProps} />;
    }
  })();
  const showStorageStatus = /resume setup|unavailable/i.test(onboarding.storageStatus);

  return (
    <LuminousScreen accent="neutral" bottomInset="none" testID="onboarding-screen">
      <OnboardingHeader stepIndex={onboarding.stepIndex} stepLabel={onboarding.stepLabel ?? "Boxer basics"} stepTotal={onboarding.stepTotal} />
      <PremiumCard accent="neutral" density="spacious" testID="onboarding-step-card">
        <View style={{ gap: spacing.lg }}>
          <Text style={screenStyles.subtle}>{stepWhy(onboarding.stepIndex)}</Text>
          {showStorageStatus ? <Text style={screenStyles.subtle}>{onboarding.storageStatus}</Text> : null}
          {message ? <Text style={[screenStyles.subtle, { color: colors.amberCaution }]}>{message}</Text> : null}
          {onboarding.stepError ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{onboarding.stepError}</Text> : null}
          {step}
          {onboarding.isLastStep ? <Text style={screenStyles.callout}>{goalSummary(onboarding.draft)}</Text> : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {!onboarding.isFirstStep ? (
              <View style={{ flexBasis: 120, flexGrow: 1 }}>
                <PremiumButton accessibilityLabel="Back to previous setup step" disabled={busy} icon="chevron-back-outline" label="Back" onPress={onboarding.back} tone="neutral" variant="quiet" />
              </View>
            ) : null}
            {onboarding.isLastStep ? (
              <View style={{ flexBasis: 156, flexGrow: 1 }}>
                <PremiumButton
                  accessibilityLabel="Finish boxer setup"
                  disabled={busy}
                  icon="checkmark-outline"
                  label={busy ? "Saving..." : "Finish setup"}
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
                  tone="neutral"
                />
              </View>
            ) : (
              <View style={{ flexBasis: 156, flexGrow: 1 }}>
                <PremiumButton accessibilityLabel="Next setup step" disabled={busy} icon="arrow-forward-outline" label="Next" onPress={onboarding.next} tone="neutral" />
              </View>
            )}
          </View>
          {demoShortcutEnabled && onCreateDemoProfile ? (
            <PremiumButton accessibilityLabel="Create safe demo boxer" disabled={busy} icon="flask-outline" label="Development shortcut: create safe demo boxer" onPress={onCreateDemoProfile} tone="neutral" variant="quiet" />
          ) : null}
          <PremiumButton accessibilityLabel="Sign out of onboarding" disabled={busy} icon="log-out-outline" label="Sign out" onPress={() => void onSignOut()} tone="neutral" variant="quiet" />
        </View>
      </PremiumCard>
    </LuminousScreen>
  );
}
