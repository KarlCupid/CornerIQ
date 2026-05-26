import React, { useState } from "react";
import type { PropsWithChildren } from "react";
import { Pressable, Text, View } from "react-native";
import { EngineCard } from "./EngineCard";
import { colors, radii, spacing } from "../theme";

export function DisclosureCard({
  children,
  defaultOpen = false,
  summary,
  title
}: PropsWithChildren<{
  defaultOpen?: boolean | undefined;
  summary?: string | undefined;
  title: string;
}>) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setOpen((value) => !value)}
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
            <Text style={{ color: colors.cornerBlack, fontSize: 15, fontWeight: "800" }}>{open ? `Hide ${title}` : `Show ${title}`}</Text>
          </Pressable>
        {summary ? <Text style={{ color: colors.wrap, fontSize: 13, lineHeight: 19 }}>{summary}</Text> : null}
        {open ? <View style={{ gap: spacing.sm }}>{children}</View> : null}
      </View>
    </EngineCard>
  );
}
