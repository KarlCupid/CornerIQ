import React from "react";
import { ImageBackground, Pressable, Text, useWindowDimensions, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import onboardingWelcomeBackground from "../../../../assets/backgrounds/onboarding-welcome-ring-editorial.png";
import { CornerIQWordmark } from "../../components/CornerIQWordmark";
import { colors, spacing } from "../../../design/theme";
import { fontFamilies } from "../../../design/typography";

export interface OnboardingWelcomeScreenProps {
  busy: boolean;
  onSignOut: () => Promise<void>;
  onStart: () => Promise<void>;
}

function WelcomeAction({
  disabled,
  label,
  onPress,
  primary = false
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
  primary?: boolean | undefined;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: primary ? (disabled ? "rgba(39, 206, 241, 0.34)" : colors.blueIQ) : "transparent",
        borderColor: primary ? colors.blueIQ : "transparent",
        borderCurve: "continuous",
        borderRadius: 5,
        borderWidth: primary ? 1 : 0,
        justifyContent: "center",
        minHeight: primary ? 56 : 44,
        opacity: disabled ? 0.7 : pressed ? 0.84 : 1,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        width: "100%"
      })}
    >
      <Text
        style={{
          color: primary ? "#080B0E" : colors.blueIQ,
          fontFamily: fontFamilies.black,
          fontSize: primary ? 17 : 16,
          fontWeight: "900",
          lineHeight: primary ? 22 : 21,
          textAlign: "center"
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function OnboardingWelcomeScreen({ busy, onSignOut, onStart }: OnboardingWelcomeScreenProps) {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const compactHeight = height < 760;
  const veryCompactHeight = height < 700;
  const contentWidth = Math.min(width, 430);
  const heroHeight = veryCompactHeight ? 245 : compactHeight ? 282 : Math.min(325, Math.max(304, contentWidth * 0.8));
  const heroTopPadding = Math.max(insets.top + spacing.sm, compactHeight ? spacing.md : spacing.lg);
  const bodyTopPadding = veryCompactHeight ? 30 : compactHeight ? 36 : 42;
  const bodyBottomPadding = Math.max(insets.bottom + spacing.sm, veryCompactHeight ? spacing.sm : spacing.lg);

  return (
    <View
      accessibilityLabel="CornerIQ welcome screen"
      style={{ alignItems: "center", backgroundColor: "#080B0E", flex: 1, overflow: "hidden" }}
      testID="onboarding-welcome-screen"
    >
      <StatusBar style="dark" />
      <View style={{ flex: 1, maxWidth: 430, width: "100%" }}>
        <ImageBackground
          imageStyle={{ height: "100%", width: "100%" }}
          resizeMode="cover"
          source={onboardingWelcomeBackground}
          style={{ backgroundColor: "#F1EADF", height: heroHeight, paddingHorizontal: 22, paddingTop: heroTopPadding, width: "100%" }}
        >
          <CornerIQWordmark alignment="left" editorial tone="dark" />
          <View style={{ gap: spacing.sm, marginTop: veryCompactHeight ? 24 : compactHeight ? 32 : 44, maxWidth: 238 }}>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.78}
              numberOfLines={3}
              style={{
                color: "#080B0E",
                fontFamily: fontFamilies.display,
                fontSize: veryCompactHeight ? 41 : compactHeight ? 47 : 52,
                fontWeight: "400",
                includeFontPadding: true,
                letterSpacing: 0.2,
                lineHeight: veryCompactHeight ? 43 : compactHeight ? 49 : 54,
                textTransform: "uppercase"
              }}
            >
              Welcome to CornerIQ
            </Text>
            <Text
              style={{
                color: "#696763",
                fontFamily: fontFamilies.regular,
                fontSize: veryCompactHeight ? 13 : compactHeight ? 14 : 16,
                fontWeight: "400",
                lineHeight: veryCompactHeight ? 18 : compactHeight ? 20 : 22,
                maxWidth: 225
              }}
            >
              CornerIQ builds around your needs, schedule and goals.
            </Text>
          </View>
        </ImageBackground>

        <View
          style={{
            backgroundColor: "#080B0E",
            flex: 1,
            paddingBottom: bodyBottomPadding,
            paddingHorizontal: 22,
            paddingTop: bodyTopPadding
          }}
          testID="onboarding-welcome-body"
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
          <View style={{ flexDirection: "row", height: 4, marginBottom: veryCompactHeight ? spacing.lg : spacing.xl }}>
            <View style={{ backgroundColor: colors.blueIQ, width: 68 }} />
            <View style={{ backgroundColor: "rgba(247, 251, 255, 0.18)", flex: 1 }} />
          </View>

          <View style={{ gap: veryCompactHeight ? spacing.md : compactHeight ? spacing.lg : 20 }}>
            <Text
              style={{
                color: colors.wrap,
                fontFamily: fontFamilies.regular,
                fontSize: veryCompactHeight ? 13 : compactHeight ? 14 : 15,
                fontWeight: "400",
                lineHeight: veryCompactHeight ? 18 : compactHeight ? 20 : 22
              }}
            >
              We’ll ask a few simple questions about you, your boxing experience, when and how you can train, and the workouts already in your week.
            </Text>
            <Text
              style={{
                color: colors.wrap,
                fontFamily: fontFamilies.regular,
                fontSize: veryCompactHeight ? 13 : compactHeight ? 14 : 15,
                fontWeight: "400",
                lineHeight: veryCompactHeight ? 18 : compactHeight ? 20 : 22
              }}
            >
              You’ll finish by choosing what you’re training toward. Anything optional will be clearly marked, and you can update your answers later.
            </Text>
          </View>

          <View style={{ gap: spacing.xs, marginTop: veryCompactHeight ? spacing.lg : spacing.xl }}>
            <WelcomeAction disabled={busy} label={busy ? "Starting..." : "Start setup"} onPress={() => void onStart()} primary />
            <WelcomeAction disabled={busy} label="Sign out" onPress={() => void onSignOut()} />
          </View>
        </View>
      </View>
    </View>
  );
}
