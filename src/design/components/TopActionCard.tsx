import React from "react";
import { Text, View } from "react-native";
import { colors, radii, spacing } from "../theme";
import { typography } from "../typography";
import type { LuminousAccent } from "./LuminousScreen";

export function TopActionCard({
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
        backgroundColor: "rgba(255, 255, 255, 0.075)",
        borderColor: "rgba(255, 255, 255, 0.12)",
        borderRadius: radii.card,
        borderWidth: 1,
        gap: spacing.md,
        padding: 18
      }}
      testID={testID}
    >
      <Text style={{ color: colors.wrap, fontSize: 12, fontWeight: "700", lineHeight: 16 }}>{title}</Text>
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.sm, minWidth: 0 }}>
          <Text style={{ color: colors.canvas, fontSize: 12, fontWeight: "700", lineHeight: 16 }}>Do now</Text>
          <Text style={{ color: colors.canvas, flexShrink: 1, fontSize: 18, fontWeight: "600", lineHeight: 24 }}>{primaryAction}</Text>
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
