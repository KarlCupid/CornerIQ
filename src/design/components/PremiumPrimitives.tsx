import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";
import { glassStyles } from "../glass";
import { type LuminousAccent, useLuminousScreenTheme } from "../luminousTheme";
import { colors, radii, spacing } from "../theme";
import { fontFamilies, typography } from "../typography";

export type PremiumTone = LuminousAccent | "muted";

const toneColors: Record<PremiumTone, string> = {
  blue: colors.blueIQ,
  gold: colors.gold,
  green: colors.readyGreen,
  muted: colors.mutedText,
  neutral: colors.mutedText,
  orange: colors.amberCaution,
  purple: colors.powerPurple,
  red: colors.redCorner
};

const toneWash: Record<PremiumTone, string> = {
  blue: "rgba(39, 206, 241, 0.12)",
  gold: "rgba(255, 216, 97, 0.11)",
  green: "rgba(56, 226, 138, 0.11)",
  muted: "rgba(183, 196, 217, 0.08)",
  neutral: "rgba(183, 196, 217, 0.09)",
  orange: "rgba(255, 148, 72, 0.12)",
  purple: "rgba(150, 87, 245, 0.12)",
  red: "rgba(255, 82, 101, 0.13)"
};

export function premiumToneColor(tone: PremiumTone | undefined): string {
  return toneColors[tone ?? "muted"];
}

export function premiumToneWash(tone: PremiumTone | undefined): string {
  return toneWash[tone ?? "muted"];
}

export function AccentRail({
  tone
}: {
  tone?: PremiumTone | undefined;
}) {
  return (
    <View
      pointerEvents="none"
      style={{
        backgroundColor: premiumToneColor(tone),
        borderRadius: radii.pill,
        bottom: spacing.lg,
        left: spacing.lg,
        opacity: tone === "muted" ? 0.42 : 0.72,
        position: "absolute",
        top: spacing.lg,
        width: 4
      }}
    />
  );
}

export function PremiumCard({
  accent,
  children,
  density = "regular",
  rail = false,
  testID
}: React.PropsWithChildren<{
  accent?: PremiumTone | undefined;
  density?: "compact" | "regular" | "spacious" | undefined;
  rail?: boolean | undefined;
  testID?: string | undefined;
}>) {
  const theme = useLuminousScreenTheme();
  const padding = density === "compact" ? spacing.md : density === "spacious" ? spacing.xl : spacing.lg;
  const tone = accent ?? theme.accent;
  return (
    <View
      style={{
        ...glassStyles.cardDeep,
        backgroundColor: theme.card,
        borderColor: theme.cardBorder,
        boxShadow: "none",
        gap: density === "compact" ? spacing.sm : spacing.md,
        overflow: "hidden",
        padding,
        paddingLeft: rail ? padding + spacing.md : padding
      }}
      testID={testID}
    >
      {rail ? <AccentRail tone={tone} /> : null}
      <View
        pointerEvents="none"
        style={{
          backgroundColor: "rgba(39, 206, 241, 0.13)",
          height: 1,
          left: rail ? padding + spacing.md : padding,
          opacity: 0.34,
          position: "absolute",
          right: padding,
          top: 0
        }}
      />
      {children}
    </View>
  );
}

export function PremiumSectionHeader({
  accent,
  eyebrow,
  title
}: {
  accent?: PremiumTone | undefined;
  eyebrow?: string | undefined;
  title: string;
}) {
  const theme = useLuminousScreenTheme();
  const tone = accent ?? theme.accent;
  return (
    <View style={{ gap: 3 }}>
      {eyebrow ? (
        <Text style={{ color: premiumToneColor(tone), fontFamily: fontFamilies.black, fontSize: 11, fontWeight: "900", letterSpacing: 0, lineHeight: 15, textTransform: "uppercase" }}>
          {eyebrow}
        </Text>
      ) : null}
      <Text style={{ color: colors.canvas, fontFamily: fontFamilies.extraBold, fontSize: 18, fontWeight: "800", letterSpacing: 0, lineHeight: 23 }}>
        {title}
      </Text>
    </View>
  );
}

export function PremiumIconBadge({
  icon,
  tone
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone?: PremiumTone | undefined;
}) {
  const color = premiumToneColor(tone);
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: premiumToneWash(tone),
        borderColor: `${color}45`,
        borderRadius: radii.pill,
        borderWidth: 1,
        height: 48,
        justifyContent: "center",
        width: 48
      }}
    >
      <Ionicons color={color} name={icon} size={24} />
    </View>
  );
}

