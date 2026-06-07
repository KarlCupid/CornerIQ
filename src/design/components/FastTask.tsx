import React from "react";
import type { PropsWithChildren } from "react";
import { Pressable, Text, View } from "react-native";
import { colors, radii, spacing } from "../theme";
import { typography } from "../typography";
import { EngineCard } from "./EngineCard";
import { accentColor, accentWash, type LuminousAccent } from "./LuminousScreen";

export interface FastTaskAction {
  accessibilityLabel?: string | undefined;
  disabled?: boolean | undefined;
  label: string;
  onPress: () => void;
  summary?: string | undefined;
  testID?: string | undefined;
}

export interface FastTaskStatusItem {
  accent?: LuminousAccent | undefined;
  label: string;
  meta?: string | undefined;
  value: string;
}

function ActionButton({
  action,
  primary = false
}: {
  action: FastTaskAction;
  primary?: boolean | undefined;
}) {
  return (
    <Pressable
      accessibilityLabel={action.accessibilityLabel ?? action.label}
      accessibilityRole="button"
      accessibilityState={{ disabled: action.disabled }}
      disabled={action.disabled}
      onPress={action.onPress}
      style={{
        alignItems: "center",
        backgroundColor: primary ? colors.blueIQ : "rgba(255, 255, 255, 0.07)",
        borderColor: primary ? colors.blueIQ : colors.line,
        borderRadius: 20,
        borderWidth: primary ? 0 : 1,
        flexBasis: primary ? 220 : 148,
        flexGrow: 1,
        justifyContent: "center",
        minHeight: 48,
        opacity: action.disabled ? 0.55 : 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm
      }}
      testID={action.testID}
    >
      <Text style={{ color: primary ? colors.cornerBlack : colors.canvas, fontSize: 15, fontWeight: "800", lineHeight: 20 }}>
        {action.label}
      </Text>
      {action.summary ? (
        <Text style={{ color: primary ? colors.cornerBlack : colors.mutedText, fontSize: 12, fontWeight: "600", lineHeight: 16, textAlign: "center" }}>
          {action.summary}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function PrimaryTaskCard({
  accent = "blue",
  children,
  primaryAction,
  primaryButton,
  purpose,
  secondaryActions = [],
  testID,
  title
}: PropsWithChildren<{
  accent?: LuminousAccent | undefined;
  primaryAction: string;
  primaryButton?: FastTaskAction | undefined;
  purpose: string;
  secondaryActions?: readonly FastTaskAction[] | undefined;
  testID?: string | undefined;
  title: string;
}>) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.md }} testID={testID}>
        <View style={{ gap: spacing.xs }}>
          <Text style={{ color: accentColor[accent], fontSize: 12, fontWeight: "800", lineHeight: 16 }}>{title}</Text>
          <Text style={{ color: colors.canvas, fontSize: 20, fontWeight: "800", lineHeight: 26 }}>{primaryAction}</Text>
          <Text style={{ ...typography.body, color: colors.wrap }}>{purpose}</Text>
        </View>
        {children}
        {primaryButton || secondaryActions.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {primaryButton ? <ActionButton action={primaryButton} primary /> : null}
            {secondaryActions.map((action) => <ActionButton action={action} key={`fast-task-secondary:${action.label}`} />)}
          </View>
        ) : null}
      </View>
    </EngineCard>
  );
}

