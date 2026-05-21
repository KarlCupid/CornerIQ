import React from "react";
import { Pressable, Text, View } from "react-native";
import { colors, radii, spacing } from "../theme";

export interface SectionTabItem<T extends string> {
  key: T;
  label: string;
}

export function SectionTabs<T extends string>({
  items,
  onChange,
  value
}: {
  items: readonly SectionTabItem<T>[];
  onChange: (value: T) => void;
  value: T;
}) {
  return (
    <View
      accessibilityLabel="Screen sections"
      accessibilityHint="Choose which section of this screen is visible."
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing.sm
      }}
    >
      {items.map((item) => {
        const selected = item.key === value;
        return (
          <Pressable
            accessibilityLabel={`Show ${item.label} section`}
            accessibilityHint={selected ? `${item.label} section is visible.` : `Switch to the ${item.label} section.`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={item.key}
            onPress={() => onChange(item.key)}
            style={{
              backgroundColor: selected ? colors.blueIQ : colors.panelRaised,
              borderColor: selected ? colors.blueIQ : colors.line,
              borderRadius: radii.control,
              borderWidth: 1,
              minHeight: 44,
              justifyContent: "center",
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm
            }}
          >
            <Text style={{ color: selected ? colors.cornerBlack : colors.canvas, fontSize: 14, fontWeight: "800" }}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
