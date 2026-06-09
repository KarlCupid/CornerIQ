import React from "react";
import { ImageBackground, Pressable, ScrollView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import loadingCornerBackground from "../../../assets/backgrounds/loading-corner-orb.png";
import { CornerIQWordmark } from "./CornerIQWordmark";
import { glassStyles } from "../../design/glass";
import { colors, spacing } from "../../design/theme";
import { typography } from "../../design/typography";

export interface StartupStateProps {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
  title: string;
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
          alignItems: "center",
          borderColor: colors.blueIQ,
          borderRadius: 19,
          borderWidth: 2,
          height: 38,
          justifyContent: "center",
          width: 38
        }}
      >
        <View style={{ backgroundColor: colors.blueIQ, borderRadius: 6, height: 12, width: 12 }} />
      </View>
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
      <View style={{ backgroundColor: "rgba(183, 196, 217, 0.62)", borderRadius: 5, height: 10, width: 10 }} />
    </View>
  );
}

function StartupStatusRows() {
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
  const insets = useSafeAreaInsets();
  const isCornerStartup = title === "CornerIQ";
  const heading = isCornerStartup ? "Preparing your corner" : title;
  const bodyCopy = message || "Loading today's boxer decision, training context, and fuel safety state.";

  return (
    <ImageBackground
      resizeMode="cover"
      source={loadingCornerBackground}
      style={{ backgroundColor: colors.cornerBlack, flex: 1 }}
      testID="startup-state"
    >
      <StatusBar style="light" />
      <View
        pointerEvents="none"
        style={{
          backgroundColor: "rgba(2, 6, 17, 0.28)",
          bottom: 0,
          left: 0,
          position: "absolute",
          right: 0,
          top: 0
        }}
      />
      <ScrollView
        contentContainerStyle={{
          alignItems: "center",
          flexGrow: 1,
          justifyContent: "flex-start",
          paddingBottom: Math.max(insets.bottom + spacing.xxl, spacing.xxl),
          paddingHorizontal: spacing.lg,
          paddingTop: Math.max(insets.top + spacing.xl, spacing.xxl)
        }}
        style={{ flex: 1 }}
      >
        <View style={{ alignItems: "center", gap: spacing.lg, maxWidth: 520, width: "100%" }}>
          <CornerIQWordmark compact />
          {isCornerStartup ? <View style={{ height: 166, width: "100%" }} /> : null}
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
              {bodyCopy}
            </Text>
          </View>
          {isCornerStartup ? <StartupStatusRows /> : null}
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
    </ImageBackground>
  );
}
