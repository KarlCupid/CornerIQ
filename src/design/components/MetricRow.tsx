import React from "react";
import { Text, View } from "react-native";
import { useLuminousScreenTheme } from "../luminousTheme";
import { colors, spacing } from "../theme";

export function MetricRow({ label, value }: { label: string; value: string }) {
  const theme = useLuminousScreenTheme();
  return (
    <View
      accessibilityLabel={`${label}: ${value}`}
      style={{
        alignItems: "flex-start",
        borderBottomColor: theme.hairline,
        borderBottomWidth: 1,
        gap: spacing.xs,
        paddingVertical: spacing.sm
      }}
    >
      <Text style={{ color: colors.wrap, fontSize: 13, lineHeight: 18 }}>{label}</Text>
      <Text style={{ color: colors.canvas, fontSize: 15, fontWeight: "700", lineHeight: 21 }}>{value}</Text>
    </View>
  );
}
