import type { TextStyle } from "react-native";
import type { VisualTone } from "../../../engine/presentation/dashboardVisualData";
import { screenStyles } from "../screenStyles";

export const trainPalette = {
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
