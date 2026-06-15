import React from "react";
import type { PropsWithChildren } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ImageBackground, Platform, ScrollView, Text, useWindowDimensions, View, type ImageSourcePropType, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { glassStyles } from "../glass";
import { accentColor, LuminousScreenThemeContext, luminousScreenThemes, type LuminousAccent, useLuminousScreenTheme } from "../luminousTheme";
import { colors, radii, spacing } from "../theme";
import { typography } from "../typography";

export { accentColor, accentWash, luminousScreenThemes, useLuminousScreenTheme, type LuminousAccent } from "../luminousTheme";

const TAB_SCREEN_BOTTOM_PADDING = spacing.xl;

const luminousStyles = {
  content: {
    alignSelf: "center" as const,
    gap: spacing.md,
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
    borderColor: "rgba(255, 255, 255, 0.11)",
    borderCurve: "continuous" as const,
    borderRadius: 24,
    borderWidth: 1,
    minHeight: 236,
    overflow: "hidden" as const
  },
  heroImage: {
    borderRadius: 24
  },
  heroOverlay: {
    backgroundColor: "rgba(2, 5, 12, 0.12)",
    bottom: 0,
    left: 0,
    position: "absolute" as const,
    right: 0,
    top: 0
  },
  heroBaseShadow: {
    backgroundColor: "rgba(0, 0, 0, 0.14)",
    bottom: 0,
    height: "58%" as const,
    left: 0,
    position: "absolute" as const,
    right: 0
  },
  heroContent: {
    gap: spacing.md,
    justifyContent: "flex-end" as const,
    minHeight: 236,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: 76
  },
  heroCopy: {
    gap: spacing.xs,
    maxWidth: 340,
    minWidth: 0
  },
  heroTitle: {
    color: colors.canvas,
    fontSize: 29,
    fontWeight: "900" as const,
    letterSpacing: 0,
    lineHeight: 33,
    maxWidth: 340
  },
  heroSubtitle: {
    color: colors.wrap,
    fontSize: 15,
    fontWeight: "500" as const,
    letterSpacing: 0,
    lineHeight: 21,
    maxWidth: 340
  },
  heroActionRow: {
    flexDirection: "row" as const,
    gap: spacing.sm,
    position: "absolute" as const,
    right: spacing.lg,
    top: spacing.lg
  },
  heroActionGlyph: {
    alignItems: "center" as const,
    backgroundColor: "rgba(6, 10, 18, 0.52)",
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderCurve: "continuous" as const,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: "center" as const,
    width: 36
  }
};

export function LuminousScreen({
  accent = "blue",
  bottomInset = "tabs",
  children,
  testID
}: PropsWithChildren<{
  accent?: LuminousAccent | undefined;
  bottomInset?: "none" | "tabs" | undefined;
  testID: string;
}>) {
  const insets = useSafeAreaInsets();
  const theme = luminousScreenThemes[accent];
  const bottomPadding =
    bottomInset === "tabs"
      ? Math.max(insets.bottom, spacing.md) + TAB_SCREEN_BOTTOM_PADDING
      : Math.max(insets.bottom, spacing.lg) + spacing.lg;

  return (
    <LuminousScreenThemeContext.Provider value={theme}>
      <View style={[luminousStyles.screen, { backgroundColor: theme.background }]}>
        <View pointerEvents="none" style={{ bottom: 0, left: 0, overflow: "hidden", position: "absolute", right: 0, top: 0 }}>
          <View style={{ backgroundColor: theme.topWash, height: 330, left: 0, opacity: 0.82, position: "absolute", right: 0, top: 0 }} />
          <View style={{ backgroundColor: theme.midWash, height: 420, left: 0, opacity: 0.58, position: "absolute", right: 0, top: 258 }} />
          <View style={{ backgroundColor: theme.bottomWash, bottom: 0, height: "55%", left: 0, position: "absolute", right: 0 }} />
          <View style={{ backgroundColor: theme.hairline, height: 1, left: spacing.lg, opacity: 0.42, position: "absolute", right: spacing.lg, top: 0 }} />
        </View>
        <ScrollView
          accessibilityLabel={`${testID.replace(/-/g, " ")} screen`}
          contentContainerStyle={[luminousStyles.content, { paddingBottom: bottomPadding, paddingTop: Math.max(insets.top + spacing.sm, spacing.lg) }]}
          style={luminousStyles.scrollFill}
          testID={testID}
        >
          {children}
        </ScrollView>
      </View>
    </LuminousScreenThemeContext.Provider>
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
  const { width } = useWindowDimensions();
  const theme = useLuminousScreenTheme();
  const compact = width < 520;
  if (heroImage) {
    const heroShadow: ViewStyle =
      Platform.OS === "web"
        ? ({ boxShadow: `0 24px 54px rgba(0, 0, 0, 0.42), 0 0 32px ${theme.strongGlow}` } as ViewStyle)
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
        style={[luminousStyles.heroFrame, heroShadow, { borderColor: theme.cardBorder, minHeight: compact ? 232 : 260 }]}
      >
        <View style={[luminousStyles.heroOverlay, { backgroundColor: `${theme.background}1F` }]} />
        <View style={[luminousStyles.heroBaseShadow, { backgroundColor: `${theme.background}B8` }]} />
        <View pointerEvents="none" style={luminousStyles.heroActionRow}>
          <View style={[luminousStyles.heroActionGlyph, { backgroundColor: theme.cardDeep, borderColor: theme.cardBorder }]}>
            <Ionicons color={colors.canvas} name="notifications-outline" size={18} />
          </View>
          <View style={[luminousStyles.heroActionGlyph, { backgroundColor: theme.cardDeep, borderColor: `${accentColor[accent]}66` }]}>
            <Ionicons color={colors.canvas} name={icon ?? "settings-outline"} size={18} />
          </View>
        </View>
        <View style={[luminousStyles.heroContent, { minHeight: compact ? 232 : 260, paddingBottom: compact ? spacing.xl : spacing.xxl }]}>
          <View style={luminousStyles.heroCopy}>
            {eyebrow ? (
              <Text style={{ color: accentColor[accent], fontSize: 11, fontWeight: "900", letterSpacing: 0, lineHeight: 15, textTransform: "uppercase" }}>
                {eyebrow}
              </Text>
            ) : null}
            <Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={2} style={[luminousStyles.heroTitle, { fontSize: compact ? 28 : 34, lineHeight: compact ? 32 : 39 }]}>
              {title}
            </Text>
            {subtitle ? <Text numberOfLines={2} style={luminousStyles.heroSubtitle}>{subtitle}</Text> : null}
            <View style={{ backgroundColor: accentColor[accent], borderRadius: radii.pill, height: 2, marginTop: spacing.md, width: 44 }} />
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
  const theme = useLuminousScreenTheme();
  const valueColor = accent ? accentColor[accent] : colors.canvas;
  return (
    <View
      accessibilityLabel={`${label}: ${value}${meta ? `. ${meta}` : ""}`}
      style={{
        ...glassStyles.tile,
        backgroundColor: theme.tile,
        borderColor: theme.tileBorder,
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
