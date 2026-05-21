import React from "react";
import type { PropsWithChildren } from "react";
import { Pressable, Text, View } from "react-native";
import { EngineCard } from "./EngineCard";
import { colors, spacing } from "../theme";
import { typography } from "../typography";

export function ActionCard({
  actionLabel,
  children,
  disabled = false,
  onAction,
  subtitle,
  title
}: PropsWithChildren<{
  actionLabel?: string | undefined;
  disabled?: boolean | undefined;
  onAction?: (() => void) | undefined;
  subtitle?: string | undefined;
  title: string;
}>) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={{ ...typography.cardTitle, color: colors.canvas }}>{title}</Text>
        {subtitle ? <Text style={{ ...typography.body, color: colors.wrap }}>{subtitle}</Text> : null}
        {children}
        {actionLabel && onAction ? (
          <Pressable
            accessibilityLabel={actionLabel}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={onAction}
            style={{
              alignItems: "center",
              backgroundColor: colors.blueIQ,
              borderRadius: 8,
              justifyContent: "center",
              minHeight: 48,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.sm
            }}
          >
            <Text style={{ color: colors.cornerBlack, fontSize: 15, fontWeight: "800" }}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </EngineCard>
  );
}
