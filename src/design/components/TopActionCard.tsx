import React from "react";
import { Text, View } from "react-native";
import { colors, radii, spacing } from "../theme";
import { typography } from "../typography";
import { AccentPill, accentColor, type LuminousAccent } from "./LuminousScreen";

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
        borderColor: colors.lineStrong,
        borderRadius: radii.card,
        borderWidth: 1,
        gap: spacing.md,
        overflow: "hidden",
        padding: spacing.lg
      }}
      testID={testID}
    >
      <View
        pointerEvents="none"
        style={{
          backgroundColor: colors.glassRail,
          height: 1,
          left: 0,
          position: "absolute",
          right: 0,
          top: 0
        }}
      />
      <View
        pointerEvents="none"
        style={{
          backgroundColor: accentColor[accent],
          height: 3,
          left: 0,
          opacity: 0.72,
          position: "absolute",
          right: 0,
          top: 0
        }}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        <AccentPill accent={accent} label={title} />
        <AccentPill accent="blue" label="CornerIQ" />
      </View>
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <View
          style={{
            backgroundColor: accentColor[accent],
            borderRadius: radii.pill,
            height: 10,
            opacity: 0.72,
            marginTop: 7,
            width: 10
          }}
        />
        <View style={{ flex: 1, gap: spacing.sm, minWidth: 0 }}>
          <Text style={{ color: colors.canvas, fontSize: 12, fontWeight: "800", lineHeight: 16 }}>Do now</Text>
          <Text style={{ ...typography.cardTitle, color: colors.canvas, flexShrink: 1 }}>{primaryAction}</Text>
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
