import React from "react";
import { Text, View } from "react-native";
import { LuminousScreen } from "../../../design/components/LuminousScreen";
import { PremiumButton, PremiumCard, PremiumIconBadge } from "../../../design/components/PremiumPrimitives";
import { colors, spacing } from "../../../design/theme";
import { fontFamilies } from "../../../design/typography";

export interface PostOnboardingWalkthroughScreenProps {
  onFinish: () => Promise<void> | void;
  onSkip?: (() => Promise<void> | void) | undefined;
}

export function PostOnboardingWalkthroughScreen({ onFinish }: PostOnboardingWalkthroughScreenProps) {
  return (
    <LuminousScreen accent="blue" bottomInset="none" testID="post-onboarding-walkthrough-screen">
      <PremiumCard accent="blue" density="spacious" rail testID="post-onboarding-walkthrough-card">
        <View style={{ gap: spacing.lg }}>
          <PremiumIconBadge icon="checkmark-outline" tone="blue" />
          <View style={{ gap: spacing.sm }}>
            <Text style={{ color: colors.mutedText, fontFamily: fontFamilies.black, fontSize: 11, fontWeight: "900", lineHeight: 15, textTransform: "uppercase" }}>
              Setup complete
            </Text>
            <Text style={{ color: colors.canvas, fontFamily: fontFamilies.extraBold, fontSize: 29, fontWeight: "800", lineHeight: 35 }}>
              Your training is ready
            </Text>
            <Text style={{ color: colors.wrap, fontFamily: fontFamilies.medium, fontSize: 15, fontWeight: "500", lineHeight: 22 }}>
              Today shows what matters now. CornerIQ workouts will be clearly labeled and planned around the training already on your schedule.
            </Text>
          </View>
          <PremiumButton accessibilityLabel="Open Today" icon="arrow-forward-outline" label="Go to Today" onPress={onFinish} tone="blue" />
        </View>
      </PremiumCard>
    </LuminousScreen>
  );
}
