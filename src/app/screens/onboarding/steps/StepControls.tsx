import React from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";
import { colors, spacing } from "../../../../design/theme";
import { screenStyles } from "../../screenStyles";

export function ChipButton({
  active,
  disabled = false,
  label,
  onPress
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPress={onPress}
      style={[
        screenStyles.quietButton,
        active ? { borderColor: colors.blueIQ, backgroundColor: colors.panelRaised } : null,
        disabled ? { opacity: 0.55 } : null
      ]}
    >
      <Text style={screenStyles.quietButtonText}>{label}</Text>
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
