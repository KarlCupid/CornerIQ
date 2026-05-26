import React from "react";
import { Text, View } from "react-native";
import { colors, radii, spacing } from "../theme";
import { typography } from "../typography";
import { accentColor, accentWash, type LuminousAccent } from "./LuminousScreen";

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
        backgroundColor: colors.panel,
        borderColor: colors.line,
        borderRadius: radii.card,
        borderWidth: 1,
        gap: spacing.md,
        overflow: "hidden",
        padding: spacing.lg
      }}
      testID={testID}
    >
      <View
        style={{
          backgroundColor: accentWash[accent],
          height: 2,
          left: spacing.lg,
          opacity: 0.7,
          pointerEvents: "none",
          position: "absolute",
          right: spacing.lg,
          top: 0
        }}
      />
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
        <View
          style={{
            backgroundColor: accentColor[accent],
            borderRadius: 4,
            height: 8,
            opacity: 0.9,
            width: 8
          }}
        />
        <Text style={{ color: accentColor[accent], fontSize: 12, fontWeight: "800", lineHeight: 16 }}>{title}</Text>
      </View>
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.sm, minWidth: 0 }}>
          <Text style={{ color: colors.canvas, fontSize: 12, fontWeight: "800", lineHeight: 16 }}>Do now</Text>
          <Text style={{ color: colors.canvas, flexShrink: 1, fontSize: 18, fontWeight: "700", lineHeight: 24 }}>{primaryAction}</Text>
          <Text style={{ ...typography.body, color: colors.wrap }}>{purpose}</Text>
        </View>
      </View>
      <Text style={{ ...typography.subtle, color: colors.wrap }}>
        <Text style={{ color: colors.canvas, fontWeight: "800" }}>Why: </Text>
        {why}
      </Text>
      <Text style={{ ...typography.subtle, color: colors.wrap }}>
        <Text style={{ color: colors.canvas, fontWeight: "800" }}>Optional: </Text>
        {optional}
      </Text>
    </View>
  );
}
