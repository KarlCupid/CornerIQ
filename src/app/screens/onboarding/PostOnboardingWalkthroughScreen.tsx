import React, { useState } from "react";
import { Text, View } from "react-native";
import { LuminousProgressBar, LuminousScreen, type LuminousAccent } from "../../../design/components/LuminousScreen";
import { PremiumButton, PremiumCard, PremiumIconBadge } from "../../../design/components/PremiumPrimitives";
import { colors, radii, spacing } from "../../../design/theme";
import { fontFamilies } from "../../../design/typography";

type WalkthroughIcon = React.ComponentProps<typeof PremiumIconBadge>["icon"];

interface WalkthroughStep {
  accent: LuminousAccent;
  body: string;
  focus: readonly string[];
  icon: WalkthroughIcon;
  title: string;
}

const WALKTHROUGH_STEPS = [
  {
    accent: "blue",
    body: "Today turns your boxer setup into one daily read: train, adjust, recover, or fill important unknowns.",
    focus: ["Missing data stays unknown.", "Safety can override performance.", "The top action changes with your context."],
    icon: "today-outline",
    title: "Start with Today"
  },
  {
    accent: "green",
    body: "You can log readiness, body weight, fuel, hydration, cycle symptoms, and completed boxing sessions by hand.",
    focus: ["Manual input is complete on its own.", "Wearables are optional.", "Fresh, consistent signals only raise confidence."],
    icon: "create-outline",
    title: "Manual logs are enough"
  },
  {
    accent: "purple",
    body: "Train supports boxing with strength, conditioning, mobility, and recovery work around commitments you already added.",
    focus: ["Coach/team boxing stays fixed.", "Support work stays secondary.", "CornerIQ does not create contact drills or unsupervised fight simulation."],
    icon: "barbell-outline",
    title: "Train around boxing"
  },
  {
    accent: "gold",
    body: "Plan keeps boxing sessions, travel, and recovery days fixed first, then suggests safe support work around them.",
    focus: ["Use it when your week changes.", "Review before accepting changes.", "You can keep the current plan."],
    icon: "calendar-outline",
    title: "Plan protects the schedule"
  },
  {
    accent: "orange",
    body: "Fuel explains meal and hydration support conservatively, especially near fights, tournaments, and hard training days.",
    focus: ["Gaps are not treated as safe.", "Weight-class pressure does not win.", "Review flags deserve attention before pushing."],
    icon: "shield-checkmark-outline",
    title: "Fuel stays safety-first"
  }
] as const satisfies readonly [WalkthroughStep, ...WalkthroughStep[]];

export interface PostOnboardingWalkthroughScreenProps {
  onFinish: () => Promise<void> | void;
  onSkip?: (() => Promise<void> | void) | undefined;
}

function ProgressDots({ activeIndex }: { activeIndex: number }) {
  return (
    <View accessibilityLabel={`Walkthrough step ${activeIndex + 1} of ${WALKTHROUGH_STEPS.length}`} style={{ flexDirection: "row", gap: spacing.xs }}>
      {WALKTHROUGH_STEPS.map((step, index) => (
        <View
          key={step.title}
          style={{
            backgroundColor: index === activeIndex ? colors.wrap : "rgba(169, 185, 207, 0.24)",
            borderRadius: radii.pill,
            height: 8,
            width: index === activeIndex ? 28 : 8
          }}
        />
      ))}
    </View>
  );
}

function FocusRows({ rows }: { rows: readonly string[] }) {
  return (
    <View style={{ gap: spacing.sm }} testID="post-onboarding-walkthrough-focus">
      {rows.map((row) => (
        <View key={row} style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
          <View
            style={{
              backgroundColor: "rgba(232, 240, 255, 0.12)",
              borderColor: "rgba(232, 240, 255, 0.16)",
              borderRadius: radii.pill,
              borderWidth: 1,
              height: 10,
              width: 10
            }}
          />
          <Text style={{ color: colors.wrap, flex: 1, fontFamily: fontFamilies.medium, fontSize: 14, fontWeight: "500", lineHeight: 20 }}>
            {row}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function PostOnboardingWalkthroughScreen({ onFinish, onSkip }: PostOnboardingWalkthroughScreenProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = WALKTHROUGH_STEPS[stepIndex] ?? WALKTHROUGH_STEPS[0];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === WALKTHROUGH_STEPS.length - 1;
  const finish = onFinish;
  const skip = onSkip ?? onFinish;

  return (
    <LuminousScreen accent={step.accent} bottomInset="none" testID="post-onboarding-walkthrough-screen">
      <PremiumCard accent={step.accent} density="spacious" testID="post-onboarding-walkthrough-header">
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md }}>
          <PremiumIconBadge icon={step.icon} tone={step.accent} />
          <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
            <Text style={{ color: colors.mutedText, fontFamily: fontFamilies.black, fontSize: 11, fontWeight: "900", lineHeight: 15, textTransform: "uppercase" }}>
              Setup complete
            </Text>
            <Text adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={1} style={{ color: colors.canvas, fontFamily: fontFamilies.extraBold, fontSize: 29, fontWeight: "800", lineHeight: 34 }}>
              Meet CornerIQ
            </Text>
          </View>
          <ProgressDots activeIndex={stepIndex} />
        </View>
        <LuminousProgressBar accent={step.accent} progress={(stepIndex + 1) / WALKTHROUGH_STEPS.length} />
      </PremiumCard>

      <PremiumCard accent={step.accent} density="spacious" rail testID="post-onboarding-walkthrough-card">
        <View style={{ gap: spacing.lg }}>
          <View style={{ gap: spacing.sm }}>
            <Text style={{ color: colors.canvas, fontFamily: fontFamilies.extraBold, fontSize: 24, fontWeight: "800", lineHeight: 30 }}>
              {step.title}
            </Text>
            <Text style={{ color: colors.wrap, fontFamily: fontFamilies.medium, fontSize: 15, fontWeight: "500", lineHeight: 22 }}>
              {step.body}
            </Text>
          </View>

          <FocusRows rows={step.focus} />

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {!isFirstStep ? (
              <View style={{ flexBasis: 120, flexGrow: 1 }}>
                <PremiumButton accessibilityLabel="Back to previous walkthrough step" icon="chevron-back-outline" label="Back" onPress={() => setStepIndex((current) => Math.max(0, current - 1))} tone={step.accent} variant="quiet" />
              </View>
            ) : null}
            <View style={{ flexBasis: 160, flexGrow: 1 }}>
              <PremiumButton
                accessibilityLabel={isLastStep ? "Finish walkthrough" : "Next walkthrough step"}
                icon={isLastStep ? "checkmark-outline" : "arrow-forward-outline"}
                label={isLastStep ? "Start Today" : "Next"}
                onPress={isLastStep ? finish : () => setStepIndex((current) => Math.min(WALKTHROUGH_STEPS.length - 1, current + 1))}
                tone={step.accent}
              />
            </View>
          </View>
          <PremiumButton accessibilityLabel="Skip walkthrough" icon="close-outline" label="Skip walkthrough" onPress={skip} tone={step.accent} variant="text" />
        </View>
      </PremiumCard>
    </LuminousScreen>
  );
}
