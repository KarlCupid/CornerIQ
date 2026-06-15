import React, { useState } from "react";
import type { PropsWithChildren } from "react";
import { Pressable, Text, View } from "react-native";
import { EngineCard } from "./EngineCard";
import { glassStyles } from "../glass";
import { accentWash, useLuminousScreenTheme } from "../luminousTheme";
import { colors, spacing } from "../theme";
import { typography } from "../typography";

export function ActionCard({
  action,
  actionLabel,
  children,
  defaultDetailsOpen = false,
  detailLabel = "details",
  detailSummary,
  disabled = false,
  highlights,
  onAction,
  status,
  subtitle,
  title,
  why
}: PropsWithChildren<{
  action?: string | undefined;
  actionLabel?: string | undefined;
  defaultDetailsOpen?: boolean | undefined;
  detailLabel?: string | undefined;
  detailSummary?: string | undefined;
  disabled?: boolean | undefined;
  highlights?: readonly string[] | undefined;
  onAction?: (() => void) | undefined;
  status?: string | undefined;
  subtitle?: string | undefined;
  title: string;
  why?: string | undefined;
}>) {
  const hasStructuredSummary = Boolean(action || why || status || detailSummary);
  const hasCollapsibleDetails = hasStructuredSummary && Boolean(children);
  const [detailsOpen, setDetailsOpen] = useState(defaultDetailsOpen);
  const theme = useLuminousScreenTheme();
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={{ ...typography.cardTitle, color: colors.canvas }}>{title}</Text>
        {subtitle ? <Text style={{ ...typography.body, color: colors.wrap }}>{subtitle}</Text> : null}
        {action ? (
          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.canvas, fontSize: 13, fontWeight: "800" }}>Action</Text>
            <Text style={{ color: theme.accentColor, fontSize: 15, fontWeight: "800", lineHeight: 21 }}>{action}</Text>
          </View>
        ) : null}
        {why ? (
          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.canvas, fontSize: 13, fontWeight: "800" }}>Why</Text>
            <Text style={{ color: colors.wrap, fontSize: 14, lineHeight: 20 }}>{why}</Text>
          </View>
        ) : null}
        {status ? (
          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.canvas, fontSize: 13, fontWeight: "800" }}>Status</Text>
            <Text style={{ color: colors.wrap, fontSize: 14, lineHeight: 20 }}>{status}</Text>
          </View>
        ) : null}
        {highlights && highlights.length > 0 ? (
          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.canvas, fontSize: 13, fontWeight: "800" }}>What to do</Text>
            {highlights.map((item, index) => <Text key={`action-highlight:${index}`} style={{ color: colors.wrap, fontSize: 14, lineHeight: 20 }}>{item}</Text>)}
          </View>
        ) : null}
        {detailSummary ? <Text style={{ color: colors.wrap, fontSize: 13, lineHeight: 19 }}>{detailSummary}</Text> : null}
        {hasCollapsibleDetails ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setDetailsOpen((value) => !value)}
            style={{
              ...glassStyles.control,
              alignItems: "center",
              backgroundColor: theme.control,
              borderColor: theme.controlBorder,
              justifyContent: "center",
              minHeight: 44,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm
            }}
          >
            <Text style={{ color: colors.canvas, fontSize: 15, fontWeight: "700" }}>{detailsOpen ? `Hide ${detailLabel}` : `Show ${detailLabel}`}</Text>
          </Pressable>
        ) : null}
        {hasCollapsibleDetails ? (detailsOpen ? <View style={{ gap: spacing.sm }}>{children}</View> : null) : children}
        {actionLabel && onAction ? (
          <Pressable
            accessibilityLabel={actionLabel}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={onAction}
            style={{
              ...glassStyles.primaryControl,
              alignItems: "center",
              backgroundColor: disabled ? "rgba(255, 255, 255, 0.105)" : `${theme.accentColor}E6`,
              borderColor: disabled ? "rgba(255, 255, 255, 0.17)" : `${theme.accentColor}99`,
              boxShadow: disabled ? undefined : `0 10px 26px ${accentWash[theme.accent]}`,
              justifyContent: "center",
              minHeight: 48,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.sm
            }}
          >
            <Text style={{ color: disabled ? colors.mutedText : colors.cornerBlack, fontSize: 15, fontWeight: "800" }}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </EngineCard>
  );
}
