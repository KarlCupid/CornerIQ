import type { TextStyle } from "react-native";
import type { VisualTone } from "../../../engine/presentation/dashboardVisualData";
import { screenStyles } from "../screenStyles";

export const trainPalette = {
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
  toneRed: "#F6FBFF"
} as const;

export const trainTextStyles = {
  body: { ...screenStyles.body, color: trainPalette.textBody },
  callout: { ...screenStyles.callout, color: trainPalette.textPrimary, fontWeight: "700" as const },
  sectionTitle: { ...screenStyles.sectionTitle, color: trainPalette.textPrimary, fontWeight: "800" as const },
  subtle: { ...screenStyles.subtle, color: trainPalette.textMuted }
} satisfies Record<string, TextStyle>;

export function trainColorForTone(tone: VisualTone): string {
  switch (tone) {
    case "blue":
      return trainPalette.toneBlue;
    case "gold":
      return trainPalette.toneGold;
    case "green":
      return trainPalette.toneGreen;
    case "orange":
      return trainPalette.toneOrange;
    case "purple":
      return trainPalette.tonePurple;
    case "red":
      return trainPalette.toneRed;
    case "muted":
    default:
      return trainPalette.toneMuted;
  }
}

export function trainTint(tone: VisualTone, alpha: string): string {
  return `${trainColorForTone(tone)}${alpha}`;
}
