import React from "react";
import type { PropsWithChildren } from "react";
import { Text, View } from "react-native";
import { colors, radii, spacing } from "../theme";
import { typography } from "../typography";
import { StatusBadge, type StatusBadgeTone } from "./StatusBadge";

export function RiskBanner({
  children,
  message,
  statusLabel,
  title,
  tone = "caution"
}: PropsWithChildren<{
  message: string;
  statusLabel?: string | undefined;
  title: string;
  tone?: Extract<StatusBadgeTone, "info" | "caution" | "critical"> | undefined;
}>) {
  const borderColor = tone === "critical" ? colors.redCorner : tone === "info" ? colors.blueIQ : colors.amberCaution;
  const resolvedStatusLabel = statusLabel ?? (tone === "critical" ? "Hard stop" : tone === "info" ? "Notice" : "Caution");
  return (
    <View
      accessibilityLabel={`${title}. ${message}`}
      accessibilityRole="alert"
      style={{
        backgroundColor: colors.panel,
        borderColor,
        borderRadius: radii.card,
        borderWidth: 1,
        gap: spacing.sm,
        overflow: "hidden",
        padding: spacing.lg
      }}
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
      <StatusBadge label={resolvedStatusLabel} tone={tone} />
      <Text style={{ ...typography.cardTitle, color: borderColor }}>{title}</Text>
      <Text style={{ ...typography.body, color: colors.wrap }}>{message}</Text>
      {children}
    </View>
  );
}
