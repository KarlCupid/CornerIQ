import React from "react";
import { Pressable, Text, View } from "react-native";
import { EngineCard } from "./EngineCard";
import { glassStyles } from "../glass";
import { useLuminousScreenTheme } from "../luminousTheme";
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
  const theme = useLuminousScreenTheme();
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
              ...glassStyles.control,
              alignItems: "center",
              backgroundColor: theme.control,
              borderColor: theme.controlBorder,
              justifyContent: "center",
              minHeight: 44,
              paddingHorizontal: spacing.md,
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
