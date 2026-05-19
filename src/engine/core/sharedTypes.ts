export type ISODateString = string;
export type ISODateTimeString = string;

export type UnitSystem = "metric" | "imperial";
export type AmateurOrPro = "amateur" | "pro";

export type ConfidenceLevel = "high" | "medium" | "low" | "unknown";

export interface Confidence {
  level: ConfidenceLevel;
  score: number;
  reasons: readonly string[];
  missingInputs: readonly string[];
}

export interface Mass {
  value: number;
  unit: "kg" | "lb";
}

export interface Height {
  value: number;
  unit: "cm" | "in";
}
