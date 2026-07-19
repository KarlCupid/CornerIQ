import React from "react";
import { ImageBackground, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import onboardingWelcomeBackground from "../../../../assets/backgrounds/onboarding-welcome-ring.png";
import { CornerIQWordmark } from "../../components/CornerIQWordmark";
import { colors, radii, spacing } from "../../../design/theme";
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
        borderColor: primary ? "rgba(255, 255, 255, 0.42)" : "transparent",
        borderCurve: "continuous",
        borderRadius: radii.pill,
        borderWidth: primary ? 1 : 0,
        boxShadow: primary && !disabled ? "0 12px 30px rgba(39, 206, 241, 0.24)" : undefined,
        justifyContent: "center",
        minHeight: primary ? 54 : 44,
        opacity: disabled ? 0.7 : pressed ? 0.86 : 1,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        width: "100%"
      })}
    >
      <Text
        style={{
          color: primary ? colors.cornerBlack : colors.blueIQ,
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
  const contentWidth = Math.min(width, 430);
  const heroSpace = compactHeight ? 200 : Math.min(250, Math.max(220, contentWidth * 0.64));

  return (
    <View style={{ backgroundColor: colors.cornerBlack, flex: 1, overflow: "hidden" }} testID="onboarding-welcome-screen">
      <ImageBackground
        imageStyle={{ height: "100%", opacity: 1, width: "100%" }}
        resizeMode="cover"
        source={onboardingWelcomeBackground}
        style={{ backgroundColor: colors.cornerBlack, flex: 1, width: "100%" }}
      >
      <ScrollView
        accessibilityLabel="CornerIQ welcome screen"
        bounces={false}
        contentContainerStyle={{
          alignSelf: "center",
          flexGrow: 1,
          maxWidth: 430,
          minHeight: height,
          paddingBottom: Math.max(insets.bottom, spacing.sm) + spacing.sm,
          paddingHorizontal: 22,
          paddingTop: Math.max(insets.top + spacing.lg, compactHeight ? spacing.xl : 54),
          width: "100%"
        }}
        showsVerticalScrollIndicator={false}
      >
        <CornerIQWordmark />
        <View style={{ height: heroSpace, pointerEvents: "none" }} />
        <View style={{ alignItems: "center", gap: spacing.sm }}>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.82}
            numberOfLines={1}
            style={{
              color: colors.canvas,
              fontFamily: fontFamilies.black,
              fontSize: compactHeight ? 29 : 30,
              fontWeight: "900",
              letterSpacing: 0,
              lineHeight: compactHeight ? 35 : 36,
              textAlign: "center"
            }}
          >
            Welcome to CornerIQ
          </Text>
          <Text
            style={{
              color: colors.mutedText,
              fontFamily: fontFamilies.regular,
              fontSize: 16,
              fontWeight: "400",
              lineHeight: 22,
              maxWidth: 300,
              textAlign: "center"
            }}
          >
            CornerIQ builds around your needs, schedule and goals.
          </Text>
        </View>

        <View
          style={{
            backgroundColor: "rgba(4, 14, 29, 0.84)",
            borderColor: "rgba(39, 206, 241, 0.8)",
            borderCurve: "continuous",
            borderRadius: radii.card,
            borderWidth: 1,
            boxShadow: "0 20px 44px rgba(0, 0, 0, 0.44), inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 0 24px rgba(39, 206, 241, 0.16)",
            gap: compactHeight ? spacing.md : 18,
            marginTop: compactHeight ? spacing.lg : spacing.xl,
            overflow: "hidden",
            paddingHorizontal: compactHeight ? spacing.lg : spacing.xxl,
            paddingVertical: spacing.lg
          }}
          testID="onboarding-welcome-card"
        >
          <View
            style={{
              backgroundColor: "rgba(215, 249, 255, 0.52)",
              height: 1,
              left: spacing.xl,
              pointerEvents: "none",
              position: "absolute",
              right: spacing.xl,
              top: 0
            }}
          />
          <View style={{ gap: compactHeight ? spacing.md : 18 }}>
            <Text
              style={{
                color: colors.wrap,
                fontFamily: fontFamilies.regular,
                fontSize: compactHeight ? 14 : 15,
                fontWeight: "400",
                lineHeight: compactHeight ? 20 : 22
              }}
            >
              We’ll ask a few simple questions about you, your boxing experience, when and how you can train, and the workouts already in your week.
            </Text>
            <Text
              style={{
                color: colors.wrap,
                fontFamily: fontFamilies.regular,
                fontSize: compactHeight ? 14 : 15,
                fontWeight: "400",
                lineHeight: compactHeight ? 20 : 22
              }}
            >
              You’ll finish by choosing what you’re training toward. Anything optional will be clearly marked, and you can update your answers later.
            </Text>
          </View>
          <View style={{ gap: spacing.xs }}>
            <WelcomeAction disabled={busy} label={busy ? "Starting..." : "Start setup"} onPress={() => void onStart()} primary />
            <WelcomeAction disabled={busy} label="Sign out" onPress={() => void onSignOut()} />
          </View>
        </View>
      </ScrollView>
      </ImageBackground>
    </View>
  );
}
