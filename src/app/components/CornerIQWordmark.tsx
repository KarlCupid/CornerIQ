import React from "react";
import { Text, View } from "react-native";
import { colors } from "../../design/theme";

export function CornerIQWordmark({ compact = false }: { compact?: boolean | undefined }) {
  const fontSize = compact ? 38 : 48;
  return (
    <View
      accessibilityLabel="CornerIQ"
      accessible
      style={{
        alignItems: "center",
        alignSelf: "center",
        justifyContent: "center",
        minHeight: compact ? 54 : 70,
        width: "100%"
      }}
    >
      <Text
        selectable={false}
        style={{
          color: colors.canvas,
          fontSize,
          fontWeight: "800",
          lineHeight: fontSize + 8,
          textAlign: "center"
        }}
      >
        Corner
        <Text style={{ color: colors.blueIQ }}>IQ</Text>
      </Text>
    </View>
  );
}
