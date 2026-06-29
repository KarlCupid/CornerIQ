export const fontFamilies = {
  regular: "InterTight_400Regular",
  medium: "InterTight_500Medium",
  semibold: "InterTight_600SemiBold",
  bold: "InterTight_700Bold",
  extraBold: "InterTight_800ExtraBold",
  black: "InterTight_900Black"
} as const;

export const typography = {
  screenTitle: {
    fontFamily: fontFamilies.extraBold,
    fontSize: 34,
    fontWeight: "800" as const,
    lineHeight: 40
  },
  heroTitle: {
    fontFamily: fontFamilies.extraBold,
    fontSize: 28,
    fontWeight: "800" as const,
    lineHeight: 34
  },
  cardTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    fontWeight: "700" as const,
    lineHeight: 24
  },
  sectionTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    fontWeight: "700" as const,
    lineHeight: 24
  },
  body: {
    fontFamily: fontFamilies.regular,
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 23
  },
  bodyStrong: {
    fontFamily: fontFamilies.medium,
    fontSize: 16,
    fontWeight: "500" as const,
    lineHeight: 23
  },
  subtle: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    fontWeight: "400" as const,
    lineHeight: 19
  },
  tileLabel: {
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    fontWeight: "600" as const,
    lineHeight: 16
  },
  tileValue: {
    fontFamily: fontFamilies.bold,
    fontSize: 21,
    fontWeight: "700" as const,
    lineHeight: 27
  }
} as const;
