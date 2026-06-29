import React from "react";
import type { PropsWithChildren } from "react";
import { ImageBackground, Platform, ScrollView, Text, useWindowDimensions, View, type ImageSourcePropType, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { glassStyles } from "../glass";
import { accentColor, LuminousScreenThemeContext, luminousScreenThemes, type LuminousAccent, useLuminousScreenTheme } from "../luminousTheme";
import { colors, radii, spacing } from "../theme";
import { fontFamilies, typography } from "../typography";

export { accentColor, accentWash, luminousScreenThemes, useLuminousScreenTheme, type LuminousAccent } from "../luminousTheme";

const TAB_SCREEN_BOTTOM_PADDING = 104;

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
    borderBottomColor: "rgba(255, 255, 255, 0.13)",
    borderCurve: "continuous" as const,
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    marginHorizontal: -spacing.lg,
    marginBottom: -spacing.lg,
    marginTop: -spacing.sm,
    minHeight: 132,
    overflow: "hidden" as const
  },
  heroImage: {
    borderRadius: 0
  },
  heroOverlay: {
    backgroundColor: "rgba(2, 5, 12, 0.2)",
    bottom: 0,
    left: 0,
    position: "absolute" as const,
    right: 0,
    top: 0
  },
  heroBaseShadow: {
    backgroundColor: "rgba(0, 0, 0, 0.28)",
    bottom: 0,
    height: "54%" as const,
    left: 0,
    position: "absolute" as const,
    right: 0
  },
  heroContent: {
    gap: spacing.xl,
    justifyContent: "flex-start" as const,
    minHeight: 132,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: 58
  },
  heroCopy: {
    gap: spacing.xs,
    maxWidth: 430,
    minWidth: 0
  },
  heroTitle: {
    color: colors.canvas,
    fontFamily: fontFamilies.black,
    fontSize: 40,
    fontWeight: "900" as const,
    letterSpacing: 0,
    lineHeight: 46,
    maxWidth: 420
  },
  heroSubtitle: {
    color: colors.wrap,
    fontFamily: fontFamilies.medium,
    fontSize: 15,
    fontWeight: "500" as const,
    letterSpacing: 0,
    lineHeight: 21,
    maxWidth: 340
  }
};

export function LuminousScreen({
  accent = "blue",
  backgroundImage: _backgroundImage,
  bottomInset = "tabs",
  children,
  testID
}: PropsWithChildren<{
  accent?: LuminousAccent | undefined;
  backgroundImage?: ImageSourcePropType | undefined;
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
      <View style={[luminousStyles.screen, { backgroundColor: colors.cornerBlack }]}>
        <View pointerEvents="none" style={{ bottom: 0, left: 0, overflow: "hidden", position: "absolute", right: 0, top: 0 }}>
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
  heroHeight?: number | undefined;
  heroMeta?: React.ReactNode | undefined;
  heroImage?: ImageSourcePropType | undefined;
  subtitle?: string | undefined;
  title: string;
}

export function ScreenHeader({
  accent = "blue",
  eyebrow,
  heroHeight,
  heroImage,
  heroMeta,
  subtitle,
  title
}: ScreenHeaderProps) {
  const { width } = useWindowDimensions();
  const theme = useLuminousScreenTheme();
  const compact = width < 520;
  const compactHeight = heroHeight ?? (heroMeta ? 282 : 132);
  const regularHeight = heroHeight ? heroHeight + 34 : heroMeta ? 354 : 336;
  if (heroImage) {
    const heroShadow: ViewStyle =
      Platform.OS === "web"
        ? ({ boxShadow: `0 18px 42px rgba(0, 0, 0, 0.36), 0 0 22px ${theme.strongGlow}` } as ViewStyle)
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
        style={[luminousStyles.heroFrame, heroShadow, { borderBottomColor: theme.cardBorder, marginBottom: compact ? -spacing.md : 0, minHeight: compact ? compactHeight : regularHeight }]}
      >
        <View style={[luminousStyles.heroOverlay, { backgroundColor: `${theme.background}33` }]} />
        <View style={[luminousStyles.heroBaseShadow, { backgroundColor: `${theme.background}A8` }]} />
        <View
          style={[
            luminousStyles.heroContent,
            {
              minHeight: compact ? compactHeight : regularHeight,
              paddingBottom: compact ? spacing.md : spacing.xxl,
              paddingTop: compact ? 34 : 72
            }
          ]}
        >
          <View style={luminousStyles.heroCopy}>
            {eyebrow ? (
              <Text style={{ color: accentColor[accent], fontSize: 13, fontWeight: "900", letterSpacing: 0, lineHeight: 17, textTransform: "uppercase" }}>
                {eyebrow}
              </Text>
            ) : null}
            <Text adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={2} style={[luminousStyles.heroTitle, { fontSize: compact ? 41 : 44, lineHeight: compact ? 47 : 50 }]}>
              {title}
            </Text>
            {subtitle ? <Text numberOfLines={2} style={luminousStyles.heroSubtitle}>{subtitle}</Text> : null}
            {heroMeta ? null : <View style={{ backgroundColor: accentColor[accent], borderRadius: radii.pill, height: 3, marginTop: spacing.sm, width: 54 }} />}
          </View>
          {heroMeta ? <View style={{ maxWidth: 720, width: "100%" }}>{heroMeta}</View> : null}
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
