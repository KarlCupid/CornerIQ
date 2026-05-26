import React from "react";
import { Text, View } from "react-native";
import { colors, radii, spacing } from "../theme";

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
        backgroundColor: color,
        borderColor: color,
        borderRadius: radii.control,
        borderWidth: 1,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs
      }}
    >
      <Text style={{ color: tone === "caution" ? colors.cornerBlack : colors.canvas, fontSize: 12, fontWeight: "900" }}>{label}</Text>
    </View>
  );
}
