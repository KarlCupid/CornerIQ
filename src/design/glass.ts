import type { ViewStyle } from "react-native";
import { radii } from "./theme";

export type GlassViewStyle = ViewStyle & {
  borderCurve?: "continuous";
  boxShadow?: string;
};

export const glassStyles = {
  card: {
    backgroundColor: "rgba(8, 13, 23, 0.68)",
    borderColor: "rgba(232, 240, 255, 0.12)",
    borderCurve: "continuous",
    borderRadius: radii.card,
    borderWidth: 1,
    boxShadow: "0 18px 38px rgba(0, 0, 0, 0.34)"
  } satisfies GlassViewStyle,
  cardDeep: {
    backgroundColor: "rgba(5, 10, 18, 0.78)",
    borderColor: "rgba(232, 240, 255, 0.12)",
    borderCurve: "continuous",
    borderRadius: radii.card,
    borderWidth: 1,
    boxShadow: "0 20px 44px rgba(0, 0, 0, 0.38)"
  } satisfies GlassViewStyle,
  control: {
    backgroundColor: "rgba(255, 255, 255, 0.055)",
    borderColor: "rgba(232, 240, 255, 0.13)",
    borderCurve: "continuous",
    borderRadius: radii.control,
    borderWidth: 1,
    boxShadow: "0 8px 22px rgba(0, 0, 0, 0.18)"
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
    boxShadow: "0 10px 26px rgba(39, 206, 241, 0.22)"
  } satisfies GlassViewStyle,
  tabBar: {
    backgroundColor: "rgba(4, 8, 15, 0.88)",
    borderColor: "rgba(232, 240, 255, 0.14)",
    borderCurve: "continuous",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    boxShadow: "0 -12px 30px rgba(0, 0, 0, 0.32)"
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
