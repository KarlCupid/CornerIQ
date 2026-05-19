import type { Confidence } from "../core/sharedTypes";

export type Phase =
  | "onboarding"
  | "build"
  | "camp"
  | "short_notice_camp"
  | "fight_week"
  | "tournament"
  | "weigh_in_day"
  | "post_weigh_in"
  | "bout_day"
  | "recovery"
  | "deload"
  | "maintenance";

export interface PhaseState {
  phase: Phase;
  daysUntilBout: number | null;
  daysUntilWeighIn: number | null;
  reason: string;
  confidence: Confidence;
}
