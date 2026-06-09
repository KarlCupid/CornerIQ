import type { ViewStyle } from "react-native";
import { radii } from "./theme";

export type GlassViewStyle = ViewStyle & {
  borderCurve?: "continuous";
  boxShadow?: string;
};

export const glassStyles = {
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.086)",
    borderColor: "rgba(255, 255, 255, 0.16)",
    borderCurve: "continuous",
    borderRadius: radii.card,
    borderWidth: 1,
    boxShadow: "0 14px 36px rgba(0, 0, 0, 0.22)"
  } satisfies GlassViewStyle,
  cardDeep: {
    backgroundColor: "rgba(12, 18, 35, 0.78)",
    borderColor: "rgba(255, 255, 255, 0.17)",
    borderCurve: "continuous",
    borderRadius: radii.card,
    borderWidth: 1,
    boxShadow: "0 16px 42px rgba(0, 0, 0, 0.24)"
  } satisfies GlassViewStyle,
  control: {
    backgroundColor: "rgba(255, 255, 255, 0.095)",
    borderColor: "rgba(255, 255, 255, 0.18)",
    borderCurve: "continuous",
    borderRadius: radii.pill,
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
    backgroundColor: "rgba(255, 255, 255, 0.092)",
    borderColor: "rgba(255, 255, 255, 0.18)",
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
    backgroundColor: "rgba(10, 16, 31, 0.97)",
    borderColor: "rgba(255, 255, 255, 0.16)",
    borderCurve: "continuous",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    boxShadow: "0 -12px 34px rgba(0, 0, 0, 0.26)"
  } satisfies GlassViewStyle,
  tile: {
    backgroundColor: "rgba(255, 255, 255, 0.072)",
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderCurve: "continuous",
    borderRadius: radii.tile,
    borderWidth: 1
  } satisfies GlassViewStyle
} as const;

export function alphaHex(color: string, alpha: string): string {
  return color.startsWith("#") ? `${color}${alpha}` : color;
}
