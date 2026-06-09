import React from "react";
import type { PropsWithChildren } from "react";
import { View } from "react-native";
import { glassStyles } from "../glass";
import { spacing } from "../theme";

export function EngineCard({ children }: PropsWithChildren) {
  return (
    <View
      style={{
        ...glassStyles.card,
        gap: spacing.md,
        padding: spacing.lg
      }}
    >
      {children}
    </View>
  );
}
