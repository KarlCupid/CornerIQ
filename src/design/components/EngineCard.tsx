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
        gap: spacing.md,
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
      {children}
    </View>
  );
}
