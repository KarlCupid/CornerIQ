import React from "react";
import { Text, View } from "react-native";
import { colors, radii, spacing } from "../theme";
import { typography } from "../typography";
import { AccentPill, LuminousOrb, type LuminousAccent } from "./LuminousScreen";

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
        gap: spacing.lg,
        overflow: "hidden",
        padding: spacing.xl
      }}
      testID={testID}
    >
      <View
        pointerEvents="none"
        style={{
          backgroundColor: colors.glassRail,
          borderRadius: radii.pill,
          height: 52,
          left: 0,
          opacity: 0.66,
          position: "absolute",
          right: 0,
          top: 0
        }}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        <AccentPill accent={accent} label={title} />
        <AccentPill accent="blue" label="CornerIQ" />
      </View>
      <View style={{ alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: spacing.lg }}>
        <View style={{ flex: 1, gap: spacing.sm, minWidth: 220 }}>
          <Text style={{ color: colors.canvas, fontSize: 13, fontWeight: "800" }}>Do now</Text>
          <Text style={{ color: colors.canvas, fontSize: 36, fontWeight: "900", lineHeight: 42 }}>{primaryAction}</Text>
          <Text style={{ ...typography.body, color: colors.wrap }}>{purpose}</Text>
        </View>
        <View style={{ alignItems: "center", flexGrow: 1 }}>
          <LuminousOrb accent={accent} size={128} />
        </View>
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
