import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AuthBackdrop, CornerIQBrandMark, CornerLineGlyph } from "./AuthBrandMark";
import { glassStyles } from "../../design/glass";
import { colors, spacing } from "../../design/theme";
import { typography } from "../../design/typography";

export interface StartupStateProps {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
  title: string;
}

function LoadingOrb() {
  const size = 176;
  return (
    <View style={{ alignItems: "center", height: 236, justifyContent: "center", width: "100%" }}>
      <View style={{ backgroundColor: "rgba(39, 206, 241, 0.25)", height: 1, left: 0, position: "absolute", right: 0, top: 118 }} />
      <View style={{ backgroundColor: "rgba(39, 206, 241, 0.25)", bottom: 18, left: "50%", position: "absolute", top: 18, width: 1 }} />
      <View style={{ borderColor: "rgba(39, 206, 241, 0.09)", borderRadius: 138, borderWidth: 1, height: 276, position: "absolute", width: 276 }} />
      <View style={{ borderColor: "rgba(39, 206, 241, 0.13)", borderRadius: 112, borderWidth: 1, height: 224, position: "absolute", width: 224 }} />
      <View
        style={{
          alignItems: "center",
          backgroundColor: "rgba(3, 10, 23, 0.88)",
          borderColor: "rgba(39, 206, 241, 0.72)",
          borderRadius: size / 2,
          borderWidth: 1,
          height: size,
          justifyContent: "center",
          width: size
        }}
      >
        <View
          style={{
            borderColor: "rgba(39, 206, 241, 0.42)",
            borderRadius: size / 2 - 16,
            borderWidth: 8,
            height: size - 28,
            position: "absolute",
            width: size - 28
          }}
        />
        <View
          style={{
            borderBottomColor: "transparent",
            borderColor: colors.blueIQ,
            borderLeftColor: "transparent",
            borderRadius: size / 2 - 18,
            borderWidth: 9,
            height: size - 36,
            position: "absolute",
            transform: [{ rotate: "18deg" }],
            width: size - 36
          }}
        />
        <View
          style={{
            borderBottomColor: "transparent",
            borderColor: "rgba(39, 206, 241, 0.76)",
            borderLeftColor: "transparent",
            borderRadius: size / 2 - 38,
            borderRightColor: "transparent",
            borderWidth: 3,
            height: size - 78,
            position: "absolute",
            transform: [{ rotate: "228deg" }],
            width: size - 78
          }}
        />
        <CornerLineGlyph size={58} />
      </View>
    </View>
  );
}

function StatusIcon({ state }: { state: "active" | "done" | "pending" }) {
  if (state === "done") {
    return (
      <View
        style={{
          alignItems: "center",
          borderColor: colors.readyGreen,
          borderRadius: 19,
          borderWidth: 2,
          height: 38,
          justifyContent: "center",
          width: 38
        }}
      >
        <Ionicons color={colors.readyGreen} name="checkmark" size={24} />
      </View>
    );
  }

  if (state === "active") {
    return (
      <View
        style={{
          borderBottomColor: "rgba(39, 206, 241, 0.22)",
          borderColor: colors.blueIQ,
          borderRadius: 19,
          borderRightColor: "rgba(39, 206, 241, 0.22)",
          borderWidth: 3,
          height: 38,
          transform: [{ rotate: "-18deg" }],
          width: 38
        }}
      />
    );
  }

  return (
    <View
      style={{
        alignItems: "center",
        borderColor: "rgba(139, 163, 198, 0.62)",
        borderRadius: 19,
        borderWidth: 2,
        height: 38,
        justifyContent: "center",
        width: 38
      }}
    >
      <Text style={{ color: "rgba(183, 196, 217, 0.84)", fontSize: 14, fontWeight: "900", lineHeight: 18 }}>...</Text>
    </View>
  );
}

