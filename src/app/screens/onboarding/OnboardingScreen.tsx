import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { ImageBackground, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import onboardingChampionshipBackground from "../../../../assets/backgrounds/onboarding-championship-ring.png";
import { spacing } from "../../../design/theme";
import { fontFamilies } from "../../../design/typography";
import type { ISODateString } from "../../../engine/core/types";
import { useOnboardingDraft } from "../../../hooks/useOnboardingDraft";
import type { OnboardingCompletionResult, OnboardingDraft } from "../../../services/supabase/onboardingService";
import { BasicInformationStep } from "./steps/BasicInformationStep";
import { BoxerBasicsStep } from "./steps/BoxerBasicsStep";
import { CycleSupportStep } from "./steps/CycleSupportStep";
import { GoalPhaseStep } from "./steps/GoalPhaseStep";
import { ProtectedScheduleStep } from "./steps/ProtectedScheduleStep";
import { TrainingAccessStep } from "./steps/TrainingAccessStep";
import { onboardingColors, onboardingStyles } from "./onboardingTheme";

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
      return "Tell us the basics CornerIQ uses to personalize your training.";
    case 1:
      return "Tell us where you are in boxing right now.";
    case 2:
      return "Choose the days CornerIQ can place a workout.";
    case 3:
      return "Add the recurring workouts already set by you, your coach, or your gym. CornerIQ will plan around them.";
    case 4:
      return "Optional, private support you can change at any time.";
    default:
      return "Choose what CornerIQ should plan for first.";
  }
}

function goalSummary(draft: OnboardingDraft): string {
  if (draft.goal.phase === "fight_known") {
    return `Finishing setup will save a tentative fight context for ${draft.goal.fight.boutDate} at ${draft.goal.fight.contractedWeightKg} kg. Weigh-in timing: ${draft.goal.fight.weighInType.replace(/_/g, " ")}.`;
  }
  if (draft.goal.phase === "tournament_known") {
    return `Finishing setup will save tournament context from ${draft.goal.tournament.tournamentStartDate} to ${draft.goal.tournament.tournamentEndDate}.`;
  }
  return "Finishing setup will start a build phase. CornerIQ will protect your boxing sessions and place support work around them.";
}

function OnboardingHeader({
  stepIndex,
  stepLabel,
  stepTotal,
  topInset,
  busy,
  onSignOut
}: {
  busy: boolean;
  onSignOut: () => Promise<void>;
  stepIndex: number;
  stepLabel: string;
  stepTotal: number;
  topInset: number;
}) {
  const titleSize = stepLabel.length > 24 ? 43 : stepLabel.length > 18 ? 48 : 54;

  return (
    <ImageBackground
      accessibilityLabel={`${stepLabel} setup header`}
      resizeMode="cover"
      source={onboardingChampionshipBackground}
      style={{ minHeight: 320, paddingBottom: spacing.xxl, paddingHorizontal: 22, paddingTop: Math.max(topInset + spacing.sm, spacing.lg) }}
      testID="onboarding-setup-header"
    >
      <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
        <View accessible accessibilityLabel="CornerIQ setup" style={{ alignItems: "flex-start" }}>
        <Text style={{ color: onboardingColors.ink, fontFamily: fontFamilies.extraBold, fontSize: 30, fontWeight: "800", letterSpacing: -1, lineHeight: 36 }}>
          Corner<Text style={{ color: onboardingColors.cyan }}>IQ</Text>
        </Text>
        </View>
        <Pressable
          accessibilityLabel="Sign out of onboarding"
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={() => void onSignOut()}
          style={{ alignItems: "center", justifyContent: "center", minHeight: 44, minWidth: 44 }}
        >
          <Ionicons color={onboardingColors.ink} name="log-out-outline" size={22} />
        </Pressable>
      </View>
      <View style={{ gap: spacing.sm, marginTop: 28, width: "55%" }}>
        <Text style={{ color: onboardingColors.ink, fontFamily: fontFamilies.medium, fontSize: 16, fontWeight: "500", lineHeight: 21 }}>
          Step {stepIndex + 1} of {stepTotal}
        </Text>
        <View
          accessibilityLabel={`${Math.round(((stepIndex + 1) / stepTotal) * 100)} percent complete`}
          style={{ backgroundColor: "rgba(8, 11, 14, 0.14)", borderRadius: 999, height: 5, overflow: "hidden", width: "100%" }}
        >
          <View style={{ backgroundColor: onboardingColors.cyan, borderRadius: 999, height: "100%", width: `${((stepIndex + 1) / stepTotal) * 100}%` }} />
        </View>
      </View>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.78}
        numberOfLines={3}
        style={{
          color: onboardingColors.ink,
          fontFamily: fontFamilies.display,
          fontSize: titleSize,
          fontWeight: "400",
          includeFontPadding: true,
          letterSpacing: 0.2,
          lineHeight: titleSize * 1.06,
          marginTop: spacing.lg,
          maxWidth: 282,
          textTransform: "uppercase"
        }}
      >
        {stepLabel}
      </Text>
      <Text style={{ color: onboardingColors.canvasMuted, fontFamily: fontFamilies.regular, fontSize: 16, fontWeight: "400", lineHeight: 22, marginTop: spacing.sm, maxWidth: 245 }}>
        {stepWhy(stepIndex)}
      </Text>
    </ImageBackground>
  );
}

