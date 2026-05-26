import type { TextStyle, ViewStyle } from "react-native";
import { colors, radii, spacing } from "../../design/theme";

export const screenStyles = {
  screen: {
    flex: 1,
    backgroundColor: colors.cornerBlack
  } satisfies ViewStyle,
  scrollFill: {
    flex: 1
  } satisfies ViewStyle,
  ambientTop: {
    backgroundColor: "rgba(115, 77, 160, 0.42)",
    borderRadius: 190,
    height: 380,
    position: "absolute",
    right: -142,
    top: -96,
    width: 380
  } satisfies ViewStyle,
  ambientLeft: {
    backgroundColor: "rgba(39, 206, 241, 0.22)",
    borderRadius: 180,
    height: 360,
    left: -154,
    position: "absolute",
    top: 92,
    width: 360
  } satisfies ViewStyle,
  ambientRight: {
    backgroundColor: "rgba(56, 226, 138, 0.12)",
    borderRadius: 170,
    bottom: 120,
    height: 340,
    position: "absolute",
    right: -188,
    width: 340
  } satisfies ViewStyle,
  content: {
    gap: spacing.xl,
    padding: spacing.lg,
    paddingBottom: 128,
    paddingTop: spacing.xxl
  } satisfies ViewStyle,
  row: {
    gap: spacing.sm
  } satisfies ViewStyle,
  title: {
    color: colors.canvas,
    fontSize: 44,
    fontWeight: "900",
    lineHeight: 52
  } satisfies TextStyle,
  heroTitle: {
    color: colors.canvas,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 40
  } satisfies TextStyle,
  headerPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.canvas,
    borderRadius: radii.pill,
    minHeight: 30,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs
  } satisfies ViewStyle,
  headerPillText: {
    color: colors.blueIQ,
    fontSize: 12,
    fontWeight: "900"
  } satisfies TextStyle,
  cardShine: {
    backgroundColor: colors.glassRail,
    borderRadius: radii.pill,
    height: 42,
    left: 0,
    opacity: 0.62,
    position: "absolute",
    right: 0,
    top: 0
  } satisfies ViewStyle,
  sectionTitle: {
    color: colors.canvas,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30
  } satisfies TextStyle,
  fieldLabel: {
    color: colors.canvas,
    fontSize: 14,
    fontWeight: "800"
  } satisfies TextStyle,
  body: {
    color: colors.wrap,
    fontSize: 17,
    lineHeight: 25
  } satisfies TextStyle,
  subtle: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 20
  } satisfies TextStyle,
  callout: {
    color: colors.blueIQ,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "900"
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
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: colors.lineStrong,
    borderRadius: radii.control,
    borderWidth: 1,
    color: colors.canvas,
    fontSize: 18,
    fontWeight: "800",
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
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderColor: "rgba(255, 255, 255, 0.92)",
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
    color: colors.cornerBlack,
    fontSize: 15,
    fontWeight: "900"
  } satisfies TextStyle,
  tileLabel: {
    color: colors.wrap,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18
  } satisfies TextStyle,
  tileValue: {
    color: colors.canvas,
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 32
  } satisfies TextStyle
} as const;
