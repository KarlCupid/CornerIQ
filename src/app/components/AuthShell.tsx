import React from "react";
import type { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AuthBackdrop, CornerIQBrandMark } from "./AuthBrandMark";
import { colors, spacing } from "../../design/theme";
import { typography } from "../../design/typography";

export function AuthShell({
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
  return (
    <KeyboardAvoidingView
      accessibilityLabel="Authentication screen"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ backgroundColor: colors.cornerBlack, flex: 1 }}
      testID={testID}
    >
      <StatusBar style="light" />
      <AuthBackdrop />
      <ScrollView
        contentContainerStyle={{
          alignItems: "center",
          flexGrow: 1,
          justifyContent: "center",
          paddingBottom: spacing.xxl,
          paddingHorizontal: spacing.lg,
          paddingTop: Platform.OS === "ios" ? 72 : spacing.xxl
        }}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
      >
        <View style={{ alignItems: "center", gap: spacing.lg, maxWidth: 520, width: "100%" }}>
          <CornerIQBrandMark />
          <View style={{ alignItems: "center", gap: spacing.xs, width: "100%" }}>
            <Text
              selectable={false}
              style={{
                color: colors.canvas,
                fontSize: 38,
                fontWeight: "800",
                lineHeight: 46,
                textAlign: "center"
              }}
            >
              {heading}
            </Text>
            <Text
              selectable={false}
              style={{
                ...typography.body,
                color: "rgba(183, 196, 217, 0.88)",
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
  );
}
