import React from "react";
import { Text, View } from "react-native";
import { colors, spacing } from "../theme";

export type StatusBadgeTone = "neutral" | "info" | "success" | "caution" | "critical";

export function StatusBadge({ label, tone: _tone = "neutral" }: { label: string; tone?: StatusBadgeTone }) {
  return (
    <View
      accessibilityLabel={`Status: ${label}`}
      style={{
        alignSelf: "flex-start",
        backgroundColor: "rgba(255, 255, 255, 0.075)",
        borderColor: "rgba(255, 255, 255, 0.16)",
        borderRadius: 4,
        borderWidth: 1,
        justifyContent: "center",
        minHeight: 32,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs
      }}
    >
      <Text numberOfLines={1} style={{ color: colors.wrap, fontSize: 12, fontWeight: "800", letterSpacing: 0, lineHeight: 16 }}>{label}</Text>
    </View>
  );
}
