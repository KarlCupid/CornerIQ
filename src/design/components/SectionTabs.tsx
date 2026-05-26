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
        backgroundColor: colors.panelDeep,
        borderColor: colors.line,
        borderRadius: radii.control,
        borderWidth: 1,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing.xs,
        padding: spacing.xs
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
              alignItems: "center",
              backgroundColor: selected ? "rgba(39, 206, 241, 0.18)" : "transparent",
              borderColor: selected ? "rgba(39, 206, 241, 0.48)" : "transparent",
              borderRadius: 20,
              borderWidth: 1,
              flexGrow: 1,
              justifyContent: "center",
              minHeight: 40,
              minWidth: 96,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.sm
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                color: selected ? colors.canvas : colors.mutedText,
                fontSize: 13,
                fontWeight: "800",
                lineHeight: 18,
                textAlign: "center"
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
