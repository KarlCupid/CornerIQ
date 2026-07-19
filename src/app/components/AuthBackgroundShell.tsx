import React, { type PropsWithChildren } from "react";
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import authSignInBackground from "../../../assets/backgrounds/auth-sign-in-gloves-v2.png";
import { spacing } from "../../design/theme";
import { fontFamilies } from "../../design/typography";
import { CornerIQWordmark } from "./CornerIQWordmark";

const OPENING_BELL_BLACK = "#070A0D";
const OPENING_BELL_IVORY = "#F2EBE0";

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
  const { height, width } = useWindowDimensions();
  const compactHeight = height < 820;
  const veryCompactHeight = height < 720;
  const contentWidth = Math.min(width, 430);
  const heroHeight = veryCompactHeight ? 270 : compactHeight ? 294 : Math.min(318, Math.max(300, contentWidth * 0.76));
  const heroTopPadding = Math.max(insets.top + spacing.md, spacing.xl);
  const bodyTopPadding = veryCompactHeight ? 44 : compactHeight ? 52 : 58;
  const bottomPadding = Math.max(insets.bottom + spacing.xl, spacing.xxl);

  return (
    <View style={{ alignItems: "center", backgroundColor: OPENING_BELL_BLACK, flex: 1, overflow: "hidden" }}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        accessibilityLabel="Authentication screen"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, maxWidth: 430, width: "100%" }}
        testID={testID}
      >
        <ScrollView
          contentContainerStyle={{ backgroundColor: OPENING_BELL_BLACK, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: OPENING_BELL_BLACK, flex: 1 }}
        >
          <View
            style={{
              backgroundColor: OPENING_BELL_IVORY,
              height: heroHeight,
              width: "100%"
            }}
          >
            <Image
              resizeMode="cover"
              source={authSignInBackground}
              style={{
                bottom: 0,
                height: "100%",
                left: 0,
                position: "absolute",
                right: 0,
                top: 0,
                width: "100%"
              }}
              testID="auth-hero-image"
            />
            <View
              testID="auth-hero-content"
              style={{
                flex: 1,
                paddingHorizontal: spacing.xl,
                paddingTop: heroTopPadding
              }}
            >
              <CornerIQWordmark alignment="left" editorial tone="dark" />
              <View
                style={{
                  gap: spacing.sm,
                  marginTop: veryCompactHeight ? 24 : compactHeight ? 30 : 38,
                  maxWidth: veryCompactHeight ? 205 : 224
                }}
              >
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.82}
                  numberOfLines={2}
                  selectable={false}
                  style={{
                    color: OPENING_BELL_BLACK,
                    fontFamily: fontFamilies.display,
                    fontSize: veryCompactHeight ? 46 : compactHeight ? 50 : 54,
                    fontWeight: "400",
                    includeFontPadding: true,
                    letterSpacing: 0.5,
                    lineHeight: veryCompactHeight ? 48 : compactHeight ? 52 : 56,
                    textTransform: "uppercase"
                  }}
                >
                  {heading}
                </Text>
                <Text
                  selectable={false}
                  style={{
                    color: "#5E5C58",
                    fontFamily: fontFamilies.medium,
                    fontSize: veryCompactHeight ? 14 : 15,
                    fontWeight: "500",
                    lineHeight: veryCompactHeight ? 19 : 21,
                    maxWidth: 220
                  }}
                >
                  {subheading}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={{
              backgroundColor: OPENING_BELL_BLACK,
              flexGrow: 1,
              paddingBottom: bottomPadding,
              paddingHorizontal: spacing.xl,
              paddingTop: bodyTopPadding,
              width: "100%"
            }}
          >
            <View
              pointerEvents="none"
              style={{
                backgroundColor: OPENING_BELL_BLACK,
                height: 30,
                left: -8,
                position: "absolute",
                right: -8,
                top: -15,
                transform: [{ rotate: "-1.6deg" }]
              }}
            />
            <View style={{ alignSelf: "center", maxWidth: 382, width: "100%" }}>{children}</View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
