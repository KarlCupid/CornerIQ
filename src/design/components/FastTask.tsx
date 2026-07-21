import React from "react";
import type { PropsWithChildren } from "react";
import { Pressable, Text, View } from "react-native";
import { glassStyles } from "../glass";
import { accentColor, accentWash, type LuminousAccent, useLuminousScreenTheme } from "../luminousTheme";
import { colors, radii, spacing } from "../theme";
import { fontFamilies, typography } from "../typography";
import { EngineCard } from "./EngineCard";

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
  accent = "blue",
  action,
  layout = "equal",
  primary = false
}: {
  accent?: LuminousAccent | undefined;
  action: FastTaskAction;
  layout?: "equal" | "primary-led" | undefined;
  primary?: boolean | undefined;
}) {
  const theme = useLuminousScreenTheme();
  const primaryLed = layout === "primary-led";
  const disabledPrimary = primary && action.disabled;
  const primaryAccent = accentColor[accent];
  const surfaceStyle = disabledPrimary
    ? glassStyles.disabledPrimaryControl
    : primary
      ? {
          ...glassStyles.primaryControl,
          backgroundColor: `${primaryAccent}E6`,
          borderColor: `${primaryAccent}99`,
          boxShadow: `0 10px 26px ${accentWash[accent]}`
        }
      : {
          ...glassStyles.control,
          backgroundColor: theme.control,
          borderColor: theme.controlBorder
        };
  const textColor = disabledPrimary ? colors.mutedText : primary ? colors.cornerBlack : colors.canvas;
  return (
    <Pressable
      accessibilityLabel={action.accessibilityLabel ?? action.label}
      accessibilityRole="button"
      accessibilityState={{ disabled: action.disabled }}
      disabled={action.disabled}
      onPress={action.onPress}
      style={{
        ...surfaceStyle,
        alignItems: "center",
        borderRadius: primaryLed ? radii.control : 20,
        flexBasis: primary ? (primaryLed ? 260 : 220) : (primaryLed ? 128 : 148),
        flexGrow: primary ? (primaryLed ? 1.35 : 1) : (primaryLed ? 0.45 : 1),
        justifyContent: "center",
        minHeight: primary ? 50 : primaryLed ? 44 : 48,
        opacity: action.disabled && !primary ? 0.62 : 1,
        paddingHorizontal: spacing.md,
        paddingVertical: primaryLed && !primary ? spacing.xs : spacing.sm
      }}
      testID={action.testID}
    >
      <Text style={{ color: textColor, fontSize: primaryLed && !primary ? 14 : 15, fontWeight: primary ? "800" : primaryLed ? "700" : "800", lineHeight: primaryLed && !primary ? 18 : 20, textAlign: "center" }}>
        {action.label}
      </Text>
      {action.summary ? (
        <Text style={{ color: primary && !disabledPrimary ? colors.cornerBlack : colors.mutedText, fontSize: primaryLed && !primary ? 11 : 12, fontWeight: "600", lineHeight: primaryLed && !primary ? 14 : 16, textAlign: "center" }}>
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
  actionLayout = "equal",
  secondaryActions = [],
  testID,
  title
}: PropsWithChildren<{
  actionLayout?: "equal" | "primary-led" | undefined;
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
        <View style={{ gap: spacing.xs, maxWidth: 760 }}>
          <Text style={{ color: accentColor[accent], fontSize: 12, fontWeight: "800", lineHeight: 16 }}>{title}</Text>
          <Text style={{ color: colors.canvas, fontSize: 20, fontWeight: "800", lineHeight: 26 }}>{primaryAction}</Text>
          <Text style={{ color: colors.wrap, fontSize: 15, fontWeight: "400", lineHeight: 21 }}>{purpose}</Text>
        </View>
        {children}
        {primaryButton || secondaryActions.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {primaryButton ? <ActionButton accent={accent} action={primaryButton} layout={actionLayout} primary /> : null}
            {secondaryActions.map((action) => <ActionButton accent={accent} action={action} key={`fast-task-secondary:${action.label}`} layout={actionLayout} />)}
          </View>
        ) : null}
      </View>
    </EngineCard>
  );
}

export function CompactStatusStrip({
  items,
  variant = "cards",
  testID
}: {
  items: readonly FastTaskStatusItem[];
  variant?: "cards" | "quiet" | undefined;
  testID?: string | undefined;
}) {
  const quiet = variant === "quiet";
  const theme = useLuminousScreenTheme();
  return (
    <View
      style={{
        borderBottomColor: quiet ? theme.hairline : "transparent",
        borderBottomWidth: quiet ? 1 : 0,
        borderTopColor: quiet ? theme.hairline : "transparent",
        borderTopWidth: quiet ? 1 : 0,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: quiet ? spacing.xs : spacing.sm,
        paddingVertical: quiet ? spacing.xs : 0
      }}
      testID={testID}
    >
      {items.map((item, index) => {
        const accent = item.accent ?? "blue";
        return (
          <View
            accessibilityLabel={`${item.label}: ${item.value}${item.meta ? `. ${item.meta}` : ""}`}
            key={`fast-status:${item.label}`}
            style={{
              backgroundColor: quiet ? "transparent" : accentWash[accent],
              borderColor: quiet ? "rgba(255, 255, 255, 0.09)" : `${accentColor[accent]}55`,
              borderWidth: quiet ? 0 : 1,
              borderLeftWidth: quiet && index > 0 ? 1 : 0,
              borderRadius: quiet ? 0 : radii.tile,
              flexBasis: quiet ? 94 : 112,
              flexGrow: 1,
              gap: quiet ? 1 : spacing.xs,
              minHeight: quiet ? 48 : 78,
              paddingHorizontal: quiet ? spacing.sm : spacing.md,
              paddingVertical: quiet ? spacing.xs : spacing.md
            }}
          >
            <Text numberOfLines={1} style={{ color: accentColor[accent], fontSize: quiet ? 11 : 12, fontWeight: quiet ? "700" : "800", lineHeight: quiet ? 15 : 16 }}>
              {item.label}
            </Text>
            <Text numberOfLines={1} style={{ color: colors.canvas, fontSize: quiet ? 15 : 16, fontWeight: "800", lineHeight: quiet ? 19 : 21 }}>
              {item.value}
            </Text>
            {item.meta ? (
              <Text numberOfLines={quiet ? 1 : 2} style={{ color: colors.mutedText, fontSize: quiet ? 11 : 12, lineHeight: quiet ? 15 : 16 }}>
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
  const theme = useLuminousScreenTheme();
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
              ...glassStyles.control,
              alignItems: "center",
              backgroundColor: theme.control,
              borderColor: theme.controlBorder,
              borderRadius: radii.pill,
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
  editorial = false,
  framed = true,
  summary,
  testID,
  title
}: PropsWithChildren<{
  defaultOpen?: boolean | undefined;
  editorial?: boolean | undefined;
  framed?: boolean | undefined;
  summary?: string | undefined;
  testID?: string | undefined;
  title: string;
}>) {
  const [open, setOpen] = React.useState(defaultOpen);
  const theme = useLuminousScreenTheme();
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
            ...(editorial ? {} : glassStyles.control),
            alignItems: "center",
            backgroundColor: editorial ? "rgba(39, 206, 241, 0.08)" : theme.control,
            borderColor: editorial ? colors.blueIQ : theme.controlBorder,
            borderRadius: editorial ? 5 : 20,
            borderWidth: 1,
            justifyContent: "center",
            minHeight: 44,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm
          }}
        >
          <Text style={{ color: editorial ? colors.blueIQ : colors.canvas, fontFamily: editorial ? fontFamilies.bold : undefined, fontSize: 15, fontWeight: "700" }}>{open ? `Hide ${title}` : `Show ${title}`}</Text>
        </Pressable>
        {summary ? <Text style={{ color: colors.wrap, fontFamily: editorial ? fontFamilies.regular : undefined, fontSize: 13, lineHeight: 19 }}>{summary}</Text> : null}
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
