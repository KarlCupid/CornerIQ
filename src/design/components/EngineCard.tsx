import React from "react";
import type { PropsWithChildren } from "react";
import { View } from "react-native";
import { PremiumCard } from "./PremiumPrimitives";
import { spacing } from "../theme";

const EditorialSurfaceContext = React.createContext(false);

export function EditorialSurfaceProvider({ children }: PropsWithChildren) {
  return <EditorialSurfaceContext.Provider value>{children}</EditorialSurfaceContext.Provider>;
}

export function EngineCard({ children }: PropsWithChildren) {
  const editorial = React.useContext(EditorialSurfaceContext);
  if (editorial) {
    return <View style={{ backgroundColor: "transparent", borderBottomColor: "rgba(205, 239, 247, 0.14)", borderBottomWidth: 1, gap: spacing.md, paddingVertical: spacing.lg }}>{children}</View>;
  }
  return (
    <PremiumCard density="regular">
      {children}
    </PremiumCard>
  );
}
