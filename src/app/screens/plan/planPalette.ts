import type { TextStyle } from "react-native";
import { screenStyles } from "../screenStyles";

export type PlanTone = "blue" | "gold" | "green" | "muted" | "orange" | "purple" | "red";

export const planPalette = {
  actionBorder: "rgba(39, 206, 241, 0.58)",
  actionFill: "#27CEF1",
  actionFillPressed: "#20B9D9",
  actionShadow: "rgba(39, 206, 241, 0.16)",
  cardLine: "rgba(216, 228, 230, 0.14)",
  controlFill: "rgba(216, 228, 230, 0.055)",
  controlFillPressed: "rgba(216, 228, 230, 0.095)",
  controlLine: "rgba(216, 228, 230, 0.16)",
  textBody: "#D8E4E6",
  textMuted: "#9FAFB4",
  textPrimary: "#F2EBE0",
  toneBlue: "#27CEF1",
  toneGold: "#FFD861",
  toneGreen: "#38E28A",
  toneMuted: "#9FAFB4",
  toneOrange: "#FF9448",
  tonePurple: "#27CEF1",
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
