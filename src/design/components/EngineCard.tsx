import React from "react";
import type { PropsWithChildren } from "react";
import { View } from "react-native";
import { radii, spacing } from "../theme";

export function EngineCard({ children }: PropsWithChildren) {
  return (
    <View
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.075)",
        borderColor: "rgba(255, 255, 255, 0.12)",
        borderRadius: radii.card,
        borderWidth: 1,
        gap: spacing.md,
        padding: spacing.lg
      }}
    >
      {children}
    </View>
  );
}
