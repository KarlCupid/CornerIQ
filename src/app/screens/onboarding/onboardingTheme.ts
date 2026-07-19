import type { TextStyle } from "react-native";
import { fontFamilies } from "../../../design/typography";

export const onboardingColors = {
  canvas: "#F1EADF",
  canvasMuted: "#6F6A63",
  cyan: "#27CEF1",
  cyanDeep: "rgba(39, 206, 241, 0.15)",
  cyanPressed: "#20B9D9",
  hairline: "rgba(241, 234, 223, 0.22)",
  hairlineStrong: "rgba(241, 234, 223, 0.36)",
  ink: "#080B0E",
  inkRaised: "#0D1115",
  muted: "#A9ADB2",
  white: "#F8F5EE"
} as const;

export const onboardingStyles = {
  bodyCopy: {
    color: onboardingColors.muted,
    fontFamily: fontFamilies.regular,
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 21
  } satisfies TextStyle,
  fieldLabel: {
    color: onboardingColors.white,
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19
  } satisfies TextStyle,
  sectionTitle: {
    color: onboardingColors.white,
    fontFamily: fontFamilies.display,
    fontSize: 23,
    fontWeight: "400",
    letterSpacing: 0.4,
    lineHeight: 27,
    textTransform: "uppercase"
  } satisfies TextStyle
} as const;
