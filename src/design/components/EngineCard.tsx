import React from "react";
import type { PropsWithChildren } from "react";
import { View } from "react-native";
import { glassStyles } from "../glass";
import { useLuminousScreenTheme } from "../luminousTheme";
import { spacing } from "../theme";

export function EngineCard({ children }: PropsWithChildren) {
  const theme = useLuminousScreenTheme();
  return (
    <View
      style={{
        ...glassStyles.card,
        backgroundColor: theme.card,
        borderColor: theme.cardBorder,
        boxShadow: `0 18px 40px rgba(0, 0, 0, 0.34), 0 0 24px ${theme.strongGlow}`,
        gap: spacing.md,
        padding: spacing.md
      }}
    >
      {children}
    </View>
  );
}
