import React from "react";
import type { PropsWithChildren } from "react";
import { ImageBackground, Platform, ScrollView, Text, useWindowDimensions, View, type ImageSourcePropType, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CornerIQWordmark } from "../../app/components/CornerIQWordmark";
import { glassStyles } from "../glass";
import { accentColor, LuminousScreenThemeContext, luminousScreenThemes, type LuminousAccent, useLuminousScreenTheme } from "../luminousTheme";
import { colors, radii, spacing } from "../theme";
import { fontFamilies, typography } from "../typography";

export { accentColor, accentWash, luminousScreenThemes, useLuminousScreenTheme, type LuminousAccent } from "../luminousTheme";

const TAB_SCREEN_BOTTOM_PADDING = 24;
const OPENING_BELL_BLACK = "#061318";
const OPENING_BELL_IVORY = "#F2EBE0";

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
    backgroundColor: OPENING_BELL_IVORY,
    borderBottomColor: "transparent",
    borderCurve: "continuous" as const,
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    marginHorizontal: -spacing.lg,
    marginBottom: 0,
    marginTop: -spacing.sm,
    minHeight: 298,
    overflow: "hidden" as const
  },
  heroImage: {
    borderRadius: 0,
    height: "100%" as const,
    opacity: 0.42,
    width: "100%" as const
  },
  heroImageNatural: {
    opacity: 1
  },
  heroOverlay: {
    backgroundColor: "rgba(242, 235, 224, 0.34)",
    bottom: 0,
    left: 0,
    position: "absolute" as const,
    right: 0,
    top: 0
  },
  heroBaseShadow: {
    backgroundColor: "transparent",
    bottom: 0,
    height: 0,
    left: 0,
    position: "absolute" as const,
    right: 0
  },
  heroContent: {
    gap: spacing.lg,
    justifyContent: "space-between" as const,
    minHeight: 298,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.lg
  },
  heroCopy: {
    gap: spacing.xs,
    maxWidth: 216,
    minWidth: 0
  },
  heroTitle: {
    color: "#080B0E",
    fontFamily: fontFamilies.display,
    fontSize: 50,
    fontWeight: "400" as const,
    includeFontPadding: true,
    letterSpacing: 0.5,
    lineHeight: 52,
    maxWidth: 220,
    textTransform: "uppercase" as const
  },
  heroSubtitle: {
    color: "#5E5C58",
    fontFamily: fontFamilies.medium,
    fontSize: 15,
    fontWeight: "500" as const,
    letterSpacing: 0,
    lineHeight: 21,
    maxWidth: 230
  },
  heroSeam: {
    backgroundColor: OPENING_BELL_BLACK,
    bottom: -14,
    height: 28,
    left: -8,
    position: "absolute" as const,
    right: -8,
    transform: [{ rotate: "-1.6deg" }]
  }
};

