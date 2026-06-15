import React from "react";
import { colors } from "./theme";

export type LuminousAccent = "blue" | "green" | "orange" | "purple" | "gold" | "red" | "neutral";

export const accentColor: Record<LuminousAccent, string> = {
  blue: colors.blueIQ,
  gold: colors.gold,
  green: colors.readyGreen,
  neutral: colors.mutedText,
  orange: colors.amberCaution,
  purple: colors.powerPurple,
  red: colors.redCorner
};

export const accentWash: Record<LuminousAccent, string> = {
  blue: "rgba(39, 206, 241, 0.16)",
  gold: "rgba(255, 216, 97, 0.16)",
  green: "rgba(56, 226, 138, 0.15)",
  neutral: "rgba(183, 196, 217, 0.14)",
  orange: "rgba(255, 148, 72, 0.16)",
  purple: "rgba(150, 87, 245, 0.16)",
  red: "rgba(255, 82, 101, 0.16)"
};

export interface LuminousScreenTheme {
  accent: LuminousAccent;
  accentColor: string;
  background: string;
  bottomWash: string;
  card: string;
  cardBorder: string;
  cardDeep: string;
  control: string;
  controlBorder: string;
  hairline: string;
  midWash: string;
  strongGlow: string;
  tile: string;
  tileBorder: string;
  topWash: string;
}

