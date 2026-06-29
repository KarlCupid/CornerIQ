import React from "react";
import { Pressable, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";
import { glassStyles } from "../../../../design/glass";
import { colors, radii, spacing } from "../../../../design/theme";
import { fontFamilies } from "../../../../design/typography";
import { screenStyles } from "../../screenStyles";

type OnboardingOptionVisualStyle = ViewStyle & {
  boxShadow?: string;
};

const optionBaseStyle = {
  ...glassStyles.control,
  backgroundColor: "rgba(12, 21, 31, 0.72)",
  borderColor: "rgba(232, 240, 255, 0.14)",
  borderRadius: radii.tile,
  flexGrow: 1,
  maxWidth: 340,
  minHeight: 46,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm
} satisfies ViewStyle;

const optionSelectedStyle = {
  backgroundColor: "rgba(169, 185, 207, 0.15)",
  borderColor: "rgba(232, 240, 255, 0.44)"
} satisfies ViewStyle;

const optionInteractiveStyle = {
  backgroundColor: "rgba(169, 185, 207, 0.12)",
  borderColor: "rgba(232, 240, 255, 0.36)",
  boxShadow: "0 0 0 1px rgba(169, 185, 207, 0.26), 0 12px 26px rgba(0, 0, 0, 0.24)"
} satisfies OnboardingOptionVisualStyle;

const optionPressedStyle = {
  backgroundColor: "rgba(247, 251, 255, 0.14)",
  borderColor: "rgba(247, 251, 255, 0.78)"
} satisfies ViewStyle;

const optionDisabledStyle = {
  opacity: 0.55
} satisfies ViewStyle;

const optionDescriptionStyle = {
  alignItems: "flex-start"
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
    screenStyles.quietButton,
    optionBaseStyle,
    interactive ? optionInteractiveStyle : null,
    active ? optionSelectedStyle : null,
    !disabled && pressed ? optionPressedStyle : null,
    disabled ? optionDisabledStyle : null,
    description ? optionDescriptionStyle : null
  ];
}

export function ChipButton({
  active,
  description,
  disabled = false,
  label,
  onPress
}: {
  active: boolean;
  description?: string;
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  const [focused, setFocused] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);

  return (
    <Pressable
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
      <Text style={[screenStyles.quietButtonText, { color: active ? colors.canvas : colors.wrap, fontFamily: fontFamilies.bold, textAlign: description ? "left" : "center" }]}>
        {label}
      </Text>
      {description ? <Text style={[screenStyles.subtle, { color: colors.mutedText, marginTop: spacing.xs }]}>{description}</Text> : null}
    </Pressable>
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
    <View style={{ gap: spacing.xs }}>
      <Text style={screenStyles.fieldLabel}>{label}</Text>
      {helper ? <Text style={screenStyles.subtle}>{helper}</Text> : null}
      {example ? <Text style={screenStyles.exampleText}>{`Example: ${example}`}</Text> : null}
      {children}
    </View>
  );
}

export function LabeledTextInput({
  example,
  helper,
  label,
  style,
  ...inputProps
}: TextInputProps & {
  example?: string | undefined;
  helper?: string | undefined;
  label: string;
}) {
  return (
    <FieldGroup example={example} helper={helper} label={label}>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.mutedText}
        style={[
          screenStyles.input,
          {
            backgroundColor: "rgba(12, 21, 31, 0.72)",
            borderColor: "rgba(232, 240, 255, 0.15)",
            borderRadius: radii.tile
          },
          style
        ]}
        {...inputProps}
      />
    </FieldGroup>
  );
}
