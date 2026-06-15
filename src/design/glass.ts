import type { ViewStyle } from "react-native";
import { radii } from "./theme";

export type GlassViewStyle = ViewStyle & {
  borderCurve?: "continuous";
  boxShadow?: string;
};

export const glassStyles = {
  card: {
    backgroundColor: "rgba(10, 15, 27, 0.78)",
    borderColor: "rgba(255, 255, 255, 0.13)",
    borderCurve: "continuous",
    borderRadius: radii.card,
    borderWidth: 1,
    boxShadow: "0 16px 34px rgba(0, 0, 0, 0.3)"
  } satisfies GlassViewStyle,
  cardDeep: {
    backgroundColor: "rgba(7, 12, 23, 0.84)",
    borderColor: "rgba(255, 255, 255, 0.13)",
    borderCurve: "continuous",
    borderRadius: radii.card,
    borderWidth: 1,
    boxShadow: "0 18px 42px rgba(0, 0, 0, 0.34)"
  } satisfies GlassViewStyle,
  control: {
    backgroundColor: "rgba(255, 255, 255, 0.075)",
    borderColor: "rgba(255, 255, 255, 0.14)",
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
    backgroundColor: "rgba(255, 255, 255, 0.074)",
    borderColor: "rgba(255, 255, 255, 0.14)",
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
    backgroundColor: "rgba(5, 9, 18, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.13)",
    borderCurve: "continuous",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    boxShadow: "0 -12px 30px rgba(0, 0, 0, 0.32)"
  } satisfies GlassViewStyle,
  tile: {
    backgroundColor: "rgba(255, 255, 255, 0.058)",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderCurve: "continuous",
    borderRadius: radii.tile,
    borderWidth: 1
  } satisfies GlassViewStyle
} as const;

export function alphaHex(color: string, alpha: string): string {
  return color.startsWith("#") ? `${color}${alpha}` : color;
}
