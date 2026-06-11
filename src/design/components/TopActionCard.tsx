import React from "react";
import { Text, View } from "react-native";
import { glassStyles } from "../glass";
import { colors, spacing } from "../theme";
import { typography } from "../typography";
import { accentColor, type LuminousAccent } from "./LuminousScreen";

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
  return (
    <View
      style={{
        ...glassStyles.card,
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
