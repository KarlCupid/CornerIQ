import React from "react";
import { Pressable, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { spacing } from "../../design/theme";
import { screenStyles } from "../screens/screenStyles";

export interface StartupStateProps {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
  title: string;
}

export function StartupState({ title, message, actionLabel, onAction }: StartupStateProps) {
  return (
    <View style={[screenStyles.screen, { justifyContent: "center", padding: spacing.lg, gap: spacing.lg }]}>
      <StatusBar style="light" />
      <Text style={screenStyles.title}>{title}</Text>
      <Text style={screenStyles.body}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={screenStyles.button}>
          <Text style={screenStyles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
