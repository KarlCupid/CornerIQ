import React from "react";
import type { PropsWithChildren } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ImageBackground, Platform, ScrollView, Text, View, type ImageSourcePropType, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { glassStyles } from "../glass";
import { colors, radii, spacing } from "../theme";
import { typography } from "../typography";

const TAB_SCREEN_BOTTOM_PADDING = spacing.xl;

const luminousStyles = {
  content: {
    alignSelf: "center" as const,
    gap: spacing.lg,
    flexGrow: 1,
    maxWidth: 1120,
    paddingHorizontal: spacing.lg,
    width: "100%" as const
  },
  screen: {
    backgroundColor: colors.cornerBlack,
    flex: 1
  },
  scrollFill: {
    flex: 1
  },
  title: {
    ...typography.screenTitle,
    color: colors.canvas,
    maxWidth: 680
  },
  heroFrame: {
    borderColor: "rgba(255, 255, 255, 0.13)",
    borderCurve: "continuous" as const,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 176,
    overflow: "hidden" as const
  },
  heroImage: {
    borderRadius: 20
  },
  heroOverlay: {
    backgroundColor: "rgba(2, 5, 12, 0.34)",
    bottom: 0,
    left: 0,
    position: "absolute" as const,
    right: 0,
    top: 0
  },
  heroContent: {
    alignItems: "center" as const,
    flexDirection: "row" as const,
    gap: spacing.lg,
    minHeight: 176,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  heroTitle: {
    color: colors.canvas,
    fontSize: 32,
    fontWeight: "900" as const,
    letterSpacing: 0,
    lineHeight: 38,
    maxWidth: 520,
    textTransform: "uppercase" as const
  },
  heroSubtitle: {
    color: colors.wrap,
    fontSize: 15,
    fontWeight: "500" as const,
    letterSpacing: 0,
    lineHeight: 21,
    maxWidth: 520
  }
};

export type LuminousAccent = "blue" | "green" | "orange" | "purple" | "gold" | "red" | "neutral";

export const accentColor: Record<LuminousAccent, string> = {
  blue: colors.blueIQ,
  gold: colors.gold,
  green: colors.readyGreen,
  neutral: colors.mutedText,
  orange: colors.amberCaution,
  purple: colors.powerPurple,
  red: colors.redCorner
};

export const accentWash: Record<LuminousAccent, string> = {
  blue: "rgba(39, 206, 241, 0.16)",
  gold: "rgba(255, 216, 97, 0.16)",
  green: "rgba(56, 226, 138, 0.15)",
  neutral: "rgba(183, 196, 217, 0.14)",
  orange: "rgba(255, 148, 72, 0.16)",
  purple: "rgba(150, 87, 245, 0.16)",
  red: "rgba(255, 82, 101, 0.16)"
};

export function LuminousScreen({
  bottomInset = "tabs",
  children,
  testID
}: PropsWithChildren<{
  bottomInset?: "none" | "tabs" | undefined;
  testID: string;
}>) {
  const insets = useSafeAreaInsets();
  const bottomPadding =
    bottomInset === "tabs"
      ? Math.max(insets.bottom, spacing.md) + TAB_SCREEN_BOTTOM_PADDING
      : Math.max(insets.bottom, spacing.lg) + spacing.lg;

  return (
    <View style={luminousStyles.screen}>
      <ScrollView
        accessibilityLabel={`${testID.replace(/-/g, " ")} screen`}
        contentContainerStyle={[luminousStyles.content, { paddingBottom: bottomPadding, paddingTop: Math.max(insets.top + spacing.lg, spacing.xl) }]}
        style={luminousStyles.scrollFill}
        testID={testID}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export interface ScreenHeaderProps {
  accent?: LuminousAccent | undefined;
  eyebrow?: string | undefined;
  heroImage?: ImageSourcePropType | undefined;
  icon?: keyof typeof Ionicons.glyphMap | undefined;
  subtitle?: string | undefined;
  title: string;
}

export function ScreenHeader({
  accent = "blue",
  eyebrow,
  heroImage,
  icon,
  subtitle,
  title
}: ScreenHeaderProps) {
  if (heroImage) {
    const heroShadow: ViewStyle =
      Platform.OS === "web"
        ? ({ boxShadow: `0 22px 48px rgba(0, 0, 0, 0.36), 0 0 34px ${accentWash[accent]}` } as ViewStyle)
        : {
            elevation: 10,
            shadowColor: accentColor[accent],
            shadowOffset: { height: 14, width: 0 },
            shadowOpacity: 0.2,
            shadowRadius: 24
          };

    return (
      <ImageBackground
        accessibilityLabel={`${title} screen header`}
        imageStyle={luminousStyles.heroImage}
        resizeMode="cover"
        source={heroImage}
        style={[luminousStyles.heroFrame, heroShadow]}
      >
        <View style={luminousStyles.heroOverlay} />
        <View style={luminousStyles.heroContent}>
          {icon ? (
            <View
              style={{
                alignItems: "center",
                backgroundColor: `${accentColor[accent]}18`,
                borderColor: `${accentColor[accent]}66`,
                borderRadius: 14,
                borderWidth: 1,
                height: 52,
                justifyContent: "center",
                width: 52
              }}
            >
              <Ionicons color={accentColor[accent]} name={icon} size={25} />
            </View>
          ) : null}
          <View style={luminousStyles.heroCopy}>
            <Text style={{ color: accentColor[accent], fontSize: 12, fontWeight: "900", letterSpacing: 0, lineHeight: 16, textTransform: "uppercase" }}>
              {eyebrow}
            </Text>
            <Text adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={1} style={luminousStyles.heroTitle}>
              {title}
            </Text>
            {subtitle ? <Text numberOfLines={2} style={luminousStyles.heroSubtitle}>{subtitle}</Text> : null}
            <View style={{ backgroundColor: accentColor[accent], borderRadius: radii.pill, height: 2, marginTop: spacing.sm, width: 44 }} />
          </View>
        </View>
      </ImageBackground>
    );
  }

  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={luminousStyles.title}>{title}</Text>
    </View>
  );
}

export function AccentPill({
  accent = "blue",
  label
}: {
  accent?: LuminousAccent | undefined;
  label: string;
}) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: "rgba(255, 255, 255, 0.065)",
        borderColor: `${accentColor[accent]}5F`,
        borderLeftColor: accentColor[accent],
        borderLeftWidth: 3,
        borderRadius: 10,
        borderWidth: 1,
        minHeight: 32,
        justifyContent: "center",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs
      }}
    >
      <Text style={{ color: accent === "gold" ? colors.gold : accentColor[accent], fontSize: 12, fontWeight: "800", letterSpacing: 0, lineHeight: 16 }}>
        {label}
      </Text>
    </View>
  );
}

