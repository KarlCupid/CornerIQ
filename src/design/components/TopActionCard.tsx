import React from "react";
import { Text, View } from "react-native";
import { glassStyles } from "../glass";
import { accentColor, type LuminousAccent, useLuminousScreenTheme } from "../luminousTheme";
import { colors, spacing } from "../theme";
import { typography } from "../typography";

export function TopActionCard({
  accent = "blue",
  optional,
  primaryAction,
  purpose,
  testID,
  title,
  why
}: {
  accent?: LuminousAccent | undefined;
  optional: string;
  primaryAction: string;
  purpose: string;
  testID?: string | undefined;
  title: string;
  why: string;
}) {
  const theme = useLuminousScreenTheme();
  return (
    <View
      style={{
        ...glassStyles.card,
        backgroundColor: theme.card,
        borderColor: theme.cardBorder,
        boxShadow: `0 18px 40px rgba(0, 0, 0, 0.34), 0 0 20px ${theme.strongGlow}`,
        gap: spacing.md,
        padding: spacing.lg
      }}
      testID={testID}
    >
      <View style={{ gap: spacing.xs, maxWidth: 760 }}>
        <Text style={{ color: accentColor[accent], fontSize: 12, fontWeight: "800", lineHeight: 16 }}>{title}</Text>
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
            <Text style={{ color: colors.canvas, flexShrink: 1, fontSize: 20, fontWeight: "800", lineHeight: 26 }}>{primaryAction}</Text>
            <Text style={{ color: colors.wrap, fontSize: 15, fontWeight: "400", lineHeight: 21 }}>{purpose}</Text>
          </View>
        </View>
      </View>
      <View style={{ borderBottomColor: "rgba(255, 255, 255, 0.09)", borderBottomWidth: 1, borderTopColor: "rgba(255, 255, 255, 0.09)", borderTopWidth: 1, gap: spacing.xs, paddingVertical: spacing.sm }}>
        <Text numberOfLines={2} style={{ ...typography.subtle, color: colors.wrap }}>
          <Text style={{ color: colors.canvas, fontWeight: "700" }}>Why: </Text>
          {why}
        </Text>
        <Text numberOfLines={2} style={{ ...typography.subtle, color: colors.wrap }}>
          <Text style={{ color: colors.canvas, fontWeight: "700" }}>Later: </Text>
          {optional}
        </Text>
      </View>
    </View>
  );
}
