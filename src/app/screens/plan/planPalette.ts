import type { TextStyle } from "react-native";
import { screenStyles } from "../screenStyles";

export type PlanTone = "blue" | "gold" | "green" | "muted" | "orange" | "purple" | "red";

export const planPalette = {
  actionBorder: "rgba(39, 206, 241, 0.58)",
  actionFill: "#27CEF1",
  actionFillPressed: "#20B9D9",
  actionShadow: "rgba(39, 206, 241, 0.16)",
  cardLine: "rgba(205, 239, 247, 0.14)",
  controlFill: "rgba(224, 244, 252, 0.055)",
  controlFillPressed: "rgba(39, 206, 241, 0.13)",
  controlLine: "rgba(205, 239, 247, 0.18)",
  textBody: "#D7E7F4",
  textMuted: "#A9BDD0",
  textPrimary: "#F6FBFF",
  toneBlue: "#27CEF1",
  toneGold: "#78DFF3",
  toneGreen: "#6FE5F6",
  toneMuted: "#A9BDD0",
  toneOrange: "#86E7F7",
  tonePurple: "#27CEF1",
  toneRed: "#FF6B75"
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
