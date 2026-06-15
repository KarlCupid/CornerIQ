import React from "react";
import type { PropsWithChildren } from "react";
import { Text, View } from "react-native";
import { useLuminousScreenTheme } from "../luminousTheme";
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
  const theme = useLuminousScreenTheme();
  const borderColor = tone === "critical" ? colors.redCorner : tone === "info" ? colors.blueIQ : colors.amberCaution;
  const resolvedStatusLabel = statusLabel ?? (tone === "critical" ? "Safety stop" : tone === "info" ? "Notice" : "Caution");
  return (
    <View
      accessibilityLabel={`${title}. ${message}`}
      accessibilityRole="alert"
      style={{
        backgroundColor: theme.card,
        borderColor,
        borderRadius: radii.card,
        borderWidth: 1,
        boxShadow: `0 18px 40px rgba(0, 0, 0, 0.34), 0 0 18px ${theme.strongGlow}`,
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
