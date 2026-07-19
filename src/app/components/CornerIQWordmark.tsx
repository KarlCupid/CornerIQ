import React from "react";
import { Text, View } from "react-native";
import { colors } from "../../design/theme";
import { fontFamilies } from "../../design/typography";

export function CornerIQWordmark({
  alignment = "center",
  compact = false,
  editorial = false,
  tone = "light"
}: {
  alignment?: "center" | "left" | undefined;
  compact?: boolean | undefined;
  editorial?: boolean | undefined;
  tone?: "dark" | "light" | undefined;
}) {
  const fontSize = editorial ? 30 : compact ? 38 : 48;
  const ink = tone === "dark" ? "#080B0E" : colors.canvas;
  return (
    <View
      accessibilityLabel="CornerIQ"
      accessible
      style={{
        alignItems: alignment === "left" ? "flex-start" : "center",
        alignSelf: alignment === "left" ? "flex-start" : "center",
        justifyContent: "center",
        minHeight: editorial ? 40 : compact ? 54 : 70,
        width: alignment === "left" ? "auto" : "100%"
      }}
    >
      <Text
        selectable={false}
        style={{
          color: ink,
          fontFamily: fontFamilies.extraBold,
          fontSize,
          fontWeight: "800",
          letterSpacing: editorial ? -1 : 0,
          lineHeight: fontSize + (editorial ? 4 : 8),
          textAlign: alignment
        }}
      >
        Corner
        <Text style={{ color: colors.blueIQ }}>IQ</Text>
      </Text>
    </View>
  );
}
