import React from "react";
import { Text, View } from "react-native";
import { colors, spacing } from "../theme";

export type StatusBadgeTone = "neutral" | "info" | "success" | "caution" | "critical";

const toneColor: Record<StatusBadgeTone, string> = {
  caution: colors.amberCaution,
  critical: colors.redCorner,
  info: colors.blueIQ,
  neutral: colors.wrap,
  success: colors.readyGreen
};

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: StatusBadgeTone }) {
  const color = toneColor[tone];
  return (
    <View
      accessibilityLabel={`Status: ${label}`}
      style={{
        alignSelf: "flex-start",
        backgroundColor: "rgba(255, 255, 255, 0.065)",
        borderColor: `${color}5F`,
        borderLeftColor: color,
        borderLeftWidth: 3,
        borderRadius: 10,
        borderWidth: 1,
        justifyContent: "center",
        minHeight: 32,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs
      }}
    >
      <Text numberOfLines={1} style={{ color, fontSize: 12, fontWeight: "800", letterSpacing: 0, lineHeight: 16 }}>{label}</Text>
    </View>
  );
}