export function PremiumButton({
  accessibilityLabel,
  disabled,
  icon,
  label,
  onPress,
  tone,
  variant = "primary"
}: {
  accessibilityLabel?: string | undefined;
  disabled?: boolean | undefined;
  icon?: keyof typeof Ionicons.glyphMap | undefined;
  label: string;
  onPress?: (() => Promise<void> | void) | undefined;
  tone?: PremiumTone | undefined;
  variant?: "primary" | "quiet" | "text" | undefined;
}) {
  const theme = useLuminousScreenTheme();
  const color = premiumToneColor(tone ?? theme.accent);
  const primary = variant === "primary";
  const quiet = variant === "quiet";
  const surfaceStyle = primary
    ? {
        ...glassStyles.primaryControl,
        backgroundColor: disabled ? "rgba(255, 255, 255, 0.1)" : color,
        borderColor: disabled ? "rgba(255, 255, 255, 0.16)" : `${color}99`,
        boxShadow: "none"
      }
    : quiet
      ? {
          ...glassStyles.control,
          backgroundColor: disabled ? "rgba(255, 255, 255, 0.04)" : theme.control,
          borderColor: disabled ? "rgba(255, 255, 255, 0.12)" : theme.controlBorder
        }
      : {
          backgroundColor: "transparent",
          borderColor: "transparent",
          borderRadius: radii.pill,
          borderWidth: 0
        };
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        ...surfaceStyle,
        alignItems: "center",
        flexDirection: "row",
        gap: spacing.sm,
        justifyContent: "center",
        minHeight: primary ? 54 : 44,
        opacity: disabled ? 0.62 : pressed ? 0.86 : 1,
        paddingHorizontal: primary ? spacing.lg : spacing.md,
        paddingVertical: spacing.sm
      })}
    >
      {icon ? <Ionicons color={disabled ? colors.mutedText : primary ? colors.cornerBlack : color} name={icon} size={18} /> : null}
      <Text style={{ color: disabled ? colors.mutedText : primary ? colors.cornerBlack : color, fontFamily: fontFamilies.black, fontSize: 15, fontWeight: "900", lineHeight: 20, textAlign: "center" }}>
        {label}
      </Text>
    </Pressable>
  );
}

export interface GroupedMetricTileItem {
  icon?: keyof typeof Ionicons.glyphMap | undefined;
  label: string;
  meta?: string | undefined;
  tone?: PremiumTone | undefined;
  value: string;
}

export function GroupedMetricTiles({
  items,
  testID
}: {
  items: readonly GroupedMetricTileItem[];
  testID?: string | undefined;
}) {
  const theme = useLuminousScreenTheme();
  return (
    <PremiumCard density="compact" testID={testID}>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {items.map((item, index) => {
          const color = premiumToneColor(item.tone ?? theme.accent);
          return (
            <View
              accessibilityLabel={`${item.label}: ${item.value}${item.meta ? `. ${item.meta}` : ""}`}
              key={`grouped-metric:${item.label}`}
              style={{
                alignItems: "center",
                borderColor: theme.hairline,
                borderLeftWidth: index > 0 ? 1 : 0,
                flexBasis: 108,
                flexGrow: 1,
                gap: spacing.xs,
                minHeight: 104,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.sm
              }}
            >
              {item.icon ? <Ionicons color={color} name={item.icon} size={22} /> : null}
              <Text numberOfLines={1} style={{ color: colors.wrap, fontFamily: fontFamilies.bold, fontSize: 12, fontWeight: "700", lineHeight: 16, textAlign: "center" }}>
                {item.label}
              </Text>
              <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={2} style={{ color, fontFamily: fontFamilies.black, fontSize: 16, fontWeight: "900", lineHeight: 20, textAlign: "center" }}>
                {item.value}
              </Text>
              {item.meta ? (
                <Text numberOfLines={1} style={{ color: colors.mutedText, fontFamily: fontFamilies.bold, fontSize: 11, fontWeight: "700", lineHeight: 15, textAlign: "center" }}>
                  {item.meta}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </PremiumCard>
  );
}

export function PremiumInlineStatus({
  label,
  tone: _tone
}: {
  label: string;
  tone?: PremiumTone | undefined;
}) {
  return (
    <View
      accessibilityLabel={`Status: ${label}`}
      style={{
        alignItems: "center",
        alignSelf: "flex-start",
        backgroundColor: "rgba(255, 255, 255, 0.055)",
        borderColor: "rgba(232, 240, 255, 0.15)",
        borderRadius: radii.pill,
        borderWidth: 1,
        justifyContent: "center",
        minHeight: 28,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3
      }}
    >
      <Text numberOfLines={1} style={{ color: colors.wrap, fontSize: 12, fontWeight: "800", letterSpacing: 0, lineHeight: 16 }}>
        {label}
      </Text>
    </View>
  );
}

export function PremiumTimelineRows({
  items
}: {
  items: readonly {
    id: string;
    label?: string | undefined;
    meta?: string | undefined;
    tone?: PremiumTone | undefined;
    title: string;
  }[];
}) {
  const theme = useLuminousScreenTheme();
  return (
    <View style={{ gap: 0 }}>
      {items.map((item, index) => {
        const color = premiumToneColor(item.tone ?? theme.accent);
        return (
          <View
            key={item.id}
            style={{
              alignItems: "center",
              borderBottomColor: index === items.length - 1 ? "transparent" : theme.hairline,
              borderBottomWidth: 1,
              flexDirection: "row",
              gap: spacing.md,
              minHeight: 64,
              paddingVertical: spacing.sm
            }}
          >
            <View style={{ alignItems: "center", width: 42 }}>
              <View
                style={{
                  alignItems: "center",
                  backgroundColor: premiumToneWash(item.tone ?? theme.accent),
                  borderColor: `${color}75`,
                  borderRadius: radii.pill,
                  borderWidth: 1,
                  height: 34,
                  justifyContent: "center",
                  width: 34
                }}
              >
                <Text style={{ color, fontSize: 13, fontWeight: "900", lineHeight: 17 }}>
                  {index + 1}
                </Text>
              </View>
            </View>
            <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
              {item.label ? <Text numberOfLines={1} style={{ color, fontSize: 12, fontWeight: "900", lineHeight: 16 }}>{item.label}</Text> : null}
              <Text numberOfLines={2} style={{ ...typography.bodyStrong, color: colors.canvas }}>
                {item.title}
              </Text>
            </View>
            {item.meta ? (
              <Text numberOfLines={1} style={{ color: colors.mutedText, flexShrink: 1, fontSize: 14, fontWeight: "700", lineHeight: 19, textAlign: "right" }}>
                {item.meta}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
