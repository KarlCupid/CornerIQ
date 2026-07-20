import type { ViewStyle } from "react-native";
import { radii } from "./theme";

export type GlassViewStyle = ViewStyle & {
  borderCurve?: "continuous";
  boxShadow?: string;
};

export const glassStyles = {
  card: {
    backgroundColor: "rgba(8, 25, 31, 0.94)",
    borderColor: "rgba(171, 209, 216, 0.16)",
    borderCurve: "continuous",
    borderRadius: radii.card,
    borderWidth: 1,
    boxShadow: "none"
  } satisfies GlassViewStyle,
  cardDeep: {
    backgroundColor: "rgba(5, 18, 23, 0.98)",
    borderColor: "rgba(171, 209, 216, 0.16)",
    borderCurve: "continuous",
    borderRadius: radii.card,
    borderWidth: 1,
    boxShadow: "none"
  } satisfies GlassViewStyle,
  control: {
    backgroundColor: "rgba(39, 206, 241, 0.05)",
    borderColor: "rgba(171, 209, 216, 0.18)",
    borderCurve: "continuous",
    borderRadius: radii.control,
    borderWidth: 1,
    boxShadow: "none"
  } satisfies GlassViewStyle,
  disabledPrimaryControl: {
    backgroundColor: "rgba(255, 255, 255, 0.105)",
    borderColor: "rgba(255, 255, 255, 0.17)",
    borderCurve: "continuous",
    borderRadius: radii.pill,
    borderWidth: 1
  } satisfies GlassViewStyle,
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.055)",
    borderColor: "rgba(232, 240, 255, 0.13)",
    borderCurve: "continuous",
    borderRadius: radii.control,
    borderWidth: 1
  } satisfies GlassViewStyle,
  primaryControl: {
    backgroundColor: "rgba(39, 206, 241, 0.86)",
    borderColor: "rgba(255, 255, 255, 0.52)",
    borderCurve: "continuous",
    borderRadius: radii.pill,
    borderWidth: 1,
    boxShadow: "none"
  } satisfies GlassViewStyle,
  tabBar: {
    backgroundColor: "#061318",
    borderColor: "rgba(39, 206, 241, 0.24)",
    borderCurve: "continuous",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    boxShadow: "none"
  } satisfies GlassViewStyle,
  tile: {
    backgroundColor: "rgba(255, 255, 255, 0.046)",
    borderColor: "rgba(232, 240, 255, 0.11)",
    borderCurve: "continuous",
    borderRadius: radii.tile,
    borderWidth: 1
  } satisfies GlassViewStyle
} as const;

export function alphaHex(color: string, alpha: string): string {
  return color.startsWith("#") ? `${color}${alpha}` : color;
}
