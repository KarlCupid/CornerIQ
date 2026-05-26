import React from "react";
import type { PropsWithChildren } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii, spacing } from "../theme";
import { typography } from "../typography";

const FLOATING_TAB_BAR_HEIGHT = 76;

const luminousStyles = {
  backgroundTopWash: {
    backgroundColor: "rgba(39, 206, 241, 0.055)",
    height: 180,
    left: 0,
    pointerEvents: "none" as const,
    position: "absolute" as const,
    right: 0,
    top: 0
  },
  content: {
    gap: spacing.xl,
    flexGrow: 1,
    paddingHorizontal: spacing.lg
  },
  headerPill: {
    alignSelf: "flex-start" as const,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radii.pill,
    justifyContent: "center" as const,
    minHeight: 28,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  headerPillText: {
    color: colors.blueIQ,
    fontSize: 12,
    fontWeight: "800" as const,
    lineHeight: 16
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
  }
};

export type LuminousAccent = "blue" | "green" | "orange" | "purple" | "gold" | "red";

export const accentColor: Record<LuminousAccent, string> = {
  blue: colors.blueIQ,
  gold: colors.gold,
  green: colors.readyGreen,
  orange: colors.amberCaution,
  purple: colors.powerPurple,
  red: colors.redCorner
};

export const accentWash: Record<LuminousAccent, string> = {
  blue: "rgba(39, 206, 241, 0.16)",
  gold: "rgba(255, 216, 97, 0.16)",
  green: "rgba(56, 226, 138, 0.15)",
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
      ? Math.max(insets.bottom, 8) + FLOATING_TAB_BAR_HEIGHT + spacing.xl
      : Math.max(insets.bottom, spacing.lg) + spacing.lg;

  return (
    <View style={luminousStyles.screen}>
      <View style={luminousStyles.backgroundTopWash} />
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

export function ScreenHeader({ eyebrow, title }: { eyebrow?: string | undefined; title: string }) {
  return (
    <View style={{ gap: spacing.sm }}>
      {eyebrow ? (
        <View style={luminousStyles.headerPill}>
          <Text style={luminousStyles.headerPillText}>{eyebrow}</Text>
        </View>
      ) : null}
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
        backgroundColor: accentWash[accent],
        borderColor: `${accentColor[accent]}55`,
        borderWidth: 1,
        borderRadius: radii.pill,
        minHeight: 30,
        justifyContent: "center",
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xs
      }}
    >
      <Text style={{ color: accent === "gold" ? colors.gold : accentColor[accent], fontSize: 12, fontWeight: "800", lineHeight: 16 }}>
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
  accent = "blue",
  label,
  meta,
  value
}: {
  accent?: LuminousAccent | undefined;
  label: string;
  meta?: string | undefined;
  value: string;
}) {
  return (
    <View
      accessibilityLabel={`${label}: ${value}${meta ? `. ${meta}` : ""}`}
      style={{
        backgroundColor: colors.panelRaised,
        borderColor: colors.line,
        borderRadius: radii.tile,
        borderWidth: 1,
        flexBasis: "47%",
        flexGrow: 1,
        flexShrink: 1,
        gap: spacing.xs,
        minHeight: 124,
        minWidth: 136,
        overflow: "hidden",
        padding: spacing.md
      }}
    >
      <View
        style={{
          backgroundColor: accentColor[accent],
          height: 2,
          left: spacing.md,
          opacity: 0.78,
          pointerEvents: "none",
          position: "absolute",
          right: spacing.md,
          top: 0
        }}
      />
      <View
        style={{
          alignSelf: "flex-start",
          backgroundColor: accentColor[accent],
          borderRadius: 4,
          height: 8,
          opacity: 0.92,
          width: 8
        }}
      />
      <Text numberOfLines={1} style={{ ...typography.tileLabel, color: colors.wrap, flexShrink: 1, minWidth: 0 }}>
        {label}
      </Text>
      <Text numberOfLines={2} style={{ ...typography.tileValue, color: colors.canvas, flexShrink: 1, minWidth: 0 }}>
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
