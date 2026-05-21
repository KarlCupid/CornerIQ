import React from "react";
import { Pressable, Text, View } from "react-native";
import { EngineCard } from "./EngineCard";
import { colors, spacing } from "../theme";
import { typography } from "../typography";

export function EmptyState({
  actionLabel,
  message,
  onAction,
  title
}: {
  actionLabel?: string | undefined;
  message: string;
  onAction?: (() => void) | undefined;
  title: string;
}) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={{ ...typography.cardTitle, color: colors.canvas }}>{title}</Text>
        <Text style={{ ...typography.body, color: colors.wrap }}>{message}</Text>
        {actionLabel && onAction ? (
          <Pressable
            accessibilityLabel={actionLabel}
            accessibilityRole="button"
            onPress={onAction}
            style={{
              alignItems: "center",
              borderColor: colors.line,
              borderRadius: 8,
              borderWidth: 1,
              justifyContent: "center",
              minHeight: 48,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.sm
            }}
          >
            <Text style={{ color: colors.canvas, fontSize: 15, fontWeight: "700" }}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </EngineCard>
  );
}
