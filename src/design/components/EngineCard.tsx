import React from "react";
import type { PropsWithChildren } from "react";
import { PremiumCard } from "./PremiumPrimitives";

export function EngineCard({ children }: PropsWithChildren) {
  return (
    <PremiumCard density="regular">
      {children}
    </PremiumCard>
  );
}
