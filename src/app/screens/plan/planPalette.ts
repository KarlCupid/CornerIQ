import type { TextStyle } from "react-native";
import { screenStyles } from "../screenStyles";

export type PlanTone = "blue" | "gold" | "green" | "muted" | "orange" | "purple" | "red";

export const planPalette = {
  actionBorder: "rgba(181, 224, 191, 0.48)",
  actionFill: "rgba(73, 132, 91, 0.36)",
  actionFillPressed: "rgba(88, 151, 105, 0.44)",
  actionShadow: "rgba(42, 106, 65, 0.28)",
  cardLine: "rgba(205, 226, 211, 0.16)",
  controlFill: "rgba(230, 247, 234, 0.062)",
  controlFillPressed: "rgba(230, 247, 234, 0.1)",
  controlLine: "rgba(205, 226, 211, 0.18)",
  textBody: "#D4E2D7",
  textMuted: "#A4B4A8",
  textPrimary: "#F3F8F4",
  toneBlue: "#8DBDCC",
  toneGold: "#CBB878",
  toneGreen: "#8DBB9B",
  toneMuted: "#A4B4A8",
  toneOrange: "#CE9565",
  tonePurple: "#A99ACB",
  toneRed: "#D57986"
} as const;

export const planTextStyles = {
  body: { ...screenStyles.body, color: planPalette.textBody },
  callout: { ...screenStyles.callout, color: planPalette.textPrimary, fontWeight: "700" as const },
  fieldLabel: { ...screenStyles.fieldLabel, color: planPalette.textPrimary },
  sectionTitle: { ...screenStyles.sectionTitle, color: planPalette.textPrimary, fontWeight: "800" as const },
  subtle: { ...screenStyles.subtle, color: planPalette.textMuted }
} satisfies Record<string, TextStyle>;

export const planToneColors: Record<PlanTone, string> = {
  blue: planPalette.toneBlue,
  gold: planPalette.toneGold,
  green: planPalette.toneGreen,
  muted: planPalette.toneMuted,
  orange: planPalette.toneOrange,
  purple: planPalette.tonePurple,
  red: planPalette.toneRed
};

export function planColorForTone(tone: PlanTone): string {
  return planToneColors[tone];
}

export function planTint(tone: PlanTone, alpha: string): string {
  return `${planColorForTone(tone)}${alpha}`;
}
