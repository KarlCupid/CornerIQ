import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Pressable, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";
import { spacing } from "../../../../design/theme";
import { fontFamilies } from "../../../../design/typography";
import { onboardingColors, onboardingStyles } from "../onboardingTheme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];
type OnboardingOptionVisualStyle = ViewStyle & { boxShadow?: string };

const optionBaseStyle = {
  backgroundColor: onboardingColors.inkRaised,
  borderColor: onboardingColors.hairline,
  borderRadius: 5,
  borderWidth: 1,
  flexBasis: 146,
  flexGrow: 1,
  justifyContent: "center",
  minHeight: 48,
  overflow: "hidden",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm
} satisfies ViewStyle;

const optionSelectedStyle = {
  backgroundColor: onboardingColors.inkSelected,
  borderColor: "rgba(39, 206, 241, 0.78)"
} satisfies ViewStyle;

const optionInteractiveStyle = {
  backgroundColor: "rgba(241, 234, 223, 0.075)",
  borderColor: onboardingColors.hairlineStrong,
  boxShadow: "0 0 0 1px rgba(241, 234, 223, 0.1)"
} satisfies OnboardingOptionVisualStyle;

const optionPressedStyle = {
  backgroundColor: "rgba(39, 206, 241, 0.22)",
  borderColor: onboardingColors.cyan
} satisfies ViewStyle;

function onboardingOptionStyle({
  active,
  description,
  disabled,
  focused,
  hovered,
  pressed
}: {
  active: boolean;
  description: boolean;
  disabled: boolean;
  focused: boolean;
  hovered: boolean;
  pressed: boolean;
}) {
  const interactive = !disabled && (hovered || focused);

  return [
    optionBaseStyle,
    description ? { alignItems: "flex-start" as const, flexBasis: 260, minHeight: 72 } : null,
    interactive ? optionInteractiveStyle : null,
    active ? optionSelectedStyle : null,
    !disabled && pressed ? optionPressedStyle : null,
    disabled ? { opacity: 0.5 } : null
  ];
}

export function ChipButton({
  active,
  description,
  disabled = false,
  icon,
  label,
  onPress
}: {
  active: boolean;
  description?: string;
  disabled?: boolean;
  icon?: IoniconName | undefined;
  label: string;
  onPress: () => void;
}) {
  const [focused, setFocused] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onPress}
      style={({ pressed }) => onboardingOptionStyle({ active, description: Boolean(description), disabled, focused, hovered, pressed })}
    >
      {active ? <View pointerEvents="none" style={{ backgroundColor: onboardingColors.cyan, bottom: 0, left: 0, position: "absolute", top: 0, width: 3 }} /> : null}
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm, width: "100%" }}>
        {icon ? <Ionicons color={active ? onboardingColors.white : onboardingColors.muted} name={icon} size={22} /> : null}
        <Text
          style={{
            color: active ? onboardingColors.white : onboardingColors.muted,
            flex: 1,
            fontFamily: fontFamilies.bold,
            fontSize: 15,
            fontWeight: "700",
            lineHeight: 20,
            textAlign: description ? "left" : icon ? "left" : "center",
            textTransform: label === label.toLowerCase() ? "capitalize" : "none"
          }}
        >
          {label}
        </Text>
        {active ? (
          <View style={{ alignItems: "center", backgroundColor: onboardingColors.cyan, borderRadius: 999, height: 24, justifyContent: "center", width: 24 }}>
            <Ionicons color={onboardingColors.ink} name="checkmark" size={17} />
          </View>
        ) : null}
      </View>
      {description ? <Text style={[onboardingStyles.bodyCopy, { fontSize: 13, lineHeight: 18, marginTop: spacing.xs }]}>{description}</Text> : null}
    </Pressable>
  );
}

export function SegmentedChoiceRow<T extends string>({
  onToggle,
  options,
  selected
}: {
  onToggle: (value: T) => void;
  options: readonly { accessibilityLabel?: string | undefined; label: string; value: T }[];
  selected: readonly T[];
}) {
  return (
    <View style={{ backgroundColor: onboardingColors.inkRaised, borderColor: onboardingColors.hairline, borderRadius: 5, borderWidth: 1, flexDirection: "row", minHeight: 62, overflow: "hidden", width: "100%" }}>
      {options.map((option, index) => {
        const active = selected.includes(option.value);
        return (
          <Pressable
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            key={option.value}
            onPress={() => onToggle(option.value)}
            style={({ pressed }) => ({
              alignItems: "center",
              backgroundColor: active ? onboardingColors.cyan : pressed ? "rgba(241, 234, 223, 0.08)" : "transparent",
              borderLeftColor: onboardingColors.hairline,
              borderLeftWidth: index === 0 ? 0 : 1,
              flex: 1,
              gap: 3,
              justifyContent: "center",
              minWidth: 44,
              paddingVertical: spacing.sm
            })}
          >
            {active ? (
              <View style={{ alignItems: "center", backgroundColor: onboardingColors.ink, borderRadius: 999, height: 21, justifyContent: "center", width: 21 }}>
                <Ionicons color={onboardingColors.cyan} name="checkmark" size={15} />
              </View>
            ) : <View style={{ height: 21 }} />}
            <Text style={{ color: active ? onboardingColors.ink : onboardingColors.muted, fontFamily: fontFamilies.bold, fontSize: 13, fontWeight: "700", lineHeight: 17 }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function FieldGroup({
  children,
  example,
  helper,
  label
}: {
  children: React.ReactNode;
  example?: string | undefined;
  helper?: string | undefined;
  label: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={onboardingStyles.sectionTitle}>{label}</Text>
      {helper ? <Text style={onboardingStyles.bodyCopy}>{helper}</Text> : null}
      {example ? <Text style={[onboardingStyles.bodyCopy, { color: onboardingColors.white, fontFamily: fontFamilies.semibold, fontSize: 13 }]}>{`Example: ${example}`}</Text> : null}
      {children}
    </View>
  );
}

export function LabeledTextInput({
  example,
  helper,
  label,
  onBlur,
  onFocus,
  style,
  ...inputProps
}: TextInputProps & {
  example?: string | undefined;
  helper?: string | undefined;
  label: string;
}) {
  const [focused, setFocused] = React.useState(false);

  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={onboardingStyles.fieldLabel}>{label}</Text>
      {helper ? <Text style={onboardingStyles.bodyCopy}>{helper}</Text> : null}
      {example ? <Text style={[onboardingStyles.bodyCopy, { color: onboardingColors.white, fontFamily: fontFamilies.semibold, fontSize: 13 }]}>{`Example: ${example}`}</Text> : null}
      <TextInput
        accessibilityLabel={label}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        placeholderTextColor={onboardingColors.canvasMuted}
        style={[
          {
            backgroundColor: focused ? "#10171D" : onboardingColors.inkRaised,
            borderColor: focused ? onboardingColors.cyan : onboardingColors.hairlineStrong,
            borderRadius: 5,
            borderWidth: 1,
            color: onboardingColors.white,
            fontFamily: fontFamilies.semibold,
            fontSize: 16,
            minHeight: 54,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm
          },
          style
        ]}
        {...inputProps}
      />
    </View>
  );
}

export function OnboardingInlineAction({
  label,
  onPress
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: pressed ? onboardingColors.cyanPressed : onboardingColors.cyan,
        borderRadius: 5,
        justifyContent: "center",
        minHeight: 52,
        paddingHorizontal: spacing.lg
      })}
    >
      <Text style={{ color: onboardingColors.ink, fontFamily: fontFamilies.black, fontSize: 16, fontWeight: "900" }}>{label}</Text>
    </Pressable>
  );
}
