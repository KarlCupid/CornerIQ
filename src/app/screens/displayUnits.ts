import { kgToLb } from "../../engine/core/units";
import type { TrendPoint } from "../../engine/presentation/dashboardVisualData";

export type PreferredUnits = "metric" | "imperial";

export function massLabelFromKg(kg: number, preferredUnits: PreferredUnits): string {
  return preferredUnits === "imperial" ? `${kgToLb(kg).toFixed(1)} lb` : `${kg.toFixed(1)} kg`;
}

export function convertMassCopy(value: string, preferredUnits: PreferredUnits): string {
  if (preferredUnits === "metric") {
    return value;
  }
  return value.replace(/(-?\d+(?:\.\d+)?)\s*kg(\/week)?/gi, (_match, amount: string, cadence: string | undefined) => {
    const kg = Number(amount);
    if (!Number.isFinite(kg)) {
      return _match;
    }
    return `${kgToLb(kg).toFixed(1)} lb${cadence ?? ""}`;
  });
}

export function bodyMassTrendPointsForUnits(points: readonly TrendPoint[], preferredUnits: PreferredUnits): readonly TrendPoint[] {
  if (preferredUnits === "metric") {
    return points;
  }
  return points.map((point) => ({
    ...point,
    valueLabel: massLabelFromKg(point.value, preferredUnits)
  }));
}