function StartupChecklist() {
  const rows = [
    { label: "Readiness check", state: "done" as const },
    { label: "Training context", state: "active" as const },
    { label: "Fuel safety", state: "pending" as const },
    { label: "Today's plan", state: "pending" as const }
  ];
  return (
    <View
      style={{
        ...glassStyles.cardDeep,
        backgroundColor: "rgba(6, 13, 28, 0.72)",
        borderColor: "rgba(217, 228, 244, 0.24)",
        borderRadius: 8,
        overflow: "hidden",
        paddingHorizontal: spacing.xl,
        width: "100%"
      }}
    >
      <View style={{ backgroundColor: colors.blueIQ, height: 98, left: 0, position: "absolute", top: 92, width: 1 }} />
      {rows.map((row, index) => {
        const pending = row.state === "pending";
        return (
          <View key={row.label}>
            <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.lg, minHeight: 86, paddingVertical: spacing.md }}>
              <StatusIcon state={row.state} />
              <Text style={{ color: pending ? "rgba(183, 196, 217, 0.74)" : colors.canvas, flex: 1, fontSize: 18, fontWeight: "700", lineHeight: 25 }}>
                {row.label}
              </Text>
            </View>
            {index < rows.length - 1 ? <View style={{ backgroundColor: "rgba(217, 228, 244, 0.13)", height: 1, marginLeft: 54 }} /> : null}
          </View>
        );
      })}
    </View>
  );
}

function ManualInputsFooter() {
  return (
    <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "center", maxWidth: 460 }}>
      <Ionicons color={colors.blueIQ} name="shield-checkmark-outline" size={32} />
      <Text style={{ color: "rgba(183, 196, 217, 0.88)", flexShrink: 1, fontSize: 15, fontWeight: "600", lineHeight: 21 }}>
        Manual inputs are enough. Wearables are optional.
      </Text>
    </View>
  );
}

export function StartupState({ title, message, actionLabel, onAction }: StartupStateProps) {
  const isCornerStartup = title === "CornerIQ";
  const heading = isCornerStartup ? "Preparing your corner" : title;

  return (
    <View style={{ backgroundColor: colors.cornerBlack, flex: 1 }} testID="startup-state">
      <StatusBar style="light" />
      <AuthBackdrop variant="loading" />
      <ScrollView
        contentContainerStyle={{
          alignItems: "center",
          flexGrow: 1,
          justifyContent: "center",
          paddingBottom: spacing.xxl,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xxl
        }}
        style={{ flex: 1 }}
      >
        <View style={{ alignItems: "center", gap: spacing.lg, maxWidth: 520, width: "100%" }}>
          <CornerIQBrandMark compact />
          {isCornerStartup ? <LoadingOrb /> : null}
          <View style={{ alignItems: "center", gap: spacing.sm, width: "100%" }}>
            <Text
              style={{
                color: colors.canvas,
                fontSize: isCornerStartup ? 36 : 30,
                fontWeight: "800",
                lineHeight: isCornerStartup ? 43 : 36,
                textAlign: "center"
              }}
            >
              {heading}
            </Text>
            <Text
              selectable
              style={{
                ...typography.body,
                color: "rgba(183, 196, 217, 0.88)",
                maxWidth: 420,
                textAlign: "center"
              }}
            >
              {message}
            </Text>
          </View>
          {isCornerStartup ? <StartupChecklist /> : null}
          {actionLabel && onAction ? (
            <Pressable
              accessibilityRole="button"
              onPress={onAction}
              style={{
                alignItems: "center",
                backgroundColor: "#079DFF",
                borderColor: "rgba(255, 255, 255, 0.32)",
                borderRadius: 6,
                borderWidth: 1,
                justifyContent: "center",
                minHeight: 54,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                width: "100%"
              }}
            >
              <Text style={{ color: colors.canvas, fontSize: 16, fontWeight: "800", lineHeight: 22, textAlign: "center" }}>
                {actionLabel}
              </Text>
            </Pressable>
          ) : null}
          {isCornerStartup ? <ManualInputsFooter /> : null}
        </View>
      </ScrollView>
    </View>
  );
}