export const luminousScreenThemes: Record<LuminousAccent, LuminousScreenTheme> = {
  blue: {
    accent: "blue",
    accentColor: accentColor.blue,
    background: "#020814",
    bottomWash: "rgba(1, 6, 14, 0.96)",
    card: "rgba(5, 17, 34, 0.88)",
    cardBorder: "rgba(39, 206, 241, 0.22)",
    cardDeep: "rgba(4, 13, 29, 0.92)",
    control: "rgba(39, 206, 241, 0.085)",
    controlBorder: "rgba(39, 206, 241, 0.24)",
    hairline: "rgba(39, 206, 241, 0.16)",
    midWash: "rgba(7, 32, 58, 0.58)",
    strongGlow: "rgba(39, 206, 241, 0.23)",
    tile: "rgba(39, 206, 241, 0.07)",
    tileBorder: "rgba(39, 206, 241, 0.18)",
    topWash: "rgba(22, 77, 123, 0.48)"
  },
  gold: {
    accent: "gold",
    accentColor: accentColor.gold,
    background: "#100C04",
    bottomWash: "rgba(8, 6, 3, 0.96)",
    card: "rgba(34, 24, 7, 0.88)",
    cardBorder: "rgba(255, 216, 97, 0.22)",
    cardDeep: "rgba(27, 18, 5, 0.92)",
    control: "rgba(255, 216, 97, 0.085)",
    controlBorder: "rgba(255, 216, 97, 0.24)",
    hairline: "rgba(255, 216, 97, 0.16)",
    midWash: "rgba(67, 42, 8, 0.52)",
    strongGlow: "rgba(255, 216, 97, 0.21)",
    tile: "rgba(255, 216, 97, 0.07)",
    tileBorder: "rgba(255, 216, 97, 0.18)",
    topWash: "rgba(96, 65, 13, 0.42)"
  },
  green: {
    accent: "green",
    accentColor: accentColor.green,
    background: "#03120B",
    bottomWash: "rgba(1, 8, 5, 0.96)",
    card: "rgba(5, 28, 17, 0.88)",
    cardBorder: "rgba(56, 226, 138, 0.22)",
    cardDeep: "rgba(4, 22, 14, 0.92)",
    control: "rgba(56, 226, 138, 0.08)",
    controlBorder: "rgba(56, 226, 138, 0.23)",
    hairline: "rgba(56, 226, 138, 0.16)",
    midWash: "rgba(12, 57, 32, 0.56)",
    strongGlow: "rgba(56, 226, 138, 0.2)",
    tile: "rgba(56, 226, 138, 0.065)",
    tileBorder: "rgba(56, 226, 138, 0.18)",
    topWash: "rgba(21, 86, 52, 0.45)"
  },
  neutral: {
    accent: "neutral",
    accentColor: accentColor.neutral,
    background: "#071018",
    bottomWash: "rgba(3, 7, 11, 0.96)",
    card: "rgba(12, 21, 31, 0.9)",
    cardBorder: "rgba(169, 185, 207, 0.22)",
    cardDeep: "rgba(8, 16, 25, 0.93)",
    control: "rgba(169, 185, 207, 0.08)",
    controlBorder: "rgba(169, 185, 207, 0.23)",
    hairline: "rgba(169, 185, 207, 0.16)",
    midWash: "rgba(31, 46, 63, 0.52)",
    strongGlow: "rgba(169, 185, 207, 0.18)",
    tile: "rgba(169, 185, 207, 0.065)",
    tileBorder: "rgba(169, 185, 207, 0.17)",
    topWash: "rgba(57, 75, 96, 0.4)"
  },
  orange: {
    accent: "orange",
    accentColor: accentColor.orange,
    background: "#120A03",
    bottomWash: "rgba(8, 5, 2, 0.96)",
    card: "rgba(35, 20, 6, 0.88)",
    cardBorder: "rgba(255, 148, 72, 0.22)",
    cardDeep: "rgba(27, 16, 5, 0.92)",
    control: "rgba(255, 148, 72, 0.085)",
    controlBorder: "rgba(255, 148, 72, 0.24)",
    hairline: "rgba(255, 148, 72, 0.16)",
    midWash: "rgba(77, 43, 8, 0.54)",
    strongGlow: "rgba(255, 148, 72, 0.22)",
    tile: "rgba(255, 148, 72, 0.07)",
    tileBorder: "rgba(255, 148, 72, 0.18)",
    topWash: "rgba(109, 64, 14, 0.45)"
  },
  purple: {
    accent: "purple",
    accentColor: accentColor.purple,
    background: "#0A0616",
    bottomWash: "rgba(5, 3, 12, 0.96)",
    card: "rgba(22, 13, 42, 0.88)",
    cardBorder: "rgba(150, 87, 245, 0.24)",
    cardDeep: "rgba(16, 10, 32, 0.93)",
    control: "rgba(150, 87, 245, 0.09)",
    controlBorder: "rgba(150, 87, 245, 0.26)",
    hairline: "rgba(150, 87, 245, 0.17)",
    midWash: "rgba(48, 19, 84, 0.56)",
    strongGlow: "rgba(150, 87, 245, 0.24)",
    tile: "rgba(150, 87, 245, 0.075)",
    tileBorder: "rgba(150, 87, 245, 0.2)",
    topWash: "rgba(75, 29, 128, 0.46)"
  },
  red: {
    accent: "red",
    accentColor: accentColor.red,
    background: "#140508",
    bottomWash: "rgba(8, 2, 4, 0.96)",
    card: "rgba(37, 10, 16, 0.88)",
    cardBorder: "rgba(255, 82, 101, 0.24)",
    cardDeep: "rgba(29, 7, 13, 0.92)",
    control: "rgba(255, 82, 101, 0.085)",
    controlBorder: "rgba(255, 82, 101, 0.25)",
    hairline: "rgba(255, 82, 101, 0.17)",
    midWash: "rgba(75, 19, 28, 0.54)",
    strongGlow: "rgba(255, 82, 101, 0.23)",
    tile: "rgba(255, 82, 101, 0.07)",
    tileBorder: "rgba(255, 82, 101, 0.19)",
    topWash: "rgba(103, 31, 42, 0.43)"
  }
};

export const LuminousScreenThemeContext = React.createContext<LuminousScreenTheme>(luminousScreenThemes.blue);

export function useLuminousScreenTheme(): LuminousScreenTheme {
  return React.useContext(LuminousScreenThemeContext);
}
