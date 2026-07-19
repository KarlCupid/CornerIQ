import type { TextStyle } from "react-native";
import { fontFamilies } from "../../../design/typography";

export const onboardingColors = {
  canvas: "#F1EADF",
  canvasMuted: "#6F6A63",
  cyan: "#27CEF1",
  cyanDeep: "rgba(39, 206, 241, 0.15)",
  cyanPressed: "#20B9D9",
  hairline: "rgba(241, 234, 223, 0.26)",
  hairlineStrong: "rgba(241, 234, 223, 0.44)",
  ink: "#080B0E",
  inkRaised: "#0C1116",
  inkSelected: "#0D252D",
  muted: "#A9ADB2",
  white: "#F8F5EE"
} as const;

export const onboardingStyles = {
  bodyCopy: {
    color: onboardingColors.muted,
    fontFamily: fontFamilies.regular,
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 22
  } satisfies TextStyle,
  fieldLabel: {
    color: onboardingColors.white,
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21
  } satisfies TextStyle,
  sectionTitle: {
    color: onboardingColors.white,
    fontFamily: fontFamilies.display,
    fontSize: 24,
    fontWeight: "400",
    includeFontPadding: true,
    letterSpacing: 0.5,
    lineHeight: 34,
    paddingBottom: 1,
    paddingTop: 1,
    textTransform: "uppercase"
  } satisfies TextStyle
} as const;
