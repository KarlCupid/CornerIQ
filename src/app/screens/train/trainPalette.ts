import type { TextStyle } from "react-native";
import type { VisualTone } from "../../../engine/presentation/dashboardVisualData";
import { screenStyles } from "../screenStyles";

export const trainPalette = {
  actionBorder: "rgba(202, 181, 255, 0.48)",
  actionFill: "rgba(119, 91, 173, 0.38)",
  actionFillPressed: "rgba(135, 103, 195, 0.46)",
  actionShadow: "rgba(76, 45, 145, 0.3)",
  cardLine: "rgba(218, 208, 242, 0.16)",
  controlFill: "rgba(236, 229, 255, 0.062)",
  controlFillPressed: "rgba(236, 229, 255, 0.1)",
  controlLine: "rgba(218, 208, 242, 0.18)",
  textBody: "#D9D2E7",
  textMuted: "#A9A1B8",
  textPrimary: "#F7F2FF",
  toneBlue: "#8FBFD2",
  toneGold: "#D5BE7B",
  toneGreen: "#8CBC9B",
  toneMuted: "#A9A1B8",
  toneOrange: "#D09666",
  tonePurple: "#A993D8",
  toneRed: "#D97887"
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
