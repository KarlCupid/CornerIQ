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
        gap: spacing.sm,
        padding: spacing.lg
      }}
      testID={testID}
    >
      <Text style={{ color: accentColor[accent], fontSize: 12, fontWeight: "800", lineHeight: 16 }}>{title}</Text>
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.sm, minWidth: 0 }}>
          <Text style={{ color: colors.canvas, flexShrink: 1, fontSize: 17, fontWeight: "700", lineHeight: 23 }}>{primaryAction}</Text>
          <Text style={{ ...typography.body, color: colors.wrap }}>{purpose}</Text>
        </View>
      </View>
      <Text style={{ ...typography.subtle, color: colors.wrap }}>
        <Text style={{ color: colors.canvas, fontWeight: "700" }}>Why: </Text>
        {why}
      </Text>
      <Text style={{ ...typography.subtle, color: colors.wrap }}>
        <Text style={{ color: colors.canvas, fontWeight: "700" }}>Optional: </Text>
        {optional}
      </Text>
    </View>
  );
}
