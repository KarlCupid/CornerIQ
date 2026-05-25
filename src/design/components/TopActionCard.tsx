import React from "react";
import { Text, View } from "react-native";
import { colors, radii, spacing } from "../theme";
import { typography } from "../typography";

export function TopActionCard({
  optional,
  primaryAction,
  purpose,
  testID,
  title,
  why
}: {
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
        backgroundColor: colors.panelRaised,
        borderColor: colors.blueIQ,
        borderRadius: radii.card,
        borderWidth: 1,
        borderLeftWidth: 4,
        gap: spacing.md,
        padding: spacing.lg
      }}
      testID={testID}
    >
      <View style={{ gap: spacing.xs }}>
        <Text style={{ ...typography.cardTitle, color: colors.canvas }}>{title}</Text>
        <Text style={{ ...typography.body, color: colors.wrap }}>{purpose}</Text>
      </View>
      <View style={{ gap: spacing.xs }}>
        <Text style={{ color: colors.canvas, fontSize: 13, fontWeight: "800" }}>Do now</Text>
        <Text style={{ color: colors.blueIQ, fontSize: 16, fontWeight: "800", lineHeight: 23 }}>{primaryAction}</Text>
      </View>
      <View style={{ gap: spacing.xs }}>
        <Text style={{ color: colors.canvas, fontSize: 13, fontWeight: "800" }}>Why</Text>
        <Text style={{ color: colors.wrap, fontSize: 14, lineHeight: 20 }}>{why}</Text>
      </View>
      <View style={{ gap: spacing.xs }}>
        <Text style={{ color: colors.canvas, fontSize: 13, fontWeight: "800" }}>Optional</Text>
        <Text style={{ color: colors.wrap, fontSize: 14, lineHeight: 20 }}>{optional}</Text>
      </View>
    </View>
  );
}
