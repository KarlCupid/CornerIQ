import React from "react";
import type { PropsWithChildren } from "react";
import { Text, View } from "react-native";
import { colors, radii, spacing } from "../theme";
import { typography } from "../typography";
import { StatusBadge, type StatusBadgeTone } from "./StatusBadge";

export function RiskBanner({
  children,
  message,
  title,
  tone = "caution"
}: PropsWithChildren<{
  message: string;
  title: string;
  tone?: Extract<StatusBadgeTone, "info" | "caution" | "critical"> | undefined;
}>) {
  const borderColor = tone === "critical" ? colors.redCorner : tone === "info" ? colors.blueIQ : colors.amberCaution;
  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: colors.panelRaised,
        borderColor,
        borderRadius: radii.card,
        borderWidth: 1,
        gap: spacing.sm,
        padding: spacing.lg
      }}
    >
      <StatusBadge label={tone === "critical" ? "Hard stop" : tone === "info" ? "Notice" : "Caution"} tone={tone} />
      <Text style={{ ...typography.cardTitle, color: borderColor }}>{title}</Text>
      <Text style={{ ...typography.body, color: colors.wrap }}>{message}</Text>
      {children}
    </View>
  );
}
