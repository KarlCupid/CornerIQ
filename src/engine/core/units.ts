import type { Mass } from "./types";

export function toKg(mass: Mass | null): number | null {
  if (mass === null) {
    return null;
  }
  return mass.unit === "kg" ? mass.value : mass.value * 0.45359237;
}

export function kgToLb(kg: number): number {
  return kg / 0.45359237;
}

export function lbToKg(lb: number): number {
  return lb * 0.45359237;
}

export function cmToIn(cm: number): number {
  return cm / 2.54;
}

export function inToCm(inches: number): number {
  return inches * 2.54;
}

export function roundKg(kg: number): number {
  return Number(kg.toFixed(1));
}