export function LuminousProgressBar({
  accent = "blue",
  progress
}: {
  accent?: LuminousAccent | undefined;
  progress: number;
}) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View
      accessibilityLabel={`${Math.round(clamped * 100)} percent`}
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.14)",
        borderRadius: radii.pill,
        height: 10,
        overflow: "hidden"
      }}
    >
      <View
        style={{
          backgroundColor: accentColor[accent],
          borderRadius: radii.pill,
          height: "100%",
          width: `${Math.max(7, clamped * 100)}%`
        }}
      />
    </View>
  );
}

export function MetricTile({
  accent,
  label,
  meta,
  value
}: {
  accent?: LuminousAccent | undefined;
  label: string;
  meta?: string | undefined;
  value: string;
}) {
  const valueColor = accent ? accentColor[accent] : colors.canvas;
  return (
    <View
      accessibilityLabel={`${label}: ${value}${meta ? `. ${meta}` : ""}`}
      style={{
        ...glassStyles.tile,
        borderRadius: 20,
        flexBasis: "47%",
        flexGrow: 1,
        flexShrink: 1,
        gap: spacing.xs,
        minHeight: 124,
        minWidth: 136,
        padding: spacing.md
      }}
    >
      <Text numberOfLines={1} style={{ ...typography.tileLabel, color: accent ? valueColor : colors.wrap, flexShrink: 1, minWidth: 0 }}>
        {label}
      </Text>
      <Text numberOfLines={2} style={{ ...typography.tileValue, color: valueColor, flexShrink: 1, minWidth: 0 }}>
        {value}
      </Text>
      {meta ? (
        <Text numberOfLines={2} style={{ ...typography.subtle, color: colors.mutedText, flexShrink: 1, minWidth: 0 }}>
          {meta}
        </Text>
      ) : null}
    </View>
  );
}