function NavigationButton({
  accessibilityLabel,
  disabled,
  icon,
  label,
  onPress,
  primary = false
}: {
  accessibilityLabel: string;
  disabled: boolean;
  icon: "arrow-back" | "arrow-forward" | "checkmark";
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: primary ? (pressed ? onboardingColors.cyanPressed : onboardingColors.cyan) : pressed ? "rgba(241, 234, 223, 0.08)" : "transparent",
        borderColor: primary ? onboardingColors.cyan : onboardingColors.hairline,
        borderRadius: 5,
        borderWidth: 1,
        flex: primary ? 1.65 : 1,
        flexDirection: icon === "arrow-back" ? "row" : "row-reverse",
        gap: spacing.md,
        justifyContent: "center",
        minHeight: 56,
        opacity: disabled ? 0.5 : 1,
        paddingHorizontal: spacing.lg
      })}
    >
      <Ionicons color={primary ? onboardingColors.ink : onboardingColors.white} name={icon} size={24} />
      <Text style={{ color: primary ? onboardingColors.ink : onboardingColors.white, fontFamily: fontFamilies.black, fontSize: 17, fontWeight: "900", lineHeight: 22 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function StatusMessage({ children, tone }: { children: string; tone: "error" | "info" | "warning" }) {
  const color = tone === "error" ? "#FF6A77" : tone === "warning" ? "#F5B66B" : onboardingColors.muted;
  const icon = tone === "error" ? "alert-circle-outline" : tone === "warning" ? "warning-outline" : "information-circle-outline";
  return (
    <View style={{ alignItems: "flex-start", backgroundColor: onboardingColors.inkRaised, borderColor: tone === "info" ? onboardingColors.hairline : color, borderRadius: 5, borderWidth: 1, flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md }}>
      <Ionicons color={color} name={icon} size={20} />
      <Text style={[onboardingStyles.bodyCopy, { color, flex: 1 }]}>{children}</Text>
    </View>
  );
}

export function OnboardingScreen({ asOfDate, busy, demoShortcutEnabled = false, message, onComplete, onCreateDemoProfile, onSignOut, userId }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const scrollRef = React.useRef<ScrollView>(null);
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
  const showStorageStatus = !demoShortcutEnabled && /resume setup|unavailable/i.test(onboarding.storageStatus);
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ animated: false, y: 0 });
  }, [onboarding.stepIndex]);
  const finish = () => {
    const error = onboarding.validateCurrentStep();
    if (error) return;
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
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ backgroundColor: onboardingColors.ink, flex: 1 }}>
      <ScrollView
        accessibilityLabel="CornerIQ onboarding screen"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        testID="onboarding-screen"
      >
        <View style={{ alignSelf: "center", backgroundColor: onboardingColors.ink, maxWidth: 430, minHeight: height, overflow: "hidden", width: "100%" }}>
          <OnboardingHeader
            busy={busy}
            onSignOut={onSignOut}
            stepIndex={onboarding.stepIndex}
            stepLabel={onboarding.stepLabel ?? "Basic information"}
            stepTotal={onboarding.stepTotal}
            topInset={insets.top}
          />
          <View pointerEvents="none" style={{ alignSelf: "center", backgroundColor: onboardingColors.ink, height: 56, marginBottom: -32, marginTop: -30, transform: [{ rotate: "-4.5deg" }], width: "112%" }} />
          <View
            style={{
              backgroundColor: onboardingColors.ink,
              flexGrow: 1,
              gap: 20,
              paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.md,
              paddingHorizontal: 22,
              paddingTop: 20
            }}
            testID="onboarding-step-card"
          >
            {showStorageStatus ? <StatusMessage tone="info">{onboarding.storageStatus}</StatusMessage> : null}
            {message ? <StatusMessage tone="warning">{message}</StatusMessage> : null}
            {onboarding.stepError ? <StatusMessage tone="error">{onboarding.stepError}</StatusMessage> : null}
            {step}
            {onboarding.isLastStep ? (
              <View style={{ borderColor: onboardingColors.hairline, borderTopWidth: 1, paddingTop: spacing.lg }}>
                <Text style={onboardingStyles.bodyCopy}>{goalSummary(onboarding.draft)}</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              {!onboarding.isFirstStep ? (
                <NavigationButton accessibilityLabel="Back to previous setup step" disabled={busy} icon="arrow-back" label="Back" onPress={onboarding.back} />
              ) : null}
              <NavigationButton
                accessibilityLabel={onboarding.isLastStep ? "Finish boxer setup" : "Next setup step"}
                disabled={busy}
                icon={onboarding.isLastStep ? "checkmark" : "arrow-forward"}
                label={onboarding.isLastStep ? (busy ? "Saving..." : "Finish setup") : "Next"}
                onPress={onboarding.isLastStep ? finish : onboarding.next}
                primary
              />
            </View>
            {demoShortcutEnabled && onCreateDemoProfile ? (
              <Pressable accessibilityLabel="Create safe demo boxer" accessibilityRole="button" disabled={busy} onPress={onCreateDemoProfile} style={{ alignItems: "center", justifyContent: "center", minHeight: 44 }}>
                <Text style={[onboardingStyles.bodyCopy, { fontFamily: fontFamilies.semibold }]}>Development shortcut: create safe demo boxer</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
