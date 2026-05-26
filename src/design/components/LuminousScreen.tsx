import React from "react";
import type { PropsWithChildren } from "react";
import { ScrollView, Text, View } from "react-native";
import { colors, radii, spacing } from "../theme";

const luminousStyles = {
  ambientLeft: {
    backgroundColor: "rgba(39, 206, 241, 0.22)",
    borderRadius: 180,
    height: 360,
    left: -154,
    position: "absolute" as const,
    top: 92,
    width: 360
  },
  ambientRight: {
    backgroundColor: "rgba(56, 226, 138, 0.12)",
    borderRadius: 170,
    bottom: 120,
    height: 340,
    position: "absolute" as const,
    right: -188,
    width: 340
  },
  ambientTop: {
    backgroundColor: "rgba(115, 77, 160, 0.42)",
    borderRadius: 190,
    height: 380,
    position: "absolute" as const,
    right: -142,
    top: -96,
    width: 380
  },
  cardShine: {
    backgroundColor: colors.glassRail,
    borderRadius: radii.pill,
    height: 42,
    left: 0,
    opacity: 0.62,
    position: "absolute" as const,
    right: 0,
    top: 0
  },
  content: {
    gap: spacing.xl,
    padding: spacing.lg,
    paddingBottom: 128,
    paddingTop: spacing.xxl
  },
  headerPill: {
    alignSelf: "flex-start" as const,
    backgroundColor: colors.canvas,
    borderRadius: radii.pill,
    justifyContent: "center" as const,
    minHeight: 30,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs
  },
  headerPillText: {
    color: colors.blueIQ,
    fontSize: 12,
    fontWeight: "900" as const
  },
  screen: {
    backgroundColor: colors.cornerBlack,
    flex: 1
  },
  scrollFill: {
    flex: 1
  },
  title: {
    color: colors.canvas,
    fontSize: 44,
    fontWeight: "900" as const,
    lineHeight: 52
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

export function LuminousScreen({
  bottomInset = "tabs",
  children,
  testID
}: PropsWithChildren<{
  bottomInset?: "none" | "tabs" | undefined;
  testID: string;
}>) {
  return (
    <View style={[luminousStyles.screen, bottomInset === "tabs" ? { paddingBottom: 104 } : null]}>
      <View pointerEvents="none" style={luminousStyles.ambientTop} />
      <View pointerEvents="none" style={luminousStyles.ambientLeft} />
      <View pointerEvents="none" style={luminousStyles.ambientRight} />
      <ScrollView
        accessibilityLabel={`${testID.replace(/-/g, " ")} screen`}
        contentContainerStyle={luminousStyles.content}
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

export function LuminousOrb({
  accent = "blue",
  size = 132
}: {
  accent?: LuminousAccent | undefined;
  size?: number | undefined;
}) {
  const color = accentColor[accent];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{
        alignItems: "center",
        backgroundColor: color,
        borderRadius: size / 2,
        height: size,
        justifyContent: "center",
        opacity: 0.94,
        width: size
      }}
    >
      <View
        style={{
          backgroundColor: accent === "orange" ? colors.redCorner : accent === "purple" ? colors.blueIQ : colors.powerPurple,
          borderRadius: size / 4,
          height: size * 0.48,
          opacity: 0.26,
          width: size * 0.48
        }}
      />
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
        backgroundColor: accentColor[accent],
        borderRadius: radii.pill,
        minHeight: 30,
        justifyContent: "center",
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xs
      }}
    >
      <Text style={{ color: accent === "gold" ? colors.cornerBlack : colors.canvas, fontSize: 12, fontWeight: "900" }}>
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
        backgroundColor: "rgba(255, 255, 255, 0.92)",
        borderRadius: radii.pill,
        height: 12,
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
        flex: 1,
        gap: spacing.xs,
        minWidth: 144,
        overflow: "hidden",
        padding: spacing.md
      }}
    >
      <View pointerEvents="none" style={luminousStyles.cardShine} />
      <View
        style={{
          alignSelf: "flex-end",
          backgroundColor: accentColor[accent],
          borderRadius: 14,
          height: 28,
          marginBottom: -spacing.md,
          width: 28
        }}
      />
      <Text style={{ color: colors.wrap, fontSize: 13, fontWeight: "900", lineHeight: 18 }}>{label}</Text>
      <Text style={{ color: colors.canvas, fontSize: 26, fontWeight: "900", lineHeight: 32 }}>{value}</Text>
      {meta ? <Text style={{ color: colors.mutedText, fontSize: 14, lineHeight: 20 }}>{meta}</Text> : null}
    </View>
  );
}
