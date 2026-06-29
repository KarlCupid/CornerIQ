import type { TextStyle } from "react-native";
import { screenStyles } from "../screenStyles";

export type PlanTone = "blue" | "gold" | "green" | "muted" | "orange" | "purple" | "red";

export const planPalette = {
  actionBorder: "rgba(56, 226, 138, 0.56)",
  actionFill: "#38E28A",
  actionFillPressed: "#30CA7B",
  actionShadow: "rgba(56, 226, 138, 0.28)",
  cardLine: "rgba(210, 244, 221, 0.14)",
  controlFill: "rgba(230, 247, 234, 0.055)",
  controlFillPressed: "rgba(230, 247, 234, 0.095)",
  controlLine: "rgba(210, 244, 221, 0.16)",
  textBody: "#D4E2D7",
  textMuted: "#A4B4A8",
  textPrimary: "#F3F8F4",
  toneBlue: "#27CEF1",
  toneGold: "#FFD861",
  toneGreen: "#38E28A",
  toneMuted: "#A4B4A8",
  toneOrange: "#FF9448",
  tonePurple: "#9657F5",
  toneRed: "#FF5265"
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
