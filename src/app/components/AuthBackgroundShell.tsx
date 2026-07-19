import React, { type PropsWithChildren } from "react";
import { ImageBackground, KeyboardAvoidingView, Platform, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import onboardingWelcomeBackground from "../../../assets/backgrounds/onboarding-welcome-ring.png";
import { colors, spacing } from "../../design/theme";
import { typography } from "../../design/typography";
import { CornerIQWordmark } from "./CornerIQWordmark";

export function AuthBackgroundShell({
  children,
  heading,
  subheading,
  testID = "auth-screen"
}: PropsWithChildren<{
  heading: string;
  subheading: string;
  testID?: string | undefined;
}>) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const compactHeight = height < 760;
  const heroSpace = compactHeight ? 92 : Math.min(150, Math.max(124, height * 0.17));
  const topPadding = Math.max(insets.top + spacing.lg, compactHeight ? spacing.xl : 48);
  const bottomPadding = Math.max(insets.bottom + spacing.xxl, spacing.xxl);

  return (
    <View style={{ backgroundColor: colors.cornerBlack, flex: 1, overflow: "hidden" }}>
      <ImageBackground
        imageStyle={{ height: "100%", width: "100%" }}
        resizeMode="cover"
        source={onboardingWelcomeBackground}
        style={{ backgroundColor: colors.cornerBlack, flex: 1, width: "100%" }}
      >
        <View
          style={{
            backgroundColor: "rgba(2, 6, 17, 0.38)",
            bottom: 0,
            left: 0,
            pointerEvents: "none",
            position: "absolute",
            right: 0,
            top: 0
          }}
        />
        <StatusBar style="light" />
        <KeyboardAvoidingView
          accessibilityLabel="Authentication screen"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
          testID={testID}
        >
          <ScrollView
            contentContainerStyle={{
              alignItems: "center",
              flexGrow: 1,
              justifyContent: "flex-start",
              paddingBottom: bottomPadding,
              paddingHorizontal: spacing.lg,
              paddingTop: topPadding
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
          >
            <View style={{ alignItems: "center", gap: spacing.lg, maxWidth: 430, width: "100%" }}>
              <CornerIQWordmark />
              <View style={{ height: heroSpace, pointerEvents: "none" }} />
              <View style={{ alignItems: "center", gap: spacing.xs, width: "100%" }}>
                <Text
                  selectable={false}
                  style={{
                    color: colors.canvas,
                    fontSize: compactHeight ? 31 : 34,
                    fontWeight: "800",
                    lineHeight: compactHeight ? 37 : 40,
                    textAlign: "center"
                  }}
                >
                  {heading}
                </Text>
                <Text
                  selectable={false}
                  style={{
                    ...typography.body,
                    color: "rgba(183, 196, 217, 0.9)",
                    textAlign: "center"
                  }}
                >
                  {subheading}
                </Text>
              </View>
              {children}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
}
