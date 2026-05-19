import React from "react";
import type { PropsWithChildren } from "react";
import { View } from "react-native";
import { colors, radii, spacing } from "../theme";

export function EngineCard({ children }: PropsWithChildren) {
  return (
    <View
      style={{
        backgroundColor: colors.panel,
        borderColor: colors.line,
        borderRadius: radii.card,
        borderWidth: 1,
        padding: spacing.lg
      }}
    >
      {children}
    </View>
  );
}
