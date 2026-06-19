import type { Confidence, ISODateString, ISODateTimeString } from "../core/sharedTypes";
import type { RiskFlag } from "../safety/types";

export interface ReadinessCheckIn {
  date: ISODateString;
  recordedAt?: ISODateTimeString | undefined;
  sleepHours?: number | undefined;
  sleepQuality1To5?: number | undefined;
  energy1To5?: number | undefined;
  soreness1To5?: number | undefined;
  stress1To5?: number | undefined;
  mood1To5?: number | undefined;
  painNotes: readonly string[];
  illnessSymptoms: readonly string[];
  dizziness: boolean;
  fainting: boolean;
  restingPulse?: number | undefined;
  urineColor?: "pale" | "normal" | "dark" | "very_dark" | "unknown" | undefined;
}

export type ReadinessColor = "green" | "amber" | "red" | "unknown";

export interface ReadinessState {
  score: number | null;
  color: ReadinessColor;
  drivers: readonly string[];
  hardStops: readonly RiskFlag[];
  confidence: Confidence;
  explanation: string;
}
