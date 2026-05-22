import type { TextStyle, ViewStyle } from "react-native";
import { colors, radii, spacing } from "../../design/theme";

export const screenStyles = {
  screen: {
    flex: 1,
    backgroundColor: colors.cornerBlack
  } satisfies ViewStyle,
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl
  } satisfies ViewStyle,
  row: {
    gap: spacing.sm
  } satisfies ViewStyle,
  title: {
    color: colors.canvas,
    fontSize: 28,
    fontWeight: "800"
  } satisfies TextStyle,
  sectionTitle: {
    color: colors.canvas,
    fontSize: 17,
    fontWeight: "700"
  } satisfies TextStyle,
  fieldLabel: {
    color: colors.canvas,
    fontSize: 14,
    fontWeight: "800"
  } satisfies TextStyle,
  body: {
    color: colors.wrap,
    fontSize: 15,
    lineHeight: 22
  } satisfies TextStyle,
  subtle: {
    color: colors.wrap,
    fontSize: 13,
    lineHeight: 19
  } satisfies TextStyle,
  callout: {
    color: colors.blueIQ,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700"
  } satisfies TextStyle,
  exampleText: {
    color: colors.blueIQ,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700"
  } satisfies TextStyle,
  successText: {
    color: colors.readyGreen,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700"
  } satisfies TextStyle,
  input: {
    minHeight: 48,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    color: colors.canvas,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  } satisfies TextStyle,
  button: {
    alignItems: "center",
    backgroundColor: colors.blueIQ,
    borderRadius: radii.control,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  } satisfies ViewStyle,
  quietButton: {
    alignItems: "center",
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  } satisfies ViewStyle,
  buttonText: {
    color: colors.cornerBlack,
    fontSize: 15,
    fontWeight: "800"
  } satisfies TextStyle,
  quietButtonText: {
    color: colors.canvas,
    fontSize: 15,
    fontWeight: "700"
  } satisfies TextStyle
} as const;
