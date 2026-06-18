import React from "react";
import { Animated, ImageBackground, Pressable, ScrollView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import loadingCornerBackground from "../../../assets/backgrounds/loading-corner-orb.png";
import { CornerIQWordmark } from "./CornerIQWordmark";
import { glassStyles } from "../../design/glass";
import { colors, radii, spacing } from "../../design/theme";
import { typography } from "../../design/typography";

export interface StartupStateProps {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
  title: string;
}

const startupStatusRows = ["Readiness check", "Training context", "Fuel safety", "Today's plan"] as const;
type StartupStatusIconState = "active" | "done" | "pending";

function startupStatusStateForFrame(index: number, frame: number): StartupStatusIconState {
  if (frame > index) {
    return "done";
  }
  return frame === index ? "active" : "pending";
}

function StatusIcon({ state }: { state: "active" | "done" | "pending" }) {
  const pulse = React.useRef(new Animated.Value(0)).current;
  const pop = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    pop.setValue(0.9);
    Animated.spring(pop, {
      damping: 12,
      mass: 0.8,
      stiffness: 220,
      toValue: 1,
      useNativeDriver: true
    }).start();
  }, [pop, state]);

  React.useEffect(() => {
    pulse.stopAnimation();
    pulse.setValue(0);

    if (state !== "active") {
      return undefined;
    }

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          duration: 340,
          toValue: 1,
          useNativeDriver: true
        }),
        Animated.timing(pulse, {
          duration: 180,
          toValue: 0,
          useNativeDriver: true
        })
      ])
    );
    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [pulse, state]);

  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.42, 0]
  });
  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.76, 1.22]
  });

  if (state === "done") {
    return (
      <Animated.View
        style={{
          alignItems: "center",
          borderColor: colors.readyGreen,
          borderRadius: 19,
          borderWidth: 2,
          height: 38,
          justifyContent: "center",
          transform: [{ scale: pop }],
          width: 38
        }}
      >
        <Ionicons color={colors.readyGreen} name="checkmark" size={24} />
      </Animated.View>
    );
  }

  if (state === "active") {
    return (
      <Animated.View
        style={{
          alignItems: "center",
          borderColor: colors.blueIQ,
          borderRadius: 19,
          borderWidth: 2,
          height: 38,
          justifyContent: "center",
          transform: [{ scale: pop }],
          width: 38
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={{
            backgroundColor: "rgba(39, 206, 241, 0.32)",
            borderRadius: 17,
            height: 34,
            opacity: pulseOpacity,
            position: "absolute",
            transform: [{ scale: pulseScale }],
            width: 34
          }}
        />
        <View style={{ backgroundColor: colors.blueIQ, borderRadius: radii.pill, height: 12, width: 12 }} />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={{
        alignItems: "center",
        borderColor: "rgba(139, 163, 198, 0.62)",
        borderRadius: 19,
        borderWidth: 2,
        height: 38,
        justifyContent: "center",
        transform: [{ scale: pop }],
        width: 38
      }}
    >
      <View style={{ backgroundColor: "rgba(183, 196, 217, 0.62)", borderRadius: 5, height: 10, width: 10 }} />
    </Animated.View>
  );
}

function StartupStatusRows() {
  const [progressFrame, setProgressFrame] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setProgressFrame((frame) => (frame + 1) % (startupStatusRows.length + 1));
    }, 430);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <View
      style={{
        ...glassStyles.cardDeep,
        backgroundColor: "rgba(5, 17, 34, 0.86)",
        borderColor: "rgba(39, 206, 241, 0.22)",
        borderRadius: radii.card,
        boxShadow: "0 18px 42px rgba(0, 0, 0, 0.34), 0 0 24px rgba(39, 206, 241, 0.18)",
        overflow: "hidden",
        paddingHorizontal: spacing.xl,
        width: "100%"
      }}
    >
      {startupStatusRows.map((label, index) => {
        const state = startupStatusStateForFrame(index, progressFrame);
        const pending = state === "pending";
        return (
          <View key={label}>
            <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.lg, minHeight: 86, paddingVertical: spacing.md }}>
              <StatusIcon state={state} />
              <Text style={{ color: pending ? "rgba(183, 196, 217, 0.74)" : colors.canvas, flex: 1, fontSize: 18, fontWeight: "700", lineHeight: 25 }}>
                {label}
              </Text>
            </View>
            {index < startupStatusRows.length - 1 ? <View style={{ backgroundColor: "rgba(217, 228, 244, 0.13)", height: 1, marginLeft: 54 }} /> : null}
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
                backgroundColor: colors.blueIQ,
                borderColor: "rgba(255, 255, 255, 0.32)",
                borderCurve: "continuous",
                borderRadius: radii.pill,
                borderWidth: 1,
                boxShadow: "0 10px 26px rgba(39, 206, 241, 0.22)",
                justifyContent: "center",
                minHeight: 54,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                width: "100%"
              }}
            >
              <Text style={{ color: colors.cornerBlack, fontSize: 16, fontWeight: "900", lineHeight: 22, textAlign: "center" }}>
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
