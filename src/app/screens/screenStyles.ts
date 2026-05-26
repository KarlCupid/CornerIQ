import type { TextStyle, ViewStyle } from "react-native";
import { colors, radii, spacing } from "../../design/theme";
import { typography } from "../../design/typography";

export const screenStyles = {
  screen: {
    flex: 1,
    backgroundColor: colors.cornerBlack
  } satisfies ViewStyle,
  scrollFill: {
    flex: 1
  } satisfies ViewStyle,
  ambientTop: {
    backgroundColor: "rgba(39, 206, 241, 0.055)",
    height: 180,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  } satisfies ViewStyle,
  ambientLeft: {
    backgroundColor: "transparent",
    bottom: 148,
    height: 260,
    left: 0,
    position: "absolute",
    right: 0
  } satisfies ViewStyle,
  ambientRight: {
    backgroundColor: "transparent",
    bottom: 0,
    height: 180,
    left: 0,
    position: "absolute",
    right: 0
  } satisfies ViewStyle,
  content: {
    gap: spacing.xl,
    flexGrow: 1,
    paddingBottom: 132,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl
  } satisfies ViewStyle,
  row: {
    gap: spacing.sm
  } satisfies ViewStyle,
  title: {
    ...typography.screenTitle,
    color: colors.canvas,
  } satisfies TextStyle,
  heroTitle: {
    ...typography.heroTitle,
    color: colors.canvas,
  } satisfies TextStyle,
  headerPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radii.pill,
    minHeight: 28,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  } satisfies ViewStyle,
  headerPillText: {
    color: colors.blueIQ,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16
  } satisfies TextStyle,
  cardShine: {
    backgroundColor: "transparent",
    height: 1,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  } satisfies ViewStyle,
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.canvas,
  } satisfies TextStyle,
  fieldLabel: {
    color: colors.canvas,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16
  } satisfies TextStyle,
  body: {
    ...typography.body,
    color: colors.wrap,
  } satisfies TextStyle,
  subtle: {
    ...typography.subtle,
    color: colors.mutedText,
  } satisfies TextStyle,
  callout: {
    color: colors.blueIQ,
    fontSize: 16,
    lineHeight: 23,
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
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    color: colors.canvas,
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 23,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  } satisfies TextStyle,
  button: {
    alignItems: "center",
    backgroundColor: colors.blueIQ,
    borderRadius: 20,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  } satisfies ViewStyle,
  quietButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.md,
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
  } satisfies TextStyle,
  chip: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.055)",
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  } satisfies ViewStyle,
  chipSelected: {
    backgroundColor: "rgba(39, 206, 241, 0.13)",
    borderColor: "rgba(39, 206, 241, 0.46)"
  } satisfies ViewStyle,
  chipText: {
    color: colors.mutedText,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18
  } satisfies TextStyle,
  chipTextSelected: {
    color: colors.canvas
  } satisfies TextStyle,
  tileLabel: {
    ...typography.tileLabel,
    color: colors.wrap,
  } satisfies TextStyle,
  tileValue: {
    ...typography.tileValue,
    color: colors.canvas,
  } satisfies TextStyle
} as const;
