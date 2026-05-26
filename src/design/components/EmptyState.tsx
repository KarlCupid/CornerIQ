import React from "react";
import { Pressable, Text, View } from "react-native";
import { EngineCard } from "./EngineCard";
import { colors, radii, spacing } from "../theme";
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
            accessibilityHint="Runs the empty-state action for this section."
            accessibilityRole="button"
            onPress={onAction}
            style={{
              alignItems: "center",
              backgroundColor: "rgba(255, 255, 255, 0.92)",
              borderColor: "rgba(255, 255, 255, 0.92)",
              borderRadius: radii.control,
              borderWidth: 1,
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
