import React from "react";
import { Image, Pressable, Text, useWindowDimensions, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import onboardingWelcomeBackground from "../../../../assets/backgrounds/onboarding-welcome-ring-editorial-v2.png";
import { CornerIQWordmark } from "../../components/CornerIQWordmark";
import { colors, spacing } from "../../../design/theme";
import { fontFamilies } from "../../../design/typography";

const OPENING_BELL_BLACK = "#070A0D";
const OPENING_BELL_IVORY = "#F2EBE0";

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
        backgroundColor: primary ? (disabled ? "rgba(39, 206, 241, 0.30)" : colors.blueIQ) : "transparent",
        borderColor: primary ? (disabled ? "rgba(39, 206, 241, 0.22)" : "rgba(255, 255, 255, 0.28)") : "transparent",
        borderCurve: "continuous",
        borderRadius: 6,
        borderWidth: primary ? 1 : 0,
        boxShadow: primary && !disabled ? "0 10px 24px rgba(39, 206, 241, 0.13)" : "none",
        justifyContent: "center",
        minHeight: primary ? 56 : 44,
        opacity: disabled ? 0.7 : pressed ? 0.84 : 1,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        transform: [{ scale: pressed ? 0.995 : 1 }],
        width: "100%"
      })}
    >
      <Text
        style={{
          color: primary ? "#071015" : colors.blueIQ,
          fontFamily: fontFamilies.black,
          fontSize: primary ? 16 : 15,
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
  const compactHeight = height < 820;
  const veryCompactHeight = height < 720;
  const contentWidth = Math.min(width, 430);
  const heroHeight = veryCompactHeight ? 286 : compactHeight ? 306 : Math.min(326, Math.max(310, contentWidth * 0.78));
  const heroTopPadding = Math.max(insets.top + spacing.md, spacing.xl);
  const bodyTopPadding = veryCompactHeight ? 32 : compactHeight ? 38 : 44;
  const bodyBottomPadding = Math.max(insets.bottom + spacing.md, veryCompactHeight ? spacing.md : spacing.xl);

  return (
    <View
      accessibilityLabel="CornerIQ welcome screen"
      style={{ alignItems: "center", backgroundColor: OPENING_BELL_BLACK, flex: 1, overflow: "hidden" }}
      testID="onboarding-welcome-screen"
    >
      <StatusBar style="dark" />
      <View style={{ flex: 1, maxWidth: 430, width: "100%" }}>
        <View
          style={{
            backgroundColor: OPENING_BELL_IVORY,
            height: heroHeight,
            width: "100%"
          }}
        >
          <Image
            resizeMode="cover"
            source={onboardingWelcomeBackground}
            style={{
              bottom: 0,
              height: "100%",
              left: 0,
              position: "absolute",
              right: 0,
              top: 0,
              width: "100%"
            }}
            testID="welcome-hero-image"
          />
          <View
            testID="welcome-hero-content"
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
                marginTop: veryCompactHeight ? 20 : compactHeight ? 24 : 30,
                maxWidth: veryCompactHeight ? 222 : 246
              }}
            >
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.84}
                numberOfLines={2}
                selectable={false}
                style={{
                  color: OPENING_BELL_BLACK,
                  fontFamily: fontFamilies.display,
                  fontSize: veryCompactHeight ? 42 : compactHeight ? 45 : 48,
                  fontWeight: "400",
                  includeFontPadding: true,
                  letterSpacing: 0.5,
                  lineHeight: veryCompactHeight ? 44 : compactHeight ? 47 : 50,
                  textTransform: "uppercase"
                }}
              >
                Welcome to CornerIQ
              </Text>
              <Text
                style={{
                  color: "#5E5C58",
                  fontFamily: fontFamilies.medium,
                  fontSize: veryCompactHeight ? 13 : compactHeight ? 14 : 15,
                  fontWeight: "500",
                  lineHeight: veryCompactHeight ? 18 : compactHeight ? 19 : 21,
                  maxWidth: 236
                }}
              >
                CornerIQ builds around your needs, schedule and goals.
              </Text>
            </View>
          </View>
        </View>

        <View
          style={{
            backgroundColor: OPENING_BELL_BLACK,
            flex: 1,
            paddingBottom: bodyBottomPadding,
            paddingHorizontal: spacing.xl,
            paddingTop: bodyTopPadding
          }}
          testID="onboarding-welcome-body"
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

          <View style={{ flex: 1, justifyContent: "space-between" }}>
            <View>
              <View style={{ flexDirection: "row", height: 3, marginBottom: veryCompactHeight ? spacing.lg : spacing.xl }}>
                <View style={{ backgroundColor: colors.blueIQ, width: 72 }} />
                <View style={{ backgroundColor: "#26313B", flex: 1 }} />
              </View>

              <View style={{ gap: veryCompactHeight ? spacing.md : 18 }}>
                <Text
                  style={{
                    color: "#E5ECF4",
                    fontFamily: fontFamilies.regular,
                    fontSize: veryCompactHeight ? 13 : compactHeight ? 14 : 15,
                    fontWeight: "400",
                    lineHeight: veryCompactHeight ? 18 : compactHeight ? 20 : 21
                  }}
                >
                  We’ll ask a few simple questions about you, your boxing experience, when and how you can train, and the workouts already in your week.
                </Text>
                <Text
                  style={{
                    color: "#E5ECF4",
                    fontFamily: fontFamilies.regular,
                    fontSize: veryCompactHeight ? 13 : compactHeight ? 14 : 15,
                    fontWeight: "400",
                    lineHeight: veryCompactHeight ? 18 : compactHeight ? 20 : 21
                  }}
                >
                  You’ll finish by choosing what you’re training toward. Anything optional will be clearly marked, and you can update your answers later.
                </Text>
              </View>
            </View>

            <View style={{ gap: spacing.xs, marginTop: spacing.lg }}>
              <WelcomeAction disabled={busy} label={busy ? "Starting..." : "Start setup"} onPress={() => void onStart()} primary />
              <WelcomeAction disabled={busy} label="Sign out" onPress={() => void onSignOut()} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
