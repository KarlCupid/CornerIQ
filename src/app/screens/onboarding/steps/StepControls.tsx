import React from "react";
import { Pressable, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";
import { colors, spacing } from "../../../../design/theme";
import { screenStyles } from "../../screenStyles";

type OnboardingOptionVisualStyle = ViewStyle & {
  boxShadow?: string;
};

const optionBaseStyle = {
  maxWidth: 280
} satisfies ViewStyle;

const optionSelectedStyle = {
  backgroundColor: "rgba(39, 206, 241, 0.13)",
  borderColor: "rgba(39, 206, 241, 0.72)"
} satisfies ViewStyle;

const optionInteractiveStyle = {
  backgroundColor: "rgba(39, 206, 241, 0.11)",
  borderColor: "rgba(39, 206, 241, 0.64)",
  boxShadow: "0 0 0 1px rgba(39, 206, 241, 0.42), 0 10px 24px rgba(39, 206, 241, 0.16)"
} satisfies OnboardingOptionVisualStyle;

const optionPressedStyle = {
  backgroundColor: "rgba(39, 206, 241, 0.18)",
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
      <Text style={screenStyles.quietButtonText}>{label}</Text>
      {description ? <Text style={[screenStyles.subtle, { marginTop: spacing.xs }]}>{description}</Text> : null}
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
  ...inputProps
}: TextInputProps & {
  example?: string | undefined;
  helper?: string | undefined;
  label: string;
}) {
  return (
    <FieldGroup example={example} helper={helper} label={label}>
      <TextInput accessibilityLabel={label} placeholderTextColor={colors.wrap} style={screenStyles.input} {...inputProps} />
    </FieldGroup>
  );
}
