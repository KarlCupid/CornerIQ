import type { TextStyle } from "react-native";
import type { VisualTone } from "../../../engine/presentation/dashboardVisualData";
import { screenStyles } from "../screenStyles";

export const trainPalette = {
  actionBorder: "rgba(202, 181, 255, 0.58)",
  actionFill: "#9657F5",
  actionFillPressed: "#854CE2",
  actionShadow: "rgba(150, 87, 245, 0.34)",
  cardLine: "rgba(232, 222, 255, 0.14)",
  controlFill: "rgba(236, 229, 255, 0.055)",
  controlFillPressed: "rgba(236, 229, 255, 0.095)",
  controlLine: "rgba(232, 222, 255, 0.16)",
  textBody: "#D9D2E7",
  textMuted: "#A9A1B8",
  textPrimary: "#FAF7FF",
  toneBlue: "#27CEF1",
  toneGold: "#FFD861",
  toneGreen: "#38E28A",
  toneMuted: "#A9A1B8",
  toneOrange: "#FF9448",
  tonePurple: "#9657F5",
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