export function CompactStatusStrip({
  items,
  testID
}: {
  items: readonly FastTaskStatusItem[];
  testID?: string | undefined;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }} testID={testID}>
      {items.map((item) => {
        const accent = item.accent ?? "blue";
        return (
          <View
            accessibilityLabel={`${item.label}: ${item.value}${item.meta ? `. ${item.meta}` : ""}`}
            key={`fast-status:${item.label}`}
            style={{
              backgroundColor: accentWash[accent],
              borderColor: `${accentColor[accent]}55`,
              borderRadius: radii.tile,
              borderWidth: 1,
              flexBasis: 112,
              flexGrow: 1,
              gap: spacing.xs,
              minHeight: 78,
              padding: spacing.md
            }}
          >
            <Text numberOfLines={1} style={{ color: accentColor[accent], fontSize: 12, fontWeight: "800", lineHeight: 16 }}>
              {item.label}
            </Text>
            <Text numberOfLines={1} style={{ color: colors.canvas, fontSize: 16, fontWeight: "800", lineHeight: 21 }}>
              {item.value}
            </Text>
            {item.meta ? (
              <Text numberOfLines={2} style={{ color: colors.mutedText, fontSize: 12, lineHeight: 16 }}>
                {item.meta}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export function QuickActionRow({
  actions,
  label,
  testID
}: {
  actions: readonly FastTaskAction[];
  label?: string | undefined;
  testID?: string | undefined;
}) {
  return (
    <View style={{ gap: spacing.sm }} testID={testID}>
      {label ? <Text style={{ color: colors.canvas, fontSize: 13, fontWeight: "800", lineHeight: 18 }}>{label}</Text> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {actions.map((action) => (
          <Pressable
            accessibilityLabel={action.accessibilityLabel ?? action.label}
            accessibilityRole="button"
            accessibilityState={{ disabled: action.disabled }}
            disabled={action.disabled}
            key={`quick-action:${action.label}`}
            onPress={action.onPress}
            style={{
              alignItems: "center",
              backgroundColor: "rgba(255, 255, 255, 0.065)",
              borderColor: colors.line,
              borderRadius: radii.pill,
              borderWidth: 1,
              flexBasis: 104,
              flexGrow: 1,
              justifyContent: "center",
              minHeight: 44,
              opacity: action.disabled ? 0.55 : 1,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm
            }}
            testID={action.testID}
          >
            <Text style={{ color: colors.canvas, fontSize: 14, fontWeight: "800", lineHeight: 18 }}>{action.label}</Text>
            {action.summary ? (
              <Text numberOfLines={1} style={{ color: colors.mutedText, fontSize: 11, fontWeight: "600", lineHeight: 15 }}>
                {action.summary}
              </Text>
            ) : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function CollapsedDetailDisclosure({
  children,
  defaultOpen = false,
  framed = true,
  summary,
  testID,
  title
}: PropsWithChildren<{
  defaultOpen?: boolean | undefined;
  framed?: boolean | undefined;
  summary?: string | undefined;
  testID?: string | undefined;
  title: string;
}>) {
  const [open, setOpen] = React.useState(defaultOpen);
  React.useEffect(() => {
    if (defaultOpen) {
      setOpen(true);
    }
  }, [defaultOpen]);
  const content = (
      <View style={{ gap: spacing.sm }}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((value) => !value)}
          style={{
            alignItems: "center",
            backgroundColor: "rgba(255, 255, 255, 0.07)",
            borderColor: colors.line,
            borderRadius: 20,
            borderWidth: 1,
            justifyContent: "center",
            minHeight: 44,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm
          }}
        >
          <Text style={{ color: colors.canvas, fontSize: 15, fontWeight: "700" }}>{open ? `Hide ${title}` : `Show ${title}`}</Text>
        </Pressable>
        {summary ? <Text style={{ color: colors.wrap, fontSize: 13, lineHeight: 19 }}>{summary}</Text> : null}
        {open ? <View style={{ gap: spacing.sm }} testID={testID}>{children}</View> : null}
      </View>
  );
  return framed ? <EngineCard>{content}</EngineCard> : content;
}

export function PostActionNextStep({
  actions = [],
  body,
  framed = true,
  testID,
  title = "Next action"
}: {
  actions?: readonly FastTaskAction[] | undefined;
  body: string;
  framed?: boolean | undefined;
  testID?: string | undefined;
  title?: string | undefined;
}) {
  const content = (
      <View style={{ gap: spacing.sm }} testID={testID}>
        <Text style={{ ...typography.cardTitle, color: colors.canvas }}>{title}</Text>
        <Text style={{ ...typography.body, color: colors.wrap }}>{body}</Text>
        {actions.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {actions.map((action) => <ActionButton action={action} key={`post-action:${action.label}`} />)}
          </View>
        ) : null}
      </View>
  );
  return framed ? <EngineCard>{content}</EngineCard> : content;
}
