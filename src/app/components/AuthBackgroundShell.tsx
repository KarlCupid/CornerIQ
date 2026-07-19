import React, { type PropsWithChildren } from "react";
import { ImageBackground, KeyboardAvoidingView, Platform, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import authSignInBackground from "../../../assets/backgrounds/auth-sign-in-gloves.png";
import { colors, spacing } from "../../design/theme";
import { fontFamilies } from "../../design/typography";
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
  const { height, width } = useWindowDimensions();
  const compactHeight = height < 760;
  const veryCompactHeight = height < 700;
  const contentWidth = Math.min(width, 430);
  const heroHeight = veryCompactHeight ? 242 : compactHeight ? 275 : Math.min(320, Math.max(294, contentWidth * 0.78));
  const heroTopPadding = Math.max(insets.top + spacing.sm, compactHeight ? spacing.md : spacing.lg);
  const bodyTopPadding = veryCompactHeight ? 34 : compactHeight ? 38 : 46;
  const bottomPadding = Math.max(insets.bottom + spacing.xl, spacing.xxl);

  return (
    <View style={{ alignItems: "center", backgroundColor: colors.cornerBlack, flex: 1, overflow: "hidden" }}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        accessibilityLabel="Authentication screen"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, maxWidth: 430, width: "100%" }}
        testID={testID}
      >
        <ScrollView
          contentContainerStyle={{ backgroundColor: "#080B0E", flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: "#080B0E", flex: 1 }}
        >
          <ImageBackground
            imageStyle={{ height: "100%", width: "100%" }}
            resizeMode="cover"
            source={authSignInBackground}
            style={{ backgroundColor: "#F1EADF", height: heroHeight, paddingHorizontal: 22, paddingTop: heroTopPadding, width: "100%" }}
          >
            <CornerIQWordmark alignment="left" editorial tone="dark" />
            <View style={{ gap: spacing.sm, marginTop: veryCompactHeight ? 26 : compactHeight ? 34 : 48, maxWidth: 226 }}>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.76}
                numberOfLines={3}
                selectable={false}
                style={{
                  color: "#080B0E",
                  fontFamily: fontFamilies.display,
                  fontSize: veryCompactHeight ? 43 : compactHeight ? 48 : 54,
                  fontWeight: "400",
                  includeFontPadding: true,
                  letterSpacing: 0.2,
                  lineHeight: veryCompactHeight ? 45 : compactHeight ? 50 : 56,
                  textTransform: "uppercase"
                }}
              >
                {heading}
              </Text>
              <Text
                selectable={false}
                style={{
                  color: "#696763",
                  fontFamily: fontFamilies.regular,
                  fontSize: veryCompactHeight ? 14 : 16,
                  fontWeight: "400",
                  lineHeight: veryCompactHeight ? 19 : 22,
                  maxWidth: 215
                }}
              >
                {subheading}
              </Text>
            </View>
          </ImageBackground>
          <View
            style={{
              backgroundColor: "#080B0E",
              flexGrow: 1,
              paddingBottom: bottomPadding,
              paddingHorizontal: 22,
              paddingTop: bodyTopPadding,
              width: "100%"
            }}
          >
            <View
              pointerEvents="none"
              style={{
                backgroundColor: "#080B0E",
                height: 34,
                left: -8,
                position: "absolute",
                right: -8,
                top: -17,
                transform: [{ rotate: "-2deg" }]
              }}
            />
            <View style={{ alignSelf: "center", maxWidth: 430, width: "100%" }}>{children}</View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
