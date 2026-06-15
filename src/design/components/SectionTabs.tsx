import React from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { glassStyles } from "../glass";
import { useLuminousScreenTheme } from "../luminousTheme";
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
  const { width } = useWindowDimensions();
  const theme = useLuminousScreenTheme();
  const compact = width < 520;
  return (
    <View
      accessibilityLabel="Screen sections"
      accessibilityHint="Choose which section of this screen is visible."
      style={{
        marginHorizontal: -spacing.xs,
        maxHeight: 52
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: spacing.xs,
          paddingHorizontal: spacing.xs
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
                ...glassStyles.control,
                alignItems: "center",
                backgroundColor: selected ? theme.control : theme.tile,
                borderColor: selected ? theme.accentColor : theme.tileBorder,
                borderRadius: radii.pill,
                justifyContent: "center",
                minHeight: 44,
                minWidth: compact ? 74 : 92,
                paddingHorizontal: compact ? spacing.md : spacing.lg,
                paddingVertical: spacing.sm
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  color: selected ? colors.canvas : colors.mutedText,
                  fontSize: compact ? 13 : 14,
                  fontWeight: selected ? "700" : "600",
                  lineHeight: 18,
                  textAlign: "center"
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