export function LuminousScreen({
  accent = "blue",
  backgroundImage: _backgroundImage,
  bottomInset = "tabs",
  children,
  contentGap = spacing.md,
  immersiveHeader = false,
  testID
}: PropsWithChildren<{
  accent?: LuminousAccent | undefined;
  backgroundImage?: ImageSourcePropType | undefined;
  bottomInset?: "none" | "tabs" | undefined;
  contentGap?: number | undefined;
  immersiveHeader?: boolean | undefined;
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
      <View style={[luminousStyles.screen, { backgroundColor: OPENING_BELL_BLACK }]}>
        <View pointerEvents="none" style={{ bottom: 0, left: 0, overflow: "hidden", position: "absolute", right: 0, top: 0 }}>
          <View style={{ backgroundColor: theme.hairline, height: 1, left: spacing.lg, opacity: 0.42, position: "absolute", right: spacing.lg, top: 0 }} />
        </View>
        <ScrollView
          accessibilityLabel={`${testID.replace(/-/g, " ")} screen`}
          contentContainerStyle={[
            luminousStyles.content,
            {
              gap: contentGap,
              paddingBottom: bottomPadding,
              paddingTop: immersiveHeader ? 0 : Math.max(insets.top + spacing.sm, spacing.lg)
            }
          ]}
          showsVerticalScrollIndicator={false}
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
  heroHeight?: number | undefined;
  heroMeta?: React.ReactNode | undefined;
  heroImage?: ImageSourcePropType | undefined;
  heroImageTreatment?: "muted" | "natural" | undefined;
  immersive?: boolean | undefined;
  subtitle?: string | undefined;
  title: string;
  topInset?: number | undefined;
}

export function ScreenHeader({
  accent: _accent = "blue",
  eyebrow,
  heroHeight,
  heroImage,
  heroImageTreatment = "muted",
  heroMeta,
  immersive = false,
  subtitle,
  title,
  topInset = 0
}: ScreenHeaderProps) {
  const { width } = useWindowDimensions();
  const compact = width < 520;
  const compactHeight = heroHeight ?? (heroMeta ? 330 : 298);
  const regularHeight = heroHeight ? heroHeight + 34 : heroMeta ? 382 : 348;
  const safeHeroInset = immersive ? topInset : 0;
  const resolvedHeight = (compact ? compactHeight : regularHeight) + safeHeroInset;
  if (heroImage) {
    const heroShadow: ViewStyle = Platform.OS === "web" ? ({ boxShadow: "none" } as ViewStyle) : { elevation: 0 };

    return (
      <ImageBackground
        accessibilityLabel={`${title} screen header`}
        imageStyle={[luminousStyles.heroImage, heroImageTreatment === "natural" ? luminousStyles.heroImageNatural : undefined]}
        resizeMode="cover"
        source={heroImage}
        style={[luminousStyles.heroFrame, heroShadow, { marginTop: immersive ? 0 : luminousStyles.heroFrame.marginTop, minHeight: resolvedHeight }]}
      >
        {heroImageTreatment === "muted" ? <View style={luminousStyles.heroOverlay} /> : null}
        <View style={luminousStyles.heroBaseShadow} />
        <View
          style={[
            luminousStyles.heroContent,
            {
              minHeight: resolvedHeight,
              paddingBottom: compact ? spacing.xl : spacing.xxl,
              paddingTop: safeHeroInset + (compact ? spacing.md : spacing.xl)
            }
          ]}
        >
          <CornerIQWordmark alignment="left" editorial tone="dark" />
          <View style={luminousStyles.heroCopy}>
            {eyebrow ? (
              <Text style={{ color: colors.blueIQ, fontFamily: fontFamilies.black, fontSize: 12, fontWeight: "900", letterSpacing: 0, lineHeight: 16, textTransform: "uppercase" }}>
                {eyebrow}
              </Text>
            ) : null}
            <Text adjustsFontSizeToFit minimumFontScale={0.76} numberOfLines={2} style={[luminousStyles.heroTitle, { fontSize: compact ? 50 : 56, lineHeight: compact ? 52 : 58 }]}>
              {title}
            </Text>
            {subtitle ? <Text numberOfLines={2} style={luminousStyles.heroSubtitle}>{subtitle}</Text> : null}
            {heroMeta ? null : <View style={{ backgroundColor: colors.blueIQ, borderRadius: radii.pill, height: 3, marginTop: spacing.sm, width: 42 }} />}
          </View>
          {heroMeta ? <View style={{ maxWidth: 720, width: "100%" }}>{heroMeta}</View> : null}
        </View>
        <View pointerEvents="none" style={luminousStyles.heroSeam} />
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
  accent: _accent = "blue",
  label
}: {
  accent?: LuminousAccent | undefined;
  label: string;
}) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: "rgba(255, 255, 255, 0.075)",
        borderColor: "rgba(255, 255, 255, 0.16)",
        borderRadius: radii.pill,
        borderWidth: 1,
        minHeight: 32,
        justifyContent: "center",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs
      }}
    >
      <Text style={{ color: colors.wrap, fontSize: 12, fontWeight: "800", letterSpacing: 0, lineHeight: 16 }}>
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
        borderRadius: radii.tile,
        flexBasis: "47%",
        flexGrow: 1,
        flexShrink: 1,
        gap: spacing.xs,
        minHeight: 104,
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
