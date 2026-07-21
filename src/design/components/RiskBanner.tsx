import React from "react";
import type { PropsWithChildren } from "react";
import { Text, View } from "react-native";
import { colors, spacing } from "../theme";
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
  const resolvedStatusLabel = statusLabel ?? (tone === "critical" ? "Safety stop" : tone === "info" ? "Notice" : "Caution");
  return (
    <View
      accessibilityLabel={`${title}. ${message}`}
      accessibilityRole="alert"
      style={{
        backgroundColor: "rgba(224, 244, 252, 0.035)",
        borderColor,
        borderRadius: 5,
        borderWidth: 1,
        boxShadow: "none",
        gap: spacing.sm,
        padding: spacing.lg
      }}
    >
      <StatusBadge label={resolvedStatusLabel} tone={tone} />
      <Text style={{ ...typography.cardTitle, color: borderColor }}>{title}</Text>
      <Text style={{ ...typography.body, color: colors.wrap }}>{message}</Text>
      {children}
    </View>
  );
}
