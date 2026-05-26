import React from "react";
import { Text, View } from "react-native";
import { colors, spacing } from "../theme";
import { typography } from "../typography";

export interface TimelineListItem {
  id: string;
  title: string;
  body: string;
  meta?: string | undefined;
}

export function TimelineList({ emptyCopy, items }: { emptyCopy: string; items: readonly TimelineListItem[] }) {
  if (items.length === 0) {
    return <Text style={{ color: colors.wrap, fontSize: 13, lineHeight: 19 }}>{emptyCopy}</Text>;
  }

  return (
    <View style={{ gap: spacing.sm }}>
      {items.map((item, index) => (
        <View key={`timeline-item:${index}`} style={{ gap: spacing.xs }}>
          <Text style={{ ...typography.body, color: colors.canvas }}>{item.title}</Text>
          <Text style={{ color: colors.wrap, fontSize: 13, lineHeight: 19 }}>{item.body}</Text>
          {item.meta ? <Text style={{ color: colors.wrap, fontSize: 13, lineHeight: 19 }}>{item.meta}</Text> : null}
        </View>
      ))}
    </View>
  );
}
