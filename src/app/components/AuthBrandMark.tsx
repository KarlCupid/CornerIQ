import React from "react";
import { Text, View } from "react-native";
import { colors, spacing } from "../../design/theme";

export function AuthBackdrop({ variant = "auth" }: { variant?: "auth" | "loading" | undefined }) {
  return (
    <View pointerEvents="none" style={{ bottom: 0, left: 0, overflow: "hidden", position: "absolute", right: 0, top: 0 }}>
      <View
        style={{
          backgroundColor: "rgba(39, 206, 241, 0.07)",
          borderRadius: 220,
          height: 360,
          left: "14%",
          position: "absolute",
          right: "14%",
          top: variant === "loading" ? 64 : 88
        }}
      />
      <View
        style={{
          backgroundColor: "rgba(255, 82, 101, 0.12)",
          borderRadius: 120,
          bottom: variant === "loading" ? 18 : 74,
          height: 120,
          position: "absolute",
          right: -72,
          width: 180
        }}
      />
      <View
        style={{
          backgroundColor: "rgba(39, 206, 241, 0.18)",
          height: 1,
          left: "6%",
          position: "absolute",
          right: "6%",
          top: variant === "loading" ? 238 : 286
        }}
      />
      <View
        style={{
          backgroundColor: "rgba(39, 206, 241, 0.28)",
          height: variant === "loading" ? 150 : 132,
          left: "50%",
          position: "absolute",
          top: variant === "loading" ? 198 : 226,
          width: 1
        }}
      />
      <View
        style={{
          backgroundColor: colors.redCorner,
          borderRadius: 2,
          height: 4,
          left: "49.4%",
          position: "absolute",
          top: variant === "loading" ? 260 : 340,
          width: 8
        }}
      />
      <View
        style={{
          borderBottomColor: "rgba(255, 82, 101, 0.72)",
          borderBottomWidth: 1,
          borderRightColor: "rgba(255, 82, 101, 0.72)",
          borderRightWidth: 1,
          bottom: 28,
          height: 110,
          position: "absolute",
          right: 28,
          width: 152
        }}
      />
    </View>
  );
}

export function CornerIQBrandMark({ compact = false }: { compact?: boolean | undefined }) {
  const height = compact ? 104 : 150;
  const brandSize = compact ? 44 : 52;
  return (
    <View accessibilityLabel="CornerIQ" style={{ alignItems: "center", alignSelf: "center", height, justifyContent: "center", maxWidth: 430, width: "100%" }}>
      <View
        style={{
          borderColor: "rgba(39, 206, 241, 0.08)",
          borderRadius: 170,
          borderWidth: 1,
          height: compact ? 132 : 184,
          position: "absolute",
          top: compact ? 12 : 26,
          width: compact ? 132 : 184
        }}
      />
      <View
        style={{
          borderColor: "rgba(39, 206, 241, 0.06)",
          borderRadius: 230,
          borderWidth: 1,
          height: compact ? 190 : 260,
          position: "absolute",
          top: compact ? -18 : -2,
          width: compact ? 190 : 260
        }}
      />
      <View
        style={{
          backgroundColor: "rgba(39, 206, 241, 0.18)",
          height: 1,
          left: 0,
          position: "absolute",
          right: 0,
          top: compact ? 84 : 116
        }}
      />
      <View
        style={{
          backgroundColor: "rgba(39, 206, 241, 0.38)",
          height: compact ? 78 : 92,
          left: "50%",
          position: "absolute",
          top: compact ? 70 : 98,
          width: 1
        }}
      />
      <View
        style={{
          borderRightColor: colors.blueIQ,
          borderRightWidth: 2,
          borderTopColor: colors.blueIQ,
          borderTopWidth: 2,
          height: compact ? 64 : 78,
          opacity: 0.95,
          position: "absolute",
          right: compact ? 68 : 48,
          top: compact ? 8 : 18,
          width: compact ? 78 : 98
        }}
      />
      <Text
        selectable={false}
        style={{
          color: colors.canvas,
          fontSize: brandSize,
          fontWeight: "800",
          lineHeight: brandSize + 8,
          textAlign: "center"
        }}
      >
        Corner
        <Text style={{ color: colors.blueIQ }}>IQ</Text>
      </Text>
      <View
        style={{
          backgroundColor: colors.redCorner,
          borderRadius: 2,
          height: 4,
          position: "absolute",
          top: compact ? 86 : 118,
          width: 8
        }}
      />
    </View>
  );
}

export function CornerLineGlyph({ size = 42 }: { size?: number | undefined }) {
  return (
    <View
      accessibilityLabel="Corner line"
      style={{
        height: size,
        width: size
      }}
    >
      <View
        style={{
          backgroundColor: colors.blueIQ,
          borderRadius: 2,
          height: 3,
          left: spacing.xs,
          position: "absolute",
          top: spacing.xs,
          width: size - spacing.lg
        }}
      />
      <View
        style={{
          backgroundColor: colors.blueIQ,
          borderRadius: 2,
          height: size - spacing.lg,
          position: "absolute",
          right: spacing.xs,
          top: spacing.xs,
          width: 3
        }}
      />
    </View>
  );
}
