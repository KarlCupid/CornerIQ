import React, { type PropsWithChildren } from "react";
import { ImageBackground, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import authRingCornerBackground from "../../../assets/backgrounds/auth-ring-corner.png";
import { colors, spacing } from "../../design/theme";
import { typography } from "../../design/typography";
import { CornerIQWordmark } from "./CornerIQWordmark";

export function AuthBackgroundShell({
  children,
  footer,
  heading,
  subheading,
  testID = "auth-screen"
}: PropsWithChildren<{
  footer?: React.ReactNode;
  heading: string;
  subheading: string;
  testID?: string | undefined;
}>) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + spacing.xxl, Platform.OS === "ios" ? 72 : spacing.xxl);
  const bottomPadding = Math.max(insets.bottom + spacing.xxl, spacing.xxl);

  return (
    <ImageBackground
      resizeMode="cover"
      source={authRingCornerBackground}
      style={{ backgroundColor: colors.cornerBlack, flex: 1 }}
    >
      <View
        pointerEvents="none"
        style={{
          backgroundColor: "rgba(2, 6, 17, 0.38)",
          bottom: 0,
          left: 0,
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
            justifyContent: "center",
            paddingBottom: bottomPadding,
            paddingHorizontal: spacing.lg,
            paddingTop: topPadding
          }}
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
        >
          <View style={{ alignItems: "center", gap: spacing.lg, maxWidth: 520, width: "100%" }}>
            <CornerIQWordmark />
            <View style={{ alignItems: "center", gap: spacing.xs, width: "100%" }}>
              <Text
                selectable={false}
                style={{
                  color: colors.canvas,
                  fontSize: 40,
                  fontWeight: "800",
                  lineHeight: 48,
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
            {footer}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}
